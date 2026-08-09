import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveEmergentEncounterOpportunities } from "./emergentEncounters.ts"
import type { WorldEvent } from "@avatark/world-memory-contracts"

function relocationEvent(tick: number, locationId: string): WorldEvent {
  return { id: `evt-${tick}`, worldId: "w1", tick, category: "POPULATION_MOVEMENT", locationId, participantEntityIds: ["cow-1"], causalReferences: [], consequences: [], significance: "MEANINGFUL", retentionTier: "RECENT", provenance: { derivedFromEventIds: [], derivationRule: "test", causalReferences: [] }, occurredAt: "2026-08-09T00:00:00.000Z" }
}

const RULE = { ruleId: "kadamba-grove-recent-arrival", category: "ambient" as const, requiresLocationId: "kadamba-grove", requiresEventCategory: "POPULATION_MOVEMENT" as const, withinLastTicks: 5 }

test("an emergent rule surfaces an opportunity when its required event occurred recently AND something is present now", () => {
  const result = resolveEmergentEncounterOpportunities({ baseOpportunities: [], worldEvents: [relocationEvent(10, "kadamba-grove")], presenceByLocation: { "kadamba-grove": ["cow-1"] }, rules: [RULE], currentTick: 12 })
  assert.equal(result.length, 1)
  assert.equal(result[0].ruleId, "kadamba-grove-recent-arrival")
  assert.deepEqual(result[0].contributingEntityIds, ["cow-1"])
})

test("no emergence without a qualifying recent event, even with presence", () => {
  const result = resolveEmergentEncounterOpportunities({ baseOpportunities: [], worldEvents: [], presenceByLocation: { "kadamba-grove": ["cow-1"] }, rules: [RULE], currentTick: 12 })
  assert.deepEqual(result, [])
})

test("no emergence without current presence, even with a qualifying recent event", () => {
  const result = resolveEmergentEncounterOpportunities({ baseOpportunities: [], worldEvents: [relocationEvent(10, "kadamba-grove")], presenceByLocation: {}, rules: [RULE], currentTick: 12 })
  assert.deepEqual(result, [])
})

test("a qualifying event outside the rule's own window does not emerge", () => {
  const result = resolveEmergentEncounterOpportunities({ baseOpportunities: [], worldEvents: [relocationEvent(1, "kadamba-grove")], presenceByLocation: { "kadamba-grove": ["cow-1"] }, rules: [RULE], currentTick: 12 })
  assert.deepEqual(result, [])
})

test("an opportunity already present at the base level is never duplicated by the emergent pass", () => {
  const base = [{ ruleId: "kadamba-grove-recent-arrival", locationId: "kadamba-grove", category: "ambient" as const, contributingEntityIds: ["cow-1"], tick: 12 }]
  const result = resolveEmergentEncounterOpportunities({ baseOpportunities: base, worldEvents: [relocationEvent(10, "kadamba-grove")], presenceByLocation: { "kadamba-grove": ["cow-1"] }, rules: [RULE], currentTick: 12 })
  assert.equal(result.length, 1, "base opportunity passes through unchanged, no second copy added")
})

test("base opportunities always pass through even when no rule applies", () => {
  const base = [{ ruleId: "some-other-rule", locationId: "yamuna", category: "environmental" as const, contributingEntityIds: [], tick: 12 }]
  const result = resolveEmergentEncounterOpportunities({ baseOpportunities: base, worldEvents: [], presenceByLocation: {}, rules: [], currentTick: 12 })
  assert.deepEqual(result, base)
})
