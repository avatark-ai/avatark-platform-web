import { deriveWeather } from "@avatark/living-systems-runtime"
import type { LivingEntityState, SharedWorldState } from "@avatark/living-systems-contracts"
import type { DurableWorldState, WorldInstanceId } from "@avatark/world-persistence-contracts"
import { LIVING_VRINDAVAN_ENTITY_ARCHETYPES, LIVING_VRINDAVAN_SEASONS } from "../livingSystems/systemsDefinition.ts"
import { durableWorldStateRepository, worldInstanceRepository, LIVING_VRINDAVAN_DEFINITION_ID, LIVING_VRINDAVAN_DEFINITION_VERSION } from "./singleton.ts"

// Sprint 9: the durable-layer analogue of lib/livingSystems/singleton.ts's
// own initialSharedWorldState/initialEntities/getOrInitSharedWorldState --
// same seed values (Vasanta at tick 0), same StudioK-sourced season/
// archetype data, but written through the NEW versioned, per-
// worldInstanceId DurableWorldStateRepository instead of Sprint 7's
// single global in-memory Map.
function freshSharedState(worldInstanceId: WorldInstanceId): SharedWorldState {
  const firstSeason = LIVING_VRINDAVAN_SEASONS[0]
  const weather = deriveWeather(firstSeason.environmentalEnvelope)
  return {
    worldId: worldInstanceId,
    worldVersion: LIVING_VRINDAVAN_DEFINITION_VERSION,
    clock: { worldId: worldInstanceId, tick: 0, paused: false },
    season: { currentSeasonId: firstSeason.id, enteredAtTick: 0 },
    environment: {
      weather,
      hydrology: { hydrologyBand: firstSeason.environmentalEnvelope.hydrologyBaselineBand, soilMoistureBand: firstSeason.environmentalEnvelope.hydrologyBaselineBand },
      ecology: { vegetationActivityBand: firstSeason.environmentalEnvelope.vegetationActivityBand, animalActivityBand: firstSeason.environmentalEnvelope.animalActivityBand },
    },
  }
}

function freshEntities(): LivingEntityState[] {
  return LIVING_VRINDAVAN_ENTITY_ARCHETYPES.map((archetype) => ({
    id: `${archetype.id}-1`,
    archetypeId: archetype.id,
    locationId: archetype.locationId,
    lifecyclePhase: archetype.initialLifecyclePhase,
    attributes: {},
    lastUpdatedTick: 0,
  }))
}

// Idempotent (Phase 9): a world instance is created at most once, and a
// concurrent double-seed race resolves to whichever save actually landed
// first -- never two divergent "fresh" states silently coexisting.
export async function ensureWorldInstance(worldInstanceId: WorldInstanceId, now: () => string): Promise<void> {
  await worldInstanceRepository.create({ id: worldInstanceId, definitionId: LIVING_VRINDAVAN_DEFINITION_ID, definitionVersion: LIVING_VRINDAVAN_DEFINITION_VERSION, createdAt: now() })
}

export async function loadOrSeedDurableWorldState(worldInstanceId: WorldInstanceId, now: () => string): Promise<DurableWorldState> {
  const existing = await durableWorldStateRepository.load(worldInstanceId)
  if (existing) return existing

  const seedResult = await durableWorldStateRepository.conditionalSave({ worldInstanceId, sharedState: freshSharedState(worldInstanceId), entities: freshEntities(), updatedAt: now() }, null)
  if (seedResult.status === "conflict") return seedResult.currentState
  const seeded = await durableWorldStateRepository.load(worldInstanceId)
  if (!seeded) throw new Error(`invariant violated: durable state for ${worldInstanceId} vanished immediately after a successful seed save`)
  return seeded
}
