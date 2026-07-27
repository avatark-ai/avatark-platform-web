import { test } from "node:test";
import assert from "node:assert/strict";
import { recoverJourney } from "./recovery.ts";
import { createJourneyManifest } from "./manifest.ts";
import { transition } from "./stateMachine.ts";

function baseInput(overrides: Partial<Parameters<typeof recoverJourney>[0]> = {}) {
  return {
    invitationStatus: null,
    manifest: null,
    practiceAvailable: true,
    watchFirstAvailable: true,
    ...overrides,
  };
}

test("recoverJourney: nothing to recover when the invitation is pending and there's no manifest", () => {
  assert.equal(recoverJourney(baseInput({ invitationStatus: "pending" })), null);
});

test("recoverJourney: an expired invitation always wins, regardless of manifest state", () => {
  const manifest = createJourneyManifest({ journeyId: "j1", source: "invitation", entryPoint: "enter" });
  const action = recoverJourney(baseInput({ invitationStatus: "expired", manifest }));
  assert.equal(action?.reason, "expired_invitation");
  assert.equal(action?.redirectTo, null);
  assert.match(action!.message, /expired/);
});

test("recoverJourney: revoked/exhausted/invalid/already-accepted all resolve to invalid_invitation", () => {
  for (const status of ["revoked", "exhausted", "invalid", "accepted"] as const) {
    const action = recoverJourney(baseInput({ invitationStatus: status }));
    assert.equal(action?.reason, "invalid_invitation", `status ${status} should be invalid_invitation`);
  }
});

test("recoverJourney: a named practice that's unavailable is missing_practice", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "invitation",
    entryPoint: "witness",
    practiceId: "the-promise-to-myself",
  });
  const action = recoverJourney(baseInput({ manifest, practiceAvailable: false }));
  assert.equal(action?.reason, "missing_practice");
  assert.equal(action?.redirectTo, null);
  assert.match(action!.message, /the-promise-to-myself/);
});

test("recoverJourney: a named Watch First that's unavailable degrades to the practice intro", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "invitation",
    entryPoint: "watch-first",
    watchFirstId: "story-1",
    practiceId: "the-promise-to-myself",
  });
  const action = recoverJourney(baseInput({ manifest, watchFirstAvailable: false }));
  assert.equal(action?.reason, "missing_watch_first");
  assert.equal(action?.redirectTo?.href, "/witness/the-promise-to-myself");
});

test("recoverJourney: missing Watch First with no named practice has nowhere honest to redirect", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "invitation",
    entryPoint: "watch-first",
    watchFirstId: "story-1",
  });
  const action = recoverJourney(baseInput({ manifest, watchFirstAvailable: false }));
  assert.equal(action?.reason, "missing_watch_first");
  assert.equal(action?.redirectTo, null);
});

test("recoverJourney: a journey that reached arena is already_completed", () => {
  let manifest = createJourneyManifest({ journeyId: "j1", source: "invitation", entryPoint: "enter" });
  for (const step of [
    "invitation_accepted",
    "practice_intro",
    "practice_runtime",
    "reflection",
    "living_echo",
    "recommendation",
    "arena",
  ] as const) {
    manifest = transition(manifest, step).manifest!;
  }
  const action = recoverJourney(baseInput({ manifest }));
  assert.equal(action?.reason, "already_completed");
  assert.equal(action?.redirectTo?.href, "/journey/today");
});

test("recoverJourney: an in-progress manifest with some history is resumable at its next step", () => {
  let manifest = createJourneyManifest({
    journeyId: "j1",
    source: "invitation",
    entryPoint: "enter",
    invitationId: "tok_1",
    practiceId: "the-promise-to-myself",
  });
  manifest = transition(manifest, "invitation_accepted").manifest!;
  manifest = transition(manifest, "practice_intro").manifest!;
  const action = recoverJourney(baseInput({ manifest }));
  assert.equal(action?.reason, "resumable");
  assert.equal(action?.redirectTo?.href, "/witness/the-promise-to-myself?invitation=tok_1");
});

test("recoverJourney: a fresh manifest with no history yet needs no recovery", () => {
  const manifest = createJourneyManifest({ journeyId: "j1", source: "invitation", entryPoint: "enter" });
  assert.equal(recoverJourney(baseInput({ manifest })), null);
});
