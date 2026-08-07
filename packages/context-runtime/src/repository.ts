import type { ContextHistoryEntry, ContextSnapshot } from './types.ts'

// Persistence contract the runtime depends on. A host wires in whatever
// backing store it has (Supabase, Postgres, in-memory for tests) — the
// runtime itself never imports a database client, per the
// "adapter driven" / no product-specific persistence principle.
export interface ContextRepository {
  loadSnapshot(userId: string): Promise<ContextSnapshot | null>
  saveSnapshot(userId: string, snapshot: ContextSnapshot): Promise<void>
  appendHistory(entry: ContextHistoryEntry): Promise<void>
  loadHistory(userId: string, limit: number): Promise<ContextHistoryEntry[]>
  loadHistoryEntry(userId: string, entryId: string): Promise<ContextHistoryEntry | null>
}

// Reference implementation — used by this package's own tests, and a
// reasonable starting point for a host with no persistence wired up yet.
// Strictly keyed by userId, so cross-user isolation is structural, not a
// matter of remembering to filter.
export class InMemoryContextRepository implements ContextRepository {
  private snapshots = new Map<string, ContextSnapshot>()
  private history = new Map<string, ContextHistoryEntry[]>()

  async loadSnapshot(userId: string): Promise<ContextSnapshot | null> {
    return this.snapshots.get(userId) ?? null
  }

  async saveSnapshot(userId: string, snapshot: ContextSnapshot): Promise<void> {
    this.snapshots.set(userId, snapshot)
  }

  async appendHistory(entry: ContextHistoryEntry): Promise<void> {
    const existing = this.history.get(entry.userId) ?? []
    existing.push(entry)
    this.history.set(entry.userId, existing)
  }

  async loadHistory(userId: string, limit: number): Promise<ContextHistoryEntry[]> {
    const entries = this.history.get(userId) ?? []
    return entries.slice(Math.max(0, entries.length - limit)).reverse()
  }

  async loadHistoryEntry(userId: string, entryId: string): Promise<ContextHistoryEntry | null> {
    const entries = this.history.get(userId) ?? []
    return entries.find((e) => e.id === entryId) ?? null
  }
}
