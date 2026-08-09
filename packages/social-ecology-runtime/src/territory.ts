import type { HomeRange, HomeRangeOwnerType, PlaceAttachment } from "@avatark/social-ecology-contracts"
import type { LocationId } from "@avatark/runtime-contracts"

// Sprint 12, Phase 7/15: a pure, query-facing derivation -- an owner
// with no HomeRange record at all, or an empty preference list, is
// considered always "within" its own (unset) range, matching the same
// honest-default convention Sprint 11's HistoricalCondition established.
export function resolvePlaceAttachment(ownerType: HomeRangeOwnerType, ownerId: string, currentLocationId: LocationId, homeRange: HomeRange | null): PlaceAttachment {
  const preferredLocationIds = homeRange?.preferredLocationIds ?? []
  const withinHomeRange = preferredLocationIds.length === 0 || preferredLocationIds.includes(currentLocationId)
  return { ownerType, ownerId, currentLocationId, withinHomeRange, preferredLocationIds }
}
