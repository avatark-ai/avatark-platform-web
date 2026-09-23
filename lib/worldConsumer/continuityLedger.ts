// Durable visitor/world absence ledger. Owner: AvatarK Platform World Memory.
//
// Key: (worldId = consumer world id, subjectId = AvatarK IdentityClaims.subjectId).
//
// The interface has exactly two writes — confirmed entry and leave — both
// meant for the platform runtime host after runtime-confirmed presence.
// There is deliberately NO write for browsing, viewing a projection, or
// submitting an entry intent, so none of those can ever move lastSeen.
//
// Semantics are those of supabase/migrations/037_world_visitor_continuity.sql.
// InMemoryContinuityLedger mirrors them exactly (same test suite runs
// against both); PostgresContinuityLedger calls the migration's functions.

export type LastSeenBasis = "LEAVE_RECORDED" | "PRESENCE_TIMEOUT" | "ENTRY_CONFIRMED"

export interface ContinuityRecord {
  worldId: string
  subjectId: string
  visitCount: number
  firstEnteredAt: string
  lastEnteredAt: string
  lastEnteredTick: number
  lastLeftAt: string | null
  visitOpen: boolean
  lastSeenAt: string
  lastSeenTick: number
  lastSeenBasis: LastSeenBasis
  lastPlaceId: string | null
  encounteredPlaceIds: string[]
}

export interface PresenceEvent {
  worldId: string
  subjectId: string
  /** Wall-clock instant of the runtime-confirmed event. */
  at: string
  /** Authoritative world tick at that instant. */
  worldTick: number
  /** Consumer projection placeId (never a runtime LocationId). */
  placeId: string | null
}

export interface VisitorContinuityLedger {
  get(worldId: string, subjectId: string): Promise<ContinuityRecord | null>
  /** Runtime-confirmed arrival only. */
  recordConfirmedEntry(event: PresenceEvent): Promise<ContinuityRecord>
  /** Runtime-recorded leave. Idempotent for an already-closed visit. */
  recordLeave(event: PresenceEvent): Promise<ContinuityRecord>
}

export class ContinuityLedgerError extends Error {
  readonly code: "NO_CONFIRMED_ENTRY" | "TICK_REGRESSION" | "INVALID_TICK"
  constructor(message: string, code: ContinuityLedgerError["code"]) {
    super(message)
    this.code = code
    this.name = "ContinuityLedgerError"
  }
}

const addPlace = (ids: string[], placeId: string | null) => (placeId && !ids.includes(placeId) ? [...ids, placeId] : ids)

export class InMemoryContinuityLedger implements VisitorContinuityLedger {
  private readonly rows = new Map<string, ContinuityRecord>()

  private key(worldId: string, subjectId: string) {
    return `${worldId}\u0000${subjectId}`
  }

  async get(worldId: string, subjectId: string): Promise<ContinuityRecord | null> {
    const row = this.rows.get(this.key(worldId, subjectId))
    return row ? structuredClone(row) : null
  }

  async recordConfirmedEntry(e: PresenceEvent): Promise<ContinuityRecord> {
    if (e.worldTick < 0) throw new ContinuityLedgerError("world tick must be non-negative", "INVALID_TICK")
    const k = this.key(e.worldId, e.subjectId)
    const existing = this.rows.get(k)
    let next: ContinuityRecord
    if (!existing) {
      next = {
        worldId: e.worldId,
        subjectId: e.subjectId,
        visitCount: 1,
        firstEnteredAt: e.at,
        lastEnteredAt: e.at,
        lastEnteredTick: e.worldTick,
        lastLeftAt: null,
        visitOpen: true,
        lastSeenAt: e.at,
        lastSeenTick: e.worldTick,
        lastSeenBasis: "ENTRY_CONFIRMED",
        lastPlaceId: e.placeId,
        encounteredPlaceIds: e.placeId ? [e.placeId] : [],
      }
    } else {
      if (e.worldTick < existing.lastSeenTick) throw new ContinuityLedgerError(`confirmed entry tick ${e.worldTick} precedes last seen tick ${existing.lastSeenTick}`, "TICK_REGRESSION")
      next = {
        ...existing,
        visitCount: existing.visitCount + 1,
        lastEnteredAt: e.at,
        lastEnteredTick: e.worldTick,
        lastLeftAt: null,
        visitOpen: true,
        lastSeenAt: e.at,
        lastSeenTick: e.worldTick,
        lastSeenBasis: "ENTRY_CONFIRMED",
        lastPlaceId: e.placeId ?? existing.lastPlaceId,
        encounteredPlaceIds: addPlace(existing.encounteredPlaceIds, e.placeId),
      }
    }
    this.rows.set(k, next)
    return structuredClone(next)
  }

