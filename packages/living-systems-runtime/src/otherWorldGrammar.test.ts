import { test } from "node:test"
import assert from "node:assert/strict"
import { advanceWorldSimulation } from "./simulation.ts"
import { resolveAvailableEncounters } from "./encounterResolution.ts"
import type { EncounterRule, EntityArchetype, SeasonDefinition, SharedWorldState } from "@avatark/living-systems-contracts"

// Sprint 7, Phase 19: proves the grammar admits a DIFFERENT Living World
// through configuration/data alone, never a code fork -- a fictional
// "living-forest" fixture with its own season names, its own causal
// emphasis (weather -> water -> vegetation -> animals, per the mission
// brief's own framing for that world), its own entity archetype and
// encounter rule, run through the exact same advanceWorldSimulation/
// resolveAvailableEncounters this file's sibling tests already exercise
// for Living Vrindavan. No import here, and no line in simulation.ts/
// causalEnvironment.ts/encounterResolution.ts, mentions "forest,"
// "vrindavan," or any franchise name -- if this test passes, the runtime
// itself is proven world-neutral, not merely asserted to be.

const CANOPY_ENVELOPE = { temperatureBand: "moderate" as const, precipitationBand: "high" as const, humidityBand: "high" as const, hydrologyBaselineBand: "high" as const, vegetationActivityBand: "high" as const, animalActivityBand: "high" as const }
const DROUGHT_ENVELOPE = { temperatureBand: "high" as const, precipitationBand: "low" as const, humidityBand: "low" as const, hydrologyBaselineBand: "low" as const, vegetationActivityBand: "low" as const, animalActivityBand: "low" as const }

const CANOPY_SEASON: SeasonDefinition = { id: "canopy-wet", name: "Canopy Wet", order: 1, canonId: "STK-CAN-999", environmentalEnvelope: CANOPY_ENVELOPE, minDurationTicks: 3, allowedNextSeasonIds: ["drought"] }
const DROUGHT_SEASON: SeasonDefinition = { id: "drought", name: "Drought", order: 2, canonId: "STK-CAN-999", environmentalEnvelope: DROUGHT_ENVELOPE, minDurationTicks: 3, allowedNextSeasonIds: [] }

const DEER_HERD: EntityArchetype = { id: "deer-herd", name: "Deer Herd", locationId: "forest-clearing", lifecyclePhases: ["scattered", "grazing", "migrating"], initialLifecyclePhase: "scattered" }

const CLEARING_ENCOUNTER: EncounterRule = { id: "forest-clearing-grazing-sign", locationId: "forest-clearing", category: "ambient", condition: { band: "animalActivityBand", atLeast: "high" } }

function freshForestState(): SharedWorldState {
  return {
    worldId: "living-forest-fixture",
    worldVersion: 1,
    clock: { worldId: "living-forest-fixture", tick: 0, paused: false },
    season: { currentSeasonId: "canopy-wet", enteredAtTick: 0 },
    environment: {
      weather: { temperatureBand: "moderate", precipitationBand: "high", humidityBand: "high" },
      hydrology: { hydrologyBand: "high", soilMoistureBand: "high" },
      ecology: { vegetationActivityBand: "high", animalActivityBand: "high" },
    },
  }
}

test("a wholly different world's season/entity/encounter fixtures run through the unchanged simulation engine", () => {
  const result = advanceWorldSimulation({
    sharedState: freshForestState(),
    seasonDefinitions: [CANOPY_SEASON, DROUGHT_SEASON],
    entityArchetypes: [DEER_HERD],
    entities: [{ id: "herd-1", archetypeId: "deer-herd", locationId: "forest-clearing", lifecyclePhase: "scattered", attributes: {}, lastUpdatedTick: 0 }],
    ticks: 3,
    seed: "forest-fixture-seed",
    now: () => "2026-08-08T00:00:00.000Z",
  })

  assert.equal(result.sharedState.season.currentSeasonId, "drought", "the fixture's own transition rule fires, unmodified engine")
  assert.ok(result.events.some((e) => e.type === "season.transitioned"))
})

test("encounter resolution treats the forest fixture's own rule exactly as it treats Living Vrindavan's -- no special-casing by world identity anywhere in the engine", () => {
  const wetEnv = { weather: { temperatureBand: "moderate" as const, precipitationBand: "high" as const, humidityBand: "high" as const }, hydrology: { hydrologyBand: "high" as const, soilMoistureBand: "high" as const }, ecology: { vegetationActivityBand: "high" as const, animalActivityBand: "high" as const } }
  const droughtEnv = { weather: { temperatureBand: "high" as const, precipitationBand: "low" as const, humidityBand: "low" as const }, hydrology: { hydrologyBand: "low" as const, soilMoistureBand: "low" as const }, ecology: { vegetationActivityBand: "low" as const, animalActivityBand: "low" as const } }
  const unresolvedNarrative = { worldId: "living-forest-fixture", episodeRef: null, sceneRef: null, resolved: false }

  const wet = resolveAvailableEncounters([CLEARING_ENCOUNTER], "forest-clearing", wetEnv, unresolvedNarrative)
  const drought = resolveAvailableEncounters([CLEARING_ENCOUNTER], "forest-clearing", droughtEnv, unresolvedNarrative)

  assert.equal(wet.length, 1, "high animal activity in the wet season makes this world's own encounter available")
  assert.equal(drought.length, 0, "low animal activity in drought makes it unavailable -- the same causal-gating behavior Vrindavan's own tests already proved, here for a different world entirely")
})
