import type { WorldId } from "@avatark/runtime-contracts"

// Sprint 7, Phase 17: WORLD/SYSTEM events, explicitly separate from
// @avatark/experience-registry's VISITOR experience events
// (world.entered, world.left, ...). A simulation tick is not itself an
// event -- only a state TRANSITION worth recording is (a season change,
// an entity crossing a lifecycle phase). Nothing here is per-visitor;
// nothing in @avatark/experience-registry's ExperienceEvent should ever
// carry one of these instead.
export type WorldSystemEventType = "season.transitioned" | "entity.lifecycle_changed" | "clock.advanced"

export interface WorldSystemEvent {
  type: WorldSystemEventType
  worldId: WorldId
  tick: number
  detail: Record<string, string | number | boolean>
  at: string
}

export interface WorldSystemEventRepository {
  append(event: WorldSystemEvent): Promise<void>
  list(worldId: WorldId): Promise<WorldSystemEvent[]>
}
