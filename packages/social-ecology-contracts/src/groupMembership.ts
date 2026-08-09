import type { EntityId } from "@avatark/living-systems-contracts"
import type { WorldId } from "@avatark/runtime-contracts"
import type { GroupId } from "@avatark/living-population-contracts"
import type { GroupMembershipId } from "./ids.ts"

// Sprint 12, Phase 5: deliberately minimal -- "MEMBER" for ordinary
// participants, "REFERENCE_ENTITY" for the one member Sprint 10's own
// group-direction vote (groupDynamics.ts) happens to be most influenced
// by if a world grammar ever wants to name one; no hierarchy beyond
// this single optional distinction ("do not build organizational
// hierarchies").
export type GroupRole = "MEMBER" | "REFERENCE_ENTITY"

export type GroupMembershipStatus = "ACTIVE" | "LEFT"

// Sprint 12, Phase 5: an ADDITIVE audit/identity record layered on top
// of Sprint 10's own `GroupState.memberEntityIds` (living-population-
// contracts) -- never a second group-membership authority.
// `GroupState.memberEntityIds` remains the one list that actually
// drives Sprint 10's own group cohesion/direction computation; this
// record exists for stable membership identity, establishedTick, and
// role, and to receive future join/leave decisions through declared
// rules (see docs/SPRINT12_GROUND_TRUTH.md's own "group membership
// stays audit-only this sprint" decision for what is and is not
// exercised live yet).
export interface GroupMembership {
  id: GroupMembershipId
  worldId: WorldId
  groupId: GroupId
  entityId: EntityId
  role: GroupRole
  status: GroupMembershipStatus
  establishedTick: number
  leftTick: number | null
}

export interface GroupMembershipRepository {
  save(membership: GroupMembership): Promise<void>
  listByGroup(worldId: WorldId, groupId: GroupId): Promise<GroupMembership[]>
  listByEntity(worldId: WorldId, entityId: EntityId): Promise<GroupMembership[]>
}
