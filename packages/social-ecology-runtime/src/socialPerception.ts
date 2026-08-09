import type { EntityId } from "@avatark/living-systems-contracts"
import type { LocationId } from "@avatark/runtime-contracts"
import type { GroupId } from "@avatark/living-population-contracts"
import type { FamiliarityState, RelationshipState, SocialPerception } from "@avatark/social-ecology-contracts"

// Sprint 12, Phase 8: an extension of Sprint 10's own bounded
// perception -- every fact here is derivable from already-authoritative
// relationship/group/familiarity state and current entity locations,
// never a raycast, never a renderer query, never inferred psychology.
export interface ResolveSocialPerceptionParams {
  entityId: EntityId
  currentLocationId: LocationId
  entityLocationsById: ReadonlyMap<EntityId, LocationId>
  relationships: RelationshipState[]
  familiarityStates: FamiliarityState[]
  groupId: GroupId | null
  groupMemberEntityIds: EntityId[]
  groupLocationId: LocationId | null
  withinHomeRange: boolean
  separationActive: boolean
}

function otherEntityId(relationship: RelationshipState, entityId: EntityId): EntityId {
  return relationship.entityAId === entityId ? relationship.entityBId : relationship.entityAId
}

export function resolveSocialPerception(params: ResolveSocialPerceptionParams): SocialPerception {
  const relationships = params.relationships.map((r) => ({ relationshipId: r.id, otherEntityId: otherEntityId(r, params.entityId), relationshipType: r.relationshipType }))
  const relatedEntityIds = new Set(relationships.map((r) => r.otherEntityId))

  const nearbyKnownEntityIds = [...params.entityLocationsById.entries()]
    .filter(([entityId, locationId]) => entityId !== params.entityId && locationId === params.currentLocationId && relatedEntityIds.has(entityId))
    .map(([entityId]) => entityId)

  const groupMembersPresentIds = params.groupMemberEntityIds.filter((id) => id !== params.entityId && params.entityLocationsById.get(id) === params.currentLocationId)
  const groupMembersAbsentIds = params.groupMemberEntityIds.filter((id) => id !== params.entityId && !groupMembersPresentIds.includes(id))

  const familiarEntityIds = params.familiarityStates.filter((f) => f.band === "FAMILIAR").map((f) => (f.entityAId === params.entityId ? f.entityBId : f.entityAId))

  return {
    entityId: params.entityId,
    nearbyKnownEntityIds,
    relationships,
    groupMembersPresentIds,
    groupMembersAbsentIds,
    familiarEntityIds,
    currentGroupLocationId: params.groupLocationId,
    withinHomeRange: params.withinHomeRange,
    separationActive: params.separationActive,
    groupId: params.groupId,
  }
}
