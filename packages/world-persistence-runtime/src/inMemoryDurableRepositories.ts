import type {
  AppendEventResult,
  ConditionalSaveResult,
  DurableWorldState,
  DurableWorldStateRepository,
  DurableWorldSystemEventRepository,
  WorldCheckpoint,
  WorldCheckpointRepository,
  WorldDefinitionId,
  WorldInstance,
  WorldInstanceId,
  WorldInstanceRepository,
  WorldLifecycleRecord,
  WorldLifecycleRepository,
  WorldStateVersion,
  WorldSystemEventRecord,
} from "@avatark/world-persistence-contracts"

// Sprint 9, Phase 16: reference, deterministic in-memory adapters for
// every new durable contract -- the same role Sprint 7's own
// InMemory*Repository classes play for SharedWorldState/LivingEntityState/
// etc (packages/living-systems-runtime/src/inMemoryRepositories.ts):
// proof that each interface is satisfiable, and a real, exercised test
// harness, never a mock. No Postgres/Supabase-specific type appears
// anywhere in this file -- see supabase/migrations/026_*.sql for the
// prepared (unapplied) real schema these adapters stand in for.

// Sprint 9, Phase 6: THE optimistic-concurrency enforcement point.
// expectedVersion must equal the currently-stored stateVersion (or be
// `null` when no row exists yet) for a write to be accepted. A stale
// writer's call resolves to `conflict` -- it is never overwritten INTO,
// and it never overwrites what a faster writer already produced.
export class InMemoryDurableWorldStateRepository implements DurableWorldStateRepository {
  private readonly states = new Map<WorldInstanceId, DurableWorldState>()

  async load(worldInstanceId: WorldInstanceId): Promise<DurableWorldState | null> {
    return this.states.get(worldInstanceId) ?? null
  }

  async conditionalSave(next: Omit<DurableWorldState, "stateVersion">, expectedVersion: WorldStateVersion | null): Promise<ConditionalSaveResult<DurableWorldState>> {
    const current = this.states.get(next.worldInstanceId) ?? null
    const currentVersion = current?.stateVersion ?? null

    if (currentVersion !== expectedVersion) {
      return { status: "conflict", currentVersion: currentVersion ?? 0, currentState: current ?? { ...next, stateVersion: 0 } }
    }

    const stateVersion = (currentVersion ?? 0) + 1
    const saved: DurableWorldState = { ...next, stateVersion }
    this.states.set(next.worldInstanceId, saved)
    return { status: "saved", stateVersion }
  }
}

export class InMemoryWorldCheckpointRepository implements WorldCheckpointRepository {
  private readonly byId = new Map<string, WorldCheckpoint>()
  private readonly latestByInstance = new Map<WorldInstanceId, string>()

  async save(checkpoint: WorldCheckpoint): Promise<void> {
    // Idempotent upsert keyed by id (Phase 9): saving the same id twice
    // never creates a second row.
    this.byId.set(checkpoint.id, checkpoint)
    const currentLatestId = this.latestByInstance.get(checkpoint.worldInstanceId)
    const currentLatest = currentLatestId ? this.byId.get(currentLatestId) : undefined
    if (!currentLatest || checkpoint.checkpointVersion >= currentLatest.checkpointVersion) {
      this.latestByInstance.set(checkpoint.worldInstanceId, checkpoint.id)
    }
  }

  async loadLatest(worldInstanceId: WorldInstanceId): Promise<WorldCheckpoint | null> {
    const id = this.latestByInstance.get(worldInstanceId)
    return id ? this.byId.get(id) ?? null : null
  }
}

// Sprint 9, Phase 9: append is a dedupe-by-eventId upsert, never a blind
// push -- a retried append of an event whose id was already stored
// resolves to `duplicate_ignored` and does not create a second row, so
// a network retry can never double a season transition or duplicate an
// entity lifecycle change.
export class InMemoryDurableWorldSystemEventRepository implements DurableWorldSystemEventRepository {
  private readonly byInstance = new Map<WorldInstanceId, WorldSystemEventRecord[]>()
  private readonly sequenceByEventId = new Map<string, number>()

  async append(record: Omit<WorldSystemEventRecord, "sequence">): Promise<AppendEventResult> {
    const existingSequence = this.sequenceByEventId.get(record.eventId)
    if (existingSequence !== undefined) {
      return { status: "duplicate_ignored", sequence: existingSequence }
    }

    const events = this.byInstance.get(record.worldInstanceId) ?? []
    const sequence = events.length + 1
    const stored: WorldSystemEventRecord = { ...record, sequence }
    events.push(stored)
    this.byInstance.set(record.worldInstanceId, events)
    this.sequenceByEventId.set(record.eventId, sequence)
    return { status: "appended", sequence }
  }

  async listAfter(worldInstanceId: WorldInstanceId, afterSequence: number): Promise<WorldSystemEventRecord[]> {
    return (this.byInstance.get(worldInstanceId) ?? []).filter((event) => event.sequence > afterSequence)
  }
}

export class InMemoryWorldInstanceRepository implements WorldInstanceRepository {
  private readonly instances = new Map<WorldInstanceId, WorldInstance>()

  async get(id: WorldInstanceId): Promise<WorldInstance | null> {
    return this.instances.get(id) ?? null
  }

  async create(instance: WorldInstance): Promise<WorldInstance> {
    // Idempotent by id (Phase 9): creating the same id twice is a no-op
    // that returns the ORIGINAL instance, not an error and not a
    // silent overwrite of createdAt/definitionVersion.
    const existing = this.instances.get(instance.id)
    if (existing) return existing
    this.instances.set(instance.id, instance)
    return instance
  }

  async listByDefinition(definitionId: WorldDefinitionId): Promise<WorldInstance[]> {
    return [...this.instances.values()].filter((instance) => instance.definitionId === definitionId)
  }
}

export class InMemoryWorldLifecycleRepository implements WorldLifecycleRepository {
  private readonly records = new Map<WorldInstanceId, WorldLifecycleRecord>()

  async get(worldInstanceId: WorldInstanceId): Promise<WorldLifecycleRecord | null> {
    return this.records.get(worldInstanceId) ?? null
  }

  async save(record: WorldLifecycleRecord): Promise<void> {
    this.records.set(record.worldInstanceId, record)
  }
}
