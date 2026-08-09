import { test } from "node:test"
import assert from "node:assert/strict"
import { deriveWorldEvents } from "./worldEventDerivation.ts"
import type { DeriveWorldEventsParams } from "./worldEventDerivation.ts"

function baseParams(overrides: Partial<DeriveWorldEventsParams> = {}): DeriveWorldEventsParams {
  return {
    worldId: "living-vrindavan",
    now: () => "2026-08-09T00:00:00.000Z",
    seasonTransitions: [],
    environmentalBandChanges: [],
    locationConditionChanges: [],
    populationEvents: [],
    encounterAvailabilityChanges: [],
    ...overrides,
  }
}

test("a season transition always becomes a LANDMARK WorldEvent with structured causal reference", () => {
  const events = deriveWorldEvents(baseParams({ seasonTransitions: [{ tick: 4, fromSeasonId: "vasanta", toSeasonId: "grishma" }] }))
  assert.equal(events.length, 1)
  assert.equal(events[0].category, "SEASON_TRANSITION")
  assert.equal(events[0].significance, "LANDMARK")
  assert.equal(events[0].retentionTier, "LANDMARK")
  assert.deepEqual(events[0].causalReferences, [{ kind: "season", ref: "grishma" }])
})

test("an environmental band change crossing scarcity becomes a WorldEvent; a non-crossing one is dropped entirely", () => {
  const events = deriveWorldEvents(
    baseParams({
      environmentalBandChanges: [
        { tick: 4, band: "hydrologyBand", fromBand: "moderate", toBand: "low" },
        { tick: 4, band: "temperatureBand", fromBand: "moderate", toBand: "high" },
      ],
    }),
  )
  assert.equal(events.length, 1, "only the scarcity-crossing band change survives the significance filter")
  assert.equal(events[0].category, "ENVIRONMENTAL_THRESHOLD")
})

test("a group relocation produces a POPULATION_MOVEMENT event with per-member consequences", () => {
  const events = deriveWorldEvents(
    baseParams({
      populationEvents: [
        { type: "group.relocated", tick: 8, entityId: null, groupId: "cow-herd-1", fromLocationId: "yamuna", toLocationId: "kadamba-grove", fromActivity: null, toActivity: null },
        { type: "entity.moved", tick: 8, entityId: "cow-1", groupId: "cow-herd-1", fromLocationId: "yamuna", toLocationId: "kadamba-grove", fromActivity: null, toActivity: null },
        { type: "entity.moved", tick: 8, entityId: "cow-2", groupId: "cow-herd-1", fromLocationId: "yamuna", toLocationId: "kadamba-grove", fromActivity: null, toActivity: null },
      ],
    }),
  )
  assert.equal(events.length, 1)
  const event = events[0]
  assert.equal(event.category, "POPULATION_MOVEMENT")
  assert.equal(event.significance, "MEANINGFUL")
  assert.deepEqual(event.participantEntityIds.sort(), ["cow-1", "cow-2"])
  assert.ok(event.consequences.some((c) => c.type === "LOCATION_HISTORY_MARKER" && c.targetLocationId === "yamuna"))
  assert.ok(event.consequences.some((c) => c.type === "RESOURCE_PREFERENCE" && c.targetEntityId === "cow-1" && c.targetLocationId === "kadamba-grove"))
  assert.ok(event.consequences.some((c) => c.type === "GROUP_HISTORY_RELATIONSHIP" && c.targetEntityId === "cow-2" && c.targetGroupId === "cow-herd-1"))
})

test("an individual entity move with no accompanying group.relocated produces no WorldEvent at all -- routine grazing is not history", () => {
  const events = deriveWorldEvents(baseParams({ populationEvents: [{ type: "entity.moved", tick: 3, entityId: "cow-1", groupId: null, fromLocationId: "yamuna", toLocationId: "kadamba-grove", fromActivity: null, toActivity: null }] }))
  assert.deepEqual(events, [])
})

test("a location condition change carries the entities present as participants, and an ENCOUNTER_ELIGIBILITY_CHANGE-adjacent LOCATION_HISTORY_MARKER consequence", () => {
  const events = deriveWorldEvents(baseParams({ locationConditionChanges: [{ tick: 5, locationId: "yamuna", category: "water", wasAvailable: true, isAvailable: false, entityIdsPresent: ["cow-1", "cow-2"] }] }))
  assert.equal(events.length, 1)
  assert.deepEqual(events[0].participantEntityIds, ["cow-1", "cow-2"])
  assert.ok(events[0].consequences.some((c) => c.type === "LOCATION_HISTORY_MARKER" && c.targetLocationId === "yamuna"))
})

test("an encounter becoming available produces a WorldEvent with an ENCOUNTER_ELIGIBILITY_CHANGE consequence", () => {
  const events = deriveWorldEvents(baseParams({ encounterAvailabilityChanges: [{ tick: 6, ruleId: "kadamba-grove-ambient-presence", locationId: "kadamba-grove", category: "ambient", becameAvailable: true, contributingEntityIds: ["bird-1"] }] }))
  assert.equal(events.length, 1)
  assert.equal(events[0].category, "ENCOUNTER_BECAME_AVAILABLE")
  assert.deepEqual(events[0].participantEntityIds, ["bird-1"])
  assert.ok(events[0].consequences.some((c) => c.type === "ENCOUNTER_ELIGIBILITY_CHANGE"))
})

test("deriving from the identical inputs twice produces identical event ids -- idempotency at the source (Phase 18)", () => {
  const params = baseParams({ seasonTransitions: [{ tick: 4, fromSeasonId: "vasanta", toSeasonId: "grishma" }] })
  const a = deriveWorldEvents(params)
  const b = deriveWorldEvents(params)
  assert.deepEqual(a.map((e) => e.id), b.map((e) => e.id))
})
