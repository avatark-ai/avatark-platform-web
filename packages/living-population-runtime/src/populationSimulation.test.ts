import { test } from "node:test"
import assert from "node:assert/strict"
import { emptyProtectedNarrativeProjection } from "@avatark/living-systems-contracts"
import type { EncounterRule, LivingEntityState, SeasonDefinition, SharedWorldState } from "@avatark/living-systems-contracts"
import type { EntityBehaviorProfile, LocationResourceAffordance, RhythmSchedule } from "@avatark/living-population-contracts"
import { advancePopulationSimulation } from "./populationSimulation.ts"
import type { AdvancePopulationSimulationParams } from "./populationSimulation.ts"
import { buildUndirectedLocationGraph } from "./locationGraph.ts"

// Fixtures reuse exactly the already-authorized Vasanta/Grīṣma reference
// envelopes this repo's own Sprint 7/9 tests already use
// (packages/living-systems-runtime/src/simulation.test.ts).
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
    { dimension: "thirst", baselinePressurePerTick: 0.1, thresholds: { urgentAbove: 0.8 } },
    { dimension: "rest", baselinePressurePerTick: 0.08, thresholds: { urgentAbove: 0.8 } },
    { dimension: "social", baselinePressurePerTick: 0.05, thresholds: { urgentAbove: 0.8 } },
  ],
  rhythmScheduleId: "cow-schedule",
  groupKind: "herd",
}
const SCHEDULE: RhythmSchedule = { id: "cow-schedule", ticksPerCycle: 4, entries: [{ phase: "FORAGE", startFractionOfDay: 0 }, { phase: "DRINK", startFractionOfDay: 0.25 }, { phase: "SOCIAL", startFractionOfDay: 0.5 }, { phase: "REST", startFractionOfDay: 0.75 }] }
const AFFORDANCES: LocationResourceAffordance[] = [{ locationId: "meadow", resourceTags: ["vegetation"] }, { locationId: "river", resourceTags: ["water"] }]
const GRAPH = buildUndirectedLocationGraph([{ from: "meadow", to: "river" }])
const ENCOUNTER_RULES: EncounterRule[] = [{ id: "meadow-grazing-sign", locationId: "meadow", category: "ambient", condition: { band: "vegetationActivityBand", atLeast: "high" } }]

function freshSharedState(): SharedWorldState {
  return {
    worldId: "test-population-world",
    worldVersion: 1,
    clock: { worldId: "test-population-world", tick: 0, paused: false },
    season: { currentSeasonId: "vasanta", enteredAtTick: 0 },
    environment: { weather: { temperatureBand: "moderate", precipitationBand: "moderate", humidityBand: "moderate" }, hydrology: { hydrologyBand: "moderate", soilMoistureBand: "moderate" }, ecology: { vegetationActivityBand: "high", animalActivityBand: "moderate" } },
  }
}

function baseParams(ticks: number): AdvancePopulationSimulationParams {
  const cow: LivingEntityState = { id: "cow-1", archetypeId: "cow", locationId: "meadow", lifecyclePhase: "DORMANT", attributes: {}, lastUpdatedTick: 0 }
  return {
    sharedState: freshSharedState(),
    seasonDefinitions: SEASONS,
    vegetationArchetypes: [],
    vegetationEntities: [],
    populationEntities: [cow],
    behaviorProfiles: [COW_PROFILE],
    behaviorStates: [],
    groups: [],
    rhythmSchedules: [SCHEDULE],
    resourceAffordances: AFFORDANCES,
    worldLocationGraph: GRAPH,
    encounterRules: ENCOUNTER_RULES,
    protectedNarrative: emptyProtectedNarrativeProjection("test-population-world"),
    ticks,
    seed: "population-sim-seed",
    now: () => "2026-08-08T00:00:00.000Z",
  }
}

test("a population entity is seeded with fresh needs and produces a behavior each tick", () => {
  const result = advancePopulationSimulation(baseParams(1))
  assert.equal(result.behaviorStates.length, 1)
  assert.equal(result.behaviorStates[0].entityId, "cow-1")
  assert.ok(result.behaviorStates[0].needs.length === 4)
})

