// WorldK consumer service boundary (future LiveWorldKClient target).
//
//   GET /api/worlds/:worldId/public-projection   -> PublicWorldProjection   (public, cacheable by freshness)
//   GET /api/worlds/:worldId/visitor-projection  -> VisitorWorldProjection  (verified session, private, no-store)
//
// Identity: the visitor handler takes the subject ONLY from the injected,
// session-verifying resolver. Query parameters, request bodies, avatarKId
// and anon hints are never read.
//
// Continuity: confirmWorldArrival / recordWorldDeparture are the only
// paths that write the absence ledger. They are host-internal (called by
// the runtime after confirmed presence) and are not reachable from any
// HTTP route — browsing, projection reads and entry intents cannot move lastSeen.

import type { WorldState } from "@avatark/living-world-runtime"
import type { PublicWorldProjection, VisitorWorldProjection } from "@avatark/world-consumer-contracts"
import { forbiddenFieldsIn } from "@avatark/world-consumer-contracts"
import {
  assertNoRuntimeIdentityEscapes,
  placeByRuntimeLocation,
  resolveWorldBinding,
  WORLD_BINDINGS,
  type WorldBinding,
  type WorldConsumerMode,
} from "./bindings.ts"
import type { ContinuityRecord, VisitorContinuityLedger } from "./continuityLedger.ts"
import type { WorldFactSource } from "./facts.ts"
import { producePublicWorldProjection, unavailableProjection, worldNotFoundProjection } from "./publicProjection.ts"
import {
  produceVisitorWorldProjection,
  unauthenticatedVisitorProjection,
  unavailableVisitorProjection,
  worldNotFoundVisitorProjection,
  type PriorVisitEvidence,
} from "./visitorProjection.ts"

export interface VerifiedVisitor {
  /** AvatarK IdentityClaims.subjectId from a server-verified session. */
  subjectId: string
}

export interface WorldConsumerDeps {
  mode: WorldConsumerMode
  bindings?: readonly WorldBinding[]
  facts: WorldFactSource
  ledger: VisitorContinuityLedger
  /** Other runtime evidence of prior visits (never the ledger itself). */
  priorVisitEvidence: (binding: WorldBinding, subjectId: string) => Promise<PriorVisitEvidence | null>
  /** Runtime entity ids the visitor was confirmed present with. */
  encounteredEntityIds: (binding: WorldBinding, subjectId: string) => Promise<string[]>
  now: () => Date
}

function guard<T extends PublicWorldProjection | VisitorWorldProjection>(payload: T, binding: WorldBinding): T {
  assertNoRuntimeIdentityEscapes(payload, binding)
  const leaked = forbiddenFieldsIn(payload)
  if (leaked.length > 0) throw new Error(`forbidden fields in consumer payload: ${leaked.join(", ")}`)
  return payload
}

async function resolvePublic(worldId: string, deps: WorldConsumerDeps): Promise<{ binding: WorldBinding | null; projection: PublicWorldProjection }> {
  const now = deps.now()
  const resolution = resolveWorldBinding(worldId, deps.mode, deps.bindings ?? WORLD_BINDINGS)
  if (resolution.kind === "NOT_FOUND") return { binding: null, projection: worldNotFoundProjection(worldId, now) }
  if (resolution.kind === "NOT_PUBLISHED") return { binding: resolution.binding, projection: unavailableProjection(worldId, now, "NOT_YET_PUBLISHED") }
  const { binding } = resolution
  const facts = await deps.facts.load(binding.runtimeWorldId)
  if (!facts) return { binding, projection: unavailableProjection(worldId, now, "SOURCE_OFFLINE") }
  try {
    return { binding, projection: guard(producePublicWorldProjection(facts, binding, now), binding) }
  } catch {
    // A leak guard tripped: serve an honest unavailable, never the payload.
    return { binding, projection: unavailableProjection(worldId, now, "SOURCE_OFFLINE") }
  }
}

export async function getPublicWorldProjection(worldId: string, deps: WorldConsumerDeps): Promise<PublicWorldProjection> {
  return (await resolvePublic(worldId, deps)).projection
}

export async function getVisitorWorldProjection(worldId: string, visitor: VerifiedVisitor | null, deps: WorldConsumerDeps): Promise<VisitorWorldProjection> {
  const now = deps.now()
  if (!visitor) return unauthenticatedVisitorProjection(worldId, now)
  const { binding, projection: publicProjection } = await resolvePublic(worldId, deps)
  if (!binding) return worldNotFoundVisitorProjection(worldId, now)
  if (publicProjection.status !== "OK") {
    return unavailableVisitorProjection(worldId, visitor.subjectId, now, publicProjection.freshness.reason === "NOT_YET_PUBLISHED" ? "NOT_YET_PUBLISHED" : "SOURCE_OFFLINE")
  }
  const facts = await deps.facts.load(binding.runtimeWorldId)
  if (!facts) return unavailableVisitorProjection(worldId, visitor.subjectId, now, "SOURCE_OFFLINE")
  let continuity: ContinuityRecord | null, evidence: PriorVisitEvidence | null, encountered: string[]
  try {
    ;[continuity, evidence, encountered] = await Promise.all([
      deps.ledger.get(binding.consumerWorldId, visitor.subjectId),
      deps.priorVisitEvidence(binding, visitor.subjectId),
      deps.encounteredEntityIds(binding, visitor.subjectId),
    ])
  } catch {
    // Durable continuity unreadable: say so; never guess a relationship.
    return unavailableVisitorProjection(worldId, visitor.subjectId, now, "SOURCE_OFFLINE")
  }
  try {
    return guard(
      produceVisitorWorldProjection({ binding, facts, publicProjection, subjectId: visitor.subjectId, continuity, priorVisitEvidence: evidence, encounteredEntityIds: encountered, now }),
      binding,
    )
  } catch {
    return unavailableVisitorProjection(worldId, visitor.subjectId, now, "SOURCE_OFFLINE")
  }
}

