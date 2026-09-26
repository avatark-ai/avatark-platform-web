// WORLDK-M14-A: the Platform's entry-authority database client.
//
// The ONLY holder of the Platform lifecycle credential (D1). It connects as
// worldk_platform_entry_preview, assumes worldk_platform_entry_authority for
// exactly one transaction per call, and calls one 040 function. That role
// can EXECUTE the 040 entry/gateway/ingress/sweeper functions and nothing
// else: no table privileges, no 039 v2 writers, no world state.
//
// Runtimes never reach this module; they reach the Runtime Ingress routes,
// which pass the runtime's credential hash through to the database for
// verification inside the same transaction as the mutation.
import pg from "pg"

export const ENTRY_AUTHORITY_ROLE = "worldk_platform_entry_authority"
export const ENTRY_AUTHORITY_CREDENTIAL_ROLE = "worldk_platform_entry_preview"
export const ENTRY_AUTHORITY_DATABASE_URL_ENV = "WORLD_ENTRY_AUTHORITY_DATABASE_URL"
export const PREVIEW_PROJECT_REF = "gxjdbfpyyrycvqzozyty"

/** Same list as supabase/scripts/run-platform-migrations.js. */
const FORBIDDEN_PROJECT_REFS = ["hapoerzbcnagyfafqojg", "bxerfgwrtwowzgahdgrj", "ibgalrzhwnitbgrqoesu", "qvwgrupvaetzcxlizccu"]

export type EntryAuthorityCode =
  | "AUTHORITY_INVALID" | "WORLD_NOT_ALLOWED" | "SUBJECT_INVALID" | "EVENT_IDENTITY_REQUIRED" | "INTENT_CONFLICT"
  | "TICKET_INVALID" | "TICKET_EXPIRED" | "TICKET_ALREADY_REDEEMED" | "TICKET_SUPERSEDED"
  | "SESSION_NOT_FOUND" | "SESSION_NOT_BOUND" | "SESSION_ENDED" | "SESSION_NOT_CLAIMED" | "SESSION_NOT_JOINED"
  | "ALLOCATION_RELEASED" | "WORLD_MISMATCH" | "VISIT_CLOSED" | "CREDENTIAL_TTL_INVALID" | "NO_OPEN_VISIT" | "VISIT_MISMATCH" | "VISIT_ALREADY_OPEN" | "VISIT_ID_REUSED"
  | "TICK_REGRESSION" | "TIME_OUT_OF_BOUNDS" | "INVALID_TICK" | "PROVENANCE_INVALID" | "INVALID_READINESS"
  | "RECEIPT_IDENTITY_REQUIRED" | "RECEIPT_CONFLICT" | "EVENT_ID_CONFLICT"
  | "RUNTIME_CREDENTIAL_INVALID" | "RUNTIME_CREDENTIAL_REVOKED" | "RUNTIME_CREDENTIAL_EXPIRED" | "RUNTIME_INSTANCE_REVOKED"
  | "PERMISSION_DENIED" | "UNAVAILABLE"

const KNOWN = new Set<string>([
  "AUTHORITY_INVALID", "WORLD_NOT_ALLOWED", "SUBJECT_INVALID", "EVENT_IDENTITY_REQUIRED", "INTENT_CONFLICT",
  "TICKET_INVALID", "TICKET_EXPIRED", "TICKET_ALREADY_REDEEMED", "TICKET_SUPERSEDED",
  "SESSION_NOT_FOUND", "SESSION_NOT_BOUND", "SESSION_ENDED", "SESSION_NOT_CLAIMED", "SESSION_NOT_JOINED",
  "ALLOCATION_RELEASED", "WORLD_MISMATCH", "VISIT_CLOSED", "CREDENTIAL_TTL_INVALID", "NO_OPEN_VISIT", "VISIT_MISMATCH", "VISIT_ALREADY_OPEN", "VISIT_ID_REUSED",
  "TICK_REGRESSION", "TIME_OUT_OF_BOUNDS", "INVALID_TICK", "PROVENANCE_INVALID", "INVALID_READINESS",
  "RECEIPT_IDENTITY_REQUIRED", "RECEIPT_CONFLICT", "EVENT_ID_CONFLICT",
  "RUNTIME_CREDENTIAL_INVALID", "RUNTIME_CREDENTIAL_REVOKED", "RUNTIME_CREDENTIAL_EXPIRED", "RUNTIME_INSTANCE_REVOKED",
])

export const RUNTIME_AUTH_CODES: ReadonlySet<EntryAuthorityCode> = new Set([
  "RUNTIME_CREDENTIAL_INVALID", "RUNTIME_CREDENTIAL_REVOKED", "RUNTIME_CREDENTIAL_EXPIRED", "RUNTIME_INSTANCE_REVOKED",
])

export class EntryAuthorityError extends Error {
  readonly code: EntryAuthorityCode
  constructor(code: EntryAuthorityCode, message?: string) {
    super(message ?? code)
    this.code = code
    this.name = "EntryAuthorityError"
  }
}

