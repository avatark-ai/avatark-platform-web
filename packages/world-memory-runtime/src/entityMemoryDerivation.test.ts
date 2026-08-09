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
