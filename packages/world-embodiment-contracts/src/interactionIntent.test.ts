import { test } from "node:test"
import assert from "node:assert/strict"
import { isWellFormedInteractionIntent } from "./interactionIntent.ts"
import type { InteractionIntent } from "./interactionIntent.ts"

test("every intent variant is well-formed when fully populated", () => {
  const intents: InteractionIntent[] = [
    { type: "enter-world", userId: "u1", worldId: "living-vrindavan" },
    { type: "leave-world", userId: "u1", worldId: "living-vrindavan" },
    { type: "visit-location", userId: "u1", worldId: "living-vrindavan", locationId: "yamuna" },
    { type: "begin-reflection", userId: "u1", worldId: "living-vrindavan", locationId: "yamuna", reflectionId: "living-vrindavan#yamuna" },
    { type: "select-encounter", userId: "u1", worldId: "living-vrindavan", locationId: "yamuna", ruleId: "yamuna-flowering-reflection" },
  ]
  for (const intent of intents) assert.equal(isWellFormedInteractionIntent(intent), true, JSON.stringify(intent))
})

test("rejects an unknown intent type", () => {
  assert.equal(isWellFormedInteractionIntent({ type: "teleport-anywhere", userId: "u1", worldId: "w" }), false)
})

test("rejects a visit-location intent missing locationId", () => {
  assert.equal(isWellFormedInteractionIntent({ type: "visit-location", userId: "u1", worldId: "w" }), false)
})

test("rejects a begin-reflection intent missing reflectionId", () => {
  assert.equal(isWellFormedInteractionIntent({ type: "begin-reflection", userId: "u1", worldId: "w", locationId: "yamuna" }), false)
})

test("begin-reflection is well-formed with content omitted (every pre-Sprint-19 caller) and with content present", () => {
  assert.equal(isWellFormedInteractionIntent({ type: "begin-reflection", userId: "u1", worldId: "w", locationId: "yamuna", reflectionId: "r1" }), true)
  assert.equal(isWellFormedInteractionIntent({ type: "begin-reflection", userId: "u1", worldId: "w", locationId: "yamuna", reflectionId: "r1", content: "a private thought" }), true)
})

test("rejects a begin-reflection intent whose content is present but not a string", () => {
  assert.equal(isWellFormedInteractionIntent({ type: "begin-reflection", userId: "u1", worldId: "w", locationId: "yamuna", reflectionId: "r1", content: 42 }), false)
})

test("rejects non-objects and null without throwing", () => {
  assert.equal(isWellFormedInteractionIntent(null), false)
  assert.equal(isWellFormedInteractionIntent("visit-location"), false)
  assert.equal(isWellFormedInteractionIntent(42), false)
})

test("an intent never carries a field that could set world truth directly -- structurally checked", () => {
  const intent: InteractionIntent = { type: "visit-location", userId: "u1", worldId: "living-vrindavan", locationId: "yamuna" }
  const forbidden = ["season", "weather", "hydrology", "ecology", "lifecyclePhase", "encounterAvailability"]
  for (const key of Object.keys(intent)) {
    assert.ok(!forbidden.includes(key), `intent field "${key}" looks like direct world-truth mutation`)
  }
})