export function classifyEntryAuthorityError(err: unknown): EntryAuthorityError {
  const e = err as { code?: string; message?: string }
  if (e?.message && KNOWN.has(e.message)) return new EntryAuthorityError(e.message as EntryAuthorityCode)
  if (e?.code === "42501" || e?.code === "42883" || e?.code === "28P01" || e?.code === "28000") return new EntryAuthorityError("PERMISSION_DENIED")
  if (e?.code === "23505" && /world_visitor_lifecycle_events_(pkey|one_per_visit)/.test(e.message ?? "")) return new EntryAuthorityError("EVENT_ID_CONFLICT")
  return new EntryAuthorityError("UNAVAILABLE")
}

// ── Typed results ──────────────────────────────────────────────────

export interface ResolveInput {
  intentId: string
  subjectId: string
  worldId: string
  requestedPlaceId: string | null
  arrivalKind: "FIRST_VISIT" | "RETURNING"
  arrivalPlaceId: string
  arrivalReason: "FIRST_VISIT_ENTRY" | "PRIOR_PLACE" | "WORLD_DIRECTED" | "SAFE_FALLBACK"
  requestedPlaceHonored: boolean
  ticketSha256: Buffer
}

export interface Resolution {
  outcome: "READY" | "PENDING" | "UNAVAILABLE"
  reason: string | null
  retryAfterSeconds: number | null
  visitId: string | null
  reconnect: boolean
  ticketExpiresAt: string | null
  arrivalKind: "FIRST_VISIT" | "RETURNING" | null
  arrivalPlaceId: string | null
  arrivalReason: ResolveInput["arrivalReason"] | null
  requestedPlaceHonored: boolean | null
}

export type SessionViewState = "WAITING" | "IN_WORLD" | "LEAVING" | "LEFT" | "ENDED"

export interface RuntimeSessionWork {
  sessionId: string
  visitId: string
  subjectId: string
  worldId: string
  reconnect: boolean
  claimed: boolean
  joined: boolean
  leaveRequested: boolean
}

export interface RuntimePollResult {
  heartbeatSeconds: number
  graceSeconds: number
  sessions: RuntimeSessionWork[]
}

export interface RuntimeBinding {
  sessionId: string
  visitId: string
  subjectId: string
  worldId: string
  placeId: string | null
  reconnect: boolean
}

export interface ReceiptResult {
  outcome: string
  recorded?: string
  leaveRequested?: boolean
  graceEndsAt?: string | null
}

export interface EntryAuthorityDb {
  resolve(input: ResolveInput): Promise<Resolution>
  redeemTicket(ticketSha256: Buffer, viewSha256: Buffer): Promise<{ outcome: string; sessionId: string | null; worldId: string }>
  sessionView(viewSha256: Buffer): Promise<{ state: SessionViewState; worldId: string }>
  requestLeave(viewSha256: Buffer): Promise<void>
  runtimePoll(credentialId: string, secretSha256: Buffer, readiness: "STARTING" | "READY"): Promise<RuntimePollResult>
  runtimeClaim(credentialId: string, secretSha256: Buffer, sessionId: string): Promise<RuntimeBinding>
  runtimeArrival(credentialId: string, secretSha256: Buffer, receiptId: string, sessionId: string, worldId: string, worldTick: number): Promise<ReceiptResult>
  runtimePresence(credentialId: string, secretSha256: Buffer, receiptId: string, sessionId: string, worldId: string, worldTick: number): Promise<ReceiptResult>
  runtimeDeparture(credentialId: string, secretSha256: Buffer, receiptId: string, sessionId: string, worldId: string, worldTick: number): Promise<ReceiptResult>
  runtimeDisconnect(credentialId: string, secretSha256: Buffer, receiptId: string, sessionId: string, worldId: string): Promise<ReceiptResult>
  sweep(limit: number): Promise<number>
}

// ── Target guard ───────────────────────────────────────────────────

/**
 * Refuses any database other than the Preview project (or, for tests only,
 * a local disposable server), so a misconfigured env can never point the
 * Platform entry authority at production.
 */
export function assertEntryAuthorityTarget(connectionString: string, opts: { allowLocal?: boolean } = {}): void {
  let u: URL
  try {
    u = new URL(connectionString)
  } catch {
    throw new Error("entry authority database URL is malformed")
  }
  const all = `${u.hostname} ${decodeURIComponent(u.username)} ${u.pathname}`
  if (FORBIDDEN_PROJECT_REFS.some((ref) => all.includes(ref))) throw new Error("entry authority database URL targets a forbidden project")
  const local = /^(localhost|127\.0\.0\.1)$/.test(u.hostname)
  if (local && opts.allowLocal) return
  if (!all.includes(PREVIEW_PROJECT_REF)) throw new Error("entry authority database URL is not the Preview project")
  const user = decodeURIComponent(u.username).split(".")[0]
  if (user !== ENTRY_AUTHORITY_CREDENTIAL_ROLE) throw new Error("entry authority database URL must use the Platform entry credential")
}

// ── pg implementation ──────────────────────────────────────────────

