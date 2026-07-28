import { test } from "node:test";
import assert from "node:assert/strict";
import { createJourneyManifest } from "../journey/manifest.ts";
import { completedBoundaryCrossings } from "./journeyHistory.ts";

test("no completed steps and nextStep at the very start -- no crossings yet", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "invitation",
    entryPoint: "enter",
    invitationId: "tok_1",
    returnTo: "/continue",
    nextStep: "invitation_received",
    completedSteps: [],
  });
  assert.deepEqual(completedBoundaryCrossings(manifest), []);
});

test("a journey that has reached practice_runtime already crossed 2 real boundaries", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "invitation",
    entryPoint: "enter",
    invitationId: "tok_1",
    watchFirstId: "story-1",
    practiceId: "the-promise-to-myself",
    returnTo: "/continue",
    nextStep: "practice_runtime",
    completedSteps: ["invitation_received", "invitation_accepted", "watch_first", "practice_intro"],
  });
  const crossings = completedBoundaryCrossings(manifest);
  assert.deepEqual(
    crossings.map((c) => [c.from, c.to, c.crossing.toProduct]),
    [
      ["invitation_accepted", "watch_first", "StreamK"],
      ["practice_intro", "practice_runtime", "Prometheus"],
    ]
  );
});

test("a same-product journey (invitation_accepted straight to practice_intro) has 0 crossings", () => {
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
  assert.deepEqual(completedBoundaryCrossings(manifest), []);
});

test("each crossing's handoff builds from the manifest's current fields, matching the real contract", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "invitation",
    entryPoint: "enter",
    invitationId: "tok_1",
    watchFirstId: "story-1",
    returnTo: "/continue",
    nextStep: "watch_first",
    completedSteps: ["invitation_received", "invitation_accepted"],
  });
  const [crossing] = completedBoundaryCrossings(manifest);
  const handoff = crossing.crossing.buildHandoff(manifest) as { watchFirstId: string } | null;
  assert.equal(handoff?.watchFirstId, "story-1");
});
