import { resolveWorldSnapshot } from "@avatark/living-systems-runtime"
import { emptyVisitorWorldMemory } from "@avatark/living-systems-contracts"
import type { VisitorWorldMemory, WorldSnapshot } from "@avatark/living-systems-contracts"
import { computeSpatialLayout, resolveWorldEmbodiment } from "@avatark/world-embodiment-runtime"
import type { EntityPresentation, WorldEmbodimentSnapshot } from "@avatark/world-embodiment-contracts"
import { LIVING_VRINDAVAN_ENCOUNTER_RULES, LIVING_VRINDAVAN_ENTITY_ARCHETYPES, LIVING_VRINDAVAN_SEASONS, LIVING_VRINDAVAN_SYSTEMS_PROVENANCE } from "../livingSystems/systemsDefinition.ts"
import { LIVING_VRINDAVAN_DEFINITION } from "../livingWorldRuntime/vrindavanDefinition.ts"
import { LIVING_VRINDAVAN_EXPERIENCE } from "../livingWorldRuntime/experienceDefinition.ts"
import { findTransitionAffordance } from "../livingWorldRuntime/experienceCatalog.ts"
import { loadOrSeedDurableWorldState } from "./durableState.ts"
import { protectedNarrativeStateRepository, visitorWorldMemoryRepository } from "./singleton.ts"
import type { WorldInstanceId } from "@avatark/world-persistence-contracts"

// Sprint 9, Phase 13: embodiment continuity through the durable path.
// This is deliberately the SAME two pure functions Sprint 7/8 already
// proved correct (resolveWorldSnapshot, resolveWorldEmbodiment) -- the
// only thing that changes here is where SharedWorldState/entities come
// from: the new DurableWorldStateRepository (survives wake/recovery/
// catch-up) instead of Sprint 7's lib/livingSystems/singleton.ts
// in-memory Map. Recovery introduces no renderer-specific state into
// persistence -- everything renderer-facing is still produced fresh by
// this same resolution chain, every call.

export interface DurableWorldSnapshotParams {
  worldInstanceId: WorldInstanceId
  userId: string
  locationId: string
  now?: () => string
  // Sprint 20, §Step B: additive override, absent for every existing
  // caller (Sprint 19's `authorizeAndRecordParticipation`, this file's
  // own pre-Sprint-20 callers) -- produces byte-identical output to
  // before this field existed. Exists for exactly one real, load-bearing
  // reason: `lib/worldEmbodiment/embodimentOrchestrator.ts`'s production
  // read path has a REAL, already-populated per-user memory derivation
  // (`projectVisitorWorldMemory`, sourced from `@avatark/living-world-runtime`'s
  // WorldRuntime + Experience Registry events, Sprint 7) that is NOT the
  // same store as `visitorWorldMemoryRepository` below (Sprint 11's own
  // repository, which has never been written to by any real production
  // request). Converging the SHARED world dimension (entities/season/
  // clock/protected-narrative) onto this durable family must not
  // silently blank out a real visitor's already-meaningful history by
  // switching to the empty repository underneath them -- the caller who
  // already has the real derivation supplies it here instead.
  visitorMemory?: VisitorWorldMemory
}

export async function resolveDurableWorldSnapshot(params: DurableWorldSnapshotParams): Promise<WorldSnapshot> {
  const now = params.now ?? (() => new Date().toISOString())
  const durableState = await loadOrSeedDurableWorldState(params.worldInstanceId, now)
  const protectedNarrative = await protectedNarrativeStateRepository.get(params.worldInstanceId)
  const visitorMemory = params.visitorMemory ?? (await visitorWorldMemoryRepository.get(params.userId, params.worldInstanceId)) ?? emptyVisitorWorldMemory(params.userId, params.worldInstanceId)

  return resolveWorldSnapshot({
    sharedState: durableState.sharedState,
    seasonDefinitions: LIVING_VRINDAVAN_SEASONS,
    entities: [...durableState.entities],
    encounterRules: LIVING_VRINDAVAN_ENCOUNTER_RULES,
    locationId: params.locationId,
    visitorMemory,
    protectedNarrative,
    provenance: {
      worldArtifactSpecId: LIVING_VRINDAVAN_SYSTEMS_PROVENANCE.worldArtifactSpecId,
      systemsArtifactSpecId: LIVING_VRINDAVAN_SYSTEMS_PROVENANCE.specId,
      canonDocIds: LIVING_VRINDAVAN_SYSTEMS_PROVENANCE.canonDocIds,
    },
    now,
  })
}

const SPATIAL_LAYOUT = computeSpatialLayout(LIVING_VRINDAVAN_DEFINITION.locations)
const LOCATION_NAMES: Record<string, string> = Object.fromEntries(LIVING_VRINDAVAN_DEFINITION.locations.map((l) => [l.id, l.name]))
const EXPERIENCE_BY_LOCATION = Object.fromEntries(LIVING_VRINDAVAN_EXPERIENCE.locations.map((l) => [l.id, l]))
const ARCHETYPES_BY_ID = Object.fromEntries(LIVING_VRINDAVAN_ENTITY_ARCHETYPES.map((a) => [a.id, a]))

export interface DurableWorldEmbodimentSnapshotParams {
  worldInstanceId: WorldInstanceId
  userId: string
  locationId: string
  // Which locations this visitor may currently reach -- owned by
  // @avatark/living-world-runtime's own per-visitor progress state, a
  // domain Sprint 9 does not fold into world persistence (Phase 0: do
  // not move responsibilities merely to make this sprint easier). The
  // caller supplies it, exactly as embodimentOrchestrator.ts's own
  // resolveWorldEmbodimentSnapshot derives it from a WorldRuntime today.
  reachableLocationIds: string[]
  soundEnabled?: boolean
  now?: () => string
  // Sprint 10, Phase 15: optional, additive -- entity presentations from
  // a domain other than Living Systems' own presentEntities (the
  // living-population domain). Absent for every pre-Sprint-10 caller,
  // producing byte-identical output to before this field existed.
  additionalEntityPresentationsByLocation?: Record<string, EntityPresentation[]>
  // Sprint 20: same additive override as `DurableWorldSnapshotParams`
  // above, threaded through unchanged -- applied identically to the
  // current AND every reachable-location snapshot so a visitor's memory
  // is byte-identical regardless of which location the embodiment
  // resolution happens to be resolving for.
  visitorMemory?: VisitorWorldMemory
}

export async function resolveDurableWorldEmbodimentSnapshot(params: DurableWorldEmbodimentSnapshotParams): Promise<WorldEmbodimentSnapshot> {
  const now = params.now ?? (() => new Date().toISOString())

  const currentSnapshot = await resolveDurableWorldSnapshot({ worldInstanceId: params.worldInstanceId, userId: params.userId, locationId: params.locationId, now, visitorMemory: params.visitorMemory })
  const reachableSnapshots = await Promise.all(
    params.reachableLocationIds.map((locationId) => resolveDurableWorldSnapshot({ worldInstanceId: params.worldInstanceId, userId: params.userId, locationId, now, visitorMemory: params.visitorMemory })),
  )
  const transitions = params.reachableLocationIds.map((toLocationId) => ({
    toLocationId,
    affordance: findTransitionAffordance(params.worldInstanceId, params.locationId, toLocationId),
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
    additionalEntityPresentationsByLocation: params.additionalEntityPresentationsByLocation,
  })
}
