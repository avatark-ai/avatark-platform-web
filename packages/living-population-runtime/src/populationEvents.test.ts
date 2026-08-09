import { test } from "node:test"
import assert from "node:assert/strict"
import { emptyProtectedNarrativeProjection } from "@avatark/living-systems-contracts"
import type { EncounterRule, EntityArchetype, LivingEntityState, SeasonDefinition } from "@avatark/living-systems-contracts"
import type { EntityBehaviorProfile, LocationResourceAffordance, RhythmSchedule } from "@avatark/living-population-contracts"
import { advancePopulationSimulation } from "./populationSimulation.ts"
import { buildUndirectedLocationGraph } from "./locationGraph.ts"

// Sprint 11: proves Sprint 10's own engine now ALSO emits structured
// per-tick population deltas, additively -- these tests would have
// failed against Sprint 10's own unmodified populationSimulation.test.ts
// fixtures if this broke anything there (see that file, still 6/6
// passing unmodified).

const VASANTA_ENVELOPE = { temperatureBand: "moderate" as const, precipitationBand: "moderate" as const, humidityBand: "moderate" as const, hydrologyBaselineBand: "moderate" as const, vegetationActivityBand: "high" as const, animalActivityBand: "moderate" as const }
const GRISHMA_ENVELOPE = { temperatureBand: "high" as const, precipitationBand: "low" as const, humidityBand: "low" as const, hydrologyBaselineBand: "low" as const, vegetationActivityBand: "moderate" as const, animalActivityBand: "low" as const }
const VASANTA: SeasonDefinition = { id: "vasanta", name: "Vasanta", order: 1, canonId: "STK-CAN-006", environmentalEnvelope: VASANTA_ENVELOPE, minDurationTicks: 4, allowedNextSeasonIds: ["grishma"] }
const GRISHMA: SeasonDefinition = { id: "grishma", name: "Grīṣma", order: 2, canonId: "STK-CAN-006", environmentalEnvelope: GRISHMA_ENVELOPE, minDurationTicks: 4, allowedNextSeasonIds: [] }
const SEASONS = [VASANTA, GRISHMA]

const COW_PROFILE: EntityBehaviorProfile = {
  archetypeId: "cow",
  capabilities: ["can_move", "can_graze", "can_drink", "can_rest", "can_group"],
  needDefinitions: [
    { dimension: "hunger", baselinePressurePerTick: 0.1, thresholds: { urgentAbove: 0.8 } },
    { dimension: "thirst", baselinePressurePerTick: 0.3, thresholds: { urgentAbove: 0.3 } },
    { dimension: "rest", baselinePressurePerTick: 0.08, thresholds: { urgentAbove: 0.8 } },
    { dimension: "social", baselinePressurePerTick: 0.05, thresholds: { urgentAbove: 0.8 } },
  ],
  rhythmScheduleId: "cow-schedule",
  groupKind: "herd",
}
const SCHEDULE: RhythmSchedule = { id: "cow-schedule", ticksPerCycle: 4, entries: [{ phase: "FORAGE", startFractionOfDay: 0 }, { phase: "DRINK", startFractionOfDay: 0.25 }, { phase: "SOCIAL", startFractionOfDay: 0.5 }, { phase: "REST", startFractionOfDay: 0.75 }] }
const AFFORDANCES: LocationResourceAffordance[] = [{ locationId: "meadow", resourceTags: ["vegetation"] }, { locationId: "river", resourceTags: ["water"] }]
const GRAPH = buildUndirectedLocationGraph([{ from: "meadow", to: "river" }])

