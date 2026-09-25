// WORLDK-M13: durable visitor continuity, read through the visitor's OWN
// verified session.
//
// The deployed Platform holds no database credential for continuity. The
// row is read from Postgres (world_visitor_continuity, migrations 037/039)
// through PostgREST with the visitor's Supabase session, so RLS
// `world_visitor_continuity_read_own` (subject_id = auth.uid()) decides what
// is visible: a visitor can never read another visitor's row, even if a
// caller passed the wrong subjectId.
//
// Read-only by construction: both write methods throw. Lifecycle writes
// happen only through the 039 lifecycle authority, never from a request.
// There is no fallback: if the durable read fails, the caller must answer
// PROJECTION_UNAVAILABLE rather than invent or cache continuity.

import { continuityRecordFromRow, type ContinuityRecord, type PresenceEvent, type VisitorContinuityLedger } from "./continuityLedger.ts"

const COLUMNS =
  "world_id, subject_id, visit_count, first_entered_at, last_entered_at, last_entered_tick, last_left_at, visit_open, last_seen_at, last_seen_tick, last_seen_basis, last_place_id, encountered_place_ids"

/** The slice of a Supabase client this reader needs (a session-bound server client). */
export interface SessionContinuityClient {
  from(table: "world_visitor_continuity"): {
    select(columns: string): {
      eq(column: "world_id", value: string): {
        eq(column: "subject_id", value: string): {
          maybeSingle(): PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>
        }
      }
    }
  }
}

export class ContinuityReadUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ContinuityReadUnavailableError"
  }
}

export class SessionRlsContinuityReader implements VisitorContinuityLedger {
  private readonly client: () => Promise<SessionContinuityClient>
  /** `client` must return a client bound to the CURRENT request's verified session. */
  constructor(client: () => Promise<SessionContinuityClient>) {
    this.client = client
  }

  async get(worldId: string, subjectId: string): Promise<ContinuityRecord | null> {
    let db: SessionContinuityClient
    try {
      db = await this.client()
    } catch (err) {
      throw new ContinuityReadUnavailableError(`continuity client unavailable: ${(err as Error).message}`)
    }
    const { data, error } = await db.from("world_visitor_continuity").select(COLUMNS).eq("world_id", worldId).eq("subject_id", subjectId).maybeSingle()
    if (error) throw new ContinuityReadUnavailableError(`durable continuity read failed: ${error.code ?? ""} ${error.message}`.trim())
    if (!data) return null
    const record = continuityRecordFromRow(data as Parameters<typeof continuityRecordFromRow>[0])
    // RLS already guarantees this; refuse loudly rather than serve a foreign row.
    if (record.subjectId !== subjectId || record.worldId !== worldId) throw new ContinuityReadUnavailableError("continuity row does not match the verified visitor")
    return record
  }

  async recordConfirmedEntry(_event: PresenceEvent): Promise<ContinuityRecord> {
    throw new Error("SessionRlsContinuityReader is read-only: lifecycle writes go through the 039 lifecycle authority")
  }

  async recordLeave(_event: PresenceEvent): Promise<ContinuityRecord> {
    throw new Error("SessionRlsContinuityReader is read-only: lifecycle writes go through the 039 lifecycle authority")
  }
}
