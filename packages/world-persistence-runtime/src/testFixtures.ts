import type { EntityArchetype, LivingEntityState, SeasonDefinition, SharedWorldState } from "@avatark/living-systems-contracts"

// Sprint 9 test fixtures reusing exactly the already-authorized
// Vasanta/Grīṣma reference states this repo's own Sprint 7 tests use
// (packages/living-systems-runtime/src/simulation.test.ts) -- no new
// season, location, or entity vocabulary invented for Sprint 9.
export const VASANTA_ENVELOPE = { temperatureBand: "moderate" as const, precipitationBand: "moderate" as const, humidityBand: "moderate" as const, hydrologyBaselineBand: "moderate" as const, vegetationActivityBand: "high" as const, animalActivityBand: "moderate" as const }
export const GRISHMA_ENVELOPE = { temperatureBand: "high" as const, precipitationBand: "low" as const, humidityBand: "low" as const, hydrologyBaselineBand: "low" as const, vegetationActivityBand: "moderate" as const, animalActivityBand: "low" as const }

export const VASANTA: SeasonDefinition = { id: "vasanta", name: "Vasanta", order: 1, canonId: "STK-CAN-006", environmentalEnvelope: VASANTA_ENVELOPE, minDurationTicks: 4, allowedNextSeasonIds: ["grishma"] }
export const GRISHMA: SeasonDefinition = { id: "grishma", name: "Grīṣma", order: 2, canonId: "STK-CAN-006", environmentalEnvelope: GRISHMA_ENVELOPE, minDurationTicks: 4, allowedNextSeasonIds: [] }
export const VRINDAVAN_SEASONS = [VASANTA, GRISHMA]

export const RIVERBANK_VEGETATION: EntityArchetype = { id: "riverbank-vegetation", name: "Riverbank Vegetation", locationId: "yamuna", lifecyclePhases: ["dormant", "budding", "flowering", "seeding"], initialLifecyclePhase: "dormant" }
export const VRINDAVAN_ARCHETYPES = [RIVERBANK_VEGETATION]

export function freshVrindavanSharedState(worldInstanceId = "living-vrindavan"): SharedWorldState {
  return {
    worldId: worldInstanceId,
    worldVersion: 1,
    clock: { worldId: worldInstanceId, tick: 0, paused: false },
    season: { currentSeasonId: "vasanta", enteredAtTick: 0 },
    environment: {
      weather: { temperatureBand: "moderate", precipitationBand: "moderate", humidityBand: "moderate" },
      hydrology: { hydrologyBand: "moderate", soilMoistureBand: "moderate" },
      ecology: { vegetationActivityBand: "high", animalActivityBand: "moderate" },
    },
  }
}

export function freshVrindavanEntities(): LivingEntityState[] {
  return [{ id: "e1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "dormant", attributes: {}, lastUpdatedTick: 0 }]
}

export const fixedNow = () => "2026-08-08T00:00:00.000Z"