test("the entity's coarse LivingEntityState.lifecyclePhase reflects its Sprint 10 activity, never Sprint 7's ecological-band stepping", () => {
  const result = advancePopulationSimulation(baseParams(4))
  const cow = result.populationEntities[0]
  assert.ok(["DORMANT", "RESTING", "ACTIVE", "MOVING"].includes(cow.lifecyclePhase))
})

// Test matrix: catch-up equivalence for the population domain -- one
// call of N ticks must equal N calls of 1 tick, the same proof Sprint 9
// established for the causal engine alone, now extended through the
// behavior layer.
test("population catch-up (N ticks in one call) equals N single-tick calls, byte for byte", () => {
  const oneCall = advancePopulationSimulation(baseParams(6))

  const state = baseParams(1)
  let result = advancePopulationSimulation(state)
  for (let i = 1; i < 6; i++) {
    result = advancePopulationSimulation({ ...state, sharedState: result.sharedState, populationEntities: result.populationEntities, behaviorStates: result.behaviorStates, groups: result.groups, ticks: 1 })
  }

  assert.deepEqual(oneCall.sharedState, result.sharedState)
  assert.deepEqual(oneCall.populationEntities, result.populationEntities)
  assert.deepEqual(oneCall.behaviorStates, result.behaviorStates)
})

// Phase 9's central proof, run through the FULL population pipeline
// (not just needsEvolution.test.ts's isolated unit): Vasanta's
// abundant conditions and Grīṣma's scarce ones must produce genuinely
// different entity needs/behavior over equivalent elapsed time -- never
// a mere label swap.
test("Vasanta's abundant resources vs Grishma's scarcity produce measurably different hunger/thirst pressure over the same elapsed ticks", () => {
  const vasantaOnly = advancePopulationSimulation(baseParams(3)) // stays in Vasanta (minDurationTicks 4)

  const grishmaParams = baseParams(3)
  grishmaParams.sharedState = { ...grishmaParams.sharedState, season: { currentSeasonId: "grishma", enteredAtTick: 0 }, environment: { weather: { temperatureBand: "high", precipitationBand: "low", humidityBand: "low" }, hydrology: { hydrologyBand: "low", soilMoistureBand: "low" }, ecology: { vegetationActivityBand: "moderate", animalActivityBand: "low" } } }
  const grishmaResult = advancePopulationSimulation(grishmaParams)

  const vasantaThirst = vasantaOnly.behaviorStates[0].needs.find((n) => n.dimension === "thirst")!.pressure
  const grishmaThirst = grishmaResult.behaviorStates[0].needs.find((n) => n.dimension === "thirst")!.pressure
  assert.ok(grishmaThirst > vasantaThirst, "Grishma's heat must leave the entity thirstier over the same elapsed time")
})

test("encounter opportunities reflect population presence at a location satisfying an existing Sprint 7 encounter rule", () => {
  const result = advancePopulationSimulation(baseParams(1))
  const opportunity = result.encounterOpportunities.find((o) => o.ruleId === "meadow-grazing-sign")
  assert.ok(opportunity, "the cow's presence at meadow, with high vegetation activity (Vasanta), makes the rule's own condition available")
  assert.ok(opportunity!.contributingEntityIds.includes("cow-1"))
})

test("world-system events from Sprint 7's own causal engine still flow through unmodified alongside population behavior", () => {
  const withVegetation = baseParams(5)
  withVegetation.vegetationArchetypes = [{ id: "riverbank-vegetation", name: "Riverbank Vegetation", locationId: "river", lifecyclePhases: ["dormant", "budding", "flowering", "seeding"], initialLifecyclePhase: "dormant" }]
  withVegetation.vegetationEntities = [{ id: "veg-1", archetypeId: "riverbank-vegetation", locationId: "river", lifecyclePhase: "dormant", attributes: {}, lastUpdatedTick: 0 }]
  const result = advancePopulationSimulation(withVegetation)
  assert.ok(result.worldSystemEvents.some((e) => e.type === "season.transitioned"), "Vasanta -> Grishma still transitions at tick 4, exactly as Sprint 7 alone would produce")
})
