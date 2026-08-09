import type { EntityId } from "@avatark/living-systems-contracts"
import type { LocationId } from "@avatark/runtime-contracts"

// Sprint 10, Phase 7: SEMANTIC movement intent only -- no coordinates,
// no path, no spatial geometry. The core behavioral engine operates
// entirely against location identity and the world graph; translating
// "MoveToLocation X" into a spatial path/region is the embodiment
// layer's job, later, per-renderer, never this layer's.
export type MovementIntentType = "MoveToLocation" | "Remain" | "FollowGroup" | "ApproachResource" | "ReturnToGroup"

export interface MovementIntent {
  entityId: EntityId
  type: MovementIntentType
  targetLocationId: LocationId | null
}
