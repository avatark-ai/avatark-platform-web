import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveSocialPerception } from "./socialPerception.ts"

const RELATIONSHIP = { id: "rel-1", worldId: "world-1", entityAId: "cow-a", entityBId: "cow-b", relationshipType: "PARENT_OFFSPRING" as const, band: "ESTABLISHED" as const, evidence: { coPresenceTicks: 6, sharedGroupTicks: 2, reunionCount: 0 }, establishedTick: 0, lastRelevantTick: 10 }

test("resolveSocialPerception: a related entity co-located at the current location is nearby-known", () => {
  const perception = resolveSocialPerception({
    entityId: "cow-a",
    currentLocationId: "loc-1",
    entityLocationsById: new Map([["cow-a", "loc-1"], ["cow-b", "loc-1"], ["cow-c", "loc-1"]]),
    relationships: [RELATIONSHIP],
    familiarityStates: [],
    groupId: null,
    groupMemberEntityIds: [],
    groupLocationId: null,
    withinHomeRange: true,
    separationActive: false,
  })
  assert.deepEqual(perception.nearbyKnownEntityIds, ["cow-b"])
  assert.equal(perception.relationships.length, 1)
  assert.equal(perception.relationships[0].otherEntityId, "cow-b")
  assert.equal(perception.relationships[0].relationshipType, "PARENT_OFFSPRING")
})

test("resolveSocialPerception: a related entity at a different location is not nearby-known", () => {
  const perception = resolveSocialPerception({
    entityId: "cow-a",
    currentLocationId: "loc-1",
    entityLocationsById: new Map([["cow-a", "loc-1"], ["cow-b", "loc-2"]]),
    relationships: [RELATIONSHIP],
    familiarityStates: [],
    groupId: null,
    groupMemberEntityIds: [],
    groupLocationId: null,
    withinHomeRange: true,
    separationActive: false,
  })
  assert.deepEqual(perception.nearbyKnownEntityIds, [])
})

test("resolveSocialPerception: an unrelated co-located entity is not surfaced as nearby-known", () => {
  const perception = resolveSocialPerception({
    entityId: "cow-a",
    currentLocationId: "loc-1",
    entityLocationsById: new Map([["cow-a", "loc-1"], ["cow-z", "loc-1"]]),
    relationships: [],
    familiarityStates: [],
    groupId: null,
    groupMemberEntityIds: [],
    groupLocationId: null,
    withinHomeRange: true,
    separationActive: false,
  })
  assert.deepEqual(perception.nearbyKnownEntityIds, [])
})

test("resolveSocialPerception: partitions group members into present and absent by co-location", () => {
  const perception = resolveSocialPerception({
    entityId: "cow-a",
    currentLocationId: "loc-1",
    entityLocationsById: new Map([["cow-a", "loc-1"], ["cow-b", "loc-1"], ["cow-c", "loc-2"]]),
    relationships: [],
    familiarityStates: [],
    groupId: "group-1",
    groupMemberEntityIds: ["cow-a", "cow-b", "cow-c"],
    groupLocationId: "loc-1",
    withinHomeRange: true,
    separationActive: false,
  })
  assert.deepEqual(perception.groupMembersPresentIds, ["cow-b"])
  assert.deepEqual(perception.groupMembersAbsentIds, ["cow-c"])
  assert.equal(perception.groupId, "group-1")
  assert.equal(perception.currentGroupLocationId, "loc-1")
})

test("resolveSocialPerception: surfaces only FAMILIAR-band entities as familiarEntityIds, from either side of the pair", () => {
  const perception = resolveSocialPerception({
    entityId: "cow-a",
    currentLocationId: "loc-1",
    entityLocationsById: new Map(),
    relationships: [],
    familiarityStates: [
      { worldId: "world-1", entityAId: "cow-a", entityBId: "cow-x", band: "FAMILIAR", evidence: { coPresenceTicks: 10, sharedGroupTicks: 0, encounterCount: 0 }, lastUpdatedTick: 5 },
      { worldId: "world-1", entityAId: "cow-y", entityBId: "cow-a", band: "FAMILIAR", evidence: { coPresenceTicks: 10, sharedGroupTicks: 0, encounterCount: 0 }, lastUpdatedTick: 5 },
      { worldId: "world-1", entityAId: "cow-a", entityBId: "cow-z", band: "SEEN", evidence: { coPresenceTicks: 1, sharedGroupTicks: 0, encounterCount: 0 }, lastUpdatedTick: 5 },
    ],
    groupId: null,
    groupMemberEntityIds: [],
    groupLocationId: null,
    withinHomeRange: true,
    separationActive: false,
  })
  assert.deepEqual(new Set(perception.familiarEntityIds), new Set(["cow-x", "cow-y"]))
})

test("resolveSocialPerception: passes withinHomeRange and separationActive straight through", () => {
  const perception = resolveSocialPerception({
    entityId: "cow-a",
    currentLocationId: "loc-1",
    entityLocationsById: new Map(),
    relationships: [],
    familiarityStates: [],
    groupId: null,
    groupMemberEntityIds: [],
    groupLocationId: null,
    withinHomeRange: false,
    separationActive: true,
  })
  assert.equal(perception.withinHomeRange, false)
  assert.equal(perception.separationActive, true)
})