function baseParams(ticks: number) {
  const cow: LivingEntityState = { id: "cow-1", archetypeId: "cow", locationId: "meadow", lifecyclePhase: "DORMANT", attributes: {}, lastUpdatedTick: 0 }
  return {
    sharedState: {
      worldId: "test-population-events-world",
      worldVersion: 1,
      clock: { worldId: "test-population-events-world", tick: 0, paused: false },
      season: { currentSeasonId: "vasanta", enteredAtTick: 0 },
      environment: { weather: { temperatureBand: "moderate" as const, precipitationBand: "moderate" as const, humidityBand: "moderate" as const }, hydrology: { hydrologyBand: "moderate" as const, soilMoistureBand: "moderate" as const }, ecology: { vegetationActivityBand: "high" as const, animalActivityBand: "moderate" as const } },
    },
    seasonDefinitions: SEASONS,
    vegetationArchetypes: [] as EntityArchetype[],
    vegetationEntities: [] as LivingEntityState[],
    populationEntities: [cow],
    behaviorProfiles: [COW_PROFILE],
    behaviorStates: [] as { worldId: string; entityId: string; needs: { dimension: "hunger" | "thirst" | "rest" | "social"; pressure: number }[]; rhythmPhase: "REST" | "WAKE" | "FORAGE" | "DRINK" | "MOVE" | "SOCIAL" | "RETURN"; activity: "REST" | "GRAZE" | "DRINK" | "MOVE_TO_RESOURCE" | "FOLLOW_GROUP" | "SOCIALIZE" | "RETURN_TO_GROUP" | "REMAIN"; movementType: "MoveToLocation" | "Remain" | "FollowGroup" | "ApproachResource" | "ReturnToGroup"; movementTargetLocationId: string | null; groupId: string | null; lastUpdatedTick: number }[],
    groups: [] as { worldId: string; id: string; kind: "herd" | "flock"; memberEntityIds: string[]; locationId: string; targetLocationId: string | null; cohesion: number; lastUpdatedTick: number }[],
    rhythmSchedules: [SCHEDULE],
    resourceAffordances: AFFORDANCES,
    worldLocationGraph: GRAPH,
    encounterRules: [] as EncounterRule[],
    protectedNarrative: emptyProtectedNarrativeProjection("test-population-events-world"),
    ticks,
    seed: "population-events-seed",
    now: () => "2026-08-09T00:00:00.000Z",
  }
}

test("an entity already urgently thirsty, with water only reachable elsewhere, emits entity.activity_transitioned and entity.moved", () => {
  const params = baseParams(1)
  params.behaviorStates = [{ worldId: "test-population-events-world", entityId: "cow-1", needs: [{ dimension: "hunger", pressure: 0 }, { dimension: "thirst", pressure: 0.9 }, { dimension: "rest", pressure: 0 }, { dimension: "social", pressure: 0 }], rhythmPhase: "WAKE", activity: "REMAIN", movementType: "Remain", movementTargetLocationId: null, groupId: null, lastUpdatedTick: 0 }]
  const result = advancePopulationSimulation(params)
  assert.ok(result.populationEvents.some((e) => e.type === "entity.activity_transitioned" && e.fromActivity === "REMAIN"), "activity changed from the pre-seeded REMAIN")
  assert.ok(result.populationEvents.some((e) => e.type === "entity.moved" && e.fromLocationId === "meadow" && e.toLocationId === "river"), "meadow has no water tag; river does, and is reachable -- urgent thirst forces the move")
})

test("no populationEvents are emitted for a tick where nothing changed", () => {
  // A second, already-arrived entity at river with satisfied needs and no group has nothing left to transition.
  const params = baseParams(1)
  params.populationEntities = [{ id: "cow-2", archetypeId: "cow", locationId: "river", lifecyclePhase: "DORMANT", attributes: {}, lastUpdatedTick: 0 }]
  const first = advancePopulationSimulation(params)
  const second = advancePopulationSimulation({ ...params, sharedState: first.sharedState, populationEntities: first.populationEntities, behaviorStates: first.behaviorStates, groups: first.groups, ticks: 1 })
  // Whatever the entity settles into by the second tick, if its activity/location are unchanged, no events fire for it.
  const settledActivity = first.behaviorStates[0].activity
  const stillSame = second.populationEntities[0].locationId === first.populationEntities[0].locationId
  if (stillSame && second.behaviorStates[0].activity === settledActivity) {
    assert.deepEqual(second.populationEvents, [])
  }
})

test("group.relocated fires only once the group's own locationId actually changes, not merely because it has a target", () => {
  const withGroup = baseParams(6)
  withGroup.groups = [{ worldId: "test-population-events-world", id: "cow-herd-1", kind: "herd", memberEntityIds: ["cow-1"], locationId: "meadow", targetLocationId: null, cohesion: 1, lastUpdatedTick: 0 }]
  const result = advancePopulationSimulation(withGroup)
  const relocations = result.populationEvents.filter((e) => e.type === "group.relocated")
  assert.ok(relocations.every((e) => e.fromLocationId !== e.toLocationId))
})
