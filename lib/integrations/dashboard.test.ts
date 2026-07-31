import { test } from "node:test";
import assert from "node:assert/strict";
import { createJourneyManifest } from "@avatark/journey";
import { describeDashboard } from "./dashboard.ts";

function baseInput(overrides: Partial<Parameters<typeof describeDashboard>[1]> = {}) {
  return {
    practiceAvailable: true,
    watchFirstAvailable: true,
    invitationStatus: null,
    ...overrides,
  };
}

test("describeDashboard: a mid-chain manifest at practice_intro reports the real Prometheus handoff as its one next option", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "direct",
    entryPoint: "witness",
    practiceId: "the-promise-to-myself",
    returnTo: "/continue",
    nextStep: "practice_intro",
  });
  const view = describeDashboard(manifest, baseInput());
  assert.equal(view.currentProduct, "AvatarK");
  assert.equal(view.currentStep, "practice_intro");
  assert.equal(view.nextOptions.length, 1);
  assert.equal(view.nextOptions[0].step, "practice_runtime");
  assert.equal(view.nextOptions[0].product, "Prometheus");
  assert.equal(view.nextOptions[0].crossesBoundary, true);
  assert.notEqual(view.nextOptions[0].handoff, null);
  assert.equal(view.status.source, "adapter");
  assert.match(view.status.message, /PrometheusK/);
});

test("describeDashboard: invitation_accepted branches into a crossing option (watch_first) and a non-crossing one (practice_intro)", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "invitation",
    entryPoint: "enter",
    invitationId: "tok_1",
    watchFirstId: "story-1",
    returnTo: "/witness/the-promise-to-myself",
    nextStep: "invitation_accepted",
  });
  const view = describeDashboard(manifest, baseInput());
  assert.equal(view.nextOptions.length, 2);
  const watchFirstOption = view.nextOptions.find((o) => o.step === "watch_first")!;
  const practiceIntroOption = view.nextOptions.find((o) => o.step === "practice_intro")!;
  assert.equal(watchFirstOption.crossesBoundary, true);
  assert.equal(watchFirstOption.product, "StreamK");
  assert.equal(practiceIntroOption.crossesBoundary, false);
  assert.equal(practiceIntroOption.product, "AvatarK");
});

test("describeDashboard: an expired invitation status wins over everything else, sourced from recoverJourney", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "invitation",
    entryPoint: "enter",
  });
  const view = describeDashboard(manifest, baseInput({ invitationStatus: "expired" }));
  assert.equal(view.status.source, "recovery");
  assert.match(view.status.message, /expired/);
});

test("describeDashboard: a terminal manifest at arena reports no next options and a ready status", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "resume",
    entryPoint: "journey",
    nextStep: "arena",
    completedSteps: [
      "invitation_received",
      "invitation_accepted",
      "practice_intro",
      "practice_runtime",
      "reflection",
      "living_echo",
      "recommendation",
    ],
  });
  const view = describeDashboard(manifest, baseInput());
  assert.equal(view.currentProduct, "Arena");
  assert.deepEqual(view.nextOptions, []);
  // already_completed is itself a recovery reason, so status still comes from recovery here.
  assert.equal(view.status.source, "recovery");
});
