import type { Timestamp } from "@avatark/runtime-contracts"
import type { SimulationTick, WorldInstanceId } from "./ids.ts"

// Sprint 9, Phase 5: runtime infrastructure states, not narrative states.
// A world instance is never "asleep" in-story -- it is DORMANT as an
// operational fact about whether anything is actively simulating it.
//
//   DORMANT    no active simulation process; durable state is the only
//              truth that exists right now.
//   WAKING     an owner has acquired the world's lease and is running
//              deterministic catch-up before serving fresh reads.
//   ACTIVE     caught up; safe to advance further and serve snapshots.
//   QUIESCING  the active owner is checkpointing and releasing its
//              lease because nothing has required active simulation
//              recently.
export type WorldLifecycleState = "DORMANT" | "WAKING" | "ACTIVE" | "QUIESCING"

// Sprint 9, Phase 11: HOT/WARM/COLD is a RESOURCE-TIER description
// derived from lifecycle state, not a fifth lifecycle state of its own --
// deliberately kept as a pure mapping function (see
// @avatark/world-persistence-runtime's lifecycle.ts) rather than a
// second piece of stored state that could drift from the first.
export type ResourceTier = "HOT" | "WARM" | "COLD"

export interface WorldLifecycleRecord {
  readonly worldInstanceId: WorldInstanceId
  readonly state: WorldLifecycleState
  readonly lastActiveAt: Timestamp
  readonly lastCheckpointTick: SimulationTick
}

export interface WorldLifecycleRepository {
  get(worldInstanceId: WorldInstanceId): Promise<WorldLifecycleRecord | null>
  save(record: WorldLifecycleRecord): Promise<void>
}

// Sprint 9, Phase 5: triggers a lifecycle transition can legally respond
// to. Kept as a closed union so illegal transitions (e.g. "wake" while
// already ACTIVE) are a caller bug the type system can catch, not a
// silent no-op discovered at runtime.
export type WorldLifecycleTrigger = "visitor_arrived" | "catch_up_complete" | "no_activity_deadline_reached" | "checkpoint_complete" | "crash_detected"