  async recordLeave(e: PresenceEvent): Promise<ContinuityRecord> {
    const k = this.key(e.worldId, e.subjectId)
    const existing = this.rows.get(k)
    if (!existing) throw new ContinuityLedgerError("no confirmed entry to leave from", "NO_CONFIRMED_ENTRY")
    if (!existing.visitOpen) return structuredClone(existing)
    if (e.worldTick < existing.lastSeenTick) throw new ContinuityLedgerError(`leave tick ${e.worldTick} precedes last seen tick ${existing.lastSeenTick}`, "TICK_REGRESSION")
    const next: ContinuityRecord = {
      ...existing,
      lastLeftAt: e.at,
      visitOpen: false,
      lastSeenAt: e.at,
      lastSeenTick: e.worldTick,
      lastSeenBasis: "LEAVE_RECORDED",
      lastPlaceId: e.placeId ?? existing.lastPlaceId,
      encounteredPlaceIds: addPlace(existing.encounteredPlaceIds, e.placeId),
    }
    this.rows.set(k, next)
    return structuredClone(next)
  }
}

// ── Postgres (migration 037) ───────────────────────────────────────

/** Minimal query surface (satisfied by `pg`'s Pool/Client). */
export interface SqlQueryable {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>
}

interface ContinuityRow {
  world_id: string
  subject_id: string
  visit_count: number
  first_entered_at: Date | string
  last_entered_at: Date | string
  last_entered_tick: number
  last_left_at: Date | string | null
  visit_open: boolean
  last_seen_at: Date | string
  last_seen_tick: number
  last_seen_basis: LastSeenBasis
  last_place_id: string | null
  encountered_place_ids: string[]
}

const iso = (v: Date | string) => (v instanceof Date ? v : new Date(v)).toISOString()

export function continuityRecordFromRow(row: ContinuityRow): ContinuityRecord {
  return {
    worldId: row.world_id,
    subjectId: row.subject_id,
    visitCount: row.visit_count,
    firstEnteredAt: iso(row.first_entered_at),
    lastEnteredAt: iso(row.last_entered_at),
    lastEnteredTick: row.last_entered_tick,
    lastLeftAt: row.last_left_at === null ? null : iso(row.last_left_at),
    visitOpen: row.visit_open,
    lastSeenAt: iso(row.last_seen_at),
    lastSeenTick: row.last_seen_tick,
    lastSeenBasis: row.last_seen_basis,
    lastPlaceId: row.last_place_id,
    encounteredPlaceIds: [...row.encountered_place_ids],
  }
}

function translatePgError(err: unknown): never {
  const e = err as { code?: string; message?: string }
  if (e.code === "P0002") throw new ContinuityLedgerError(e.message ?? "no confirmed entry", "NO_CONFIRMED_ENTRY")
  if (e.code === "22023") {
    throw new ContinuityLedgerError(e.message ?? "invalid tick", e.message?.includes("precedes") ? "TICK_REGRESSION" : "INVALID_TICK")
  }
  throw err
}

export class PostgresContinuityLedger implements VisitorContinuityLedger {
  private readonly db: SqlQueryable
  constructor(db: SqlQueryable) {
    this.db = db
  }

  async get(worldId: string, subjectId: string): Promise<ContinuityRecord | null> {
    const { rows } = await this.db.query("SELECT * FROM world_visitor_continuity WHERE world_id = $1 AND subject_id = $2", [worldId, subjectId])
    return rows[0] ? continuityRecordFromRow(rows[0] as unknown as ContinuityRow) : null
  }

  async recordConfirmedEntry(e: PresenceEvent): Promise<ContinuityRecord> {
    try {
      const { rows } = await this.db.query("SELECT * FROM record_world_confirmed_entry($1, $2, $3, $4, $5)", [e.worldId, e.subjectId, e.at, e.worldTick, e.placeId])
      return continuityRecordFromRow(rows[0] as unknown as ContinuityRow)
    } catch (err) {
      translatePgError(err)
    }
  }

  async recordLeave(e: PresenceEvent): Promise<ContinuityRecord> {
    try {
      const { rows } = await this.db.query("SELECT * FROM record_world_leave($1, $2, $3, $4, $5)", [e.worldId, e.subjectId, e.at, e.worldTick, e.placeId])
      return continuityRecordFromRow(rows[0] as unknown as ContinuityRow)
    } catch (err) {
      translatePgError(err)
    }
  }
}
