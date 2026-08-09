import { test } from "node:test"
import assert from "node:assert/strict"
import { deriveWorldEvents } from "./worldEventDerivation.ts"
import { deriveEntityMemoryEntries } from "./entityMemoryDerivation.ts"
import { resolveEmergentEncounterOpportunities } from "./emergentEncounters.ts"
import { computeReturnRecognition } from "./returnRecognition.ts"
import type { DeriveWorldEventsParams } from "./worldEventDerivation.ts"

// Sprint 11, Phase 23: the same fictional, non-canonical "living-forest"
// fixture Sprint 7/9/10 already established, run through the FULL
// Sprint 11 memory pipeline -- significance, World Event derivation,
// Entity Memory, emergent encounters, ReturnRecognition -- to prove none
// of it is Living-Vrindavan-specific. No import here, and no line in
// worldEventDerivation.ts/entityMemoryDerivation.ts/emergentEncounters.ts/
// returnRecognition.ts, mentions "forest," "vrindavan," "cow," or any
// franchise/reference-entity name.
const FOREST_WORLD_ID = "living-forest-fixture"

function forestInterval(): DeriveWorldEventsParams {
  return {
    worldId: FOREST_WORLD_ID,
    now: () => "2026-08-09T00:00:00.000Z",
    seasonTransitions: [{ tick: 3, fromSeasonId: "canopy-wet", toSeasonId: "drought" }],
    environmentalBandChanges: [{ tick: 3, band: "hydrologyBand", fromBand: "high", toBand: "low" }],
    locationConditionChanges: [{ tick: 3, locationId: "forest-clearing", category: "water", wasAvailable: true, isAvailable: false, entityIdsPresent: ["deer-1", "deer-2"] }],
    populationEvents: [
      { type: "group.relocated", tick: 4, entityId: null, groupId: "deer-herd-1", fromLocationId: "forest-clearing", toLocationId: "forest-stream", fromActivity: null, toActivity: null },
      { type: "entity.moved", tick: 4, entityId: "deer-1", groupId: "deer-herd-1", fromLocationId: "forest-clearing", toLocationId: "forest-stream", fromActivity: null, toActivity: null },
      { type: "entity.moved", tick: 4, entityId: "deer-2", groupId: "deer-herd-1", fromLocationId: "forest-clearing", toLocationId: "forest-stream", fromActivity: null, toActivity: null },
    ],
    encounterAvailabilityChanges: [{ tick: 4, ruleId: "forest-stream-ambient-presence", locationId: "forest-stream", category: "ambient", becameAvailable: true, contributingEntityIds: ["deer-1", "deer-2"] }],
  }
}

test("the unmodified significance filter and WorldEvent derivation work identically for the forest fixture", () => {
  const events = deriveWorldEvents(forestInterval())
  assert.ok(events.some((e) => e.category === "SEASON_TRANSITION" && e.significance === "LANDMARK"))
  assert.ok(events.some((e) => e.category === "POPULATION_MOVEMENT" && e.significance === "MEANINGFUL"))
  assert.ok(events.some((e) => e.category === "ENCOUNTER_BECAME_AVAILABLE"))
})

test("Entity Memory derives identically for the forest fixture's own herd", () => {
  const events = deriveWorldEvents(forestInterval())
  const entries = deriveEntityMemoryEntries(FOREST_WORLD_ID, events)
  assert.ok(entries.some((e) => e.entityId === "deer-1" && e.type === "PREVIOUS_RESOURCE_LOCATION" && e.detail.locationId === "forest-stream"))
  assert.ok(entries.some((e) => e.entityId === "deer-2" && e.type === "RECENT_GROUP_MEMBERSHIP" && e.detail.groupId === "deer-herd-1"))
})

test("an emergent encounter rule works for the forest fixture using the unmodified resolver", () => {
  const events = deriveWorldEvents(forestInterval())
  const result = resolveEmergentEncounterOpportunities({
    baseOpportunities: [],
    worldEvents: events,
    presenceByLocation: { "forest-stream": ["deer-1", "deer-2"] },
    rules: [{ ruleId: "forest-stream-recent-arrival", category: "ambient", requiresLocationId: "forest-stream", requiresEventCategory: "POPULATION_MOVEMENT", withinLastTicks: 5 }],
    currentTick: 6,
  })
  assert.ok(result.some((o) => o.ruleId === "forest-stream-recent-arrival"))
})

test("ReturnRecognition derives identically for the forest fixture's own event categories", () => {
  const events = deriveWorldEvents(forestInterval())
  const recognition = computeReturnRecognition(FOREST_WORLD_ID, "visitor-1", 0, 6, events)
  const types = recognition.facts.map((f) => f.type).sort()
  assert.deepEqual(types, ["encounter_changed", "environment_changed", "population_relocated", "season_changed"])
})
