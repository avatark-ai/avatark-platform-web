import { test } from "node:test";
import assert from "node:assert/strict";
import { ContextRuntime, InMemoryContextRepository } from "@avatark/context-runtime";
import { ExperienceRegistry, InMemoryExperienceEventRepository } from "@avatark/experience-registry";
import { createWorldRuntime, InMemoryWorldStateRepository } from "@avatark/living-world-runtime";
import { LIVING_VRINDAVAN_DEFINITION } from "./vrindavanDefinition.ts";
import { getWorldAccountSummary } from "./accountAdapter.ts";
import { enterLivingWorld, leaveLivingWorld, visitLivingWorldLocation, recordLivingWorldReflection, type RuntimeKernel } from "../runtimeKernel/orchestrator.ts";

// Reference end-to-end lifecycle for the REAL Living Vrindavan definition
// (Sprint 5), through the Host's own orchestration functions -- the same
// path app/api/account/living-worlds/route.ts uses, minus the Next.js/
// Supabase plumbing. Mirrors lib/runtimeKernel/e2eKernelFlow.test.ts's
// role for the generic Runtime Kernel, but proves this specific,
// Approved-Canon-derived world end to end: enter -> navigate -> reflect
// -> leave -> resume, plus user isolation.

const PRODUCT_ID = "avatark";

function makeKernel(): RuntimeKernel {
  return {
    context: new ContextRuntime(new InMemoryContextRepository()),
    livingWorld: createWorldRuntime({ definitions: [LIVING_VRINDAVAN_DEFINITION], repository: new InMemoryWorldStateRepository() }),
    registry: new ExperienceRegistry(new InMemoryExperienceEventRepository()),
  };
}

test("Living Vrindavan: fresh user reads Ready to Begin, Progress: Not Started -- never fabricated", async () => {
  const kernel = makeKernel();
  const summary = await getWorldAccountSummary(kernel.livingWorld!, LIVING_VRINDAVAN_DEFINITION, "fresh-user");
  assert.equal(summary.canContinue, false);
  assert.equal(summary.currentLocationId, null);
  assert.equal(summary.percentComplete, 0);
});

test("Living Vrindavan: full lifecycle -- enter, navigate the authored graph, reflect, leave, return and resume exactly", async () => {
  const kernel = makeKernel();
  const userId = "alice";

  // Enter -> Vrindavan Entry.
  const entered = await enterLivingWorld(kernel, { userId, productId: PRODUCT_ID, worldId: "living-vrindavan" });
  assert.equal(entered.worldState?.currentLocationId, "vrindavan-entry");
  assert.equal(entered.contextApplied, true);
  assert.equal(entered.eventRecorded, true);
  assert.equal((await kernel.context!.getContext(userId)).fields.currentLocationId.value, "vrindavan-entry");

  // Navigate: Vrindavan Entry -> Yamuna.
  const atYamuna = await visitLivingWorldLocation(kernel, { userId, productId: PRODUCT_ID, worldId: "living-vrindavan", locationId: "yamuna" });
  assert.equal(atYamuna.worldState?.currentLocationId, "yamuna");
  assert.equal((await kernel.context!.getContext(userId)).fields.currentLocationId.value, "yamuna");

  // Reflect at Yamuna, without persisting any composed content.
  const summaryAtYamuna = await getWorldAccountSummary(kernel.livingWorld!, LIVING_VRINDAVAN_DEFINITION, userId);
  assert.equal(summaryAtYamuna.currentReflectionPrompt, "What becomes visible when you stop trying to control the current?");
  const reflected = await recordLivingWorldReflection(kernel, { userId, productId: PRODUCT_ID, locationId: "yamuna", reflectionId: "living-vrindavan#yamuna" });
  assert.equal(reflected.eventRecorded, true);

  // Navigate: Yamuna -> Kadamba Grove.
  const atKadamba = await visitLivingWorldLocation(kernel, { userId, productId: PRODUCT_ID, worldId: "living-vrindavan", locationId: "kadamba-grove" });
  assert.equal(atKadamba.worldState?.currentLocationId, "kadamba-grove");
  assert.equal(atKadamba.worldState?.visitedLocationIds.length, 3);

  // Leave: state must be preserved, not reset.
  const left = await leaveLivingWorld(kernel, { userId, productId: PRODUCT_ID, worldId: "living-vrindavan" });
  assert.equal(left.worldState?.active, false);
  assert.equal(left.worldState?.currentLocationId, "kadamba-grove");

  // Return: must resume at Kadamba Grove, not reset to the entry location.
  const returned = await enterLivingWorld(kernel, { userId, productId: PRODUCT_ID, worldId: "living-vrindavan" });
  assert.equal(returned.worldState?.active, true);
  assert.equal(returned.worldState?.currentLocationId, "kadamba-grove", "must resume where the user left off, never reset");

  // Timeline must be coherent: every real event, newest first.
  const events = await kernel.registry!.listRecentEvents(userId);
  assert.deepEqual(
    events.map((e) => e.type),
    ["world.entered", "world.left", "world.location_visited", "reflection.created", "world.location_visited", "world.entered"],
  );
});

test("Living Vrindavan: an illegal transition is rejected -- Kadamba Grove is not reachable before Yamuna", async () => {
  const kernel = makeKernel();
  await enterLivingWorld(kernel, { userId: "bob", productId: PRODUCT_ID, worldId: "living-vrindavan" });

  await assert.rejects(() =>
    visitLivingWorldLocation(kernel, { userId: "bob", productId: PRODUCT_ID, worldId: "living-vrindavan", locationId: "kadamba-grove" }),
  );

  const summary = await getWorldAccountSummary(kernel.livingWorld!, LIVING_VRINDAVAN_DEFINITION, "bob");
  assert.equal(summary.currentLocationId, "vrindavan-entry", "a rejected transition must not move the user");
});

test("Living Vrindavan: two users on the same kernel are fully isolated", async () => {
  const kernel = makeKernel();
  await enterLivingWorld(kernel, { userId: "carol", productId: PRODUCT_ID, worldId: "living-vrindavan" });
  await visitLivingWorldLocation(kernel, { userId: "carol", productId: PRODUCT_ID, worldId: "living-vrindavan", locationId: "yamuna" });

  // Dave has done nothing -- must read completely fresh, no bleed from Carol.
  const dave = await getWorldAccountSummary(kernel.livingWorld!, LIVING_VRINDAVAN_DEFINITION, "dave");
  assert.equal(dave.canContinue, false);
  assert.equal(dave.currentLocationId, null);
  assert.deepEqual(dave.nextLocations, []);
  assert.equal((await kernel.context!.getContext("dave")).fields.currentLocationId.value, null);
  assert.deepEqual(await kernel.registry!.listRecentEvents("dave"), []);

  // Carol's own state is untouched by Dave's (no-op) reads.
  const carol = await getWorldAccountSummary(kernel.livingWorld!, LIVING_VRINDAVAN_DEFINITION, "carol");
  assert.equal(carol.currentLocationId, "yamuna");
});
