import type { EntityId } from "@avatark/living-systems-contracts"
import type { GroupId, BehaviorType } from "@avatark/living-population-contracts"
import type { LocationId } from "@avatark/runtime-contracts"

// Sprint 13, Phase 9: a closed, deterministic occupancy vocabulary --
// derived from present-entity count and activity mix, never authored
// prose, never a UI-only count.
export type OccupancyLevel = "QUIET" | "ACTIVE" | "GATHERING" | "DISPERSING" | "RESTING"

// Sprint 13, Phase 9: a location's own derived condition, reconstructed
// FRESH from authoritative population/group state every time --
// deliberately no repository, no `save` method (see
// docs/SPRINT13_GROUND_TRUTH.md's decision 3: never a parallel truth
// store, the same posture Sprint 10's own `PopulationSnapshot` already
// established).
export interface PlaceOccupancy {
  locationId: LocationId
  tick: number
  presentEntityIds: EntityId[]
  presentGroupIds: GroupId[]
  entityCountsByArchetype: Record<string, number>
  activityMix: Partial<Record<BehaviorType, number>>
  occupancyLevel: OccupancyLevel
}
