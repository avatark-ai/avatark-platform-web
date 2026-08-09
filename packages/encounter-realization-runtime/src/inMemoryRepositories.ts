import type { EncounterRecord, EncounterRecordRepository } from "@avatark/encounter-realization-contracts"

// Sprint 14: a reference in-memory adapter -- no Postgres repository is
// wired up in this environment (see
// supabase/migrations/031_encounter_realization.sql for the prepared,
// unapplied real schema). `save` is a plain upsert-by-id, matching
// every other STATE (not event-stream) repository's own convention in
// this codebase.
export class InMemoryEncounterRecordRepository implements EncounterRecordRepository {
  private readonly byWorld = new Map<string, Map<string, EncounterRecord>>()

  async save(record: EncounterRecord): Promise<void> {
    if (!this.byWorld.has(record.worldId)) this.byWorld.set(record.worldId, new Map())
    this.byWorld.get(record.worldId)!.set(record.id, record)
  }

  async get(worldId: string, id: string): Promise<EncounterRecord | null> {
    return this.byWorld.get(worldId)?.get(id) ?? null
  }

  async listByLocation(worldId: string, locationId: string): Promise<EncounterRecord[]> {
    return [...(this.byWorld.get(worldId)?.values() ?? [])].filter((r) => r.locationId === locationId)
  }

  async listRecent(worldId: string, limit: number): Promise<EncounterRecord[]> {
    return [...(this.byWorld.get(worldId)?.values() ?? [])].sort((a, b) => b.startTick - a.startTick).slice(0, limit)
  }
}