// ── Runtime-host continuity entry points (not HTTP-reachable) ──────

export interface ConfirmedPresence {
  consumerWorldId: string
  subjectId: string
  at: string
  worldTick: number
  /** Runtime LocationId as reported by the runtime; mapped to a projection placeId here. */
  runtimeLocationId: string | null
}

function presenceToEvent(p: ConfirmedPresence, deps: Pick<WorldConsumerDeps, "bindings">) {
  const binding = (deps.bindings ?? WORLD_BINDINGS).find((b) => b.consumerWorldId === p.consumerWorldId)
  if (!binding) throw new Error(`unknown consumer world ${p.consumerWorldId}`)
  const place = placeByRuntimeLocation(binding, p.runtimeLocationId)
  return { worldId: binding.consumerWorldId, subjectId: p.subjectId, at: p.at, worldTick: p.worldTick, placeId: place?.projectionPlaceId ?? null }
}

/** Call ONLY after the Living World runtime has confirmed the visitor's arrival. */
export async function confirmWorldArrival(p: ConfirmedPresence, deps: Pick<WorldConsumerDeps, "ledger" | "bindings">): Promise<ContinuityRecord> {
  return deps.ledger.recordConfirmedEntry(presenceToEvent(p, deps))
}

/** Call when the runtime records the visitor leaving (last confirmed-present point). */
export async function recordWorldDeparture(p: ConfirmedPresence, deps: Pick<WorldConsumerDeps, "ledger" | "bindings">): Promise<ContinuityRecord> {
  return deps.ledger.recordLeave(presenceToEvent(p, deps))
}

/** Prior-visit evidence from living-world-runtime state (no ledger row => R07 claimed return). */
export function priorVisitEvidenceFromWorldState(state: WorldState | null, binding: WorldBinding): PriorVisitEvidence | null {
  if (!state || state.recentVisits.length === 0) return null
  const visits = state.recentVisits // most-recent-first, runtime-capped
  const last = visits[0]!
  const lastPlace = placeByRuntimeLocation(binding, last.locationId)
  return {
    visitCount: visits.length,
    firstEnteredAt: visits[visits.length - 1]!.enteredAt,
    lastEnteredAt: last.enteredAt,
    lastLeftAt: last.leftAt ?? null,
    lastPlaceId: lastPlace?.projectionPlaceId ?? null,
  }
}

// ── HTTP handlers (wrapped by app/api/worlds/[worldId]/*/route.ts) ──

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff" }

function publicCacheControl(p: PublicWorldProjection, now: Date): string {
  if (p.status === "OK" && p.freshness.state === "CURRENT" && p.freshness.staleAfter) {
    const seconds = Math.max(0, Math.floor((Date.parse(p.freshness.staleAfter) - now.getTime()) / 1000))
    return `public, max-age=0, s-maxage=${seconds}`
  }
  return "public, max-age=0, s-maxage=10"
}

const PUBLIC_STATUS: Record<PublicWorldProjection["status"], number> = { OK: 200, WORLD_NOT_FOUND: 404, PROJECTION_UNAVAILABLE: 503 }
const VISITOR_STATUS: Record<VisitorWorldProjection["status"], number> = { OK: 200, UNAUTHENTICATED: 401, UNAUTHORIZED: 403, WORLD_NOT_FOUND: 404, PROJECTION_UNAVAILABLE: 503 }

/** Public projection: reads no cookies, no identity, nothing from the query string. */
export async function handlePublicProjectionRequest(_request: Request, worldId: string, deps: WorldConsumerDeps): Promise<Response> {
  const projection = await getPublicWorldProjection(worldId, deps)
  return new Response(JSON.stringify(projection), {
    status: PUBLIC_STATUS[projection.status],
    headers: { ...JSON_HEADERS, "Cache-Control": publicCacheControl(projection, deps.now()) },
  })
}

/** Visitor projection: identity comes only from `resolveVisitor` (verified session). */
export async function handleVisitorProjectionRequest(
  request: Request,
  worldId: string,
  resolveVisitor: (request: Request) => Promise<VerifiedVisitor | null>,
  deps: WorldConsumerDeps,
): Promise<Response> {
  const visitor = await resolveVisitor(request)
  const projection = await getVisitorWorldProjection(worldId, visitor, deps)
  return new Response(JSON.stringify(projection), {
    status: VISITOR_STATUS[projection.status],
    headers: { ...JSON_HEADERS, "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" },
  })
}
