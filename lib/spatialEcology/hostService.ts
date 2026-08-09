import { resolvePlaceOccupancy, resolveResourceOpportunities } from "@avatark/living-rhythms-runtime"
import type { PlaceOccupancyEntityInput } from "@avatark/living-rhythms-runtime"
import type { PlaceOccupancy } from "@avatark/living-rhythms-contracts"
import type { HomeRange } from "@avatark/social-ecology-contracts"
import type { WorldLifecycleState } from "@avatark/world-persistence-contracts"
import type { SpatialMembership, SpatialMovementContext, SpatialSnapshot, TerritoryClaim } from "@avatark/spatial-ecology-contracts"
import {
  buildSpatialMembershipIndex,
  buildSpatialMovementContext,
  resolvePatchState,
  resolveRouteState,
  resolveTerritoryClaims,
  resolveTerritoryPressure,
} from "@avatark/spatial-ecology-runtime"
import { commitWakeCompletion, getWorldState } from "../worldPersistence/hostService.ts"
import { getPopulationSnapshot } from "../livingPopulation/hostService.ts"
import { VRINDAVAN_RESOURCE_AFFORDANCES } from "../livingPopulation/vrindavanPopulationDefinition.ts"
import { getEmbodimentWithAdaptation, wakeWorldWithAdaptation, getWorldAdaptationEffects } from "../worldAdaptation/hostService.ts"
import type { WakeWorldWithAdaptationResult, WorldEmbodimentSnapshotWithAdaptation } from "../worldAdaptation/hostService.ts"
import { homeRangeRepository } from "../socialEcology/singleton.ts"
import { territoryClaimRepository } from "./singleton.ts"
import { VRINDAVAN_SPATIAL_EDGES, VRINDAVAN_SPATIAL_GRAMMAR, VRINDAVAN_ROUTES } from "./vrindavanSpatialDefinition.ts"

const defaultNow = () => new Date().toISOString()

// Sprint 16: built once from the STATIC Vrindavan grammar -- cheap
// enough to rebuild per call (a handful of locations today), kept
// module-scoped only to avoid rebuilding it inside a tight loop.
const MEMBERSHIP_INDEX: Map<string, SpatialMembership> = buildSpatialMembershipIndex(VRINDAVAN_SPATIAL_GRAMMAR)

async function collectGroupHomeRanges(worldInstanceId: string, groupIds: string[]): Promise<HomeRange[]> {
  const found = await Promise.all(groupIds.map((groupId) => homeRangeRepository.get(worldInstanceId, "GROUP", groupId)))
  return found.filter((range): range is HomeRange => range !== null)
}

async function resolveAllPlaceOccupancies(worldInstanceId: string, tick: number): Promise<PlaceOccupancy[]> {
  const populationSnapshot = await getPopulationSnapshot(worldInstanceId)
  const entitiesByLocation = new Map<string, PlaceOccupancyEntityInput[]>()
  for (const entity of populationSnapshot.entities) {
    if (!entitiesByLocation.has(entity.locationId)) entitiesByLocation.set(entity.locationId, [])
    entitiesByLocation.get(entity.locationId)!.push({ entityId: entity.entityId, archetypeId: entity.archetypeId, activity: entity.activity, groupId: entity.groupId })
  }

  // Every Local Place this grammar knows about gets an occupancy read,
  // even one with zero entities present (QUIET) -- the same "resolved
  // fresh for every known location" posture Sprint 13's own
  // resolvePlaceOccupancy callers already hold.
  return VRINDAVAN_SPATIAL_GRAMMAR.localPlaces.map((place) => resolvePlaceOccupancy(place.locationId, entitiesByLocation.get(place.locationId) ?? [], tick))
}

// Sprint 16 Phase 0 architecture, section 17: PatchState/RouteState/
// TerritoryPressure are ALWAYS resolved fresh from already-durable
// state -- this function has no repository of its own beyond the one
// persisted TerritoryClaim read. Composes existing systems only: never
// a second causal, occupancy, or territory engine.
export async function getSpatialSnapshot(worldInstanceId: string, now: () => string = defaultNow): Promise<SpatialSnapshot> {
  const state = await getWorldState(worldInstanceId, now)
  const tick = state.sharedState.clock.tick

  const resourceOpportunities = resolveResourceOpportunities(VRINDAVAN_RESOURCE_AFFORDANCES, state.sharedState.environment, tick)
  const placeOccupancies = await resolveAllPlaceOccupancies(worldInstanceId, tick)
  const allAdaptationEffects = await getWorldAdaptationEffects(worldInstanceId)
  const placeAdaptationEffects = allAdaptationEffects.filter((effect) => effect.domain === "PLACE")

  const patchStates = VRINDAVAN_SPATIAL_GRAMMAR.patches.map((patch) =>
    resolvePatchState({ patch, tick, environment: state.sharedState.environment, resourceOpportunities, placeOccupancies, edges: VRINDAVAN_SPATIAL_EDGES, placeAdaptationEffects }),
  )

  const claims = await territoryClaimRepository.listByWorld(worldInstanceId)
  const territoryPressures = resolveTerritoryPressure(claims, tick)

  const routeStates = VRINDAVAN_ROUTES.map((route) => resolveRouteState(route, VRINDAVAN_SPATIAL_EDGES, tick))

  return { worldId: worldInstanceId, tick, patchStates, territoryPressures, routeStates }
}

