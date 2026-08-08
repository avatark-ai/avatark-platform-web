import type { Timestamp } from "@avatark/runtime-contracts"
import type { LivingEntityState, SharedWorldState } from "@avatark/living-systems-contracts"
import type { ConditionalSaveResult } from "./concurrency.ts"
import type { WorldInstanceId, WorldStateVersion } from "./ids.ts"

// Sprint 9, Phase 1: the durable form of "current authoritative world
// state." SharedWorldState and LivingEntityState stay the exact SAME
// types Sprint 7 already defined (Architectural Law #1/#2: shared world
// state and entity state are independently addressable domains) --
// nothing here redefines them or collapses them into an untyped blob.
//
// They ARE persisted together, in one conditional-save call, because
// @avatark/living-systems-runtime's own advanceWorldSimulation already
// advances them together, one logical tick at a time, so that a season
// transition and the entities it affects never drift out of sync with
// each other (packages/living-systems-runtime/src/simulation.ts's own
// header comment). Persisting them separately would only reintroduce a
// race this sprint's own concurrency requirement (Phase 6) exists to
// remove. VisitorWorldMemory and ProtectedNarrativeProjection are NOT
// part of this type -- they remain their own domains with their own
// repositories (repositories.ts), per Architectural Law #3/#4.
export interface DurableWorldState {
  readonly worldInstanceId: WorldInstanceId
  readonly stateVersion: WorldStateVersion
  readonly sharedState: SharedWorldState
  readonly entities: readonly LivingEntityState[]
  readonly updatedAt: Timestamp
}

export interface DurableWorldStateRepository {
  load(worldInstanceId: WorldInstanceId): Promise<DurableWorldState | null>

  // expectedVersion must match the currently-stored stateVersion (or be
  // `null` when no row exists yet, i.e. first write) for the write to
  // succeed. See concurrency.ts for the result shape.
  conditionalSave(next: Omit<DurableWorldState, "stateVersion">, expectedVersion: WorldStateVersion | null): Promise<ConditionalSaveResult<DurableWorldState>>
}
