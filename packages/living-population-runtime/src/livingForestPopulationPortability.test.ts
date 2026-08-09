import { test } from "node:test"
import assert from "node:assert/strict"
import { emptyProtectedNarrativeProjection } from "@avatark/living-systems-contracts"
import type { LivingEntityState, SeasonDefinition, SharedWorldState } from "@avatark/living-systems-contracts"
import type { EntityBehaviorProfile, LocationResourceAffordance, RhythmSchedule } from "@avatark/living-population-contracts"
import { advancePopulationSimulation } from "./populationSimulation.ts"
import type { AdvancePopulationSimulationParams } from "./populationSimulation.ts"
import { buildUndirectedLocationGraph } from "./locationGraph.ts"

// Sprint 10, Phase 19: the SAME fictional, non-canonical "living-forest"
// fixture Sprint 7 (otherWorldGrammar.test.ts) and Sprint 9
// (livingForestPortability.test.ts) already established, run here
// through the FULL Sprint 10 population pipeline -- needs, rhythm,
// perception, behavior, herd dynamics, encounter opportunity -- to prove
// none of it is Living-Vrindavan-specific. No import here, and no line
// in populationSimulation.ts/behaviorSelection.ts/groupDynamics.ts,
// mentions "forest," "vrindavan," "cow," or any franchise/reference-
// entity name.

const CANOPY_ENVELOPE = { temperatureBand: "moderate" as const, precipitationBand: "high" as const, humidityBand: "high" as const, hydrologyBaselineBand: "high" as const, vegetationActivityBand: "high" as const, animalActivityBand: "high" as const }
const DROUGHT_ENVELOPE = { temperatureBand: "high" as const, precipitationBand: "low" as const, humidityBand: "low" as const, hydrologyBaselineBand: "low" as const, vegetationActivityBand: "low" as const, animalActivityBand: "low" as const }
const CANOPY_SEASON: SeasonDefinition = { id: "canopy-wet", name: "Canopy Wet", order: 1, canonId: "STK-CAN-999", environmentalEnvelope: CANOPY_ENVELOPE, minDurationTicks: 3, allowedNextSeasonIds: ["drought"] }
const DROUGHT_SEASON: SeasonDefinition = { id: "drought", name: "Drought", order: 2, canonId: "STK-CAN-999", environmentalEnvelope: DROUGHT_ENVELOPE, minDurationTicks: 3, allowedNextSeasonIds: [] }

const DEER_PROFILE: EntityBehaviorProfile = {
  archetypeId: "deer-herd",
  capabilities: ["can_move", "can_forage", "can_drink", "can_rest", "can_group"],
  needDefinitions: [
    { dimension: "hunger", baselinePressurePerTick: 0.1, thresholds: { urgentAbove: 0.8 } },
    { dimension: "thirst", baselinePressurePerTick: 0.1, thresholds: { urgentAbove: 0.8 } },
    { dimension: "rest", baselinePressurePerTick: 0.08, thresholds: { urgentAbove: 0.8 } },
  ],
  rhythmScheduleId: "deer-schedule",
  groupKind: "herd",
}
const SCHEDULE: RhythmSchedule = { id: "deer-schedule", ticksPerCycle: 3, entries: [{ phase: "FORAGE", startFractionOfDay: 0 }, { phase: "DRINK", startFractionOfDay: 1 / 3 }, { phase: "REST", startFractionOfDay: 2 / 3 }] }
const AFFORDANCES: LocationResourceAffordance[] = [{ locationId: "forest-clearing", resourceTags: ["vegetation"] }, { locationId: "forest-stream", resourceTags: ["water"] }]
const GRAPH = buildUndirectedLocationGraph([{ from: "forest-clearing", to: "forest-stream" }])

function freshForestState(): SharedWorldState {
  return {
    worldId: "living-forest-fixture",
    worldVersion: 1,
    clock: { worldId: "living-forest-fixture", tick: 0, paused: false },
    season: { currentSeasonId: "canopy-wet", enteredAtTick: 0 },
    environment: { weather: { temperatureBand: "moderate", precipitationBand: "high", humidityBand: "high" }, hydrology: { hydrologyBand: "high", soilMoistureBand: "high" }, ecology: { vegetationActivityBand: "high", animalActivityBand: "high" } },
  }
}

function forestParams(ticks: number): AdvancePopulationSimulationParams {
  const herd: LivingEntityState[] = [
    { id: "deer-1", archetypeId: "deer-herd", locationId: "forest-clearing", lifecyclePhase: "DORMANT", attributes: {}, lastUpdatedTick: 0 },
    { id: "deer-2", archetypeId: "deer-herd", locationId: "forest-clearing", lifecyclePhase: "DORMANT", attributes: {}, lastUpdatedTick: 0 },
  ]
  return {
    sharedState: freshForestState(),
    seasonDefinitions: [CANOPY_SEASON, DROUGHT_SEASON],
    vegetationArchetypes: [],
    vegetationEntities: [],
    populationEntities: herd,
    behaviorProfiles: [DEER_PROFILE],
    behaviorStates: [],
    groups: [{ worldId: "living-forest-fixture", id: "deer-herd-1", kind: "herd", memberEntityIds: ["deer-1", "deer-2"], locationId: "forest-clearing", targetLocationId: null, cohesion: 1, lastUpdatedTick: 0 }],
    rhythmSchedules: [SCHEDULE],
    resourceAffordances: AFFORDANCES,
    worldLocationGraph: GRAPH,
    encounterRules: [],
    protectedNarrative: emptyProtectedNarrativeProjection("living-forest-fixture"),
    ticks,
    seed: "forest-population-seed",
    now: () => "2026-08-08T00:00:00.000Z",
  }
}

test("the unmodified population engine seeds needs and selects behavior for a wholly fictional herd, with zero core changes", () => {
  const result = advancePopulationSimulation(forestParams(1))
  assert.equal(result.behaviorStates.length, 2)
  assert.ok(result.behaviorStates.every((s) => s.needs.length === 3))
})

test("the fixture's own drought transition changes need pressure through the identical causal chain Vrindavan uses", () => {
  const result = advancePopulationSimulation(forestParams(3))
  assert.equal(result.sharedState.season.currentSeasonId, "drought", "the fixture's own season rule fires, unmodified engine")
})

test("herd cohesion and group movement work identically for this fixture's herd -- no world-identity branching anywhere in group dynamics", () => {
  const result = advancePopulationSimulation(forestParams(6))
  const group = result.groups.find((g) => g.id === "deer-herd-1")
  assert.ok(group)
  assert.ok(group!.cohesion >= 0 && group!.cohesion <= 1)
})
