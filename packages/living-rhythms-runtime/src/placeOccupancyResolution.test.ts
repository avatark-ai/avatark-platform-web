import assert from "node:assert/strict"
import { test } from "node:test"
import { resolvePlaceOccupancy } from "./placeOccupancyResolution.ts"
import type { PlaceOccupancyEntityInput } from "./placeOccupancyResolution.ts"

test("an empty location resolves to QUIET", () => {
  const occupancy = resolvePlaceOccupancy("loc-1", [], 1)
  assert.equal(occupancy.occupancyLevel, "QUIET")
  assert.deepEqual(occupancy.presentEntityIds, [])
})

test("a majority of present entities resting resolves to RESTING", () => {
  const entities: PlaceOccupancyEntityInput[] = [
    { entityId: "a", archetypeId: "cow", activity: "REST", groupId: "herd-1" },
    { entityId: "b", archetypeId: "cow", activity: "REST", groupId: "herd-1" },
    { entityId: "c", archetypeId: "cow", activity: "GRAZE", groupId: "herd-1" },
  ]
  assert.equal(resolvePlaceOccupancy("loc-1", entities, 1).occupancyLevel, "RESTING")
})

test("a majority socializing resolves to GATHERING, a majority moving resolves to DISPERSING, otherwise ACTIVE", () => {
  const socializing: PlaceOccupancyEntityInput[] = [
    { entityId: "a", archetypeId: "cow", activity: "SOCIALIZE", groupId: null },
    { entityId: "b", archetypeId: "cow", activity: "SOCIALIZE", groupId: null },
  ]
  assert.equal(resolvePlaceOccupancy("loc-1", socializing, 1).occupancyLevel, "GATHERING")

  const moving: PlaceOccupancyEntityInput[] = [
    { entityId: "a", archetypeId: "cow", activity: "MOVE_TO_RESOURCE", groupId: null },
    { entityId: "b", archetypeId: "cow", activity: "FOLLOW_GROUP", groupId: null },
  ]
  assert.equal(resolvePlaceOccupancy("loc-1", moving, 1).occupancyLevel, "DISPERSING")

  const mixed: PlaceOccupancyEntityInput[] = [
    { entityId: "a", archetypeId: "cow", activity: "GRAZE", groupId: null },
    { entityId: "b", archetypeId: "cow", activity: "DRINK", groupId: null },
  ]
  assert.equal(resolvePlaceOccupancy("loc-1", mixed, 1).occupancyLevel, "ACTIVE")
})

test("entityCountsByArchetype and presentGroupIds aggregate correctly, deduplicating group ids and excluding null", () => {
  const entities: PlaceOccupancyEntityInput[] = [
    { entityId: "a", archetypeId: "cow", activity: "GRAZE", groupId: "herd-1" },
    { entityId: "b", archetypeId: "cow", activity: "DRINK", groupId: "herd-1" },
    { entityId: "c", archetypeId: "bird-flock", activity: "GRAZE", groupId: null },
  ]
  const occupancy = resolvePlaceOccupancy("loc-1", entities, 1)
  assert.deepEqual(occupancy.entityCountsByArchetype, { cow: 2, "bird-flock": 1 })
  assert.deepEqual(occupancy.presentGroupIds, ["herd-1"])
})
