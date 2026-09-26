// WORLDK-M14-A: Platform Entry Resolver — Contract 03 (frozen M07 v1).
//
//   POST /api/worlds/:worldId/entry   WorldEntryIntent -> WorldEntryResult
//
// Identity: the subject comes ONLY from the injected session-verifying
// resolver (M07 §6). The body never carries identity, and anything that
// looks like one is rejected by the strict intent shape check.
//
// A READY result means "a runtime allocation and a single-use ticket exist".
// It is NOT an arrival: no continuity row or lifecycle event is written here
// or anywhere on this path. The visit opens only when a registered runtime
// instance sends a verified ARRIVAL receipt to the Runtime Ingress.
//
// Opaqueness (D5): the only runtime-related thing that leaves this module
// is handoff.href — a Platform-origin URL carrying the ticket secret. No
// runtime instance id, allocation id, visit id, machine or signalling
// address is ever returned.
import type { WorldEntryArrival, WorldEntryIntent, WorldEntryResult } from "@avatark/world-consumer-contracts"
import { forbiddenFieldsIn } from "@avatark/world-consumer-contracts"
import { resolveArrivalDecision } from "@avatark/world-experience-runtime"
import { resolveWorldBinding, WORLD_BINDINGS, type WorldBinding, type WorldConsumerMode } from "../worldConsumer/bindings.ts"
import type { VisitorContinuityLedger } from "../worldConsumer/continuityLedger.ts"
import type { VerifiedVisitor } from "../worldConsumer/service.ts"
import { EntryAuthorityError, type EntryAuthorityDb, type Resolution } from "./authorityDb.ts"
import { isUuid, newTicket } from "./credentials.ts"

export const HANDOFF_PATH_PREFIX = "/world-entry/h/"

export interface WorldEntryDeps {
  mode: WorldConsumerMode
  bindings?: readonly WorldBinding[]
  /** Session-scoped continuity reader (read-only), for the ArrivalDecision. */
  ledger: VisitorContinuityLedger
  /** Null when the entry authority is not configured in this environment. */
  db: EntryAuthorityDb | null
  /** https origin of the Platform handoff gateway. */
  handoffOrigin: string
}

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Authorization",
  "Referrer-Policy": "no-referrer",
}

const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })

// ── Intent shape (strict: unknown keys are refused) ────────────────

const VIEWPORT = new Set(["COMPACT", "MEDIUM", "EXPANDED"])
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

function exactKeys(o: Record<string, unknown>, keys: string[]): boolean {
  const k = Object.keys(o)
  return k.length === keys.length && keys.every((x) => k.includes(x))
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v)

export function parseWorldEntryIntent(body: unknown): WorldEntryIntent | null {
  if (!isObj(body) || !exactKeys(body, ["schemaVersion", "contract", "intentId", "worldId", "requestedPlaceId", "narrativeContext", "client"])) return null
  if (body.schemaVersion !== "1.0" || body.contract !== "world-entry-intent") return null
  if (!isUuid(body.intentId) || typeof body.worldId !== "string" || !SLUG.test(body.worldId)) return null
  if (body.requestedPlaceId !== null && (typeof body.requestedPlaceId !== "string" || !SLUG.test(body.requestedPlaceId))) return null
  if (body.narrativeContext !== null && !isObj(body.narrativeContext)) return null
  const c = body.client
  if (!isObj(c) || !exactKeys(c, ["surface", "capabilities"]) || c.surface !== "WEB") return null
  const cap = c.capabilities
  if (!isObj(cap) || !exactKeys(cap, ["webgl2", "touchPrimary", "viewportClass", "reducedMotion"])) return null
  if (typeof cap.webgl2 !== "boolean" || typeof cap.touchPrimary !== "boolean" || typeof cap.reducedMotion !== "boolean") return null
  if (typeof cap.viewportClass !== "string" || !VIEWPORT.has(cap.viewportClass)) return null
  return body as unknown as WorldEntryIntent
}

// ── Result builders ────────────────────────────────────────────────

function base(intent: Pick<WorldEntryIntent, "intentId" | "worldId">, subjectId: string | null): Omit<WorldEntryResult, "outcome"> {
  return {
    schemaVersion: "1.0",
    contract: "world-entry-result",
    intentId: intent.intentId,
    worldId: intent.worldId,
    subjectId,
    arrival: null,
    handoff: null,
    pending: null,
    unavailable: null,
    denied: null,
  }
}

type UnavailableReason = NonNullable<WorldEntryResult["unavailable"]>["reason"]

export function unavailableResult(intent: Pick<WorldEntryIntent, "intentId" | "worldId">, subjectId: string, reason: UnavailableReason, retryAfterSeconds: number | null): WorldEntryResult {
  return { ...base(intent, subjectId), outcome: "UNAVAILABLE", unavailable: { reason, retryAfterSeconds } }
}

const REASON: Record<string, WorldEntryArrival["reason"]> = {
  FIRST_EVER_VISIT: "FIRST_VISIT_ENTRY",
  RETURNING_TO_PRIOR_PLACE: "PRIOR_PLACE",
  CANON_DIRECTED_ENTRY: "WORLD_DIRECTED",
  STALE_PRIOR_LOCATION_FALLBACK: "SAFE_FALLBACK",
  SAFE_FALLBACK_ENTRY: "SAFE_FALLBACK",
}

