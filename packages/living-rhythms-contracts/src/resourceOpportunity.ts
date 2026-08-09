import type { LocationId } from "@avatark/runtime-contracts"
import type { ResourceTag } from "@avatark/living-population-contracts"

// Sprint 13, Phase 4: a semantic, renderer-neutral projection of "does
// this location currently afford this resource category" -- never an
// inventory/economy item, never a renderer asset. Deliberately a
// QUERY-FACING derived fact (no repository, no `save`), resolved fresh
// from environment + location + world state each time, the same
// posture `PlaceAttachment` (Sprint 12) and `EntityPerception` (Sprint
// 10) already established for their own derived facts.
export interface ResourceOpportunity {
  locationId: LocationId
  category: ResourceTag
  available: boolean
  tick: number
}
