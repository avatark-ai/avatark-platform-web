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
  assert.equal(summary.overallStatus.status, "not_started");
});

test("blocked: an expired invitation is a real blocker, not a resumable continuation", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "invitation",
    entryPoint: "enter",
    invitationId: "tok_1",
    returnTo: "/continue",
  });
  const summary = describeJourneySummary(manifest, { invitationStatus: "expired", practiceAvailable: false, watchFirstAvailable: false }, describeIntegrationHealth());
  assert.equal(summary.recovery?.reason, "expired_invitation");
  assert.equal(summary.overallStatus.status, "blocked");
  assert.equal(summary.recommendations[0].tone, "warning");
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
  assert.equal(summary.overallStatus.status, "complete");
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
  assert.equal(summary.overallStatus.status, "in_progress");
  assert.equal(summary.recommendations[0].tone, "info");
});

test("deriveRecommendations surfaces a missing_contract recommendation for a pending boundary crossing with no real implementation", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "resume",
    entryPoint: "journey",
    returnTo: "/journey/today",
    nextStep: "recommendation",
    completedSteps: ["invitation_received", "invitation_accepted", "watch_first", "practice_intro", "practice_runtime", "reflection", "living_echo"],
  });
  const summary = describeJourneySummary(manifest, { invitationStatus: null, practiceAvailable: true, watchFirstAvailable: true }, describeIntegrationHealth());
  assert.ok(summary.recommendations.some((r) => r.id === "missing-contract-Arena"), JSON.stringify(summary.recommendations));
});

test("primary recommendation always reflects the same message as view.status when there is no recovery to report", () => {
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
  assert.equal(summary.recovery, null);
  assert.equal(summary.recommendations[0].message, summary.view.status.message);
});
