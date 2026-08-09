import type { WorldId } from "@avatark/runtime-contracts"
import type { HomeRangeId, HomeRangeOwnerType } from "@avatark/social-ecology-contracts"
import type { PatchId, TerritoryClaimId } from "./ids.ts"

// Sprint 16 Phase 0 architecture, section 11 -- and the single largest
// overlap risk this sprint carries, resolved the way that document
// requires: Sprint 12's own HomeRange (@avatark/social-ecology-contracts)
// remains the SOLE durable ownership/preference record. TerritoryClaim
// is a read-only, additive AGGREGATION computed FROM an existing
// HomeRange's own `preferredLocationIds`, resolved against the Patch
// each preferred location falls in -- never a second preference list,
// never itself a claim of ownership (the mission's own explicit "do not
// assume ownership" constraint). `ownerType`/`ownerId` are denormalized
// references for convenience (the same posture EncounterRecord's own
// `relationshipContext` already holds), never a second source of truth
// for who the owner is -- that remains HomeRange.ownerId.
export type TerritoryClaimStrength = "PRIMARY" | "SECONDARY"

export interface TerritoryClaim {
  id: TerritoryClaimId
  worldId: WorldId
  homeRangeId: HomeRangeId
  ownerType: HomeRangeOwnerType
  ownerId: string
  patchId: PatchId
  /** PRIMARY for the HomeRange's own first (most-preferred) location
   * that resolves into this Patch; SECONDARY for any other. */
  strength: TerritoryClaimStrength
  establishedTick: number
}

export type AppendTerritoryClaimResult = { status: "appended" | "duplicate_ignored" }

export interface TerritoryClaimRepository {
  // Idempotent by id -- the same discipline every WorldEvent/
  // EncounterRecord/AdaptationEffect append already holds.
  append(claim: TerritoryClaim): Promise<AppendTerritoryClaimResult>
  listByPatch(worldId: WorldId, patchId: PatchId): Promise<TerritoryClaim[]>
  listByWorld(worldId: WorldId): Promise<TerritoryClaim[]>
}

// A QUERY-facing projection, never itself stored -- "how many distinct
// HomeRange owners currently claim this Patch" -- the same convention
// PlaceAttachment/HistoricalCondition/PlaceOccupancy already establish
// for derived-on-demand facts. Sprint 16 does NOT implement contest
// resolution (who "wins" a contested Patch) -- this is a read model
// only, an explicit, documented scope deferral (Phase 0 architecture,
// unresolved question #5).
export interface TerritoryPressure {
  patchId: PatchId
  tick: number
  overlappingClaimCount: number
  contestedOwnerIds: string[]
}
