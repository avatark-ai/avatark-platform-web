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

// A three-location branching graph (mirrors Living Vrindavan's own
// entry -> middle -> {branch-a, branch-b} shape, Sprint 5) with one
// reflection-capable activity -- kept separate from FOREST/STILLNESS
// above so their existing reflectionCount: 0 assertions stay accurate.
const GROVE: WorldDefinition = {
  id: "living-grove",
  name: "Living Grove",
  entryLocationId: "entry",
  locations: [
    { id: "entry", name: "Entry", order: 0 },
    { id: "middle", name: "Middle", order: 1, requiresLocationIds: ["entry"] },
    { id: "branch-a", name: "Branch A", order: 2, requiresLocationIds: ["middle"] },
    { id: "branch-b", name: "Branch B", order: 2, requiresLocationIds: ["middle"] },
  ],
  activities: [
    { id: "middle-reflection", locationId: "middle", name: "Reflection", description: "What do you notice here?", reflectionRef: { reflectionId: "living-grove#middle", source: "test-fixture" } },
  ],
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

// Sprint 5 (Living Vrindavan): nextLocations / currentReflectionPrompt --
// generic derivation, tested against GROVE's own branching graph, not
// Vrindavan-specific data.
test("a fresh (never-entered) world has no next locations and no reflection prompt", async () => {
  const runtime = createWorldRuntime({ definitions: [GROVE], repository: new InMemoryWorldStateRepository() });
  const summary = await getWorldAccountSummary(runtime, GROVE, "ghost");
  assert.deepEqual(summary.nextLocations, []);
  assert.equal(summary.currentReflectionPrompt, null);
});

test("nextLocations lists only locations whose requiresLocationIds are fully satisfied, excluding the current location", async () => {
  const runtime = createWorldRuntime({ definitions: [GROVE], repository: new InMemoryWorldStateRepository() });
  await runtime.enterWorld("u4", "living-grove"); // at "entry"

  let summary = await getWorldAccountSummary(runtime, GROVE, "u4");
  assert.deepEqual(summary.nextLocations, [{ id: "middle", name: "Middle" }]);

  await runtime.unlockLocation("u4", "living-grove", "middle");
  await runtime.visitLocation("u4", "living-grove", "middle");
  summary = await getWorldAccountSummary(runtime, GROVE, "u4");
  // Both branches are legal next moves from "middle" -- neither is
  // hardcoded, both come from requiresLocationIds: ["middle"].
  assert.deepEqual(
    new Set(summary.nextLocations.map((l) => l.id)),
    new Set(["branch-a", "branch-b"]),
  );
});

test("currentReflectionPrompt surfaces the authored activity description only at a location that carries a reflectionRef", async () => {
  const runtime = createWorldRuntime({ definitions: [GROVE], repository: new InMemoryWorldStateRepository() });
  await runtime.enterWorld("u5", "living-grove");

  let summary = await getWorldAccountSummary(runtime, GROVE, "u5");
  assert.equal(summary.currentReflectionPrompt, null, "no reflection activity at entry");

  await runtime.unlockLocation("u5", "living-grove", "middle");
  await runtime.visitLocation("u5", "living-grove", "middle");
  summary = await getWorldAccountSummary(runtime, GROVE, "u5");
  assert.equal(summary.currentReflectionPrompt, "What do you notice here?");
});

test("the account-shaped adapter exposes currentLocationId, nextLocations, and currentReflectionPrompt", async () => {
  const runtime = createWorldRuntime({ definitions: [GROVE], repository: new InMemoryWorldStateRepository() });
  await runtime.enterWorld("u6", "living-grove");
  await runtime.unlockLocation("u6", "living-grove", "middle");
  await runtime.visitLocation("u6", "living-grove", "middle");

  const adapter = createLivingWorldsAccountAdapter(runtime, [GROVE], "u6");
  const result = await adapter.list();
  const grove = result.data!.find((w) => w.id === "living-grove")!;

  assert.equal(grove.currentLocationId, "middle");
  assert.equal(grove.currentReflectionPrompt, "What do you notice here?");
  assert.deepEqual(new Set(grove.nextLocations.map((l) => l.id)), new Set(["branch-a", "branch-b"]));
});

test("currentLocationExperience is honestly null for a world with no authored Experience Description (Sprint 6)", async () => {
  const runtime = createWorldRuntime({ definitions: [GROVE], repository: new InMemoryWorldStateRepository() });
  await runtime.enterWorld("u7", "living-grove");

  const summary = await getWorldAccountSummary(runtime, GROVE, "u7");
  assert.equal(summary.currentLocationExperience, null, "living-grove is a test fixture, never gets a fabricated experience description");
});

test("currentLocationExperience is null when a world has no current location at all, even one with a real Experience Description", async () => {
  const { LIVING_VRINDAVAN_DEFINITION } = await import("./vrindavanDefinition.ts");
  const runtime = createWorldRuntime({ definitions: [LIVING_VRINDAVAN_DEFINITION], repository: new InMemoryWorldStateRepository() });

  const summary = await getWorldAccountSummary(runtime, LIVING_VRINDAVAN_DEFINITION, "ghost");
  assert.equal(summary.currentLocationExperience, null);
});

test("currentLocationExperience surfaces the real, distinct Sprint 6 Experience Description at Living Vrindavan's entry and after navigating to Yamuna", async () => {
  const { LIVING_VRINDAVAN_DEFINITION } = await import("./vrindavanDefinition.ts");
  const runtime = createWorldRuntime({ definitions: [LIVING_VRINDAVAN_DEFINITION], repository: new InMemoryWorldStateRepository() });
  await runtime.enterWorld("u8", "living-vrindavan");

  let summary = await getWorldAccountSummary(runtime, LIVING_VRINDAVAN_DEFINITION, "u8");
  assert.equal(summary.currentLocationExperience?.id, "vrindavan-entry");
  assert.equal(summary.currentLocationExperience?.atmosphere.quality, "arrival");

  await runtime.unlockLocation("u8", "living-vrindavan", "yamuna");
  await runtime.visitLocation("u8", "living-vrindavan", "yamuna");
  summary = await getWorldAccountSummary(runtime, LIVING_VRINDAVAN_DEFINITION, "u8");
  assert.equal(summary.currentLocationExperience?.id, "yamuna");
  assert.equal(summary.currentLocationExperience?.atmosphere.quality, "contemplative");
  assert.equal(summary.currentLocationExperience?.interaction.reflectionAvailable, true);
});
