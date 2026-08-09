import type { AppendCanonicalEventWitnessResult, VisitorCanonicalEventWitness, VisitorCanonicalEventWitnessRepository, WorldInstanceCanonicalProjectionState, WorldInstanceCanonicalProjectionStateRepository } from "@avatark/canonical-event-contracts"

// Sprint 18: a reference in-memory adapter -- no Postgres repository is
// wired up in this environment (see
// supabase/migrations/034_canonical_events.sql for the prepared,
// unapplied real schema). `save` is a plain upsert-by-(worldId,
// canonicalEventId), the same convention every other STATE (not
// event-stream) repository in this codebase already holds.
export class InMemoryWorldInstanceCanonicalProjectionStateRepository implements WorldInstanceCanonicalProjectionStateRepository {
  private readonly byWorld = new Map<string, Map<string, WorldInstanceCanonicalProjectionState>>()

  async get(worldId: string, canonicalEventId: string): Promise<WorldInstanceCanonicalProjectionState | null> {
    return this.byWorld.get(worldId)?.get(canonicalEventId) ?? null
  }

  async save(state: WorldInstanceCanonicalProjectionState): Promise<void> {
    if (!this.byWorld.has(state.worldInstanceId)) this.byWorld.set(state.worldInstanceId, new Map())
    this.byWorld.get(state.worldInstanceId)!.set(state.canonicalEventId, state)
  }

  async listByWorld(worldId: string): Promise<WorldInstanceCanonicalProjectionState[]> {
    return [...(this.byWorld.get(worldId)?.values() ?? [])]
  }
}

function witnessKey(userId: string, canonicalEventId: string): string {
  return `${userId}|${canonicalEventId}`
}

// Sprint 18: append-only, idempotent by (worldId, userId, canonicalEventId)
// -- the same posture every other append-style repository in this
// codebase already holds (WorldEvent, EncounterRecord, AdaptationEffect,
// TerritoryClaim).
export class InMemoryVisitorCanonicalEventWitnessRepository implements VisitorCanonicalEventWitnessRepository {
  private readonly byWorld = new Map<string, Map<string, VisitorCanonicalEventWitness>>()

  async append(witness: VisitorCanonicalEventWitness): Promise<AppendCanonicalEventWitnessResult> {
    if (!this.byWorld.has(witness.worldInstanceId)) this.byWorld.set(witness.worldInstanceId, new Map())
    const existing = this.byWorld.get(witness.worldInstanceId)!
    const key = witnessKey(witness.userId, witness.canonicalEventId)
    if (existing.has(key)) return { status: "duplicate_ignored" }
    existing.set(key, witness)
    return { status: "appended" }
  }

  async listByUser(worldId: string, userId: string): Promise<VisitorCanonicalEventWitness[]> {
    return [...(this.byWorld.get(worldId)?.values() ?? [])].filter((w) => w.userId === userId)
  }
}
