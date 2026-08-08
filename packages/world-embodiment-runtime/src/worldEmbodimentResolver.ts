import type { EntityArchetype, WorldSnapshot } from "@avatark/living-systems-contracts"
import type { LocationExperience, TransitionAffordance } from "@avatark/renderer-contracts"
import type { LocationId } from "@avatark/runtime-contracts"
import type { EmbodiedRegion, SpatialNode, WorldEmbodimentProvenance, WorldEmbodimentSnapshot } from "@avatark/world-embodiment-contracts"
import { freezeWorldEmbodimentSnapshot } from "@avatark/world-embodiment-contracts"
import { resolveEncounterPresentation } from "./encounterPresentationResolver.ts"
import { resolveEntityPresentation } from "./entityPresentationResolver.ts"
import { resolveEnvironmentPresentation } from "./environmentPresentationResolver.ts"

export interface ResolveWorldEmbodimentParams {
  currentSnapshot: WorldSnapshot
  reachableSnapshots: WorldSnapshot[]
  locationNames: Record<LocationId, string>
  spatialLayout: Record<LocationId, SpatialNode>
  experienceByLocation: Record<LocationId, LocationExperience>
  archetypesById: Record<string, EntityArchetype>
  transitions: { toLocationId: LocationId; affordance: TransitionAffordance | null }[]
  soundEnabled: boolean
  provenance: WorldEmbodimentProvenance
}

// Sprint 8, Phase 4: a PROJECTION, not a simulation step. Calls no
// mutator, no repository .save(), no clock advance -- every function
// this module calls (resolveEnvironmentPresentation/
// resolveEntityPresentation/resolveEncounterPresentation) is pure, and
// this function itself does nothing but assemble their outputs plus a
// spatial layout it's handed, already computed. The same
// (currentSnapshot, reachableSnapshots, ...) input always produces the
// same output -- proven by this package's own determinism test.
function buildRegion(
  snapshot: WorldSnapshot,
  spatialLayout: Record<LocationId, SpatialNode>,
  locationNames: Record<LocationId, string>,
  experienceByLocation: Record<LocationId, LocationExperience>,
  archetypesById: Record<string, EntityArchetype>,
  soundEnabled: boolean,
): EmbodiedRegion {
  const locationId = snapshot.locationId
  const experience = experienceByLocation[locationId]
  const environment = resolveEnvironmentPresentation(experience, { weather: snapshot.weather, hydrology: snapshot.hydrology, ecology: snapshot.ecology }, soundEnabled)

  const entities = snapshot.presentEntities
    .filter((entity) => archetypesById[entity.archetypeId])
    .map((entity) => resolveEntityPresentation(entity, archetypesById[entity.archetypeId]))

  const encounters = snapshot.availableEncounters.map(resolveEncounterPresentation)

  return {
    locationId,
    name: locationNames[locationId] ?? locationId,
    spatialNode: spatialLayout[locationId],
    environment,
    entities,
    encounters,
  }
}

export function resolveWorldEmbodiment(params: ResolveWorldEmbodimentParams): WorldEmbodimentSnapshot {
  const current = buildRegion(params.currentSnapshot, params.spatialLayout, params.locationNames, params.experienceByLocation, params.archetypesById, params.soundEnabled)
  const reachable = params.reachableSnapshots.map((snapshot) =>
    buildRegion(snapshot, params.spatialLayout, params.locationNames, params.experienceByLocation, params.archetypesById, params.soundEnabled),
  )

  return freezeWorldEmbodimentSnapshot({
    worldId: params.currentSnapshot.worldId,
    worldVersion: params.currentSnapshot.worldVersion,
    simulationTick: params.currentSnapshot.simulationTick,
    season: params.currentSnapshot.season,
    current,
    reachable,
    transitions: params.transitions,
    visitorContext: params.currentSnapshot.visitorContext,
    protectedNarrative: params.currentSnapshot.protectedNarrative,
    generatedAt: params.currentSnapshot.generatedAt,
    provenance: params.provenance,
  })
}
