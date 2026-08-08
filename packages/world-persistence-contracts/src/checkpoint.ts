import type { Timestamp } from "@avatark/runtime-contracts"
import type { LivingEntityState, SharedWorldState } from "@avatark/living-systems-contracts"
import type { CheckpointId, SimulationTick, WorldInstanceId, WorldStateVersion } from "./ids.ts"

// Sprint 9, Phase 3: a checkpoint contains enough authoritative state to
// resume deterministic simulation without replaying world history from
// tick zero:
//
//   checkpoint N
//       +
//   world-system events after N
//       -> recovered authoritative state
//
// `eventSequenceAsOf` records the last WorldSystemEventRecord.sequence
// already reflected in this checkpoint's own sharedState/entities --
// recovery only needs to consider events with a strictly greater
// sequence. `reason` is checkpoint PROVENANCE (Phase 3's own term):
// why this checkpoint was taken, not narrative content.
export type CheckpointReason = "periodic" | "dormancy" | "manual" | "recovery"

export interface WorldCheckpoint {
  readonly id: CheckpointId
  readonly worldInstanceId: WorldInstanceId
  readonly checkpointVersion: number
  readonly stateVersion: WorldStateVersion
  readonly tick: SimulationTick
  readonly sharedState: SharedWorldState
  readonly entities: readonly LivingEntityState[]
  readonly eventSequenceAsOf: number
  readonly reason: CheckpointReason
  readonly createdAt: Timestamp
}

export interface WorldCheckpointRepository {
  // Idempotent upsert keyed by id (Phase 9) -- saving the same checkpoint
  // id twice is a no-op, never a duplicate row.
  save(checkpoint: WorldCheckpoint): Promise<void>
  loadLatest(worldInstanceId: WorldInstanceId): Promise<WorldCheckpoint | null>
}
