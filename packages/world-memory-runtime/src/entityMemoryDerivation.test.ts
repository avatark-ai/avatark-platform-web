import { test } from "node:test"
import assert from "node:assert/strict"
import { deriveWorldEvents } from "./worldEventDerivation.ts"
import { deriveEntityMemoryEntries } from "./entityMemoryDerivation.ts"

test("a group relocation's consequences produce PREVIOUS_RESOURCE_LOCATION and RECENT_GROUP_MEMBERSHIP entries for each member, plus RECENT_RELOCATION from the event's own participants", () => {
  const events = deriveWorldEvents({
    worldId: "w1",
    now: () => "2026-08-09T00:00:00.000Z",
    seasonTransitions: [],
    environmentalBandChanges: [],
    locationConditionChanges: [],
    encounterAvailabilityChanges: [],
    populationEvents: [
      { type: "group.relocated", tick: 8, entityId: null, groupId: "cow-herd-1", fromLocationId: "yamuna", toLocationId: "kadamba-grove", fromActivity: null, toActivity: null },
      { type: "entity.moved", tick: 8, entityId: "cow-1", groupId: "cow-herd-1", fromLocationId: "yamuna", toLocationId: "kadamba-grove", fromActivity: null, toActivity: null },
    ],
  })

  const entries = deriveEntityMemoryEntries("w1", events)
  const byType = (type: string) => entries.filter((e) => e.type === type)

  assert.ok(byType("PREVIOUS_RESOURCE_LOCATION").some((e) => e.entityId === "cow-1" && e.detail.locationId === "kadamba-grove"))
  assert.ok(byType("RECENT_GROUP_MEMBERSHIP").some((e) => e.entityId === "cow-1" && e.detail.groupId === "cow-herd-1"))
  assert.ok(byType("RECENT_RELOCATION").some((e) => e.entityId === "cow-1"))
})

test("a location condition change's participants get RECENT_STRESS_CONDITION entries", () => {
  const events = deriveWorldEvents({
    worldId: "w1",
    now: () => "2026-08-09T00:00:00.000Z",
    seasonTransitions: [],
    environmentalBandChanges: [],
    locationConditionChanges: [{ tick: 5, locationId: "yamuna", category: "water", wasAvailable: true, isAvailable: false, entityIdsPresent: ["cow-1"] }],
    encounterAvailabilityChanges: [],
    populationEvents: [],
  })
  const entries = deriveEntityMemoryEntries("w1", events)
  assert.ok(entries.some((e) => e.type === "RECENT_STRESS_CONDITION" && e.entityId === "cow-1" && e.detail.locationId === "yamuna"))
})

test("an encounter becoming available gives its contributing entities a RECENT_ENCOUNTER_INVOLVEMENT entry", () => {
  const events = deriveWorldEvents({
    worldId: "w1",
    now: () => "2026-08-09T00:00:00.000Z",
    seasonTransitions: [],
    environmentalBandChanges: [],
    locationConditionChanges: [],
    populationEvents: [],
    encounterAvailabilityChanges: [{ tick: 6, ruleId: "kadamba-grove-ambient-presence", locationId: "kadamba-grove", category: "ambient", becameAvailable: true, contributingEntityIds: ["bird-1"] }],
  })
  const entries = deriveEntityMemoryEntries("w1", events)
  assert.ok(entries.some((e) => e.type === "RECENT_ENCOUNTER_INVOLVEMENT" && e.entityId === "bird-1"))
})

test("a season transition (no participants, no entity-targeted consequences) produces zero entity memory entries", () => {
  const events = deriveWorldEvents({ worldId: "w1", now: () => "2026-08-09T00:00:00.000Z", seasonTransitions: [{ tick: 4, fromSeasonId: "vasanta", toSeasonId: "grishma" }], environmentalBandChanges: [], locationConditionChanges: [], populationEvents: [], encounterAvailabilityChanges: [] })
  assert.deepEqual(deriveEntityMemoryEntries("w1", events), [])
})

