import type { EntityBehaviorState, EntityBehaviorStateRepository, GroupId, GroupState, GroupStateRepository } from "@avatark/living-population-contracts"
import type { EntityId } from "@avatark/living-systems-contracts"
import type { WorldId } from "@avatark/runtime-contracts"

// Sprint 10, Phase 11: reference in-memory adapters proving each new
// persistence contract is satisfiable -- the same role Sprint 7/9's own
// InMemory*Repository classes play for their own domains. No Postgres
// repository exists for either of these yet; a real schema is
// prepared-but-unapplied (see supabase/migrations/027_*.sql).
export class InMemoryEntityBehaviorStateRepository implements EntityBehaviorStateRepository {
  private readonly states = new Map<WorldId, Map<EntityId, EntityBehaviorState>>()

  async list(worldId: WorldId): Promise<EntityBehaviorState[]> {
    return [...(this.states.get(worldId)?.values() ?? [])]
  }

  async get(worldId: WorldId, entityId: EntityId): Promise<EntityBehaviorState | null> {
    return this.states.get(worldId)?.get(entityId) ?? null
  }

  async save(state: EntityBehaviorState): Promise<void> {
    if (!this.states.has(state.worldId)) this.states.set(state.worldId, new Map())
    this.states.get(state.worldId)!.set(state.entityId, state)
  }
}

export class InMemoryGroupStateRepository implements GroupStateRepository {
  private readonly groups = new Map<WorldId, Map<GroupId, GroupState>>()

  async list(worldId: WorldId): Promise<GroupState[]> {
    return [...(this.groups.get(worldId)?.values() ?? [])]
  }

  async get(worldId: WorldId, groupId: GroupId): Promise<GroupState | null> {
    return this.groups.get(worldId)?.get(groupId) ?? null
  }

  async save(state: GroupState): Promise<void> {
    if (!this.groups.has(state.worldId)) this.groups.set(state.worldId, new Map())
    this.groups.get(state.worldId)!.set(state.id, state)
  }
}
