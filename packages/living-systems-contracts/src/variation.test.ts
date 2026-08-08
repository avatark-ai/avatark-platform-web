import { test } from "node:test"
import assert from "node:assert/strict"
import { deriveDeterministicVariation } from "./variation.ts"

const baseInput = { worldId: "living-vrindavan", worldVersion: 1, tick: 5, locationId: "yamuna", seasonId: "vasanta", seed: "test-seed" }

test("the same input always produces the same output -- deterministic, not renderer-side Math.random()", () => {
  const a = deriveDeterministicVariation(baseInput)
  const b = deriveDeterministicVariation({ ...baseInput })
  assert.equal(a, b)
})

test("output is always within [0, 1)", () => {
  for (let tick = 0; tick < 50; tick++) {
    const v = deriveDeterministicVariation({ ...baseInput, tick })
    assert.ok(v >= 0 && v < 1, `expected ${v} in [0,1)`)
  }
})

test("changing tick changes the output -- not a constant function", () => {
  const values = new Set(Array.from({ length: 10 }, (_, tick) => deriveDeterministicVariation({ ...baseInput, tick })))
  assert.ok(values.size > 1, "expected variation across ticks")
})

test("changing any single input dimension changes the output", () => {
  const base = deriveDeterministicVariation(baseInput)
  assert.notEqual(deriveDeterministicVariation({ ...baseInput, worldId: "living-forest" }), base)
  assert.notEqual(deriveDeterministicVariation({ ...baseInput, locationId: "kadamba-grove" }), base)
  assert.notEqual(deriveDeterministicVariation({ ...baseInput, seasonId: "grishma" }), base)
  assert.notEqual(deriveDeterministicVariation({ ...baseInput, seed: "different-seed" }), base)
})

test("replay: recomputing from the same recorded input reproduces the exact same value, proving test replay support", () => {
  const recorded = { input: baseInput, expected: deriveDeterministicVariation(baseInput) }
  assert.equal(deriveDeterministicVariation(recorded.input), recorded.expected)
})
