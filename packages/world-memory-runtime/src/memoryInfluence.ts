import type { EntityMemoryEntry } from "@avatark/world-memory-contracts"
import type { LocationId } from "@avatark/runtime-contracts"

// Sprint 11, Phase 7: the one bounded, deterministic bridge from stored
// Entity Memory to Sprint 10's own behaviorSelection MemoryHint --
// picks the MOST RECENT remembered resource location, nothing more
// elaborate. Population's own selectBehavior still gates this against
// current perception before ever acting on it (see
// @avatark/living-population-runtime's own behaviorSelection.ts
// comment) -- this function only surfaces a preference, it cannot make
// an unavailable location viable.
export function resolvePreferredResourceLocation(entries: EntityMemoryEntry[]): LocationId | null {
  const remembered = entries.filter((e) => e.type === "PREVIOUS_RESOURCE_LOCATION").sort((a, b) => b.tick - a.tick)
  const locationId = remembered[0]?.detail.locationId
  return typeof locationId === "string" && locationId.length > 0 ? locationId : null
}
