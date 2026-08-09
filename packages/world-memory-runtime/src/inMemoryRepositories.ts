import type {
  AppendEntityMemoryResult,
  AppendWorldEventResult,
  EncounterHistoryEntry,
  EncounterHistoryRepository,
  EncounterHistoryStatus,
  EntityMemoryEntry,
  EntityMemoryEntryType,
  EntityMemoryRepository,
  HistoricalMarker,
  HistoricalMarkerRepository,
  WorldEvent,
  WorldEventCategory,
  WorldEventRepository,
} from "@avatark/world-memory-contracts"
import type { EncounterRuleId, EntityId } from "@avatark/living-systems-contracts"
import type { LocationId, WorldId } from "@avatark/runtime-contracts"

// Sprint 11, Phase 17/18: reference in-memory adapters -- the same role
// every prior sprint's own InMemory*Repository classes play: proof each
// contract is satisfiable, and idempotent by construction (dedupe by
// id), never a weaker stand-in. No Postgres repository exists for any
// of these yet; a real schema is prepared-but-unapplied
// (supabase/migrations/028_*.sql).

// Sprint 10's own EntityMemory bound: keep only the most recent K
// entries per (entityId, type) -- "minimal meaningful memory," never an
// unbounded log (Phase 6's own requirement).
const MAX_ENTRIES_PER_TYPE = 5

export class InMemoryWorldEventRepository implements WorldEventRepository {
  private readonly byWorld = new Map<WorldId, WorldEvent[]>()
  private readonly seenIds = new Set<string>()

  async append(event: WorldEvent): Promise<AppendWorldEventResult> {
    if (this.seenIds.has(event.id)) return { status: "duplicate_ignored" }
    this.seenIds.add(event.id)
    const events = this.byWorld.get(event.worldId) ?? []
    events.push(event)
    this.byWorld.set(event.worldId, events)
    return { status: "appended" }
  }

  async listSince(worldId: WorldId, sinceTick: number): Promise<WorldEvent[]> {
    return (this.byWorld.get(worldId) ?? []).filter((e) => e.tick > sinceTick)
  }

  async listByLocation(worldId: WorldId, locationId: LocationId): Promise<WorldEvent[]> {
    return (this.byWorld.get(worldId) ?? []).filter((e) => e.locationId === locationId)
  }

  async listByEntity(worldId: WorldId, entityId: EntityId): Promise<WorldEvent[]> {
    return (this.byWorld.get(worldId) ?? []).filter((e) => e.participantEntityIds.includes(entityId))
  }

  async listByCategory(worldId: WorldId, category: WorldEventCategory): Promise<WorldEvent[]> {
    return (this.byWorld.get(worldId) ?? []).filter((e) => e.category === category)
  }

  async listRecent(worldId: WorldId, limit: number): Promise<WorldEvent[]> {
    return [...(this.byWorld.get(worldId) ?? [])].sort((a, b) => b.tick - a.tick).slice(0, limit)
  }
}

export class InMemoryEntityMemoryRepository implements EntityMemoryRepository {
  private readonly byWorld = new Map<WorldId, Map<EntityId, EntityMemoryEntry[]>>()
  private readonly seenIds = new Set<string>()

  async append(entry: EntityMemoryEntry): Promise<AppendEntityMemoryResult> {
    if (this.seenIds.has(entry.id)) return { status: "duplicate_ignored" }
    this.seenIds.add(entry.id)

    if (!this.byWorld.has(entry.worldId)) this.byWorld.set(entry.worldId, new Map())
    const byEntity = this.byWorld.get(entry.worldId)!
    const existing = byEntity.get(entry.entityId) ?? []
    existing.push(entry)

    // Bound per (entityId, type): keep only the most recent K, oldest
    // first evicted -- never an unbounded autobiographical log.
    const byType = new Map<EntityMemoryEntryType, EntityMemoryEntry[]>()
    for (const e of existing) byType.set(e.type, [...(byType.get(e.type) ?? []), e])
    const bounded = [...byType.values()].flatMap((entries) => entries.slice(-MAX_ENTRIES_PER_TYPE))
    byEntity.set(entry.entityId, bounded)

    return { status: "appended" }
  }

  async list(worldId: WorldId, entityId: EntityId): Promise<EntityMemoryEntry[]> {
    return [...(this.byWorld.get(worldId)?.get(entityId) ?? [])]
  }

  async listByType(worldId: WorldId, entityId: EntityId, type: EntityMemoryEntryType): Promise<EntityMemoryEntry[]> {
    return (this.byWorld.get(worldId)?.get(entityId) ?? []).filter((e) => e.type === type)
  }
}

export class InMemoryHistoricalMarkerRepository implements HistoricalMarkerRepository {
  private readonly byWorld = new Map<WorldId, HistoricalMarker[]>()
  private readonly seenIds = new Set<string>()

  async append(marker: HistoricalMarker): Promise<{ status: "appended" | "duplicate_ignored" }> {
    if (this.seenIds.has(marker.id)) return { status: "duplicate_ignored" }
    this.seenIds.add(marker.id)
    const markers = this.byWorld.get(marker.worldId) ?? []
    markers.push(marker)
    this.byWorld.set(marker.worldId, markers)
    return { status: "appended" }
  }

  async listByLocation(worldId: WorldId, locationId: LocationId): Promise<HistoricalMarker[]> {
    return (this.byWorld.get(worldId) ?? []).filter((m) => m.locationId === locationId)
  }
}

export class InMemoryEncounterHistoryRepository implements EncounterHistoryRepository {
  private readonly byWorld = new Map<WorldId, EncounterHistoryEntry[]>()
  private readonly seenIds = new Set<string>()

  async append(entry: EncounterHistoryEntry): Promise<{ status: "appended" | "duplicate_ignored" }> {
    if (this.seenIds.has(entry.id)) return { status: "duplicate_ignored" }
    this.seenIds.add(entry.id)
    const entries = this.byWorld.get(entry.worldId) ?? []
    entries.push(entry)
    this.byWorld.set(entry.worldId, entries)
    return { status: "appended" }
  }

  async listByRule(worldId: WorldId, ruleId: EncounterRuleId): Promise<EncounterHistoryEntry[]> {
    return (this.byWorld.get(worldId) ?? []).filter((e) => e.ruleId === ruleId)
  }

  async latestStatus(worldId: WorldId, ruleId: EncounterRuleId): Promise<EncounterHistoryStatus | null> {
    const entries = (this.byWorld.get(worldId) ?? []).filter((e) => e.ruleId === ruleId).sort((a, b) => a.tick - b.tick)
    return entries.length > 0 ? entries[entries.length - 1].status : null
  }
}
