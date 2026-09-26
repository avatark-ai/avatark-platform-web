// WORLDK-M14-A: Platform Runtime Ingress (D1, D2).
//
//   POST /api/runtime/v1/:op    op = poll | claim | arrival | presence | departure | disconnect
//   Authorization: Bearer wkrt1.<credentialId>.<secret>
//
// The ONLY surface a runtime talks to. A runtime submits evidence; the
// Platform verifies it (credential, instance status, allocation, session,
// visit, world binding — all inside the database transaction that applies
// it) and performs the lifecycle mutation itself. Runtimes hold no database
// credential and never reach continuity directly.
//
// Trust: the runtime supplies only identifiers it was given (session id,
// world id) and a receipt id for replay protection. It never supplies
// time, world tick, place, subject or visit: the Platform takes time from
// the database clock, the world tick from its own world clock, and the
// subject/visit/place from the session binding it created.
import { createHash, timingSafeEqual } from "node:crypto"
import { resolveWorldBinding, WORLD_BINDINGS, type WorldBinding, type WorldConsumerMode } from "../worldConsumer/bindings.ts"
import type { WorldFactSource } from "../worldConsumer/facts.ts"
import { EntryAuthorityError, RUNTIME_AUTH_CODES, type EntryAuthorityDb } from "./authorityDb.ts"
import { isUuid, platformIssuedCredentialAuthenticator, type RuntimeAuthenticator } from "./credentials.ts"

export const RUNTIME_OPS = ["poll", "claim", "arrival", "presence", "departure", "disconnect"] as const
export type RuntimeOp = (typeof RUNTIME_OPS)[number]

export interface RuntimeIngressDeps {
  db: EntryAuthorityDb | null
  mode: WorldConsumerMode
  bindings?: readonly WorldBinding[]
  facts: WorldFactSource
  authenticator?: RuntimeAuthenticator
}

const HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" }
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: HEADERS })

const STATUS: Partial<Record<string, number>> = {
  SESSION_NOT_BOUND: 403, WORLD_MISMATCH: 403, AUTHORITY_INVALID: 403, PERMISSION_DENIED: 403,
  RECEIPT_CONFLICT: 409, EVENT_ID_CONFLICT: 409, VISIT_ALREADY_OPEN: 409, VISIT_ID_REUSED: 409,
  SESSION_ENDED: 409, SESSION_NOT_CLAIMED: 409, SESSION_NOT_JOINED: 409, ALLOCATION_RELEASED: 409,
  NO_OPEN_VISIT: 409, VISIT_CLOSED: 409, VISIT_MISMATCH: 409, TICK_REGRESSION: 409, INVALID_READINESS: 400, RECEIPT_IDENTITY_REQUIRED: 400,
}

/** The Platform's own authoritative tick for a consumer world (never the runtime's). */
async function worldTick(worldId: string, deps: RuntimeIngressDeps): Promise<number | null> {
  const r = resolveWorldBinding(worldId, deps.mode, deps.bindings ?? WORLD_BINDINGS)
  if (r.kind !== "FOUND") return null
  const facts = await deps.facts.load(r.binding.runtimeWorldId)
  const tick = facts?.sharedState.clock.tick
  return typeof tick === "number" && Number.isInteger(tick) && tick >= 0 ? tick : null
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v)
}

export async function handleRuntimeIngress(request: Request, op: string, deps: RuntimeIngressDeps): Promise<Response> {
  if (!(RUNTIME_OPS as readonly string[]).includes(op)) return json({ error: "NOT_FOUND" }, 404)
  const principal = (deps.authenticator ?? platformIssuedCredentialAuthenticator).principal(request.headers)
  if (!principal) return json({ error: "RUNTIME_UNAUTHORIZED" }, 401)
  if (!deps.db) return json({ error: "UNAVAILABLE" }, 503)
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: "INVALID_REQUEST" }, 400)
  }
  if (!isObj(body)) return json({ error: "INVALID_REQUEST" }, 400)
  const { credentialId, secretSha256 } = principal
  const db = deps.db

  try {
    if (op === "poll") {
      const readiness = body.readiness === "STARTING" ? "STARTING" : body.readiness === "READY" ? "READY" : null
      if (!readiness) return json({ error: "INVALID_REQUEST" }, 400)
      return json(await db.runtimePoll(credentialId, secretSha256, readiness), 200)
    }
    if (!isUuid(body.sessionId)) return json({ error: "INVALID_REQUEST" }, 400)
    const sessionId = body.sessionId
    if (op === "claim") return json(await db.runtimeClaim(credentialId, secretSha256, sessionId), 200)

    if (!isUuid(body.receiptId) || typeof body.worldId !== "string") return json({ error: "INVALID_REQUEST" }, 400)
    const { receiptId, worldId } = body
    if (op === "disconnect") return json(await db.runtimeDisconnect(credentialId, secretSha256, receiptId, sessionId, worldId), 200)

    const tick = await worldTick(worldId, deps)
    if (tick === null) return json({ error: "WORLD_MISMATCH" }, 403)
    if (op === "arrival") return json(await db.runtimeArrival(credentialId, secretSha256, receiptId, sessionId, worldId, tick), 200)
    if (op === "presence") return json(await db.runtimePresence(credentialId, secretSha256, receiptId, sessionId, worldId, tick), 200)
    return json(await db.runtimeDeparture(credentialId, secretSha256, receiptId, sessionId, worldId, tick), 200)
  } catch (err) {
    const code = err instanceof EntryAuthorityError ? err.code : "UNAVAILABLE"
    // Every authentication failure looks the same to the caller.
    if (RUNTIME_AUTH_CODES.has(code)) return json({ error: "RUNTIME_UNAUTHORIZED" }, 401)
    return json({ error: code }, STATUS[code] ?? 503)
  }
}

// ── Presence sweeper trigger ───────────────────────────────────────

export const SWEEPER_KEY_HEADER = "x-platform-presence-sweeper-key"
export const SWEEPER_KEY_ENV = "PLATFORM_PRESENCE_SWEEPER_KEY"


const KEY_FORMAT = /^[A-Za-z0-9_-]{43,128}$/
const digest = (v: string) => createHash("sha256").update(v, "utf8").digest()

export function sweeperKeyMatches(supplied: string | null, configured: string | undefined): boolean {
  if (typeof configured !== "string" || !KEY_FORMAT.test(configured)) return false
  if (typeof supplied !== "string" || !KEY_FORMAT.test(supplied)) return false
  return timingSafeEqual(digest(supplied), digest(configured))
}

/**
 * Sweeping is also performed inside every entry resolution and runtime
 * receipt for the affected visit, and its outcome never depends on when it
 * runs (occurred_at = last accepted presence). This trigger only bounds how
 * long an abandoned visit can look open in projections.
 */
export async function handlePresenceSweep(request: Request, deps: { db: EntryAuthorityDb | null; configuredKey: string | undefined }): Promise<Response> {
  if (!sweeperKeyMatches(request.headers.get(SWEEPER_KEY_HEADER), deps.configuredKey)) return json({ error: "UNAUTHORIZED" }, 401)
  if (!deps.db) return json({ error: "UNAVAILABLE" }, 503)
  try {
    return json({ timedOut: await deps.db.sweep(100) }, 200)
  } catch {
    return json({ error: "UNAVAILABLE" }, 503)
  }
}
