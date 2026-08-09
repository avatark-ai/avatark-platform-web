import type { EntityId } from "@avatark/living-systems-contracts"
import type { WorldId } from "@avatark/runtime-contracts"
import type { ReunionEventId, SeparationStateId } from "./ids.ts"

// Sprint 12, Phase 10: separation modeled as STATE, never emotion --
// generic across relationship kinds. `subjectId` is a RelationshipId
// when `subjectType` is "RELATIONSHIP" (e.g. offspring separated from
// parent), or a GroupMembershipId when "GROUP_MEMBERSHIP" (a member
// physically apart from its own group's current location).
export type SeparationSubjectType = "RELATIONSHIP" | "GROUP_MEMBERSHIP"

export interface SeparationState {
  id: SeparationStateId
  worldId: WorldId
  subjectType: SeparationSubjectType
  subjectId: string
  entityId: EntityId
  separatedSinceTick: number
  active: boolean
  resolvedAtTick: number | null
}

export interface SeparationRepository {
  save(state: SeparationState): Promise<void>
  getActive(worldId: WorldId, subjectType: SeparationSubjectType, subjectId: string): Promise<SeparationState | null>
  listActiveByEntity(worldId: WorldId, entityId: EntityId): Promise<SeparationState[]>
}

// Sprint 12, Phase 11: a systemic OCCURRENCE, not a stored ongoing
// state -- fires once when a previously-active separation resolves via
// legitimate co-location. Never prose; never a declared emotional
// meaning.
export interface ReunionEvent {
  id: ReunionEventId
  worldId: WorldId
  subjectType: SeparationSubjectType
  subjectId: string
  entityId: EntityId
  tick: number
  separationDurationTicks: number
}
