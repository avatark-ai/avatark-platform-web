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

// Sprint 12, Phase 10/11: separation/reunion candidates become their
// own WorldEvent categories, gated by the same significance filter.
test("a separation candidate becomes a SEPARATION_OCCURRED WorldEvent", () => {
  const events = deriveWorldEvents(baseParams({ separationEvents: [{ tick: 6, entityId: "calf-1", subjectType: "RELATIONSHIP", subjectId: "rel-1", locationId: "kadamba-grove" }] }))
  assert.equal(events.length, 1)
  assert.equal(events[0].category, "SEPARATION_OCCURRED")
  assert.deepEqual(events[0].participantEntityIds, ["calf-1"])
})

test("a reunion candidate with a sufficiently long separation becomes a REUNION_OCCURRED WorldEvent with a group-history consequence for a GROUP_MEMBERSHIP subject", () => {
  const events = deriveWorldEvents(baseParams({ reunionEvents: [{ tick: 10, entityId: "cow-1", subjectType: "GROUP_MEMBERSHIP", subjectId: "membership-1", locationId: "yamuna", separationDurationTicks: 5 }] }))
  assert.equal(events.length, 1)
  assert.equal(events[0].category, "REUNION_OCCURRED")
  assert.ok(events[0].consequences.some((c) => c.type === "GROUP_HISTORY_RELATIONSHIP" && c.targetEntityId === "cow-1" && c.targetGroupId === "membership-1"))
})

test("a reunion candidate whose own separation was too brief is dropped entirely, never recorded", () => {
  const events = deriveWorldEvents(baseParams({ reunionEvents: [{ tick: 7, entityId: "cow-1", subjectType: "RELATIONSHIP", subjectId: "rel-1", locationId: "yamuna", separationDurationTicks: 1 }] }))
  assert.deepEqual(events, [])
})

// Sprint 14, Phase 8: a realized encounter carries its own resolver's
// already-computed causal references and consequences straight through
// -- this pipeline never recomputes them, only filters/stamps them.
test("a resolved encounter always becomes an ENCOUNTER_RESOLVED WorldEvent (ENCOUNTER_RESOLVED is unconditionally MEANINGFUL), carrying its own causal references and consequences through unchanged", () => {
  const events = deriveWorldEvents(
    baseParams({
      resolvedEncounters: [
        {
          tick: 12,
          ruleId: "kadamba-grove-ambient-presence",
          locationId: "kadamba-grove",
          category: "ambient",
          participantEntityIds: ["cow-1", "cow-2"],
          causalReferences: [{ kind: "routineCompatibility", ref: "1.00" }],
          consequences: [{ type: "RESOURCE_PREFERENCE", targetEntityId: "cow-1", targetGroupId: null, targetLocationId: "kadamba-grove", detail: {} }],
        },
      ],
    }),
  )
  assert.equal(events.length, 1)
  assert.equal(events[0].category, "ENCOUNTER_RESOLVED")
  assert.equal(events[0].significance, "MEANINGFUL")
  assert.deepEqual(events[0].causalReferences, [{ kind: "routineCompatibility", ref: "1.00" }])
  assert.deepEqual(events[0].consequences, [{ type: "RESOURCE_PREFERENCE", targetEntityId: "cow-1", targetGroupId: null, targetLocationId: "kadamba-grove", detail: {} }])
})
