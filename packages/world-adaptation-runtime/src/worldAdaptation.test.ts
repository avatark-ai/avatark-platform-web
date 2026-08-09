import assert from "node:assert/strict"
import { test } from "node:test"
import type { AdaptationRule } from "@avatark/world-adaptation-contracts"
import { accumulateAdaptationPressure } from "./adaptationPressure.ts"
import { evaluateAdaptationRule } from "./adaptationDecision.ts"
import { deriveAdaptationEffect } from "./adaptationEffectDerivation.ts"
import { runWorldAdaptation } from "./worldAdaptation.ts"

test("accumulateAdaptationPressure with no prior pressure starts at exactly the new signal weight", () => {
  const pressure = accumulateAdaptationPressure({ worldId: "w1", domain: "ENTITY", subjectId: "cow-1", kind: "ENCOUNTER_INVOLVEMENT", existing: null, signalWeightSum: 1, decayPerTick: 0.1, tick: 10 })
  assert.deepEqual(pressure, { worldId: "w1", domain: "ENTITY", subjectId: "cow-1", kind: "ENCOUNTER_INVOLVEMENT", value: 1, lastUpdatedTick: 10 })
})

test("accumulateAdaptationPressure decays linearly by decayPerTick * elapsedTicks before adding new signal weight", () => {
  const existing = { worldId: "w1", domain: "ENTITY" as const, subjectId: "cow-1", kind: "ENCOUNTER_INVOLVEMENT" as const, value: 10, lastUpdatedTick: 0 }
  const pressure = accumulateAdaptationPressure({ worldId: "w1", domain: "ENTITY", subjectId: "cow-1", kind: "ENCOUNTER_INVOLVEMENT", existing, signalWeightSum: 0, decayPerTick: 1, tick: 5 })
  assert.equal(pressure.value, 5)
})

test("accumulateAdaptationPressure decay never goes negative -- floors at zero before adding new signal weight", () => {
  const existing = { worldId: "w1", domain: "ENTITY" as const, subjectId: "cow-1", kind: "ENCOUNTER_INVOLVEMENT" as const, value: 2, lastUpdatedTick: 0 }
  const pressure = accumulateAdaptationPressure({ worldId: "w1", domain: "ENTITY", subjectId: "cow-1", kind: "ENCOUNTER_INVOLVEMENT", existing, signalWeightSum: 0, decayPerTick: 1, tick: 100 })
  assert.equal(pressure.value, 0)
})

test("evaluateAdaptationRule derives an integer tier from pressure/threshold and triggers only once tier > 0", () => {
  const rule: AdaptationRule = { id: "r1", domain: "ENTITY", signalKind: "ENCOUNTER_INVOLVEMENT", threshold: 3, decayPerTick: 0, reversible: true, effect: { domain: "ENTITY", kind: "RESOURCE_PREFERENCE_BIAS", magnitude: 1 }, description: "test" }
  const below = evaluateAdaptationRule(rule, { worldId: "w1", domain: "ENTITY", subjectId: "cow-1", kind: "ENCOUNTER_INVOLVEMENT", value: 2, lastUpdatedTick: 10 })
  assert.equal(below.triggered, false)
  assert.equal(below.tier, 0)

  const at = evaluateAdaptationRule(rule, { worldId: "w1", domain: "ENTITY", subjectId: "cow-1", kind: "ENCOUNTER_INVOLVEMENT", value: 3, lastUpdatedTick: 10 })
  assert.equal(at.triggered, true)
  assert.equal(at.tier, 1)

  const double = evaluateAdaptationRule(rule, { worldId: "w1", domain: "ENTITY", subjectId: "cow-1", kind: "ENCOUNTER_INVOLVEMENT", value: 7, lastUpdatedTick: 10 })
  assert.equal(double.tier, 2)
})

test("deriveAdaptationEffect returns null for a non-triggered decision -- no effect is ever fabricated below threshold", () => {
  const rule: AdaptationRule = { id: "r1", domain: "ENTITY", signalKind: "ENCOUNTER_INVOLVEMENT", threshold: 3, decayPerTick: 0, reversible: true, effect: { domain: "ENTITY", kind: "RESOURCE_PREFERENCE_BIAS", magnitude: 1 }, description: "test" }
  const decision = evaluateAdaptationRule(rule, { worldId: "w1", domain: "ENTITY", subjectId: "cow-1", kind: "ENCOUNTER_INVOLVEMENT", value: 1, lastUpdatedTick: 10 })
  assert.equal(deriveAdaptationEffect(rule, decision, "w1"), null)
})

