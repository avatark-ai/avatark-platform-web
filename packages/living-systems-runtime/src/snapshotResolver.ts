import { freezeWorldSnapshot } from "@avatark/living-systems-contracts"
import type {
  EncounterRule,
  LivingEntityState,
  ProtectedNarrativeProjection,
  SeasonDefinition,
  SharedWorldState,
  VisitorWorldMemory,
  WorldSnapshot,
  WorldSnapshotProvenance,
} from "@avatark/living-systems-contracts"
import type { LocationId } from "@avatark/runtime-contracts"
import { resolveAvailableEncounters } from "./encounterResolution.ts"
import { findSeasonDefinition } from "./seasonTransition.ts"

export interface ResolveWorldSnapshotParams {
  sharedState: SharedWorldState
  seasonDefinitions: SeasonDefinition[]
  entities: LivingEntityState[]
  encounterRules: EncounterRule[]
  locationId: LocationId
  visitorMemory: VisitorWorldMemory
  protectedNarrative: ProtectedNarrativeProjection
  provenance: WorldSnapshotProvenance
  now: () => string
}

// Sprint 7, Phase 12: assembles the canonical renderer-facing snapshot
// from internal simulation state -- and only from what the renderer is
// meant to see. No SeasonDefinition/EntityArchetype/EncounterRule
// (StudioK's authored intent) and no raw SharedWorldState/full entity
// list for the whole world crosses this boundary; only what's resolved
// for this specific locationId and visitor does. Frozen before return --
// immutable from the renderer's perspective, enforced at runtime.
export function resolveWorldSnapshot(params: ResolveWorldSnapshotParams): WorldSnapshot {
  const { sharedState, seasonDefinitions, entities, encounterRules, locationId, visitorMemory, protectedNarrative, provenance, now } = params
  const seasonDefinition = findSeasonDefinition(seasonDefinitions, sharedState.season.currentSeasonId)
  const presentEntities = entities.filter((e) => e.locationId === locationId)
  const availableEncounters = resolveAvailableEncounters(encounterRules, locationId, sharedState.environment, protectedNarrative)

  const snapshot: WorldSnapshot = {
    worldId: sharedState.worldId,
    worldVersion: sharedState.worldVersion,
    simulationTick: sharedState.clock.tick,
    locationId,
    season: { id: seasonDefinition.id, name: seasonDefinition.name },
    weather: sharedState.environment.weather,
    hydrology: sharedState.environment.hydrology,
    ecology: sharedState.environment.ecology,
    presentEntities,
    availableEncounters,
    visitorContext: {
      userId: visitorMemory.userId,
      lastLocationId: visitorMemory.lastLocationId,
      meaningfulEncounterCount: visitorMemory.meaningfulEncounters.length,
      reflectionCount: visitorMemory.reflectionRefs.length,
    },
    protectedNarrative,
    generatedAt: now(),
    provenance,
  }

  return freezeWorldSnapshot(snapshot)
}
