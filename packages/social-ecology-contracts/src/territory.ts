import type { LocationId, WorldId } from "@avatark/runtime-contracts"
import type { HomeRangeId } from "./ids.ts"

export type HomeRangeOwnerType = "ENTITY" | "GROUP"

// Sprint 12, Phase 7: renderer-neutral place attachment against the
// EXISTING world graph -- no coordinates, no NavMesh, no Unreal volume.
// `preferredLocationIds` is an ordered preference list (first = most
// preferred); environmental conditions may temporarily make the most
// preferred one unavailable without this record itself changing.
export interface HomeRange {
  id: HomeRangeId
  worldId: WorldId
  ownerType: HomeRangeOwnerType
  ownerId: string
  preferredLocationIds: LocationId[]
  establishedTick: number
}

export interface HomeRangeRepository {
  save(range: HomeRange): Promise<void>
  get(worldId: WorldId, ownerType: HomeRangeOwnerType, ownerId: string): Promise<HomeRange | null>
}

// Sprint 12, Phase 7/15: a QUERY-facing projection, never itself
// stored -- "is this owner currently within its own home range" -- the
// same convention Sprint 11's own HistoricalCondition established for
// derived-on-demand facts.
export interface PlaceAttachment {
  ownerType: HomeRangeOwnerType
  ownerId: string
  currentLocationId: LocationId
  withinHomeRange: boolean
  preferredLocationIds: LocationId[]
}
