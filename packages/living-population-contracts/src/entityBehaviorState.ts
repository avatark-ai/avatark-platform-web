import type { EntityId } from "@avatark/living-systems-contracts"
import type { WorldId } from "@avatark/runtime-contracts"
import type { GroupId } from "./ids.ts"
import type { NeedState } from "./needs.ts"
import type { RhythmPhase } from "./rhythm.ts"
import type { BehaviorType } from "./behavior.ts"
import type { MovementIntentType } from "./movement.ts"

// Sprint 10: the Sprint 10 extension of the Persistent Living/Entity
// State domain -- everything about ONE entity's behavior that Sprint 7's
// own LivingEntityState has no field for. Bundled into a single record
// (rather than four separate need/rhythm/activity/movement stores)
// because the population-simulation tick loop always advances all of it
// together for a given entity, one logical tick at a time -- the exact
// same rationale Sprint 9's DurableWorldState already documents for
// bundling SharedWorldState + entities.
//
// Deliberately NOT merged into LivingEntityState itself: that type
// stays Sprint 7's own, unmodified, still used unchanged by the two
// pre-existing vendored archetypes' ecological-lifecycle stepping. A
// population entity has BOTH a LivingEntityState row (identity,
// location, a coarse `lifecyclePhase` Sprint 10 writes directly -- see
// entityLifecycle usage in the runtime package) AND an
// EntityBehaviorState row (this type) -- joined by `entityId`, never by
// restructuring the first type to accommodate the second.
export interface EntityBehaviorState {
  worldId: WorldId
  entityId: EntityId
  needs: NeedState[]
  rhythmPhase: RhythmPhase
  activity: BehaviorType
  movementType: MovementIntentType
  movementTargetLocationId: string | null
  groupId: GroupId | null
  lastUpdatedTick: number
}

export interface EntityBehaviorStateRepository {
  list(worldId: WorldId): Promise<EntityBehaviorState[]>
  get(worldId: WorldId, entityId: EntityId): Promise<EntityBehaviorState | null>
  save(state: EntityBehaviorState): Promise<void>
}
