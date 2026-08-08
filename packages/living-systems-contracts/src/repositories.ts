import type { UserId, WorldId } from "@avatark/runtime-contracts"
import type { LivingEntityState } from "./entity.ts"
import type { EntityId } from "./ids.ts"
import type { SharedWorldState } from "./sharedWorldState.ts"
import type { VisitorWorldMemory } from "./visitorMemory.ts"

// Sprint 7, Phase 18: four persistence interfaces, kept explicitly
// separate -- never assume they belong in one table. Reference in-memory
// adapters live in @avatark/living-systems-runtime; any real database
// schema is proposal-only this sprint (no migration exists or is applied).
// (ProtectedNarrativeStateRepository lives in protectedNarrative.ts,
// deliberately get-only by construction -- see that file's own comment.)

export interface SharedWorldStateRepository {
  get(worldId: WorldId): Promise<SharedWorldState | null>
  save(state: SharedWorldState): Promise<void>
}

export interface LivingEntityStateRepository {
  list(worldId: WorldId): Promise<LivingEntityState[]>
  get(worldId: WorldId, entityId: EntityId): Promise<LivingEntityState | null>
  save(worldId: WorldId, entity: LivingEntityState): Promise<void>
}

export interface VisitorWorldMemoryRepository {
  get(userId: UserId, worldId: WorldId): Promise<VisitorWorldMemory | null>
  save(memory: VisitorWorldMemory): Promise<void>
}
