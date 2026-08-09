import type { EntityArchetypeId, EntityId } from "@avatark/living-systems-contracts"
import type { LocationId, WorldId } from "@avatark/runtime-contracts"
import type { GroupId } from "./ids.ts"
import type { NeedState } from "./needs.ts"
import type { BehaviorType } from "./behavior.ts"
import type { MovementIntentType } from "./movement.ts"
import type { GroupState } from "./group.ts"
import type { EncounterOpportunity } from "./encounterOpportunity.ts"

// Sprint 10: the population-domain analogue of Sprint 7's WorldSnapshot
// -- a renderer-neutral, frozen-shape read of "what is the population
// doing right now," assembled by the Host layer from
// EntityBehaviorState + GroupState + EncounterOpportunity, never a
// second authoritative store in its own right (it is always resolved
// fresh from those, the same way WorldSnapshot is always resolved fresh
// from SharedWorldState/LivingEntityState).
export interface PopulationEntitySnapshot {
  entityId: EntityId
  archetypeId: EntityArchetypeId
  locationId: LocationId
  activity: BehaviorType
  movement: MovementIntentType
  movementTargetLocationId: LocationId | null
  groupId: GroupId | null
  needs: NeedState[]
}

export interface PopulationSnapshot {
  worldId: WorldId
  tick: number
  entities: PopulationEntitySnapshot[]
  groups: GroupState[]
  encounterOpportunities: EncounterOpportunity[]
}