const uuidOrNull = (v: unknown) => (typeof v === "string" ? v : null)
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : typeof v === "string" ? new Date(v).toISOString() : null)

export class PgEntryAuthorityDb implements EntryAuthorityDb {
  private readonly pool: pg.Pool

  constructor(connectionString: string, opts: { allowLocal?: boolean; ssl?: boolean } = {}) {
    assertEntryAuthorityTarget(connectionString, opts)
    this.pool = new pg.Pool({
      connectionString,
      max: 2,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
      ssl: opts.ssl === false ? undefined : { rejectUnauthorized: false },
    })
  }

  async end(): Promise<void> {
    await this.pool.end()
  }

  private async call<T extends pg.QueryResultRow>(sql: string, params: unknown[]): Promise<T[]> {
    const client = await this.pool.connect().catch(() => {
      throw new EntryAuthorityError("UNAVAILABLE")
    })
    try {
      await client.query("BEGIN")
      await client.query(`SET LOCAL ROLE ${ENTRY_AUTHORITY_ROLE}`)
      const r = await client.query<T>(sql, params)
      await client.query("COMMIT")
      return r.rows
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {})
      throw err instanceof EntryAuthorityError ? err : classifyEntryAuthorityError(err)
    } finally {
      client.release()
    }
  }

  async resolve(i: ResolveInput): Promise<Resolution> {
    const [r] = await this.call(
      "SELECT * FROM world_entry_resolve($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [i.intentId, i.subjectId, i.worldId, i.requestedPlaceId, i.arrivalKind, i.arrivalPlaceId, i.arrivalReason, i.requestedPlaceHonored, i.ticketSha256],
    )
    return {
      outcome: r.outcome,
      reason: r.reason ?? null,
      retryAfterSeconds: r.retry_after_seconds ?? null,
      visitId: uuidOrNull(r.visit_id),
      reconnect: r.reconnect === true,
      ticketExpiresAt: iso(r.ticket_expires_at),
      arrivalKind: r.arrival_kind ?? null,
      arrivalPlaceId: r.arrival_place_id ?? null,
      arrivalReason: r.arrival_reason ?? null,
      requestedPlaceHonored: r.requested_place_honored ?? null,
    }
  }

  async redeemTicket(ticketSha256: Buffer, viewSha256: Buffer) {
    const [r] = await this.call("SELECT * FROM world_entry_redeem_ticket($1, $2)", [ticketSha256, viewSha256])
    return { outcome: r.outcome as string, sessionId: uuidOrNull(r.session_id), worldId: r.world_id as string }
  }

  async sessionView(viewSha256: Buffer) {
    const [r] = await this.call("SELECT * FROM world_entry_session_view($1)", [viewSha256])
    return { state: r.state as SessionViewState, worldId: r.world_id as string }
  }

  async requestLeave(viewSha256: Buffer) {
    await this.call("SELECT world_entry_session_request_leave($1) AS r", [viewSha256])
  }

  async runtimePoll(credentialId: string, secretSha256: Buffer, readiness: "STARTING" | "READY") {
    const [r] = await this.call("SELECT world_runtime_poll($1, $2, $3) AS r", [credentialId, secretSha256, readiness])
    return r.r as RuntimePollResult
  }

  async runtimeClaim(credentialId: string, secretSha256: Buffer, sessionId: string) {
    const [r] = await this.call("SELECT world_runtime_claim($1, $2, $3) AS r", [credentialId, secretSha256, sessionId])
    return r.r as RuntimeBinding
  }

  async runtimeArrival(credentialId: string, secretSha256: Buffer, receiptId: string, sessionId: string, worldId: string, worldTick: number) {
    const [r] = await this.call("SELECT world_runtime_arrival($1, $2, $3, $4, $5, $6) AS r", [credentialId, secretSha256, receiptId, sessionId, worldId, worldTick])
    return r.r as ReceiptResult
  }

  async runtimePresence(credentialId: string, secretSha256: Buffer, receiptId: string, sessionId: string, worldId: string, worldTick: number) {
    const [r] = await this.call("SELECT world_runtime_presence($1, $2, $3, $4, $5, $6) AS r", [credentialId, secretSha256, receiptId, sessionId, worldId, worldTick])
    return r.r as ReceiptResult
  }

  async runtimeDeparture(credentialId: string, secretSha256: Buffer, receiptId: string, sessionId: string, worldId: string, worldTick: number) {
    const [r] = await this.call("SELECT world_runtime_departure($1, $2, $3, $4, $5, $6) AS r", [credentialId, secretSha256, receiptId, sessionId, worldId, worldTick])
    return r.r as ReceiptResult
  }

  async runtimeDisconnect(credentialId: string, secretSha256: Buffer, receiptId: string, sessionId: string, worldId: string) {
    const [r] = await this.call("SELECT world_runtime_disconnect($1, $2, $3, $4, $5) AS r", [credentialId, secretSha256, receiptId, sessionId, worldId])
    return r.r as ReceiptResult
  }

  async sweep(limit: number) {
    const [r] = await this.call("SELECT world_presence_sweep($1) AS n", [limit])
    return Number(r.n)
  }
}
