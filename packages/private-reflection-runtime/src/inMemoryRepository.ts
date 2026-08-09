import type { PrivateReflectionRecord, PrivateReflectionRecordRepository } from "@avatark/private-reflection-contracts"

// Sprint 19: append-only, owner-scoped-read-only -- the same posture
// every other append-style repository in this codebase already holds
// (WorldEvent, EncounterRecord, AdaptationEffect, TerritoryClaim,
// VisitorCanonicalEventWitness), plus one deliberate omission: there is
// no world-wide listing method here at all, not even for internal Host
// use. See supabase/migrations/035_participation.sql for the prepared,
// unapplied real schema (owner-only RLS, no service-role read path).
export class InMemoryPrivateReflectionRepository implements PrivateReflectionRecordRepository {
  private readonly byWorld = new Map<string, PrivateReflectionRecord[]>()

  async append(record: PrivateReflectionRecord): Promise<void> {
    if (!this.byWorld.has(record.worldId)) this.byWorld.set(record.worldId, [])
    this.byWorld.get(record.worldId)!.push(record)
  }

  async listByOwner(worldId: string, userId: string): Promise<PrivateReflectionRecord[]> {
    return (this.byWorld.get(worldId) ?? []).filter((r) => r.userId === userId)
  }
}
