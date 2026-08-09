import type { EntityId } from "@avatark/living-systems-contracts"
import type { GroupId } from "@avatark/living-population-contracts"
import type { LocationId } from "@avatark/runtime-contracts"
import type { AdaptationEffect } from "@avatark/world-adaptation-contracts"
import type { SpatialEdge, SpatialMembership, SpatialMovementContext, TerritoryClaim } from "@avatark/spatial-ecology-contracts"
import { reachablePatchIds } from "./topologyResolution.ts"
import { resolvePlaceEffectLocationId } from "./adaptationEffectLocation.ts"

export interface BuildSpatialMovementContextParams {
  entityId: EntityId
  currentLocationId: LocationId
  groupId: GroupId | null
  membershipIndex: Map<LocationId, SpatialMembership>
  edges: SpatialEdge[]
  /** Every currently-derived TerritoryClaim in the world -- filtered
   * here to this entity's own group (a HomeRange's own ownerId, per
   * Sprint 12, is a GroupId for a group-owned range or an EntityId for
   * an entity-owned one). */
  allTerritoryClaims: TerritoryClaim[]
  /** Every currently-persisted Sprint 15 AdaptationEffect in the world
   * -- filtered here to this entity/group/place. */
  allAdaptationEffects: AdaptationEffect[]
}

// Sprint 16 Phase 0 architecture, section 12: assembles the renderer-
// neutral spatial CONTEXT a future movement resolver would consult --
// no pathfinding, no coordinates, no mutation of Sprint 10's own
// MovementIntent. Pure composition of already-derived facts.
export function buildSpatialMovementContext(params: BuildSpatialMovementContextParams): SpatialMovementContext {
  const membership = params.membershipIndex.get(params.currentLocationId) ?? null
  const currentPatchId = membership?.patchId ?? null

  const reachable = currentPatchId ? reachablePatchIds(params.edges, currentPatchId) : []

  const ownTerritoryClaims = params.allTerritoryClaims.filter((claim) => claim.ownerId === params.entityId || (params.groupId !== null && claim.ownerId === params.groupId))

  const relevantAdaptationEffects = params.allAdaptationEffects.filter(
    (effect) =>
      (effect.domain === "ENTITY" && effect.entityId === params.entityId) ||
      (effect.domain === "GROUP" && params.groupId !== null && effect.groupId === params.groupId) ||
      (effect.domain === "PLACE" && resolvePlaceEffectLocationId(effect) === params.currentLocationId),
  )

  return {
    entityId: params.entityId,
    currentLocationId: params.currentLocationId,
    currentPatchId,
    reachablePatchIds: reachable,
    ownTerritoryClaims,
    relevantAdaptationEffects,
  }
}