test("deriveAdaptationEffect produces the domain-correct typed effect, tagged with the triggering tier, for each domain", () => {
  const entityRule: AdaptationRule = { id: "r-entity", domain: "ENTITY", signalKind: "ENCOUNTER_INVOLVEMENT", threshold: 3, decayPerTick: 0, reversible: true, effect: { domain: "ENTITY", kind: "RESOURCE_PREFERENCE_BIAS", magnitude: 1 }, description: "test" }
  const entityDecision = evaluateAdaptationRule(entityRule, { worldId: "w1", domain: "ENTITY", subjectId: "cow-1", kind: "ENCOUNTER_INVOLVEMENT", value: 3, lastUpdatedTick: 10 })
  const entityEffect = deriveAdaptationEffect(entityRule, entityDecision, "w1")
  assert.equal(entityEffect?.domain, "ENTITY")
  assert.equal(entityEffect && "entityId" in entityEffect ? entityEffect.entityId : undefined, "cow-1")
  assert.equal(entityEffect?.tier, 1)

  const relationshipRule: AdaptationRule = { id: "r-rel", domain: "RELATIONSHIP", signalKind: "ENCOUNTER_EVIDENCE", threshold: 2, decayPerTick: 0, reversible: true, effect: { domain: "RELATIONSHIP", kind: "INTERACTION_LIKELIHOOD_BIAS", magnitude: 1 }, description: "test" }
  const relationshipDecision = evaluateAdaptationRule(relationshipRule, { worldId: "w1", domain: "RELATIONSHIP", subjectId: "rel-1", kind: "ENCOUNTER_EVIDENCE", value: 2, lastUpdatedTick: 10 })
  const relationshipEffect = deriveAdaptationEffect(relationshipRule, relationshipDecision, "w1")
  assert.equal(relationshipEffect?.domain, "RELATIONSHIP")
  assert.equal(relationshipEffect && "relationshipId" in relationshipEffect ? relationshipEffect.relationshipId : undefined, "rel-1")

  const placeRule: AdaptationRule = { id: "r-place", domain: "PLACE", signalKind: "ENCOUNTER_INVOLVEMENT", threshold: 3, decayPerTick: 0, reversible: false, effect: { domain: "PLACE", kind: "ENCOUNTER_ELIGIBILITY", magnitude: 1 }, description: "test" }
  const placeDecision = evaluateAdaptationRule(placeRule, { worldId: "w1", domain: "PLACE", subjectId: "kadamba-grove", kind: "ENCOUNTER_INVOLVEMENT", value: 3, lastUpdatedTick: 10 })
  const placeEffect = deriveAdaptationEffect(placeRule, placeDecision, "w1")
  assert.equal(placeEffect?.domain, "PLACE")
  assert.equal(placeEffect && "locationId" in placeEffect ? placeEffect.locationId : undefined, "kadamba-grove")

  const worldPossibilityRule: AdaptationRule = { id: "r-wp", domain: "WORLD_POSSIBILITY", signalKind: "ENCOUNTER_INVOLVEMENT", threshold: 2, decayPerTick: 0, reversible: true, effect: { domain: "WORLD_POSSIBILITY", kind: "ENCOUNTER_WEIGHT_BIAS", magnitude: 1 }, description: "test" }
  const wpDecision = evaluateAdaptationRule(worldPossibilityRule, { worldId: "w1", domain: "WORLD_POSSIBILITY", subjectId: "avatark-yamuna-flowering-reflection", kind: "ENCOUNTER_INVOLVEMENT", value: 2, lastUpdatedTick: 10 })
  const wpEffect = deriveAdaptationEffect(worldPossibilityRule, wpDecision, "w1")
  assert.equal(wpEffect?.domain, "WORLD_POSSIBILITY")
})

const ENTITY_RULE: AdaptationRule = {
  id: "avatark-entity-repeated-encounter-resource-bias-test",
  domain: "ENTITY",
  signalKind: "ENCOUNTER_INVOLVEMENT",
  threshold: 3,
  decayPerTick: 0,
  reversible: true,
  effect: { domain: "ENTITY", kind: "RESOURCE_PREFERENCE_BIAS", magnitude: 1 },
  description: "test",
}

