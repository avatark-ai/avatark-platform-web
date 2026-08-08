import { test } from "node:test"
import assert from "node:assert/strict"
import { validateInteractionIntent } from "./interactionIntentValidation.ts"
import type { WorldDefinition } from "@avatark/living-world-runtime"

const DEFINITION: WorldDefinition = {
  id: "living-vrindavan",
  name: "Living Vrindavan",
  entryLocationId: "vrindavan-entry",
  locations: [
    { id: "vrindavan-entry", name: "Vrindavan Entry", order: 0 },
    { id: "yamuna", name: "Yamuna", order: 1, requiresLocationIds: ["vrindavan-entry"] },
  ],
  activities: [],
}

test("a well-formed, in-world intent validates clean", () => {
  const result = validateInteractionIntent({ type: "visit-location", userId: "u1", worldId: "living-vrindavan", locationId: "yamuna" }, DEFINITION)
  assert.equal(result.valid, true)
  assert.deepEqual(result.errors, [])
})

test("a structurally malformed intent is rejected without inspecting world state", () => {
  const result = validateInteractionIntent({ type: "teleport", userId: "u1" }, DEFINITION)
  assert.equal(result.valid, false)
})

test("an intent for a different world is rejected", () => {
  const result = validateInteractionIntent({ type: "visit-location", userId: "u1", worldId: "living-forest", locationId: "yamuna" }, DEFINITION)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes("worldId")))
})

test("an intent targeting a location that doesn't exist in this world is rejected -- structural existence check, not full transition legality", () => {
  const result = validateInteractionIntent({ type: "visit-location", userId: "u1", worldId: "living-vrindavan", locationId: "nonexistent-location" }, DEFINITION)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes("locationId")))
})

test("enter-world/leave-world intents (no locationId) validate without requiring one", () => {
  assert.equal(validateInteractionIntent({ type: "enter-world", userId: "u1", worldId: "living-vrindavan" }, DEFINITION).valid, true)
  assert.equal(validateInteractionIntent({ type: "leave-world", userId: "u1", worldId: "living-vrindavan" }, DEFINITION).valid, true)
})

test("never throws on garbage input", () => {
  assert.doesNotThrow(() => validateInteractionIntent(null, DEFINITION))
  assert.doesNotThrow(() => validateInteractionIntent(42, DEFINITION))
  assert.doesNotThrow(() => validateInteractionIntent("visit-location", DEFINITION))
})
