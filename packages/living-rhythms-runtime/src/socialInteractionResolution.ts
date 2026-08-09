import type { EntityId } from "@avatark/living-systems-contracts"
import type { RelationshipState } from "@avatark/social-ecology-contracts"
import type { SocialInteractionOpportunity } from "@avatark/living-rhythms-contracts"

export interface ResolveSocialInteractionOpportunitiesParams {
  relationships: RelationshipState[]
  entityLocationsById: ReadonlyMap<EntityId, string>
  // Sprint 12's own convention: `entityBId` is the recorded
  // representative side for a RELATIONSHIP-subject separation -- this
  // set names which relationships currently have an active separation.
  separatedRelationshipIds: ReadonlySet<string>
  tick: number
}

// Sprint 13, Phase 11: co-location + relationship + separation state ->
// a closed semantic category, reusing Sprint 12's own facts directly
// (see docs/SPRINT13_GROUND_TRUTH.md's decision 5) -- never dialogue,
// never prose. "gather"/"avoid"/"follow" remain reserved vocabulary for
// a future resolver with richer inputs (group-routine/rhythm
// compatibility); this reference resolver proves the mechanism with
// the two conditions already available: co-presence and separation.
export function resolveSocialInteractionOpportunities(params: ResolveSocialInteractionOpportunitiesParams): SocialInteractionOpportunity[] {
  const opportunities: SocialInteractionOpportunity[] = []

  for (const relationship of params.relationships) {
    const locationA = params.entityLocationsById.get(relationship.entityAId)
    const locationB = params.entityLocationsById.get(relationship.entityBId)
    if (locationA === undefined || locationB === undefined) continue

    if (locationA === locationB) {
      const category = relationship.band === "STRONG" ? "rest_together" : "remain_near"
      opportunities.push({ entityAId: relationship.entityAId, entityBId: relationship.entityBId, relationshipType: relationship.relationshipType, category, locationId: locationA, tick: params.tick })
    } else if (params.separatedRelationshipIds.has(relationship.id)) {
      opportunities.push({ entityAId: relationship.entityAId, entityBId: relationship.entityBId, relationshipType: relationship.relationshipType, category: "approach", locationId: locationB, tick: params.tick })
    }
  }

  return opportunities
}
