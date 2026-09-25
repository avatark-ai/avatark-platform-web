// WORLDK-M13 Preview Lifecycle Harness — PREVIEW_ONLY / TEST_ONLY /
// AUTHORITY_SIMULATION.
//
// The ONLY M13 authority permitted to produce confirmed arrival/departure
// lifecycle events, and only on avatark-platform-preview. It stands for
// "an authoritative runtime/lifecycle producer confirmed this event". It is
// not WorldK clicking ENTER, not browsing, not authentication, not a consumer
// visit request, not a runtime receipt and not WorldEntry.
//
// Operator-run from a workstation. Never imported by an app route, never
// deployed, never in WorldK. It connects as the revocable credential
// worldk_lifecycle_harness_preview, assumes worldk_lifecycle_authority for a
// single transaction, and calls the 039 v2 functions — which can write only
// visitor continuity and the lifecycle log, never world state.

import { randomUUID } from "node:crypto"

export const PREVIEW_PROJECT_REF = "gxjdbfpyyrycvqzozyty"

/** Same list as supabase/scripts/run-platform-migrations.js. */
export const FORBIDDEN_PROJECT_REFS = [
  "hapoerzbcnagyfafqojg", // avatark-platform-test — PRODUCTION despite its name
  "bxerfgwrtwowzgahdgrj", // PrometheusK production
  "ibgalrzhwnitbgrqoesu", // prometheusk-test
  "qvwgrupvaetzcxlizccu", // legacy avatark-web production (arenak-prod)
] as const

export const PREVIEW_LIFECYCLE_AUTHORITY = {
  kind: "PREVIEW_AUTHORITY_SIMULATION",
  id: "worldk-m13-preview-lifecycle-harness",
} as const

export const LIFECYCLE_WRITER_ROLE = "worldk_lifecycle_authority"
export const LIFECYCLE_CREDENTIAL_ROLE = "worldk_lifecycle_harness_preview"
const HARNESS_VERSION = "m13.1"

export type LifecycleFailureCode =
  | "AUTHORITY_INVALID"
  | "WORLD_NOT_ALLOWED"
  | "SUBJECT_INVALID"
  | "TIME_OUT_OF_BOUNDS"
  | "INVALID_TICK"
  | "PROVENANCE_INVALID"
  | "EVENT_IDENTITY_REQUIRED"
  | "EVENT_ID_CONFLICT"
  | "VISIT_ID_REUSED"
  | "VISIT_ALREADY_OPEN"
  | "NO_OPEN_VISIT"
  | "VISIT_MISMATCH"
  | "TICK_REGRESSION"
  | "PERMISSION_DENIED"
  | "TARGET_REFUSED"

const DB_CODES = new Set<string>([
  "AUTHORITY_INVALID", "WORLD_NOT_ALLOWED", "SUBJECT_INVALID", "TIME_OUT_OF_BOUNDS", "INVALID_TICK", "PROVENANCE_INVALID",
  "EVENT_IDENTITY_REQUIRED", "EVENT_ID_CONFLICT", "VISIT_ID_REUSED", "VISIT_ALREADY_OPEN", "NO_OPEN_VISIT", "VISIT_MISMATCH", "TICK_REGRESSION",
])

export class LifecycleFailure extends Error {
  readonly code: LifecycleFailureCode
  constructor(code: LifecycleFailureCode, message?: string) {
    super(message ?? code)
    this.code = code
    this.name = "LifecycleFailure"
  }
}

/** Maps a Postgres error from the v2 functions to its deterministic classification. */
export function classifyLifecycleError(err: unknown): LifecycleFailure {
  const e = err as { code?: string; message?: string }
  if (e.message && DB_CODES.has(e.message)) return new LifecycleFailure(e.message as LifecycleFailureCode)
  // 42501 insufficient_privilege (no EXECUTE / no SET ROLE), 42883 undefined function.
  if (e.code === "42501" || e.code === "42883" || e.code === "28P01" || e.code === "28000") return new LifecycleFailure("PERMISSION_DENIED", e.message)
  if (e.code === "23505" && /world_visitor_lifecycle_events_pkey/.test(e.message ?? "")) return new LifecycleFailure("EVENT_ID_CONFLICT")
  throw err
}

export interface LifecycleTarget {
  /** Postgres host the harness will connect to. */
  host: string
  /** Login user (Supavisor form `<role>.<projectRef>` or plain role for direct/local). */
  user: string
  /** The project the operator intends to write. */
  projectRef: string
}

/**
 * Fails closed unless the target is unambiguously the Preview project.
 * A local disposable database is allowed only when explicitly requested
 * AND the host is loopback.
 */
