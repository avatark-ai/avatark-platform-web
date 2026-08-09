import { test } from "node:test"
import assert from "node:assert/strict"
import type { BehaviorIntent, EntityPerception } from "@avatark/living-population-contracts"
import { IllegalMovementError, resolveMovementIntent } from "./movementResolution.ts"

function perception(overrides: Partial<EntityPerception> = {}): EntityPerception {
  return {
    entityId: "cow-1",
    currentLocationId: "meadow",
    reachableLocationIds: ["river"],
    localEnvironment: { weather: { temperatureBand: "moderate", precipitationBand: "moderate", humidityBand: "moderate" }, hydrology: { hydrologyBand: "moderate", soilMoistureBand: "moderate" }, ecology: { vegetationActivityBand: "high", animalActivityBand: "moderate" } },
    waterAvailable: false,
    vegetationAvailable: true,
    reachableWaterLocationIds: ["river"],
    reachableVegetationLocationIds: ["meadow"],
    nearbyEntityIds: [],
    groupId: null,
    availableEncounterRuleIds: [],
    ...overrides,
  }
}

test("REMAIN/GRAZE/DRINK/REST/SOCIALIZE behaviors all resolve to semantic Remain", () => {
  for (const type of ["REMAIN", "GRAZE", "DRINK", "REST", "SOCIALIZE"] as const) {
    const intent: BehaviorIntent = { entityId: "cow-1", type, targetLocationId: null, tick: 1 }
    const movement = resolveMovementIntent(intent, perception())
    assert.equal(movement.type, "Remain")
    assert.equal(movement.targetLocationId, null)
  }
})

test("MOVE_TO_RESOURCE resolves to ApproachResource with the same target, when legal", () => {
  const intent: BehaviorIntent = { entityId: "cow-1", type: "MOVE_TO_RESOURCE", targetLocationId: "river", tick: 1 }
  const movement = resolveMovementIntent(intent, perception())
  assert.equal(movement.type, "ApproachResource")
  assert.equal(movement.targetLocationId, "river")
})

test("an illegal target (not current, not reachable) throws rather than silently moving the entity off-graph", () => {
  const intent: BehaviorIntent = { entityId: "cow-1", type: "MOVE_TO_RESOURCE", targetLocationId: "far-away-unconnected-place", tick: 1 }
  assert.throws(() => resolveMovementIntent(intent, perception()), IllegalMovementError)
})

test("FOLLOW_GROUP and RETURN_TO_GROUP map to their own semantic movement types", () => {
  const follow = resolveMovementIntent({ entityId: "cow-1", type: "FOLLOW_GROUP", targetLocationId: "river", tick: 1 }, perception())
  assert.equal(follow.type, "FollowGroup")
  const returnToGroup = resolveMovementIntent({ entityId: "cow-1", type: "RETURN_TO_GROUP", targetLocationId: "river", tick: 1 }, perception())
  assert.equal(returnToGroup.type, "ReturnToGroup")
})

// Sprint 12, Phase 9: the two new social BehaviorTypes map to their own
// semantic movement types, same legality checking as every other type.
test("APPROACH_RELATED_ENTITY and RETURN_TO_HOME_RANGE map to their own semantic movement types", () => {
  const approach = resolveMovementIntent({ entityId: "cow-1", type: "APPROACH_RELATED_ENTITY", targetLocationId: "river", tick: 1 }, perception())
  assert.equal(approach.type, "ApproachRelatedEntity")
  const returnHome = resolveMovementIntent({ entityId: "cow-1", type: "RETURN_TO_HOME_RANGE", targetLocationId: "river", tick: 1 }, perception())
  assert.equal(returnHome.type, "ReturnToHomeRange")
})

test("an illegal target for the new social movement types still throws, same discipline as every existing type", () => {
  const intent: BehaviorIntent = { entityId: "cow-1", type: "APPROACH_RELATED_ENTITY", targetLocationId: "far-away-unconnected-place", tick: 1 }
  assert.throws(() => resolveMovementIntent(intent, perception()), IllegalMovementError)
})
