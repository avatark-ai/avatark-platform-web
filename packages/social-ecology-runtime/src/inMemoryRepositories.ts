import type {
  FamiliarityRepository,
  FamiliarityState,
  GroupMembership,
  GroupMembershipRepository,
  HomeRange,
  HomeRangeOwnerType,
  HomeRangeRepository,
  RelationshipRepository,
  RelationshipState,
  RelationshipType,
  SeparationRepository,
  SeparationState,
  SeparationSubjectType,
} from "@avatark/social-ecology-contracts"
import { normalizeEntityPair } from "@avatark/social-ecology-contracts"
import type { EntityId } from "@avatark/living-systems-contracts"
import type { GroupId } from "@avatark/living-population-contracts"
import type { WorldId } from "@avatark/runtime-contracts"

// Sprint 12, Phase 18: reference in-memory adapters -- the same role
// every prior sprint's own InMemory*Repository classes play. Every
// store here is a plain upsert-by-stable-key Map: replaying the exact
// same deterministic interval and re-saving the exact same content is a
// no-op in effect (Phase 19's own "no duplicate relationships/
// separation/reunion events" requirement) -- there is no append-log
// identity concern here the way there is for WorldEvent/EntityMemory,
// because these are STATE records, not an event stream.

export class InMemoryRelationshipRepository implements RelationshipRepository {
  private readonly byWorld = new Map<WorldId, Map<string, RelationshipState>>()

  async save(relationship: RelationshipState): Promise<void> {
    if (!this.byWorld.has(relationship.worldId)) this.byWorld.set(relationship.worldId, new Map())
    this.byWorld.get(relationship.worldId)!.set(relationship.id, relationship)
  }

  async get(worldId: WorldId, relationshipId: string): Promise<RelationshipState | null> {
    return this.byWorld.get(worldId)?.get(relationshipId) ?? null
  }

  async listByEntity(worldId: WorldId, entityId: EntityId): Promise<RelationshipState[]> {
    return [...(this.byWorld.get(worldId)?.values() ?? [])].filter((r) => r.entityAId === entityId || r.entityBId === entityId)
  }

  async listByType(worldId: WorldId, relationshipType: RelationshipType): Promise<RelationshipState[]> {
    return [...(this.byWorld.get(worldId)?.values() ?? [])].filter((r) => r.relationshipType === relationshipType)
  }
}

export class InMemoryGroupMembershipRepository implements GroupMembershipRepository {
  private readonly byWorld = new Map<WorldId, Map<string, GroupMembership>>()

  async save(membership: GroupMembership): Promise<void> {
    if (!this.byWorld.has(membership.worldId)) this.byWorld.set(membership.worldId, new Map())
    this.byWorld.get(membership.worldId)!.set(membership.id, membership)
  }

  async listByGroup(worldId: WorldId, groupId: GroupId): Promise<GroupMembership[]> {
    return [...(this.byWorld.get(worldId)?.values() ?? [])].filter((m) => m.groupId === groupId)
  }

  async listByEntity(worldId: WorldId, entityId: EntityId): Promise<GroupMembership[]> {
    return [...(this.byWorld.get(worldId)?.values() ?? [])].filter((m) => m.entityId === entityId)
  }
}

export class InMemoryFamiliarityRepository implements FamiliarityRepository {
  private readonly byWorld = new Map<WorldId, Map<string, FamiliarityState>>()

  private key(entityAId: EntityId, entityBId: EntityId): string {
    const [a, b] = normalizeEntityPair(entityAId, entityBId)
    return `${a}::${b}`
  }

  async save(state: FamiliarityState): Promise<void> {
    if (!this.byWorld.has(state.worldId)) this.byWorld.set(state.worldId, new Map())
    this.byWorld.get(state.worldId)!.set(this.key(state.entityAId, state.entityBId), state)
  }

  async get(worldId: WorldId, entityAId: EntityId, entityBId: EntityId): Promise<FamiliarityState | null> {
    return this.byWorld.get(worldId)?.get(this.key(entityAId, entityBId)) ?? null
  }

  async listByEntity(worldId: WorldId, entityId: EntityId): Promise<FamiliarityState[]> {
    return [...(this.byWorld.get(worldId)?.values() ?? [])].filter((f) => f.entityAId === entityId || f.entityBId === entityId)
  }
}

export class InMemoryHomeRangeRepository implements HomeRangeRepository {
  private readonly byWorld = new Map<WorldId, Map<string, HomeRange>>()

  private key(ownerType: HomeRangeOwnerType, ownerId: string): string {
    return `${ownerType}::${ownerId}`
  }

  async save(range: HomeRange): Promise<void> {
    if (!this.byWorld.has(range.worldId)) this.byWorld.set(range.worldId, new Map())
    this.byWorld.get(range.worldId)!.set(this.key(range.ownerType, range.ownerId), range)
  }

  async get(worldId: WorldId, ownerType: HomeRangeOwnerType, ownerId: string): Promise<HomeRange | null> {
    return this.byWorld.get(worldId)?.get(this.key(ownerType, ownerId)) ?? null
  }
}

export class InMemorySeparationRepository implements SeparationRepository {
  private readonly byWorld = new Map<WorldId, Map<string, SeparationState>>()

  private key(subjectType: SeparationSubjectType, subjectId: string): string {
    return `${subjectType}::${subjectId}`
  }

  async save(state: SeparationState): Promise<void> {
    if (!this.byWorld.has(state.worldId)) this.byWorld.set(state.worldId, new Map())
    this.byWorld.get(state.worldId)!.set(this.key(state.subjectType, state.subjectId), state)
  }

  async getActive(worldId: WorldId, subjectType: SeparationSubjectType, subjectId: string): Promise<SeparationState | null> {
    const state = this.byWorld.get(worldId)?.get(this.key(subjectType, subjectId)) ?? null
    return state?.active ? state : null
  }

  async listActiveByEntity(worldId: WorldId, entityId: EntityId): Promise<SeparationState[]> {
    return [...(this.byWorld.get(worldId)?.values() ?? [])].filter((s) => s.active && s.entityId === entityId)
  }
}
