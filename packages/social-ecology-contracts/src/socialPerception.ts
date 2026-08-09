import type { EntityId } from "@avatark/living-systems-contracts"
import type { LocationId } from "@avatark/runtime-contracts"
import type { GroupId } from "@avatark/living-population-contracts"
import type { RelationshipId } from "./ids.ts"
import type { RelationshipType } from "./relationship.ts"

// Sprint 12, Phase 8: an extension of Sprint 10's own bounded
// EntityPerception -- semantic facts derived from authoritative
// relationship/group/familiarity state, never computer vision, never a
// renderer query, never inferred psychology.
export interface NearbyRelationship {
  relationshipId: RelationshipId
  otherEntityId: EntityId
  relationshipType: RelationshipType
}

export interface SocialPerception {
  entityId: EntityId
  nearbyKnownEntityIds: EntityId[]
  relationships: NearbyRelationship[]
  groupMembersPresentIds: EntityId[]
  groupMembersAbsentIds: EntityId[]
  familiarEntityIds: EntityId[]
  currentGroupLocationId: LocationId | null
  withinHomeRange: boolean
  separationActive: boolean
  groupId: GroupId | null
}
