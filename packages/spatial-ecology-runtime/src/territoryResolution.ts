import type { LocationId, WorldId } from "@avatark/runtime-contracts"
import type { HomeRange } from "@avatark/social-ecology-contracts"
import type { PatchId, SpatialMembership, TerritoryClaim, TerritoryPressure } from "@avatark/spatial-ecology-contracts"

// Sprint 16 Phase 0 architecture, section 11: TerritoryClaim is a
// read-only AGGREGATION over Sprint 12's own HomeRange.preferredLocationIds
// -- never a second preference list. One claim per (HomeRange, Patch)
// pair its own preferred locations resolve into; a HomeRange whose
// preferred locations span two Patches produces two claims. `id` is
// content-derived from (homeRangeId, patchId) so a replayed derivation
// against the identical HomeRange/grammar reproduces the identical id
// (idempotent by construction, the same discipline every content-derived
// id in this codebase already holds).
export function deriveTerritoryClaimId(homeRangeId: string, patchId: PatchId): string {
  return `territory-claim:${homeRangeId}:${patchId}`
}

export function resolveTerritoryClaims(worldId: WorldId, homeRanges: HomeRange[], membershipIndex: Map<LocationId, SpatialMembership>, tick: number): TerritoryClaim[] {
  const claims: TerritoryClaim[] = []

  for (const homeRange of homeRanges) {
    const seenPatchIds = new Set<PatchId>()
    homeRange.preferredLocationIds.forEach((locationId, index) => {
      const membership = membershipIndex.get(locationId)
      const patchId = membership?.patchId ?? null
      // Sprint 16 mission: "if existing Canon does not define literal
      // internal geometry, represent the hierarchy abstractly/minimally"
      // -- a preferred location outside the known spatial grammar
      // produces no claim, rather than a fabricated one.
      if (!patchId || seenPatchIds.has(patchId)) return
      seenPatchIds.add(patchId)

      claims.push({
        id: deriveTerritoryClaimId(homeRange.id, patchId),
        worldId,
        homeRangeId: homeRange.id,
        ownerType: homeRange.ownerType,
        ownerId: homeRange.ownerId,
        patchId,
        strength: index === 0 ? "PRIMARY" : "SECONDARY",
        establishedTick: tick,
      })
    })
  }

  return claims
}

export function resolveTerritoryPressure(claims: TerritoryClaim[], tick: number): TerritoryPressure[] {
  const byPatch = new Map<PatchId, TerritoryClaim[]>()
  for (const claim of claims) {
    if (!byPatch.has(claim.patchId)) byPatch.set(claim.patchId, [])
    byPatch.get(claim.patchId)!.push(claim)
  }

  return [...byPatch.entries()].map(([patchId, patchClaims]) => {
    const distinctOwnerIds = [...new Set(patchClaims.map((claim) => claim.ownerId))]
    return {
      patchId,
      tick,
      overlappingClaimCount: distinctOwnerIds.length,
      contestedOwnerIds: distinctOwnerIds.length > 1 ? distinctOwnerIds : [],
    }
  })
}
