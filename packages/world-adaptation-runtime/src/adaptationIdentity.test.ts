import assert from "node:assert/strict"
import { test } from "node:test"
import { deriveAdaptationEffectId } from "./adaptationIdentity.ts"

test("deriveAdaptationEffectId is deterministic for identical inputs", () => {
  const a = deriveAdaptationEffectId("world-1", "rule-1", "cow-1", 1)
  const b = deriveAdaptationEffectId("world-1", "rule-1", "cow-1", 1)
  assert.equal(a, b)
})

test("deriveAdaptationEffectId changes when the tier changes -- crossing into a new tier is a genuinely new effect", () => {
  const tier1 = deriveAdaptationEffectId("world-1", "rule-1", "cow-1", 1)
  const tier2 = deriveAdaptationEffectId("world-1", "rule-1", "cow-1", 2)
  assert.notEqual(tier1, tier2)
})

test("deriveAdaptationEffectId changes when worldId/ruleId/subjectId changes, holding the rest fixed", () => {
  const base = deriveAdaptationEffectId("world-1", "rule-1", "cow-1", 1)
  assert.notEqual(deriveAdaptationEffectId("world-2", "rule-1", "cow-1", 1), base)
  assert.notEqual(deriveAdaptationEffectId("world-1", "rule-2", "cow-1", 1), base)
  assert.notEqual(deriveAdaptationEffectId("world-1", "rule-1", "cow-2", 1), base)
})
