import type { EntityId } from "@avatark/living-systems-contracts"
import type { LocationId } from "@avatark/runtime-contracts"
import type { BehaviorType } from "./behavior.ts"
import type { GroupId } from "./ids.ts"

// Sprint 11: structured, per-tick population deltas -- an ADDITIVE
// extension of Sprint 10's own advancePopulationSimulation output
// (a new field, never a second engine), so a downstream domain (World
// Memory) has real structured events to derive history from instead of
// diffing before/after snapshots itself. Population's own behavior
// engine is unchanged; this only names what it already computes each
// tick.
export type PopulationEventType = "entity.moved" | "entity.activity_transitioned" | "group.relocated" | "group.formed" | "group.dispersed"

export interface PopulationEvent {
  type: PopulationEventType
  tick: number
  entityId: EntityId | null
  groupId: GroupId | null
  fromLocationId: LocationId | null
  toLocationId: LocationId | null
  fromActivity: BehaviorType | null
  toActivity: BehaviorType | null
}
