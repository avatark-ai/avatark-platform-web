// @avatark/world-persistence-contracts -- Sprint 9.
//
// Renderer-neutral, database-neutral contracts for durable Living World
// state. The core runtime depends on the interfaces exported here, never
// on Postgres/Supabase-specific APIs -- see
// @avatark/world-persistence-runtime for reference (in-memory,
// deterministic) implementations and, separately, docs/SPRINT9_*.md /
// supabase/migrations/026_*.sql for the prepared-but-unapplied real
// schema.
//
// VisitorWorldMemory and ProtectedNarrativeProjection are deliberately
// NOT redefined here -- Sprint 7's own
// @avatark/living-systems-contracts VisitorWorldMemoryRepository and
// ProtectedNarrativeStateRepository already model exactly what Phase 1
// asks for (load/save visitor meaningful-memory; read-only protected
// narrative). Re-exported below so a caller of this package never needs
// a second import for the other two state domains this sprint's
// architectural law requires stay independently addressable.

export type { WorldDefinitionId, WorldInstanceId, WorldOwnerId, WorldStateVersion, WorldSystemEventId, WorldVersion, SimulationTick, CheckpointId } from "./ids.ts"

export type { WorldDefinition, WorldInstance, WorldInstanceRepository } from "./worldInstance.ts"

export type { ConditionalSaveResult } from "./concurrency.ts"
export { isSaveConflict } from "./concurrency.ts"

export type { DurableWorldState, DurableWorldStateRepository } from "./durableWorldState.ts"

export type { AppendEventResult, DurableWorldSystemEventRepository, WorldSystemEventRecord } from "./systemEventRecord.ts"

export type { CheckpointReason, WorldCheckpoint, WorldCheckpointRepository } from "./checkpoint.ts"

export type { ResourceTier, WorldLifecycleRecord, WorldLifecycleRepository, WorldLifecycleState, WorldLifecycleTrigger } from "./lifecycle.ts"

export type { LeaseAcquireResult, WorldLease, WorldLeaseRepository } from "./lease.ts"

export type { WorldOperationalTelemetry } from "./telemetry.ts"

export {
  CorruptCheckpointError,
  DuplicateWorldSystemEventError,
  IncompatibleWorldDefinitionError,
  InvalidCatchUpRequestError,
  LeaseConflictError,
  ProtectedNarrativeMutationAttemptError,
  StaleWorldStateVersionError,
  WorldNotFoundError,
} from "./errors.ts"

export type { ProtectedNarrativeProjection, ProtectedNarrativeStateRepository, VisitorWorldMemory, VisitorWorldMemoryRepository } from "@avatark/living-systems-contracts"
