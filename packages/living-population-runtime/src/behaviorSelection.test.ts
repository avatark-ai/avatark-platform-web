import { test } from "node:test"
import assert from "node:assert/strict"
import type { EntityBehaviorProfile, EntityPerception } from "@avatark/living-population-contracts"
import { selectBehavior } from "./behaviorSelection.ts"

const PROFILE: EntityBehaviorProfile = {
  archetypeId: "cow",
  capabilities: ["can_move", "can_graze", "can_drink", "can_rest", "can_group"],
  needDefinitions: [
    { dimension: "hunger", baselinePressurePerTick: 0.1, thresholds: { urgentAbove: 0.8 } },
    { dimension: "thirst", baselinePressurePerTick: 0.1, thresholds: { urgentAbove: 0.8 } },
    { dimension: "rest", baselinePressurePerTick: 0.1, thresholds: { urgentAbove: 0.8 } },
    { dimension: "social", baselinePressurePerTick: 0.05, thresholds: { urgentAbove: 0.8 } },
  ],
  rhythmScheduleId: "cow-schedule",
  groupKind: "herd",
}

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

function needs(overrides: Record<string, number> = {}) {
  return (["hunger", "thirst", "rest", "social"] as const).map((dimension) => ({ dimension, pressure: overrides[dimension] ?? 0 }))
}

test("an urgent thirst need overrides a non-drinking rhythm phase, when water is reachable", () => {
  const intent = selectBehavior({ entityId: "cow-1", profile: PROFILE, needs: needs({ thirst: 0.9 }), rhythmPhase: "FORAGE", perception: perception(), group: null, tick: 10 })
  assert.equal(intent.type, "MOVE_TO_RESOURCE", "thirst is urgent but water isn't at the current location -- the entity must move toward it")
  assert.equal(intent.targetLocationId, "river")
})

test("grazing is selected when eligible and the rhythm phase favors it", () => {
  const intent = selectBehavior({ entityId: "cow-1", profile: PROFILE, needs: needs({ hunger: 0.5 }), rhythmPhase: "FORAGE", perception: perception(), group: null, tick: 10 })
  assert.equal(intent.type, "GRAZE")
})

test("an ineligible behavior (no capability) is never selected even under pressure", () => {
  const noDrinkProfile: EntityBehaviorProfile = { ...PROFILE, capabilities: ["can_move", "can_graze", "can_rest"] }
  const intent = selectBehavior({ entityId: "cow-1", profile: noDrinkProfile, needs: needs({ thirst: 0.95 }), rhythmPhase: "DRINK", perception: perception({ waterAvailable: true, reachableWaterLocationIds: ["meadow"] }), group: null, tick: 10 })
  assert.notEqual(intent.type, "DRINK")
})

test("with no pressing need and a neutral rhythm phase, the entity remains", () => {
  const intent = selectBehavior({ entityId: "cow-1", profile: PROFILE, needs: needs(), rhythmPhase: "WAKE", perception: perception({ vegetationAvailable: false, reachableVegetationLocationIds: [] }), group: null, tick: 10 })
  assert.equal(intent.type, "REMAIN")
})

test("a moving group pulls a member along via FOLLOW_GROUP when no individual need overrides it", () => {
  const intent = selectBehavior({
    entityId: "cow-1",
    profile: PROFILE,
    needs: needs(),
    rhythmPhase: "MOVE",
    perception: perception({ groupId: "herd-1", vegetationAvailable: false, reachableVegetationLocationIds: [] }),
    group: { locationId: "meadow", targetLocationId: "river" },
    tick: 10,
  })
  assert.equal(intent.type, "FOLLOW_GROUP")
  assert.equal(intent.targetLocationId, "river")
})

test("selection is deterministic -- identical inputs always produce the identical intent", () => {
  const params = { entityId: "cow-1", profile: PROFILE, needs: needs({ hunger: 0.4, thirst: 0.6 }), rhythmPhase: "FORAGE" as const, perception: perception(), group: null, tick: 3 }
  const a = selectBehavior(params)
  const b = selectBehavior(params)
  assert.deepEqual(a, b)
})