test("runWorldAdaptation: a single realized-encounter signal never crosses a threshold-3 rule alone -- one encounter should not transform the world", () => {
  const result = runWorldAdaptation({ worldId: "w1", tick: 10, signals: [{ domain: "ENTITY", subjectId: "cow-1", kind: "ENCOUNTER_INVOLVEMENT", tick: 10, weight: 1, causalReferences: [] }], rules: [ENTITY_RULE], existingPressures: [] })
  assert.equal(result.pressures.length, 1)
  assert.equal(result.pressures[0].value, 1)
  assert.equal(result.decisions[0].triggered, false)
  assert.equal(result.effects.length, 0)
})

test("runWorldAdaptation: bounded accumulation across three separate wakes crosses the threshold and produces exactly one tier-1 effect", () => {
  let existingPressures: Awaited<ReturnType<typeof runWorldAdaptation>>["pressures"] = []
  let lastResult: ReturnType<typeof runWorldAdaptation> | null = null

  for (const tick of [10, 20, 30]) {
    lastResult = runWorldAdaptation({ worldId: "w1", tick, signals: [{ domain: "ENTITY", subjectId: "cow-1", kind: "ENCOUNTER_INVOLVEMENT", tick, weight: 1, causalReferences: [] }], rules: [ENTITY_RULE], existingPressures })
    existingPressures = lastResult.pressures
  }

  assert.equal(existingPressures[0].value, 3)
  assert.equal(lastResult!.decisions[0].tier, 1)
  assert.equal(lastResult!.effects.length, 1)
  assert.equal(lastResult!.effects[0].tier, 1)
})

test("runWorldAdaptation: replaying the exact same wake (identical tick, existingPressures already advanced to that tick) is a no-op -- zero pressures/decisions/effects produced for that subject", () => {
  const afterFirstRun = runWorldAdaptation({ worldId: "w1", tick: 10, signals: [{ domain: "ENTITY", subjectId: "cow-1", kind: "ENCOUNTER_INVOLVEMENT", tick: 10, weight: 1, causalReferences: [] }], rules: [ENTITY_RULE], existingPressures: [] })
  assert.equal(afterFirstRun.pressures.length, 1)

  const replay = runWorldAdaptation({ worldId: "w1", tick: 10, signals: [{ domain: "ENTITY", subjectId: "cow-1", kind: "ENCOUNTER_INVOLVEMENT", tick: 10, weight: 1, causalReferences: [] }], rules: [ENTITY_RULE], existingPressures: afterFirstRun.pressures })
  assert.deepEqual(replay.pressures, [])
  assert.deepEqual(replay.decisions, [])
  assert.deepEqual(replay.effects, [])
})

test("runWorldAdaptation: two independent subjects under the same rule accumulate independently, never bleeding into each other's pressure", () => {
  const result = runWorldAdaptation({
    worldId: "w1",
    tick: 10,
    signals: [
      { domain: "ENTITY", subjectId: "cow-1", kind: "ENCOUNTER_INVOLVEMENT", tick: 10, weight: 1, causalReferences: [] },
      { domain: "ENTITY", subjectId: "cow-2", kind: "ENCOUNTER_INVOLVEMENT", tick: 10, weight: 1, causalReferences: [] },
      { domain: "ENTITY", subjectId: "cow-2", kind: "ENCOUNTER_INVOLVEMENT", tick: 10, weight: 1, causalReferences: [] },
    ],
    rules: [ENTITY_RULE],
    existingPressures: [],
  })
  const byCow = new Map(result.pressures.map((p) => [p.subjectId, p.value]))
  assert.equal(byCow.get("cow-1"), 1)
  assert.equal(byCow.get("cow-2"), 2)
})

test("runWorldAdaptation: a signal for a domain/kind with no matching rule is carried through in `signals` but produces no pressure/decision/effect", () => {
  const result = runWorldAdaptation({ worldId: "w1", tick: 10, signals: [{ domain: "PLACE", subjectId: "yamuna:water", kind: "RESOURCE_ABUNDANCE", tick: 10, weight: 1, causalReferences: [] }], rules: [ENTITY_RULE], existingPressures: [] })
  assert.equal(result.signals.length, 1)
  assert.equal(result.pressures.length, 0)
  assert.equal(result.effects.length, 0)
})