export function assertLifecycleTarget(t: LifecycleTarget, opts: { allowLocalDisposable?: boolean } = {}): void {
  const hay = `${t.host} ${t.user} ${t.projectRef}`
  for (const ref of FORBIDDEN_PROJECT_REFS) {
    if (hay.includes(ref)) throw new LifecycleFailure("TARGET_REFUSED", `target references forbidden project ${ref}`)
  }
  const loopback = t.host === "127.0.0.1" || t.host === "localhost"
  if (loopback) {
    if (!opts.allowLocalDisposable) throw new LifecycleFailure("TARGET_REFUSED", "local target requires allowLocalDisposable")
    return
  }
  if (t.projectRef !== PREVIEW_PROJECT_REF) throw new LifecycleFailure("TARGET_REFUSED", `only ${PREVIEW_PROJECT_REF} (avatark-platform-preview) is permitted`)
  if (!(t.host.includes(PREVIEW_PROJECT_REF) || t.user.endsWith(`.${PREVIEW_PROJECT_REF}`))) {
    throw new LifecycleFailure("TARGET_REFUSED", "connection does not reference the preview project")
  }
  if (!t.user.startsWith(LIFECYCLE_CREDENTIAL_ROLE)) throw new LifecycleFailure("TARGET_REFUSED", `harness connects only as ${LIFECYCLE_CREDENTIAL_ROLE}`)
}

/** A single pg client/connection (not a pool: SET LOCAL ROLE must share the transaction). */
export interface LifecycleConnection {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>
}

export interface LifecycleEvent {
  eventId: string
  worldId: string
  subjectId: string
  visitId: string
  /** Must fall within (db now − 15 min, db now + 1 min); the DB is the clock of record. */
  occurredAt: string
  worldTick: number
  placeId: string | null
  authorityKind?: string
  authorityId?: string
  provenance?: Record<string, unknown>
}

export interface LifecycleResult {
  outcome: "APPLIED" | "IDEMPOTENT_REPLAY"
  eventId: string
  eventType: "CONFIRMED_ARRIVAL" | "CONFIRMED_DEPARTURE"
  worldId: string
  subjectId: string
  visitId: string
  visitCount: number
  visitOpen: boolean
  openVisitId: string | null
  lastSeenAt: string
  lastSeenTick: number
  lastSeenBasis: string
  recordedAt: string
}

/** Provenance receipt: states plainly that this is a Preview authority simulation. */
export function previewProvenance(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    classification: "PREVIEW_AUTHORITY_SIMULATION",
    harness: PREVIEW_LIFECYCLE_AUTHORITY.id,
    harnessVersion: HARNESS_VERSION,
    mission: "WORLDK-M13-DURABLE-VISITOR-CONTINUITY-01",
    runtimeReceipt: false,
    worldEntry: false,
    receiptId: randomUUID(),
    ...extra,
  }
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString())

function toResult(row: Record<string, unknown>): LifecycleResult {
  return {
    outcome: row.outcome as LifecycleResult["outcome"],
    eventId: String(row.event_id),
    eventType: row.event_type as LifecycleResult["eventType"],
    worldId: String(row.world_id),
    subjectId: String(row.subject_id),
    visitId: String(row.visit_id),
    visitCount: Number(row.visit_count),
    visitOpen: Boolean(row.visit_open),
    openVisitId: row.open_visit_id == null ? null : String(row.open_visit_id),
    lastSeenAt: iso(row.last_seen_at),
    lastSeenTick: Number(row.last_seen_tick),
    lastSeenBasis: String(row.last_seen_basis),
    recordedAt: iso(row.recorded_at),
  }
}

async function call(conn: LifecycleConnection, fn: "record_world_lifecycle_arrival_v2" | "record_world_lifecycle_departure_v2", e: LifecycleEvent, opts: { assumeRole?: boolean }): Promise<LifecycleResult> {
  const params = [
    e.eventId, e.worldId, e.subjectId, e.visitId, e.occurredAt, e.worldTick, e.placeId,
    e.authorityKind ?? PREVIEW_LIFECYCLE_AUTHORITY.kind, e.authorityId ?? PREVIEW_LIFECYCLE_AUTHORITY.id,
    JSON.stringify(e.provenance ?? {}),
  ]
  await conn.query("BEGIN")
  try {
    if (opts.assumeRole !== false) await conn.query(`SET LOCAL ROLE ${LIFECYCLE_WRITER_ROLE}`)
    const { rows } = await conn.query(`SELECT * FROM ${fn}($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`, params)
    await conn.query("COMMIT")
    return toResult(rows[0]!)
  } catch (err) {
    await conn.query("ROLLBACK").catch(() => {})
    throw classifyLifecycleError(err)
  }
}

/** Confirmed arrival. `assumeRole: false` exists only so negative tests can prove the bare credential is powerless. */
export function recordConfirmedArrival(conn: LifecycleConnection, e: LifecycleEvent, opts: { assumeRole?: boolean } = {}) {
  return call(conn, "record_world_lifecycle_arrival_v2", e, opts)
}

/** Confirmed departure, correlated to the open visit. */
export function recordConfirmedDeparture(conn: LifecycleConnection, e: LifecycleEvent, opts: { assumeRole?: boolean } = {}) {
  return call(conn, "record_world_lifecycle_departure_v2", e, opts)
}
