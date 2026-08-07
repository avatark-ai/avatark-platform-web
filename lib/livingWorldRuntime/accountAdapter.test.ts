import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorldRuntime, InMemoryWorldStateRepository } from "@avatark/living-world-runtime";
import type { WorldDefinition } from "@avatark/living-world-runtime";
import { createLivingWorldsAccountAdapter, getWorldAccountSummary } from "./accountAdapter.ts";

const FOREST: WorldDefinition = {
  id: "living-forest",
  name: "Living Forest",
  entryLocationId: "entry",
  locations: [
    { id: "entry", name: "The Threshold", order: 0 },
    { id: "second", name: "The Grove", order: 1, requiresLocationIds: ["entry"] },
  ],
  activities: [],
};

const STILLNESS: WorldDefinition = {
  id: "living-stillness",
  name: "Living Stillness",
  entryLocationId: "entry",
  locations: [{ id: "entry", name: "Entry", order: 0 }],
  activities: [],
};

function makeRuntime() {
  let ms = 0;
  return createWorldRuntime({
    definitions: [FOREST, STILLNESS],
    repository: new InMemoryWorldStateRepository(),
    now: () => new Date((ms += 1000)).toISOString(),
  });
}

test("a user with no world state at all gets an honest empty summary, not fabricated data", async () => {
  const runtime = makeRuntime();
  const summary = await getWorldAccountSummary(runtime, FOREST, "ghost");

  assert.equal(summary.active, false);
  assert.equal(summary.canContinue, false);
  assert.equal(summary.currentLocationId, null);
  assert.equal(summary.currentLocationName, null);
  assert.equal(summary.lastVisitAt, null);
  assert.equal(summary.recentActivityLabel, null);
  assert.equal(summary.visitedLocationCount, 0);
  assert.equal(summary.totalLocationCount, 2);
});

test("a user who entered gets Active/Current Location/Progress/Last Visit/Recent Activity populated", async () => {
  const runtime = makeRuntime();
  await runtime.enterWorld("u1", "living-forest");

  const summary = await getWorldAccountSummary(runtime, FOREST, "u1");
  assert.equal(summary.active, true);
  assert.equal(summary.canContinue, true);
  assert.equal(summary.currentLocationId, "entry");
  assert.equal(summary.currentLocationName, "The Threshold");
  assert.ok(summary.lastVisitAt);
  assert.equal(summary.recentActivityLabel, "Visited The Threshold");
});

test("leaving a world reports Not Active while still allowing Continue", async () => {
  const runtime = makeRuntime();
  await runtime.enterWorld("u1", "living-forest");
  await runtime.leaveWorld("u1", "living-forest");

  const summary = await getWorldAccountSummary(runtime, FOREST, "u1");
  assert.equal(summary.active, false);
  assert.equal(summary.canContinue, true);
});

test("the account-shaped adapter maps every world into id/name/status/description/progress, and never-entered worlds read 'Ready to Begin' not 'Coming Soon'", async () => {
  const runtime = makeRuntime();
  await runtime.enterWorld("u1", "living-forest");

  const adapter = createLivingWorldsAccountAdapter(runtime, [FOREST, STILLNESS], "u1");
  const result = await adapter.list();

  assert.equal(result.error, undefined);
  assert.equal(result.data?.length, 2);

  const forest = result.data!.find((w) => w.id === "living-forest")!;
  assert.equal(forest.name, "Living Forest");
  assert.equal(forest.status, "Active");
  assert.equal(forest.currentLocation, "The Threshold");
  assert.equal(forest.canContinue, true);
  assert.match(forest.progress, /%/);
  assert.equal(forest.upcomingPracticeCount, 0);
  assert.equal(forest.reflectionCount, 0);

  const stillness = result.data!.find((w) => w.id === "living-stillness")!;
  assert.equal(stillness.status, "Ready to Begin");
  assert.equal(stillness.canContinue, false);
  assert.equal(stillness.currentLocation, null);
});

test("the adapter is user-scoped: two different userIds never see each other's data", async () => {
  const runtime = makeRuntime();
  await runtime.enterWorld("alice", "living-forest");

  const bobAdapter = createLivingWorldsAccountAdapter(runtime, [FOREST], "bob");
  const bobResult = await bobAdapter.list();
  assert.equal(bobResult.data?.[0]?.status, "Ready to Begin");

  const aliceAdapter = createLivingWorldsAccountAdapter(runtime, [FOREST], "alice");
  const aliceResult = await aliceAdapter.list();
  assert.equal(aliceResult.data?.[0]?.status, "Active");
});

test("enter() performs the world entry and returns the updated summary", async () => {
  const runtime = makeRuntime();
  const adapter = createLivingWorldsAccountAdapter(runtime, [FOREST, STILLNESS], "u2");

  const before = await adapter.list();
  assert.equal(before.data!.find((w) => w.id === "living-forest")!.status, "Ready to Begin");

  const entered = await adapter.enter("living-forest");
  assert.equal(entered.error, undefined);
  assert.equal(entered.data?.status, "Active");
  assert.equal(entered.data?.currentLocation, "The Threshold");

  const after = await adapter.list();
  assert.equal(after.data!.find((w) => w.id === "living-forest")!.status, "Active");
});

test("enter() reports an error for an unknown world id instead of throwing", async () => {
  const runtime = makeRuntime();
  const adapter = createLivingWorldsAccountAdapter(runtime, [FOREST], "u3");
  const result = await adapter.enter("no-such-world");
  assert.equal(result.data, undefined);
  assert.match(result.error ?? "", /Unknown Living World/);
});
