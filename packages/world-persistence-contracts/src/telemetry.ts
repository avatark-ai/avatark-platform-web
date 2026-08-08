import type { Timestamp } from "@avatark/runtime-contracts"
import type { SimulationTick, WorldInstanceId, WorldOwnerId, WorldStateVersion } from "./ids.ts"
import type { WorldLifecycleState } from "./lifecycle.ts"

// Sprint 9, Phase 18: OPERATIONAL observability only -- how the runtime
// itself is doing, never what a visitor did or how they might be
// feeling. Nothing here is keyed by userId, and nothing here would need
// to change if Living Systems grew a real psychological-inference
// feature tomorrow (it wouldn't, but the point is this type couldn't
// carry that even by accident).
export interface WorldOperationalTelemetry {
  readonly worldInstanceId: WorldInstanceId
  readonly tick: SimulationTick
  readonly stateVersion: WorldStateVersion
  readonly lifecycleState: WorldLifecycleState
  readonly lastCheckpointTick: SimulationTick
  readonly catchUpDurationMs: number | null
  readonly recoverySucceeded: boolean | null
  readonly activeOwnerId: WorldOwnerId | null
  readonly leaseExpiresAt: Timestamp | null
  readonly observedAt: Timestamp
}
