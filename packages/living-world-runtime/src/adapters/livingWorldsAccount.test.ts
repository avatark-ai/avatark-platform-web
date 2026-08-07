import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorldRuntime } from "../runtime.ts";
import { InMemoryWorldStateRepository } from "../repository.ts";
import { createLivingWorldsAccountAdapter, getWorldAccountSummary } from "./livingWorldsAccount.ts";
import type { WorldDefinition } from "../types.ts";

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

test("the account-shaped adapter maps every world into id/name/status/description/progress strings", async () => {
  const runtime = makeRuntime();
  await runtime.enterWorld("u1", "living-forest");

  const adapter = createLivingWorldsAccountAdapter(runtime, [FOREST, STILLNESS], "u1");
  const result = await adapter.list();

  assert.equal(result.error, undefined);
  assert.equal(result.data?.length, 2);

  const forest = result.data!.find((w) => w.id === "living-forest")!;
  assert.equal(forest.name, "Living Forest");
  assert.equal(forest.status, "Active");
  assert.match(forest.description, /Current location: The Threshold/);
  assert.match(forest.progress, /%/);

  const stillness = result.data!.find((w) => w.id === "living-stillness")!;
  assert.equal(stillness.status, "Not Active");
  assert.match(stillness.description, /Not yet started/);
});

test("the adapter is user-scoped: two different userIds never see each other's data", async () => {
  const runtime = makeRuntime();
  await runtime.enterWorld("alice", "living-forest");

  const bobAdapter = createLivingWorldsAccountAdapter(runtime, [FOREST], "bob");
  const bobResult = await bobAdapter.list();
  assert.equal(bobResult.data?.[0]?.status, "Not Active");

  const aliceAdapter = createLivingWorldsAccountAdapter(runtime, [FOREST], "alice");
  const aliceResult = await aliceAdapter.list();
  assert.equal(aliceResult.data?.[0]?.status, "Active");
});
