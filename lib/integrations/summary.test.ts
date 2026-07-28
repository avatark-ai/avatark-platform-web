import { test } from "node:test";
import assert from "node:assert/strict";
import { createJourneyManifest } from "../journey/manifest.ts";
import { describeIntegrationHealth } from "./health.ts";
import { describeJourneySummary } from "./summary.ts";

test("not_started: a fresh manifest with nothing completed and nothing wrong", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "invitation",
    entryPoint: "enter",
    invitationId: "tok_1",
    returnTo: "/continue",
  });
  const summary = describeJourneySummary(manifest, { invitationStatus: "pending", practiceAvailable: false, watchFirstAvailable: false }, describeIntegrationHealth());
  assert.equal(summary.journeyStatus.status, "not_started");
  assert.equal(summary.primaryBlocker, null);
});

test("blocked: an expired invitation is a real blocker, and integration readiness stays ready -- it's a journey problem, not a contract gap", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "invitation",
    entryPoint: "enter",
    invitationId: "tok_1",
    returnTo: "/continue",
  });
  const summary = describeJourneySummary(manifest, { invitationStatus: "expired", practiceAvailable: false, watchFirstAvailable: false }, describeIntegrationHealth());
  assert.equal(summary.recovery?.reason, "expired_invitation");
  assert.equal(summary.journeyStatus.status, "blocked");
  assert.equal(summary.primaryBlocker, summary.recovery?.message);
  assert.equal(summary.integrationReadiness.status, "ready");
});

test("blocked: a missing practice mapping is a real blocker, and integration readiness reflects the real adapter gap", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "direct",
    entryPoint: "witness",
    practiceId: "the-promise-to-myself",
    returnTo: "/continue",
    nextStep: "practice_intro",
    completedSteps: [],
  });
  const summary = describeJourneySummary(manifest, { invitationStatus: null, practiceAvailable: false, watchFirstAvailable: true }, describeIntegrationHealth());
  assert.equal(summary.recovery?.reason, "missing_practice");
  assert.equal(summary.journeyStatus.status, "blocked");
  assert.ok(summary.primaryBlocker);
  assert.equal(summary.integrationReadiness.status, "waiting");
});

test("missing_watch_first is non-blocking -- Watch First degrades gracefully, journeyStatus stays in_progress", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "resume",
    entryPoint: "watch-first",
    watchFirstId: "story-1",
    returnTo: "/continue",
    nextStep: "watch_first",
    completedSteps: ["invitation_received", "invitation_accepted"],
  });
  const summary = describeJourneySummary(manifest, { invitationStatus: null, practiceAvailable: true, watchFirstAvailable: false }, describeIntegrationHealth());
  assert.equal(summary.recovery?.reason, "missing_watch_first");
  assert.equal(summary.journeyStatus.status, "in_progress", "a missing, optional Watch First must not read as Blocked");
  assert.equal(summary.primaryBlocker, null);
  assert.equal(summary.integrationReadiness.status, "missing_contract", "StreamK genuinely isn't wired -- integration readiness may still say so");
});

test("complete: reaching the terminal step (arena) reads complete, not blocked", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "resume",
    entryPoint: "journey",
    returnTo: "/journey/today",
    nextStep: "arena",
    completedSteps: ["invitation_received", "invitation_accepted", "watch_first", "practice_intro", "practice_runtime", "reflection", "living_echo", "recommendation"],
  });
  const summary = describeJourneySummary(manifest, { invitationStatus: null, practiceAvailable: true, watchFirstAvailable: true }, describeIntegrationHealth());
  assert.equal(summary.recovery?.reason, "already_completed");
  assert.equal(summary.journeyStatus.status, "complete");
  assert.equal(summary.primaryBlocker, null);
  assert.equal(summary.recommendations[0].tone, "success");
});

test("in_progress: a resumable, in-flight journey is neither blocked nor complete", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "invitation",
    entryPoint: "enter",
    invitationId: "tok_1",
    practiceId: "the-promise-to-myself",
    returnTo: "/continue",
    nextStep: "practice_intro",
    completedSteps: ["invitation_received", "invitation_accepted"],
  });
  const summary = describeJourneySummary(manifest, { invitationStatus: "pending", practiceAvailable: true, watchFirstAvailable: true }, describeIntegrationHealth());
  assert.equal(summary.recovery?.reason, "resumable");
  assert.equal(summary.journeyStatus.status, "in_progress");
  assert.equal(summary.primaryBlocker, null);
});

test("deriveRecommendations surfaces a missing_contract recommendation for a pending boundary crossing with no real implementation, explicitly non-blocking", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "resume",
    entryPoint: "journey",
    returnTo: "/journey/today",
    nextStep: "recommendation",
    completedSteps: ["invitation_received", "invitation_accepted", "watch_first", "practice_intro", "practice_runtime", "reflection", "living_echo"],
  });
  const summary = describeJourneySummary(manifest, { invitationStatus: null, practiceAvailable: true, watchFirstAvailable: true }, describeIntegrationHealth());
  const arenaRec = summary.recommendations.find((r) => r.id === "missing-contract-Arena");
  assert.ok(arenaRec, JSON.stringify(summary.recommendations));
  assert.match(arenaRec!.blocker, /does not block your current progress/);
});

test("every recommendation names a blocker, owner, and exact next action", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "direct",
    entryPoint: "witness",
    practiceId: "the-promise-to-myself",
    returnTo: "/continue",
    nextStep: "practice_intro",
    completedSteps: [],
  });
  const summary = describeJourneySummary(manifest, { invitationStatus: null, practiceAvailable: true, watchFirstAvailable: true }, describeIntegrationHealth());
  for (const rec of summary.recommendations) {
    assert.ok(rec.blocker.length > 0);
    assert.ok(rec.owner.length > 0);
    assert.ok(rec.nextAction.length > 0);
  }
});
