import type { EntityId } from "@avatark/living-systems-contracts"
import type { LocationId } from "@avatark/runtime-contracts"
import type { RelationshipType } from "@avatark/social-ecology-contracts"

// Sprint 13, Phase 11: a closed, semantic interaction vocabulary --
// never dialogue, never generated prose, never an LLM call. Reuses
// Sprint 12's own `RelationshipState`/`SocialPerception` facts directly
// (see docs/SPRINT13_GROUND_TRUTH.md's decision 5) -- no new
// relationship mechanic.
export type SocialInteractionCategory = "approach" | "remain_near" | "follow" | "gather" | "avoid" | "rest_together"

// A bounded, query-facing derived fact -- co-location + relationship +
// rhythm/routine compatibility resolved to a category, never stored as
// its own event stream.
export interface SocialInteractionOpportunity {
  entityAId: EntityId
  entityBId: EntityId
  relationshipType: RelationshipType | null
  category: SocialInteractionCategory
  locationId: LocationId
  tick: number
}
