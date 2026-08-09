import type { ParticipationRecord, ParticipationRecordRepository } from "@avatark/participation-contracts"

// Sprint 19: a reference in-memory adapter -- no Postgres repository is
// wired up in this environment (see
// supabase/migrations/035_participation.sql for the prepared, unapplied
// real schema). `save` is a plain upsert-by-(worldId, id), the same
// convention every other STATE (not event-stream) repository in this
// codebase already holds (WorldInstanceCanonicalProjectionState,
// EncounterRecord).
export class InMemoryParticipationRecordRepository implements ParticipationRecordRepository {
  private readonly byWorld = new Map<string, Map<string, ParticipationRecord>>()

  async save(record: ParticipationRecord): Promise<void> {
    if (!this.byWorld.has(record.worldId)) this.byWorld.set(record.worldId, new Map())
    this.byWorld.get(record.worldId)!.set(record.id, record)
  }

  async get(worldId: string, id: string): Promise<ParticipationRecord | null> {
    return this.byWorld.get(worldId)?.get(id) ?? null
  }

  async listByUser(worldId: string, userId: string): Promise<ParticipationRecord[]> {
    return [...(this.byWorld.get(worldId)?.values() ?? [])].filter((r) => r.userId === userId)
  }

  async listByWorld(worldId: string): Promise<ParticipationRecord[]> {
    return [...(this.byWorld.get(worldId)?.values() ?? [])]
  }
}
