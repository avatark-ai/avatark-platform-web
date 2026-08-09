import type { LocationId } from "@avatark/runtime-contracts"
import type { SpatialGrammar, SpatialMembership } from "@avatark/spatial-ecology-contracts"

// Sprint 16 Phase 0 architecture, section 21 (backward compatibility):
// spatial membership is ALWAYS a derived lookup from a static
// SpatialGrammar, never stored on LivingEntityState. This is the one
// function every other spatial-ecology-runtime function builds on --
// pure, deterministic, and cheap enough to rebuild on every call (a
// handful of locations per world today).
export function buildSpatialMembershipIndex(grammar: SpatialGrammar): Map<LocationId, SpatialMembership> {
  const domainBySectorId = new Map(grammar.sectors.map((sector) => [sector.id, sector.domainId]))
  const sectorByQuadrantId = new Map(grammar.quadrants.map((quadrant) => [quadrant.id, quadrant.sectorId]))
  const quadrantByPatchId = new Map(grammar.patches.map((patch) => [patch.id, patch.quadrantId]))

  const index = new Map<LocationId, SpatialMembership>()

  for (const localPlace of grammar.localPlaces) {
    const patchId = localPlace.patchId
    const quadrantId = quadrantByPatchId.get(patchId) ?? null
    const sectorId = quadrantId ? (sectorByQuadrantId.get(quadrantId) ?? null) : null
    const domainId = sectorId ? (domainBySectorId.get(sectorId) ?? null) : null

    index.set(localPlace.locationId, {
      locationId: localPlace.locationId,
      localPlaceId: localPlace.id,
      patchId,
      quadrantId,
      sectorId,
      domainId,
    })
  }

  return index
}

export function membershipFor(index: Map<LocationId, SpatialMembership>, locationId: LocationId): SpatialMembership | null {
  return index.get(locationId) ?? null
}
