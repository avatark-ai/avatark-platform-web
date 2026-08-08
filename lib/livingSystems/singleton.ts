import { deriveWeather, InMemoryLivingEntityStateRepository, InMemoryProtectedNarrativeStateRepository, InMemorySharedWorldStateRepository, InMemoryWorldSystemEventRepository } from "@avatark/living-systems-runtime"
import type { LivingEntityState, SharedWorldState } from "@avatark/living-systems-contracts"
import { LIVING_VRINDAVAN_ENTITY_ARCHETYPES, LIVING_VRINDAVAN_SEASONS } from "./systemsDefinition.ts"

// Sprint 7: a module-scoped, process-lifetime Shared World State + Entity
// State store for Living Vrindavan -- same documented simplification
// lib/livingWorldRuntime/singleton.ts already carries for Living World
// state (no Postgres repository exists yet; state survives across
// requests within one running Node process, resets on restart). This is
// genuinely NEW state (Phase 0 confirmed nothing pre-existing models
// world clock/season/environment/entities) -- unlike visitor memory,
// there is no existing system to project this from.
export const WORLD_ID = "living-vrindavan"

export const sharedWorldStateRepository = new InMemorySharedWorldStateRepository()
export const livingEntityStateRepository = new InMemoryLivingEntityStateRepository()
// No seed -- every world defaults to an honestly-unresolved protected-
// narrative projection until a real canonical-narrative system exists.
export const protectedNarrativeStateRepository = new InMemoryProtectedNarrativeStateRepository()
export const worldSystemEventRepository = new InMemoryWorldSystemEventRepository()

function initialSharedWorldState(): SharedWorldState {
  const firstSeason = LIVING_VRINDAVAN_SEASONS[0]
  const weather = deriveWeather(firstSeason.environmentalEnvelope)
  return {
    worldId: WORLD_ID,
    worldVersion: 1,
    clock: { worldId: WORLD_ID, tick: 0, paused: false },
    season: { currentSeasonId: firstSeason.id, enteredAtTick: 0 },
    environment: {
      weather,
      hydrology: { hydrologyBand: firstSeason.environmentalEnvelope.hydrologyBaselineBand, soilMoistureBand: firstSeason.environmentalEnvelope.hydrologyBaselineBand },
      ecology: { vegetationActivityBand: firstSeason.environmentalEnvelope.vegetationActivityBand, animalActivityBand: firstSeason.environmentalEnvelope.animalActivityBand },
    },
  }
}

function initialEntities(): LivingEntityState[] {
  return LIVING_VRINDAVAN_ENTITY_ARCHETYPES.map((archetype) => ({
    id: `${archetype.id}-1`,
    archetypeId: archetype.id,
    locationId: archetype.locationId,
    lifecyclePhase: archetype.initialLifecyclePhase,
    attributes: {},
    lastUpdatedTick: 0,
  }))
}

// Lazily seeds the world on first access -- so a fresh process/test run
// always starts from Vasanta at tick 0, deterministically, without a
// separate "seed the database" step this sprint's in-memory reference
// architecture doesn't need.
export async function getOrInitSharedWorldState(): Promise<SharedWorldState> {
  const existing = await sharedWorldStateRepository.get(WORLD_ID)
  if (existing) return existing

  const fresh = initialSharedWorldState()
  await sharedWorldStateRepository.save(fresh)
  for (const entity of initialEntities()) {
    await livingEntityStateRepository.save(WORLD_ID, entity)
  }
  return fresh
}

// Test-only: returns the singleton to its freshly-seeded state. Used by
// tests that need a clean world per test case without restarting the
// process. Never called from production request paths.
export async function resetLivingSystemsSingletonForTests(): Promise<void> {
  await sharedWorldStateRepository.save(initialSharedWorldState())
  for (const entity of initialEntities()) {
    await livingEntityStateRepository.save(WORLD_ID, entity)
  }
}
