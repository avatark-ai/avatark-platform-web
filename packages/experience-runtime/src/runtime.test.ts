import { test } from "node:test";
import assert from "node:assert/strict";
import type { JourneyAdapter, JourneyTransitionEvent } from "./adapter.ts";
import { FIXTURE_DEFINITION } from "./journeyFixtures.ts";
import { InMemoryJourneyRepository } from "./repository.ts";
import { JourneyRuntime } from "./runtime.ts";
import { JourneyError } from "./types.ts";

function makeRuntime() {
  const events: JourneyTransitionEvent[] = [];
  const adapter: JourneyAdapter = {
    onTransition: (event) => {
      events.push(event);
    },
  };
  const repository = new InMemoryJourneyRepository();
  const runtime = new JourneyRuntime(FIXTURE_DEFINITION, repository, adapter);
  return { runtime, repository, events };
}

test("start() initializes state at the first episode and notifies the adapter", async () => {
  const { runtime, events } = makeRuntime();
  const state = await runtime.start("subject-1");
  assert.equal(state.status, "active");
  assert.equal(state.currentEpisodeId, "ep1");
  assert.equal(events.length, 1);
  assert.equal(events[0].transition.type, "started");
});

test("start() twice for the same subject throws", async () => {
  const { runtime } = makeRuntime();
  await runtime.start("subject-1");
  await assert.rejects(() => runtime.start("subject-1"), JourneyError);
});

test("completeEpisode advances currentEpisodeId, resolves its reflection, and awards a milestone", async () => {
  const { runtime, events } = makeRuntime();
  await runtime.start("subject-1");
  const state = await runtime.completeEpisode("subject-1", "ep1");

  assert.deepEqual(state.completedEpisodeIds, ["ep1"]);
  assert.deepEqual(state.completedReflectionIds, ["ref1"]);
  assert.equal(state.currentEpisodeId, "ep2");
  assert.deepEqual(state.completedMilestoneIds, ["milestone1"]);

  const types = events.map((e) => e.transition.type);
  assert.deepEqual(types, ["started", "episode_completed", "milestone_reached"]);
});

test("completeEpisode rejects a locked episode and a repeat completion", async () => {
  const { runtime } = makeRuntime();
  await runtime.start("subject-1");
  await assert.rejects(() => runtime.completeEpisode("subject-1", "ep2"), JourneyError);
  await runtime.completeEpisode("subject-1", "ep1");
  await assert.rejects(() => runtime.completeEpisode("subject-1", "ep1"), JourneyError);
});

test("enterWorld is locked until its prerequisite episode is complete", async () => {
  const { runtime } = makeRuntime();
  await runtime.start("subject-1");
  await assert.rejects(() => runtime.enterWorld("subject-1", "world1"), JourneyError);
  await runtime.completeEpisode("subject-1", "ep1");
  const state = await runtime.enterWorld("subject-1", "world1");
  assert.equal(state.currentWorldId, "world1");
  assert.deepEqual(state.visitedWorldIds, ["world1"]);
});

test("beginPractice/finishPractice track a single active practice at a time", async () => {
  const { runtime } = makeRuntime();
  await runtime.start("subject-1");
  await runtime.beginPractice("subject-1", "practice1");
  await assert.rejects(() => runtime.beginPractice("subject-1", "practice1"), JourneyError);
  const finished = await runtime.finishPractice("subject-1", "practice1");
  assert.equal(finished.activePracticeId, null);
  assert.deepEqual(finished.completedPracticeIds, ["practice1"]);
});

test("a challenge shares the practice methods but requires its own prerequisites", async () => {
  const { runtime } = makeRuntime();
  await runtime.start("subject-1");
  await assert.rejects(() => runtime.beginPractice("subject-1", "challenge1"), JourneyError);
  await runtime.completeEpisode("subject-1", "ep1");
  await runtime.enterWorld("subject-1", "world1");
  await runtime.beginPractice("subject-1", "challenge1");
  const state = await runtime.finishPractice("subject-1", "challenge1");
  assert.ok(state.completedPracticeIds.includes("challenge1"));
});

test("advance() is a no-op when nothing new is eligible, and opens the next living world once unlocked", async () => {
  const { runtime, events } = makeRuntime();
  await runtime.start("subject-1");

  const noop = await runtime.advance("subject-1");
  assert.equal(noop.currentWorldId, null);
  assert.equal(events.at(-1)?.transition.detail, "no eligible next step");

  await runtime.completeEpisode("subject-1", "ep1");
  const advanced = await runtime.advance("subject-1");
  assert.equal(advanced.currentWorldId, "world1");
  assert.equal(events.at(-1)?.transition.type, "advanced");
  assert.equal(events.at(-1)?.transition.detail, "livingWorld");
});

test("completing every completion-criteria node transitions the journey to completed", async () => {
  const { runtime } = makeRuntime();
  await runtime.start("subject-1");
  await runtime.completeEpisode("subject-1", "ep1");
  await runtime.enterWorld("subject-1", "world1");
  const state = await runtime.completeEpisode("subject-1", "ep2");

  assert.equal(state.status, "completed");
  await assert.rejects(() => runtime.completeEpisode("subject-1", "ep2"), JourneyError);
});

test("pause/resume/abandon enforce valid status transitions", async () => {
  const { runtime } = makeRuntime();
  await runtime.start("subject-1");

  const paused = await runtime.pause("subject-1");
  assert.equal(paused.status, "paused");
  await assert.rejects(() => runtime.pause("subject-1"), JourneyError);

  const resumed = await runtime.resume("subject-1");
  assert.equal(resumed.status, "active");

  await runtime.pause("subject-1");
  const abandoned = await runtime.abandon("subject-1");
  assert.equal(abandoned.status, "abandoned");
  await assert.rejects(() => runtime.resume("subject-1"), JourneyError);
  await assert.rejects(() => runtime.abandon("subject-1"), JourneyError);
});

test("history() returns transitions in order and getProgress() reflects current state", async () => {
  const { runtime } = makeRuntime();
  await runtime.start("subject-1");
  await runtime.completeEpisode("subject-1", "ep1");

  const history = await runtime.history("subject-1");
  assert.deepEqual(
    history.transitions.map((t) => t.type),
    ["started", "episode_completed", "milestone_reached"],
  );

  const progress = await runtime.getProgress("subject-1");
  assert.equal(progress?.nextEpisode?.id, "ep2");
  assert.equal(progress?.nextLivingWorld?.id, "world1");
  assert.deepEqual(progress?.completedMilestoneIds, ["milestone1"]);
});

test("getProgress() returns null when the subject never started the journey", async () => {
  const { runtime } = makeRuntime();
  assert.equal(await runtime.getProgress("nobody"), null);
});

test("every mutating method requires start() first", async () => {
  const { runtime } = makeRuntime();
  await assert.rejects(() => runtime.resume("subject-1"), JourneyError);
  await assert.rejects(() => runtime.completeEpisode("subject-1", "ep1"), JourneyError);
  await assert.rejects(() => runtime.enterWorld("subject-1", "world1"), JourneyError);
  await assert.rejects(() => runtime.beginPractice("subject-1", "practice1"), JourneyError);
  await assert.rejects(() => runtime.advance("subject-1"), JourneyError);
  await assert.rejects(() => runtime.pause("subject-1"), JourneyError);
  await assert.rejects(() => runtime.abandon("subject-1"), JourneyError);
});
