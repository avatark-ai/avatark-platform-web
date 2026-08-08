import { test } from "node:test"
import assert from "node:assert/strict"
import { emptyVisitorWorldMemory } from "./visitorMemory.ts"

test("emptyVisitorWorldMemory starts with no location, no encounters, no reflections -- never fabricated", () => {
  const memory = emptyVisitorWorldMemory("u1", "living-vrindavan")
  assert.equal(memory.lastLocationId, null)
  assert.deepEqual(memory.meaningfulEncounters, [])
  assert.deepEqual(memory.reflectionRefs, [])
  assert.deepEqual(memory.milestoneRefs, [])
  assert.equal(memory.updatedAtTick, 0)
})

test("VisitorWorldMemory carries no score, engagement metric, or inferred psychological field -- checked structurally", () => {
  const memory = emptyVisitorWorldMemory("u1", "living-vrindavan")
  const keys = Object.keys(memory)
  const forbidden = ["score", "engagement", "emotion", "sentiment", "profile", "belief", "psychological"]
  for (const key of keys) {
    for (const bad of forbidden) {
      assert.ok(!key.toLowerCase().includes(bad), `field "${key}" looks like behavioral scoring, forbidden by STK-CAN-004`)
    }
  }
})
