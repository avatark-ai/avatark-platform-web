import { test } from "node:test"
import assert from "node:assert/strict"
import { createWorldRuntime, InMemoryWorldStateRepository } from "@avatark/living-world-runtime"
import { LIVING_VRINDAVAN_DEFINITION } from "../livingWorldRuntime/vrindavanDefinition.ts"
import { dispatchInteractionIntent } from "./intentDispatcher.ts"
import { resetLivingSystemsSingletonForTests } from "../livingSystems/singleton.ts"
import type { RuntimeKernel } from "../runtimeKernel/orchestrator.ts"

function freshKernel(): RuntimeKernel {
  return { livingWorld: createWorldRuntime({ definitions: [LIVING_VRINDAVAN_DEFINITION], repository: new InMemoryWorldStateRepository() }) }
}

test("a malformed intent is rejected before touching any runtime", async () => {
  const result = await dispatchInteractionIntent({ type: "teleport-anywhere" }, freshKernel())
  assert.equal(result.ok, false)
})

test("enter-world dispatches through the existing Sprint 5 orchestrator and succeeds", async () => {
  const kernel = freshKernel()
  const result = await dispatchInteractionIntent({ type: "enter-world", userId: "u1", worldId: "living-vrindavan" }, kernel)
  assert.equal(result.ok, true)
  const state = await kernel.livingWorld!.getState("u1", "living-vrindavan")
  assert.equal(state?.currentLocationId, "vrindavan-entry")
})

test("visit-location to an illegal (not-yet-unlocked) location is rejected through the SAME authoritative runtime rule, not a competing one", async () => {
  const kernel = freshKernel()
  await dispatchInteractionIntent({ type: "enter-world", userId: "u2", worldId: "living-vrindavan" }, kernel)
  // kadamba-grove requires yamuna, which u2 has never visited -- illegal.
  const result = await dispatchInteractionIntent({ type: "visit-location", userId: "u2", worldId: "living-vrindavan", locationId: "kadamba-grove" }, kernel)
  assert.equal(result.ok, false)
  assert.ok(result.error && result.error.length > 0)
})

test("visit-location to a legal next location succeeds and actually changes runtime state", async () => {
  const kernel = freshKernel()
  await dispatchInteractionIntent({ type: "enter-world", userId: "u3", worldId: "living-vrindavan" }, kernel)
  const result = await dispatchInteractionIntent({ type: "visit-location", userId: "u3", worldId: "living-vrindavan", locationId: "yamuna" }, kernel)
  assert.equal(result.ok, true)
  const state = await kernel.livingWorld!.getState("u3", "living-vrindavan")
  assert.equal(state?.currentLocationId, "yamuna")
})

test("begin-reflection dispatches through the existing reflection operation", async () => {
  const kernel = freshKernel()
  await dispatchInteractionIntent({ type: "enter-world", userId: "u4", worldId: "living-vrindavan" }, kernel)
  await dispatchInteractionIntent({ type: "visit-location", userId: "u4", worldId: "living-vrindavan", locationId: "yamuna" }, kernel)
  const result = await dispatchInteractionIntent({ type: "begin-reflection", userId: "u4", worldId: "living-vrindavan", locationId: "yamuna", reflectionId: "living-vrindavan#yamuna" }, kernel)
  assert.equal(result.ok, true)
})

test("select-encounter acknowledges without mutating state when the encounter is currently available", async () => {
  await resetLivingSystemsSingletonForTests()
  const kernel = freshKernel()
  await dispatchInteractionIntent({ type: "enter-world", userId: "u5", worldId: "living-vrindavan" }, kernel)
  await dispatchInteractionIntent({ type: "visit-location", userId: "u5", worldId: "living-vrindavan", locationId: "yamuna" }, kernel)

  const result = await dispatchInteractionIntent({ type: "select-encounter", userId: "u5", worldId: "living-vrindavan", locationId: "yamuna", ruleId: "yamuna-flowering-reflection" }, kernel)
  assert.equal(result.ok, true)

  const stateAfter = await kernel.livingWorld!.getState("u5", "living-vrindavan")
  assert.equal(stateAfter?.currentLocationId, "yamuna", "select-encounter caused no navigation or state change")
})

test("select-encounter reports unavailable for a rule that doesn't apply at this location", async () => {
  await resetLivingSystemsSingletonForTests()
  const kernel = freshKernel()
  await dispatchInteractionIntent({ type: "enter-world", userId: "u6", worldId: "living-vrindavan" }, kernel)

  const result = await dispatchInteractionIntent({ type: "select-encounter", userId: "u6", worldId: "living-vrindavan", locationId: "vrindavan-entry", ruleId: "yamuna-flowering-reflection" }, kernel)
  assert.equal(result.ok, false)
})

test("leave-world dispatches through the existing operation", async () => {
  const kernel = freshKernel()
  await dispatchInteractionIntent({ type: "enter-world", userId: "u7", worldId: "living-vrindavan" }, kernel)
  const result = await dispatchInteractionIntent({ type: "leave-world", userId: "u7", worldId: "living-vrindavan" }, kernel)
  assert.equal(result.ok, true)
})