export interface WakeWorldWithSpatialEcologyResult {
  adaptation: WakeWorldWithAdaptationResult
  spatial: SpatialSnapshot
  lifecycleState: WorldLifecycleState
}

// Sprint 16, mission's own causal-order chain, closed: the one place
// Sprint 7's causal engine through Sprint 15's own adaptation are all
// driven by the SAME wake, now ALSO deriving TerritoryClaims from
// whatever HomeRanges currently exist and persisting them (idempotent
// append, content-derived id). Composes `wakeWorldWithAdaptation`,
// never modifies it -- this file adds a spatial pass ON TOP, the same
// layering discipline every prior sprint's own Host service holds.
//
// Sprint 17: this is the REAL outermost composed wake function -- the
// one and only call to `commitWakeCompletion` for the entire chain
// happens here, and only after every downstream layer (population
// through this file's own TerritoryClaim persistence) has already
// succeeded. See lib/worldPersistence/hostService.ts's own
// `commitWakeCompletion`/`resolveTicksToApply` doc comments for why
// this sequencing is what makes a crash anywhere in the chain safely
// retryable instead of silently dropping ticks downstream layers never
// got to process.
export async function wakeWorldWithSpatialEcology(worldInstanceId: string, ownerId: string, now: () => string = defaultNow): Promise<WakeWorldWithSpatialEcologyResult> {
  const adaptation = await wakeWorldWithAdaptation(worldInstanceId, ownerId, now)

  const afterMemory = adaptation.realization.rhythms.social.memory
  const afterTick = afterMemory.world.state.sharedState.clock.tick
  const groupIds = afterMemory.population.groups.map((group) => group.id)

  const homeRanges = await collectGroupHomeRanges(worldInstanceId, groupIds)
  const claims = resolveTerritoryClaims(worldInstanceId, homeRanges, MEMBERSHIP_INDEX, afterTick)
  for (const claim of claims) await territoryClaimRepository.append(claim)

  const spatial = await getSpatialSnapshot(worldInstanceId, now)

  const lifecycleState = await commitWakeCompletion(worldInstanceId, afterMemory.world.lifecycleStateBeforeCommit, afterTick, now)

  return { adaptation, spatial, lifecycleState }
}

// Sprint 16 Phase 0 architecture, section 12: assembles the renderer-
// neutral spatial movement CONTEXT for one entity -- no pathfinding, no
// mutation of Sprint 10's own MovementIntent. A pure read composed from
// already-authoritative state.
export async function getSpatialMovementContext(worldInstanceId: string, entityId: string, now: () => string = defaultNow): Promise<SpatialMovementContext | null> {
  const populationSnapshot = await getPopulationSnapshot(worldInstanceId, now)
  const entity = populationSnapshot.entities.find((e) => e.entityId === entityId)
  if (!entity) return null

  const allTerritoryClaims: TerritoryClaim[] = await territoryClaimRepository.listByWorld(worldInstanceId)
  const allAdaptationEffects = await getWorldAdaptationEffects(worldInstanceId)

  return buildSpatialMovementContext({
    entityId,
    currentLocationId: entity.locationId,
    groupId: entity.groupId,
    membershipIndex: MEMBERSHIP_INDEX,
    edges: VRINDAVAN_SPATIAL_EDGES,
    allTerritoryClaims,
    allAdaptationEffects,
  })
}

export interface WorldEmbodimentSnapshotWithSpatialEcology {
  embodimentWithAdaptation: WorldEmbodimentSnapshotWithAdaptation
  spatialSnapshot: SpatialSnapshot
}

// Sprint 16: Host-level composition ONLY, one layer above Sprint 15's
// own WorldEmbodimentSnapshotWithAdaptation -- never a further widening
// of @avatark/world-embodiment-contracts itself (Sprint 10 widened it
// once; every sprint since has declined to widen it further). The
// renderer receives this projection; it never queries
// territoryClaimRepository itself.
export async function getEmbodimentWithSpatialEcology(worldInstanceId: string, userId: string, locationId: string, reachableLocationIds: string[], sinceTick: number | null, now: () => string = defaultNow): Promise<WorldEmbodimentSnapshotWithSpatialEcology> {
  const embodimentWithAdaptation = await getEmbodimentWithAdaptation(worldInstanceId, userId, locationId, reachableLocationIds, sinceTick, now)
  const spatialSnapshot = await getSpatialSnapshot(worldInstanceId, now)
  return { embodimentWithAdaptation, spatialSnapshot }
}
