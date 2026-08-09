import type { WorldId } from "@avatark/runtime-contracts"
import type { RelationshipState } from "./relationship.ts"
import type { GroupMembership } from "./groupMembership.ts"
import type { FamiliarityState } from "./familiarity.ts"
import type { HomeRange } from "./territory.ts"
import type { SeparationState } from "./separationReunion.ts"

// Sprint 12: a read-only, resolved-fresh-every-call projection --
// mirrors every prior sprint's own SnapshotResolver role. Never itself
// an authoritative store.
export interface SocialEcologySnapshot {
  worldId: WorldId
  tick: number
  relationships: RelationshipState[]
  groupMemberships: GroupMembership[]
  familiarityStates: FamiliarityState[]
  homeRanges: HomeRange[]
  activeSeparations: SeparationState[]
}
