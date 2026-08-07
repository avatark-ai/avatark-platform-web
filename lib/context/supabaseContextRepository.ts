// Concrete @avatark/context-runtime ContextRepository backed by
// migration 023's context_snapshots/context_history tables. Lives at the
// app layer, not inside packages/context-runtime, since that package
// must stay free of any database client and any app-local (`@/`)
// imports -- the runtime knows nothing about Supabase, and this file
// knows nothing about the runtime's precedence rules.
//
// Every query is additionally scoped with `.eq('user_id', userId)` as
// defense in depth, but the real security boundary is migration 023's
// RLS: `auth.uid() = user_id`. Whatever userId a caller passes in, a
// request authenticated as a different user simply gets no rows back.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ContextFields, ContextHistoryEntry, ContextRepository, ContextSnapshot } from '@avatark/context-runtime'

interface ContextSnapshotRow {
  user_id: string
  fields: ContextFields
  updated_at: string | null
}

interface ContextHistoryRow {
  id: string
  user_id: string
  snapshot: ContextSnapshot
  patch: ContextHistoryEntry['patch']
  recorded_at: string
}

function rowToSnapshot(row: ContextSnapshotRow): ContextSnapshot {
  return { userId: row.user_id, fields: row.fields, updatedAt: row.updated_at }
}

function rowToHistoryEntry(row: ContextHistoryRow): ContextHistoryEntry {
  return { id: row.id, userId: row.user_id, snapshot: row.snapshot, patch: row.patch, recordedAt: row.recorded_at }
}

export class SupabaseContextRepository implements ContextRepository {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  async loadSnapshot(userId: string): Promise<ContextSnapshot | null> {
    const { data, error } = await this.supabase
      .from('context_snapshots')
      .select('user_id, fields, updated_at')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load context snapshot: ${error.message}`)
    return data ? rowToSnapshot(data as ContextSnapshotRow) : null
  }

  async saveSnapshot(userId: string, snapshot: ContextSnapshot): Promise<void> {
    const { error } = await this.supabase
      .from('context_snapshots')
      .upsert({ user_id: userId, fields: snapshot.fields, updated_at: snapshot.updatedAt })
    if (error) throw new Error(`Failed to save context snapshot: ${error.message}`)
  }

  async appendHistory(entry: ContextHistoryEntry): Promise<void> {
    const { error } = await this.supabase.from('context_history').insert({
      id: entry.id,
      user_id: entry.userId,
      snapshot: entry.snapshot,
      patch: entry.patch,
      recorded_at: entry.recordedAt,
    })
    if (error) throw new Error(`Failed to append context history: ${error.message}`)
  }

  async loadHistory(userId: string, limit: number): Promise<ContextHistoryEntry[]> {
    const { data, error } = await this.supabase
      .from('context_history')
      .select('id, user_id, snapshot, patch, recorded_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(limit)
    if (error) throw new Error(`Failed to load context history: ${error.message}`)
    return (data ?? []).map((row) => rowToHistoryEntry(row as ContextHistoryRow))
  }

  async loadHistoryEntry(userId: string, entryId: string): Promise<ContextHistoryEntry | null> {
    const { data, error } = await this.supabase
      .from('context_history')
      .select('id, user_id, snapshot, patch, recorded_at')
      .eq('user_id', userId)
      .eq('id', entryId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load context history entry: ${error.message}`)
    return data ? rowToHistoryEntry(data as ContextHistoryRow) : null
  }
}
