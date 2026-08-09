import type { EntityId } from "@avatark/living-systems-contracts"
import type { GroupId } from "@avatark/living-population-contracts"
import type { OccupancyLevel, PlaceOccupancy } from "@avatark/living-rhythms-contracts"

// Sprint 16: composes Sprint 13's own per-LocationId PlaceOccupancy,
// never a second occupancy engine. A Patch's occupancy is the union of
// entities/groups present at any LocationId it contains, and its
// occupancyLevel is whichever contained location's own level is
// "busiest" -- a small, deterministic, total order over the existing
// closed OccupancyLevel vocabulary (Sprint 13), not a new concept.
const OCCUPANCY_RANK: Record<OccupancyLevel, number> = { QUIET: 0, RESTING: 1, DISPERSING: 2, ACTIVE: 3, GATHERING: 4 }

export interface PatchOccupancyRollup {
  occupancyLevel: OccupancyLevel
  presentEntityIds: EntityId[]
  presentGroupIds: GroupId[]
}

export function rollupPatchOccupancy(occupancies: PlaceOccupancy[]): PatchOccupancyRollup {
  if (occupancies.length === 0) return { occupancyLevel: "QUIET", presentEntityIds: [], presentGroupIds: [] }

  const busiest = occupancies.reduce((a, b) => (OCCUPANCY_RANK[b.occupancyLevel] > OCCUPANCY_RANK[a.occupancyLevel] ? b : a))
  const presentEntityIds = [...new Set(occupancies.flatMap((o) => o.presentEntityIds))]
  const presentGroupIds = [...new Set(occupancies.flatMap((o) => o.presentGroupIds))]

  return { occupancyLevel: busiest.occupancyLevel, presentEntityIds, presentGroupIds }
}
