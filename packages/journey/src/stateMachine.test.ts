import { test } from "node:test";
import assert from "node:assert/strict";
import { canTransition, isTerminalStep, transition, JOURNEY_STEP_ORDER, type JourneyStepId } from "./stateMachine.ts";

interface Fixture {
  nextStep: JourneyStepId;
  completedSteps: JourneyStepId[];
}

function fixture(nextStep: JourneyStepId, completedSteps: JourneyStepId[] = []): Fixture {
  return { nextStep, completedSteps };
}

test("JOURNEY_STEP_ORDER lists all nine steps in mission order", () => {
  assert.deepEqual(JOURNEY_STEP_ORDER, [
    "invitation_received",
    "invitation_accepted",
    "watch_first",
    "practice_intro",
    "practice_runtime",
    "reflection",
    "living_echo",
    "recommendation",
    "arena",
  ]);
});

test("the full linear chain from invitation_received to arena is legal, one edge at a time", () => {
  let manifest = fixture("invitation_received");
  const path: JourneyStepId[] = [
    "invitation_accepted",
    "practice_intro",
    "practice_runtime",
    "reflection",
    "living_echo",
    "recommendation",
    "arena",
  ];
  for (const step of path) {
    const result = transition(manifest, step);
    assert.equal(result.ok, true, `expected transition to "${step}" to succeed`);
    manifest = result.manifest!;
  }
  assert.equal(manifest.nextStep, "arena");
  assert.deepEqual(manifest.completedSteps, [
    "invitation_received",
    "invitation_accepted",
    "practice_intro",
    "practice_runtime",
    "reflection",
    "living_echo",
    "recommendation",
  ]);
});

test("invitation_accepted may branch through watch_first before practice_intro", () => {
  const afterAccept = fixture("invitation_accepted");
  const toWatchFirst = transition(afterAccept, "watch_first");
  assert.equal(toWatchFirst.ok, true);
  const toPracticeIntro = transition(toWatchFirst.manifest!, "practice_intro");
  assert.equal(toPracticeIntro.ok, true);
  assert.deepEqual(toPracticeIntro.manifest!.completedSteps, ["invitation_accepted", "watch_first"]);
});

test("invitation_accepted may also skip watch_first straight to practice_intro", () => {
  const afterAccept = fixture("invitation_accepted");
  const result = transition(afterAccept, "practice_intro");
  assert.equal(result.ok, true);
  assert.deepEqual(result.manifest!.completedSteps, ["invitation_accepted"]);
});

test("an illegal transition is rejected with a reason and leaves the manifest untouched", () => {
  const manifest = fixture("invitation_received");
  const result = transition(manifest, "practice_runtime");
  assert.equal(result.ok, false);
  assert.match(result.reason!, /Cannot transition from "invitation_received" to "practice_runtime"/);
  assert.equal(result.manifest, undefined);
});

test("completing an already-completed step again is idempotent, never duplicated", () => {
  const manifest = fixture("watch_first", ["invitation_received", "invitation_accepted", "watch_first"]);
  const result = transition(manifest, "practice_intro");
  assert.equal(result.ok, true);
  assert.deepEqual(result.manifest!.completedSteps, ["invitation_received", "invitation_accepted", "watch_first"]);
});

test("arena is the one terminal step; every other step has at least one legal outgoing edge", () => {
  assert.equal(isTerminalStep("arena"), true);
  for (const step of JOURNEY_STEP_ORDER.filter((s) => s !== "arena")) {
    assert.equal(isTerminalStep(step), false, `${step} should not be terminal`);
  }
});

test("canTransition is a pure, side-effect-free predicate matching the graph", () => {
  assert.equal(canTransition("watch_first", "practice_intro"), true);
  assert.equal(canTransition("watch_first", "reflection"), false);
  assert.equal(canTransition("arena", "invitation_received"), false);
});