/** Contract 03 arrival from the platform ArrivalDecision over durable continuity. */
export function decideArrival(binding: WorldBinding, visitCount: number, lastPlaceId: string | null, requestedPlaceId: string | null): WorldEntryArrival {
  const known = binding.places.map((p) => p.projectionPlaceId)
  const d = resolveArrivalDecision({
    priorLocationId: visitCount > 0 ? lastPlaceId ?? "" : null,
    knownLocationIds: known,
    entryLocationId: known[0],
    canonDirectedLocationIds: [],
    worldChangedSinceLastVisit: visitCount > 0,
  })
  return {
    kind: visitCount > 0 ? "RETURNING" : "FIRST_VISIT",
    placeId: d.locationId,
    reason: REASON[d.reason] ?? "SAFE_FALLBACK",
    requestedPlaceHonored: requestedPlaceId !== null && requestedPlaceId === d.locationId,
  }
}

function fromResolution(intent: WorldEntryIntent, subjectId: string, r: Resolution, ticketSecret: string, origin: string): WorldEntryResult {
  if (r.outcome === "READY" && r.ticketExpiresAt && r.arrivalKind && r.arrivalPlaceId && r.arrivalReason) {
    return {
      ...base(intent, subjectId),
      outcome: "READY",
      arrival: { kind: r.arrivalKind, placeId: r.arrivalPlaceId, reason: r.arrivalReason, requestedPlaceHonored: r.requestedPlaceHonored === true },
      handoff: { kind: "NAVIGATE", href: `${origin}${HANDOFF_PATH_PREFIX}${ticketSecret}`, expiresAt: r.ticketExpiresAt, singleUse: true },
    }
  }
  if (r.outcome === "PENDING") {
    const reason = r.reason === "QUEUED" ? "QUEUED" : "PREPARING"
    return { ...base(intent, subjectId), outcome: "PENDING", pending: { reason, retryAfterSeconds: Math.min(300, Math.max(1, r.retryAfterSeconds ?? 5)) } }
  }
  const reason: UnavailableReason = r.reason === "AT_CAPACITY" ? "AT_CAPACITY" : "RUNTIME_UNAVAILABLE"
  return unavailableResult(intent, subjectId, reason, r.retryAfterSeconds === null ? null : Math.min(86400, Math.max(1, r.retryAfterSeconds)))
}

function guard(result: WorldEntryResult): WorldEntryResult {
  const leaked = forbiddenFieldsIn(result)
  if (leaked.length > 0) throw new Error(`forbidden fields in entry result: ${leaked.join(", ")}`)
  return result
}

// ── Handler ────────────────────────────────────────────────────────

export async function handleWorldEntryRequest(
  request: Request,
  worldId: string,
  resolveVisitor: (request: Request) => Promise<VerifiedVisitor | null>,
  deps: WorldEntryDeps,
): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: "INVALID_INTENT" }, 400)
  }
  const intent = parseWorldEntryIntent(body)
  if (!intent || intent.worldId !== worldId) return json({ error: "INVALID_INTENT" }, 400)

  const visitor = await resolveVisitor(request)
  if (!visitor) return json(guard({ ...base(intent, null), outcome: "AUTHENTICATION_REQUIRED" }), 401)
  const subjectId = visitor.subjectId

  const binding = resolveWorldBinding(worldId, deps.mode, deps.bindings ?? WORLD_BINDINGS)
  if (binding.kind === "NOT_FOUND") return json(guard(unavailableResult(intent, subjectId, "WORLD_NOT_FOUND", null)), 200)
  if (binding.kind === "NOT_PUBLISHED") return json(guard(unavailableResult(intent, subjectId, "NOT_YET_OPEN", null)), 200)
  if (!deps.db) return json(guard(unavailableResult(intent, subjectId, "RUNTIME_UNAVAILABLE", null)), 200)

  const requested = intent.requestedPlaceId && binding.binding.places.some((p) => p.projectionPlaceId === intent.requestedPlaceId) ? intent.requestedPlaceId : null
  let continuity
  try {
    continuity = await deps.ledger.get(worldId, subjectId)
  } catch {
    return json(guard(unavailableResult(intent, subjectId, "RUNTIME_UNAVAILABLE", 30)), 200)
  }
  const arrival = decideArrival(binding.binding, continuity?.visitCount ?? 0, continuity?.lastPlaceId ?? null, requested)
  const ticket = newTicket()
  let resolution: Resolution
  try {
    resolution = await deps.db.resolve({
      intentId: intent.intentId,
      subjectId,
      worldId,
      requestedPlaceId: requested,
      arrivalKind: arrival.kind,
      arrivalPlaceId: arrival.placeId,
      arrivalReason: arrival.reason,
      requestedPlaceHonored: arrival.requestedPlaceHonored,
      ticketSha256: ticket.sha256,
    })
  } catch (err) {
    if (err instanceof EntryAuthorityError && err.code === "INTENT_CONFLICT") return json({ error: "INTENT_CONFLICT" }, 409)
    return json(guard(unavailableResult(intent, subjectId, "RUNTIME_UNAVAILABLE", 30)), 200)
  }
  return json(guard(fromResolution(intent, subjectId, resolution, ticket.secret, deps.handoffOrigin)), 200)
}
