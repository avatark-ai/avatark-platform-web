import type { EntityId } from "@avatark/living-systems-contracts"
import type { LocationId } from "@avatark/runtime-contracts"
import type { AdaptationEffect } from "@avatark/world-adaptation-contracts"
import type { PatchId } from "./ids.ts"
import type { TerritoryClaim } from "./territory.ts"

// Sprint 16 Phase 0 architecture, section 12: a semantic movement
// CONTEXT, not a resolver and not a replacement for Sprint 10's own
// MovementIntent -- no pathfinding, no NavMesh, no coordinates. This is
// the renderer-neutral bundle of spatial facts a future movement
// resolver (still not built here) would consult; today it exists so a
// caller can OBSERVE what spatial context an entity's current movement
// intent was/would be evaluated against, composing existing systems
// rather than replacing any of them.
export interface SpatialMovementContext {
  entityId: EntityId
  currentLocationId: LocationId
  currentPatchId: PatchId | null
  /** Every Patch reachable from `currentPatchId` via traversable
   * topology (see @avatark/spatial-ecology-runtime's own
   * `reachablePatchIds`) -- includes currentPatchId itself. Empty when
   * currentPatchId is null (a LocationId outside the spatial grammar --
   * see Sprint 16 Phase 0's own "unresolved location" allowance). */
  reachablePatchIds: PatchId[]
  /** This entity's own group's/home-range's TerritoryClaims, if any --
   * never a claim belonging to a different owner. */
  ownTerritoryClaims: TerritoryClaim[]
  /** Sprint 15 AdaptationEffects relevant to this entity's own spatial
   * behavior right now: ENTITY-domain effects about this entityId,
   * GROUP-domain effects about this entity's own group (if any), and
   * PLACE-domain effects about currentLocationId. Read-only reference
   * to Sprint 15's own effect records -- Sprint 16 never derives a
   * second adaptation value from these, it only surfaces them. */
  relevantAdaptationEffects: AdaptationEffect[]
}
