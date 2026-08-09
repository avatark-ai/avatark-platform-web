import { test } from "node:test"
import assert from "node:assert/strict"
import { computeReturnRecognition } from "./returnRecognition.ts"
import type { WorldEvent } from "@avatark/world-memory-contracts"

function event(category: WorldEvent["category"], tick: number): WorldEvent {
  return { id: `evt-${category}-${tick}`, worldId: "w1", tick, category, locationId: null, participantEntityIds: [], causalReferences: [], consequences: [], significance: "MEANINGFUL", retentionTier: "RECENT", provenance: { derivedFromEventIds: [], derivationRule: "test", causalReferences: [] }, occurredAt: "2026-08-09T00:00:00.000Z" }
}

test("no events since departure produces an honest zero-facts recognition, never a fabricated one", () => {
  const result = computeReturnRecognition("w1", "visitor-1", 10, 10, [])
  assert.deepEqual(result.facts, [])
})

test("a season transition maps to season_changed", () => {
  const result = computeReturnRecognition("w1", "visitor-1", 4, 8, [event("SEASON_TRANSITION", 4)])
  assert.deepEqual(result.facts, [{ type: "season_changed", sourceCategories: ["SEASON_TRANSITION"], occurrenceCount: 1 }])
})

test("multiple events mapping to the same fact type are aggregated, not duplicated as separate facts", () => {
  const result = computeReturnRecognition("w1", "visitor-1", 0, 20, [event("POPULATION_MOVEMENT", 5), event("GROUP_FORMED", 10)])
  assert.equal(result.facts.length, 1)
  assert.equal(result.facts[0].type, "population_relocated")
  assert.equal(result.facts[0].occurrenceCount, 2)
  assert.deepEqual(result.facts[0].sourceCategories.sort(), ["GROUP_FORMED", "POPULATION_MOVEMENT"])
})

test("distinct categories produce distinct, semantically correct facts -- never prose", () => {
  const result = computeReturnRecognition("w1", "visitor-1", 0, 20, [event("SEASON_TRANSITION", 4), event("LOCATION_CONDITION_CHANGED", 6), event("ENCOUNTER_BECAME_AVAILABLE", 8), event("ENTITY_ACTIVITY_TRANSITION", 9)])
  const types = result.facts.map((f) => f.type).sort()
  assert.deepEqual(types, ["encounter_changed", "environment_changed", "known_entity_state_changed", "season_changed"])
  assert.ok(types.every((t) => !t.includes(" ")), "fact types are fixed snake_case identifiers, never free-text sentences")
})

// Sprint 12, Phase 12: separation/reunion both map to the one additive
// fact type, aggregated together like every other category pair.
test("separation and reunion events both map to social_relationship_changed, aggregated", () => {
  const result = computeReturnRecognition("w1", "visitor-1", 0, 20, [event("SEPARATION_OCCURRED", 4), event("REUNION_OCCURRED", 10)])
  assert.equal(result.facts.length, 1)
  assert.equal(result.facts[0].type, "social_relationship_changed")
  assert.equal(result.facts[0].occurrenceCount, 2)
})