// Sprint 12, Phase 12: separation/reunion WorldEvents produce the
// entity-relevant RECENT_SEPARATION/RECENT_REUNION entries only for
// the entity actually involved -- never a third, competing memory
// engine, only Sprint 11's own machinery reacting to new event
// categories.
test("a separation event produces a RECENT_SEPARATION entry for its own entity", () => {
  const events = deriveWorldEvents({ worldId: "w1", now: () => "2026-08-09T00:00:00.000Z", seasonTransitions: [], environmentalBandChanges: [], locationConditionChanges: [], populationEvents: [], encounterAvailabilityChanges: [], separationEvents: [{ tick: 6, entityId: "calf-1", subjectType: "RELATIONSHIP", subjectId: "rel-1", locationId: "kadamba-grove" }] })
  const entries = deriveEntityMemoryEntries("w1", events)
  assert.ok(entries.some((e) => e.entityId === "calf-1" && e.type === "RECENT_SEPARATION" && e.detail.locationId === "kadamba-grove"))
})

test("a significant reunion event produces a RECENT_REUNION entry for its own entity, plus RECENT_GROUP_MEMBERSHIP when the subject is a group membership", () => {
  const events = deriveWorldEvents({ worldId: "w1", now: () => "2026-08-09T00:00:00.000Z", seasonTransitions: [], environmentalBandChanges: [], locationConditionChanges: [], populationEvents: [], encounterAvailabilityChanges: [], reunionEvents: [{ tick: 10, entityId: "cow-1", subjectType: "GROUP_MEMBERSHIP", subjectId: "membership-1", locationId: "yamuna", separationDurationTicks: 5 }] })
  const entries = deriveEntityMemoryEntries("w1", events)
  assert.ok(entries.some((e) => e.entityId === "cow-1" && e.type === "RECENT_REUNION"))
  assert.ok(entries.some((e) => e.entityId === "cow-1" && e.type === "RECENT_GROUP_MEMBERSHIP" && e.detail.groupId === "membership-1"))
})

// Sprint 14, Phase 8: a REALIZED encounter's own RESOURCE_PREFERENCE
// consequence (attached by @avatark/encounter-realization-runtime's own
// deriveConsequences) produces a PREVIOUS_RESOURCE_LOCATION entry --
// this is the ENTIRE "changed future behavior" mechanism for Sprint 14:
// no new bridge, the exact same one Sprint 11 already built for
// POPULATION_MOVEMENT. Its participants also get RECENT_ENCOUNTER_INVOLVEMENT,
// same as an ENCOUNTER_BECAME_AVAILABLE event already produces.
test("a resolved encounter's participants get RECENT_ENCOUNTER_INVOLVEMENT, and its own RESOURCE_PREFERENCE consequence produces PREVIOUS_RESOURCE_LOCATION -- the existing memoryHint bridge, no new mechanism", () => {
  const events = deriveWorldEvents({
    worldId: "w1",
    now: () => "2026-08-09T00:00:00.000Z",
    seasonTransitions: [],
    environmentalBandChanges: [],
    locationConditionChanges: [],
    populationEvents: [],
    encounterAvailabilityChanges: [],
    resolvedEncounters: [
      {
        tick: 12,
        ruleId: "kadamba-grove-ambient-presence",
        locationId: "kadamba-grove",
        category: "ambient",
        participantEntityIds: ["cow-1"],
        causalReferences: [],
        consequences: [{ type: "RESOURCE_PREFERENCE", targetEntityId: "cow-1", targetGroupId: null, targetLocationId: "kadamba-grove", detail: {} }],
      },
    ],
  })
  const entries = deriveEntityMemoryEntries("w1", events)
  assert.ok(entries.some((e) => e.entityId === "cow-1" && e.type === "RECENT_ENCOUNTER_INVOLVEMENT"))
  assert.ok(entries.some((e) => e.entityId === "cow-1" && e.type === "PREVIOUS_RESOURCE_LOCATION" && e.detail.locationId === "kadamba-grove"))
})
