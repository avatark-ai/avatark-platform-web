import { test } from "node:test";
import assert from "node:assert/strict";
import { simulateJourney } from "./simulate.ts";

const COMPLETED_AT = "2026-07-28T00:00:00.000Z";

function stageByProduct(stages: ReturnType<typeof simulateJourney>, product: string) {
  return stages.find((s) => s.product === product)!;
}

test("simulateJourney always returns the 5 stages in mission order", () => {
  const stages = simulateJourney("invitation", "guest", "j1", COMPLETED_AT);
  assert.deepEqual(
    stages.map((s) => s.product),
    ["AvatarK", "StreamK", "Prometheus", "Living Echo", "Arena"]
  );
});

test('"invitation" scenario visits all 5 stages, starting at the origin', () => {
  const stages = simulateJourney("invitation", "guest", "j1", COMPLETED_AT);
  assert.ok(stages.every((s) => s.visited));
  assert.equal(stageByProduct(stages, "AvatarK").incomingHandoffNote, "n/a -- origin of this scenario");
});

test('"practice" scenario skips StreamK entirely', () => {
  const stages = simulateJourney("practice", "guest", "j1", COMPLETED_AT);
  const streamk = stageByProduct(stages, "StreamK");
  assert.equal(streamk.visited, false);
  assert.equal(streamk.incomingHandoff, null);
  assert.equal(streamk.incomingHandoffNote, "n/a -- skipped in this scenario");
  // AvatarK is still visited (practice_intro), as the scenario's origin.
  assert.equal(stageByProduct(stages, "AvatarK").visited, true);
});

test('"watch_first" scenario starts at StreamK, still reaches AvatarK\'s practice_intro afterward', () => {
  const stages = simulateJourney("watch_first", "guest", "j1", COMPLETED_AT);
  assert.equal(stageByProduct(stages, "StreamK").incomingHandoffNote, "n/a -- origin of this scenario");
  assert.equal(stageByProduct(stages, "AvatarK").visited, true);
});

test('"journey" (resume) scenario skips AvatarK, StreamK, and practice_runtime, starting at reflection', () => {
  const stages = simulateJourney("journey", "guest", "j1", COMPLETED_AT);
  assert.equal(stageByProduct(stages, "AvatarK").visited, false);
  assert.equal(stageByProduct(stages, "StreamK").visited, false);
  assert.equal(stageByProduct(stages, "Prometheus").visited, true);
  assert.deepEqual(stageByProduct(stages, "Prometheus").steps, ["reflection"]);
});

test("the real crossing into Prometheus carries the exact StreamKToPrometheusHandoff shape", () => {
  const stages = simulateJourney("practice", "guest", "j1", COMPLETED_AT);
  const prometheus = stageByProduct(stages, "Prometheus");
  const handoff = prometheus.incomingHandoff as { practiceId: string; returnTo: string };
  assert.equal(handoff.practiceId, "the-promise-to-myself");
  assert.equal(handoff.returnTo, "/continue");
});

test("the real crossing into Living Echo carries the supplied completedAt", () => {
  const stages = simulateJourney("invitation", "signed_in", "j1", COMPLETED_AT);
  const livingEcho = stageByProduct(stages, "Living Echo");
  const handoff = livingEcho.incomingHandoff as { completedAt: string };
  assert.equal(handoff.completedAt, COMPLETED_AT);
});

test("guest vs signed_in changes only the manifest's authState metadata, not the path taken", () => {
  const guestStages = simulateJourney("invitation", "guest", "j1", COMPLETED_AT);
  const signedInStages = simulateJourney("invitation", "signed_in", "j1", COMPLETED_AT);
  assert.equal(stageByProduct(guestStages, "AvatarK").manifestAtEntry?.metadata.authState, "guest");
  assert.equal(stageByProduct(signedInStages, "AvatarK").manifestAtEntry?.metadata.authState, "signed_in");
  assert.deepEqual(
    guestStages.map((s) => s.steps),
    signedInStages.map((s) => s.steps)
  );
});
