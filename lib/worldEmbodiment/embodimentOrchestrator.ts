import { computeSpatialLayout, resolveWorldEmbodiment } from "@avatark/world-embodiment-runtime"
import type { WorldEmbodimentSnapshot } from "@avatark/world-embodiment-contracts"
import type { ExperienceRegistry } from "@avatark/experience-registry"
import type { WorldRuntime } from "@avatark/living-world-runtime"
import { LIVING_VRINDAVAN_DEFINITION } from "../livingWorldRuntime/vrindavanDefinition.ts"
import { LIVING_VRINDAVAN_EXPERIENCE } from "../livingWorldRuntime/experienceDefinition.ts"
import { findTransitionAffordance } from "../livingWorldRuntime/experienceCatalog.ts"
import { LIVING_VRINDAVAN_ENTITY_ARCHETYPES, LIVING_VRINDAVAN_SYSTEMS_PROVENANCE } from "../livingSystems/systemsDefinition.ts"
import { resolveLivingSystemsSnapshot } from "../livingSystems/orchestrator.ts"
import { WORLD_ID } from "../livingSystems/singleton.ts"

// Sprint 8, Phase 4: the Host's one read path from Living Systems'
// authoritative WorldSnapshot to the renderer-facing WorldEmbodimentSnapshot.
// Every call re-resolves from Living Systems (Sprint 7) -- this module
// never caches simulation state itself, and never advances it.

const SPATIAL_LAYOUT = computeSpatialLayout(LIVING_VRINDAVAN_DEFINITION.locations)
const LOCATION_NAMES: Record<string, string> = Object.fromEntries(LIVING_VRINDAVAN_DEFINITION.locations.map((l) => [l.id, l.name]))
const EXPERIENCE_BY_LOCATION = Object.fromEntries(LIVING_VRINDAVAN_EXPERIENCE.locations.map((l) => [l.id, l]))
const ARCHETYPES_BY_ID = Object.fromEntries(LIVING_VRINDAVAN_ENTITY_ARCHETYPES.map((a) => [a.id, a]))

// Same legal-next-location filter lib/livingWorldRuntime/accountAdapter.ts's
// own findNextLocations already uses (Sprint 5/6) -- reimplemented here
// rather than imported, since that function is Sprint 6's UI-shaped
// account-summary adapter, not a general-purpose graph query this module
// should couple to.
function findReachableLocationIds(currentLocationId: string, visitedLocationIds: string[]): string[] {
  return LIVING_VRINDAVAN_DEFINITION.locations
    .filter((location) => {
      if (location.id === currentLocationId) return false
      const requires = location.requiresLocationIds ?? []
      return requires.length > 0 && requires.every((id) => visitedLocationIds.includes(id))
    })
    .map((location) => location.id)
}

export interface ResolveWorldEmbodimentSnapshotParams {
  userId: string
  locationId: string
  livingWorldRuntime: WorldRuntime
  experienceRegistry?: ExperienceRegistry
  soundEnabled?: boolean
  now?: () => string
}

export async function resolveWorldEmbodimentSnapshot(params: ResolveWorldEmbodimentSnapshotParams): Promise<WorldEmbodimentSnapshot> {
  const currentSnapshot = await resolveLivingSystemsSnapshot({
    userId: params.userId,
    locationId: params.locationId,
    livingWorldRuntime: params.livingWorldRuntime,
    experienceRegistry: params.experienceRegistry,
    now: params.now,
  })

  const worldState = await params.livingWorldRuntime.getState(params.userId, WORLD_ID)
  const reachableLocationIds = worldState ? findReachableLocationIds(params.locationId, worldState.visitedLocationIds) : []

  const reachableSnapshots = await Promise.all(
    reachableLocationIds.map((locationId) =>
      resolveLivingSystemsSnapshot({
        userId: params.userId,
        locationId,
        livingWorldRuntime: params.livingWorldRuntime,
        experienceRegistry: params.experienceRegistry,
        now: params.now,
      }),
    ),
  )

  const transitions = reachableLocationIds.map((toLocationId) => ({
    toLocationId,
    affordance: findTransitionAffordance(WORLD_ID, params.locationId, toLocationId),
  }))

  return resolveWorldEmbodiment({
    currentSnapshot,
    reachableSnapshots,
    locationNames: LOCATION_NAMES,
    spatialLayout: SPATIAL_LAYOUT,
    experienceByLocation: EXPERIENCE_BY_LOCATION,
    archetypesById: ARCHETYPES_BY_ID,
    transitions,
    soundEnabled: params.soundEnabled ?? false,
    provenance: {
      worldArtifactSpecId: LIVING_VRINDAVAN_SYSTEMS_PROVENANCE.worldArtifactSpecId,
      experienceArtifactSpecId: LIVING_VRINDAVAN_EXPERIENCE.provenance.specId,
      systemsArtifactSpecId: LIVING_VRINDAVAN_SYSTEMS_PROVENANCE.specId,
      canonDocIds: [...new Set([...LIVING_VRINDAVAN_EXPERIENCE.provenance.canonDocIds, ...LIVING_VRINDAVAN_SYSTEMS_PROVENANCE.canonDocIds])],
    },
  })
}
