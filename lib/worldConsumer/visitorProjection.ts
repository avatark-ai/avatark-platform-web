// VisitorWorldProjection v1 producer (incl. SinceYouWereHere).
// Owner: AvatarK Platform World Memory.
//
// Inputs are platform-owned facts only:
//   durable continuity record (absence ledger, keyed by verified subjectId)
//   + world history since lastSeen.worldTick (World Memory events)
//   + ReturnRecognition (the existing computeReturnRecognition — not a second algorithm)
//   + world significance (stored with each event)
//   + visitor encounter/familiarity (ledger places, participation companions)
//   + a deterministic, versioned relevance policy
//   -> SinceYouWereHereProjection
//
// Personalization SELECTS public truth; it never creates it. Every selected
// change links to occurrences present in the PublicWorldProjection history,
// and every placeId resolves against its places.
//
// R07 continuity meanings are preserved (lib/worldMemory/visitTransitionContinuity.ts):
//   first_entry                              -> NO_PRIOR_VISIT / FIRST_VISIT / NOT_APPLICABLE_FIRST_VISIT
//   return_recognized                        -> VISITED / RETURNING / RECOGNIZED / SYWH from durable continuity
//   return_claimed_without_continuity_record -> VISITED / RETURNING / NO_CONTINUITY_RECORD / SYWH UNAVAILABLE
// Missing continuity is never turned into "nothing changed".

import { createHash } from "node:crypto"
import { computeReturnRecognition } from "@avatark/world-memory-runtime"
import type { ReturnRecognitionFactType, WorldEvent } from "@avatark/world-memory-contracts"
import type {
  ChangeKind,
  Freshness,
  PublicWorldProjection,
  SinceYouWereHere,
  SinceYouWereHereChange,
  VisitorRelevance,
  VisitorWorldProjection,
  VisitorWorldProjectionBody,
} from "@avatark/world-consumer-contracts"
import { WORLD_CONSUMER_CONTRACT_VERSION } from "@avatark/world-consumer-contracts"
import type { VisitContinuityReason } from "../worldMemory/visitTransitionContinuity.ts"
import type { WorldBinding } from "./bindings.ts"
import type { ContinuityRecord } from "./continuityLedger.ts"
import type { WorldFacts } from "./facts.ts"
import { publicOccurrences, unavailableFreshness, type PublicOccurrence } from "./publicProjection.ts"

export const SINCE_YOU_WERE_HERE_POLICY = {
  policyId: "syw-relevance",
  version: "1.0",
  maxChanges: 5,
} as const

/**
 * Prior-visit evidence from runtime facts OTHER than the absence ledger
 * (e.g. living-world-runtime WorldState.recentVisits). Its presence without
 * a ledger row is exactly R07's return_claimed_without_continuity_record.
 */
export interface PriorVisitEvidence {
  visitCount: number
  firstEnteredAt: string
  lastEnteredAt: string
  lastLeftAt: string | null
  /** Consumer projection placeId, already mapped through the binding. */
  lastPlaceId: string | null
}

export interface VisitorProjectionInput {
  binding: WorldBinding
  facts: WorldFacts
  publicProjection: PublicWorldProjection
  /** Verified AvatarK subjectId — the ONLY identity input. */
  subjectId: string
  continuity: ContinuityRecord | null
  priorVisitEvidence: PriorVisitEvidence | null
  /** Runtime entity ids the visitor was present with (participation/encounter facts). */
  encounteredEntityIds: readonly string[]
  now: Date
}

const FACT_TO_CHANGE: Record<ReturnRecognitionFactType, ChangeKind> = {
  season_changed: "SEASON_CHANGED",
  environment_changed: "ENVIRONMENT_CHANGED",
  population_relocated: "POPULATION_MOVED",
  encounter_changed: "ENCOUNTER_CHANGED",
  known_entity_state_changed: "KNOWN_ENTITY_CHANGED",
  social_relationship_changed: "RELATIONSHIP_CHANGED",
  canonical_event_occurred: "WORLD_EVENT",
}

const RELEVANCE_RANK: Record<VisitorRelevance, number> = { DIRECT: 0, FAMILIAR_PLACE: 1, WORLD_WIDE: 2 }

/** Classifies continuity exactly as R07 does, from durable platform facts. */
export function classifyContinuity(continuity: ContinuityRecord | null, evidence: PriorVisitEvidence | null): VisitContinuityReason {
  if (continuity) return "return_recognized"
  if (evidence && evidence.visitCount > 0) return "return_claimed_without_continuity_record"
  return "first_entry"
}

// ── Envelopes ──────────────────────────────────────────────────────

function envelope(
  worldId: string,
  status: VisitorWorldProjection["status"],
  subjectId: string | null,
  freshness: Freshness,
  projection: VisitorWorldProjectionBody | null,
): VisitorWorldProjection {
  return { schemaVersion: WORLD_CONSUMER_CONTRACT_VERSION, contract: "visitor-world-projection", worldId, status, subjectId, cacheScope: "PRIVATE", freshness, projection }
}

export function unauthenticatedVisitorProjection(worldId: string, now: Date): VisitorWorldProjection {
  // M07 has no freshness reason for "signed out"; follows the frozen M07 anonymous fixture's precedent.
  return envelope(worldId, "UNAUTHENTICATED", null, unavailableFreshness(now, "NOT_YET_PUBLISHED"), null)
}

export function worldNotFoundVisitorProjection(worldId: string, now: Date): VisitorWorldProjection {
  return envelope(worldId, "WORLD_NOT_FOUND", null, unavailableFreshness(now, "WORLD_NOT_FOUND"), null)
}

export function unavailableVisitorProjection(worldId: string, subjectId: string, now: Date, reason: "SOURCE_OFFLINE" | "NOT_YET_PUBLISHED"): VisitorWorldProjection {
  return envelope(worldId, "PROJECTION_UNAVAILABLE", subjectId, unavailableFreshness(now, reason), null)
}

// ── Since You Were Here ────────────────────────────────────────────

function factTypeOf(runtimeWorldId: string, subjectId: string, event: WorldEvent): ReturnRecognitionFactType | null {
  // Reuses the existing ReturnRecognition mapping for a single event rather
  // than restating its category -> fact table here.
  return computeReturnRecognition(runtimeWorldId, subjectId, event.tick - 1, event.tick, [event]).facts[0]?.type ?? null
}

function changeIdFor(worldId: string, subjectId: string, sinceTick: number, factType: string): string {
  return `syw-${createHash("sha256").update(`${worldId}:${subjectId}:${sinceTick}:${factType}`).digest("hex").slice(0, 20)}`
}

interface ChangeGroup {
  factType: ReturnRecognitionFactType
  occurrences: PublicOccurrence[] // newest first
  relevance: VisitorRelevance | null
}

function relevanceOf(group: PublicOccurrence[], encounteredEntityIds: ReadonlySet<string>, encounteredPlaceIds: ReadonlySet<string>): VisitorRelevance | null {
  if (group.some((o) => o.event.participantEntityIds.some((id) => encounteredEntityIds.has(id)))) return "DIRECT"
  if (group.some((o) => o.entry.placeIds.some((p) => encounteredPlaceIds.has(p)))) return "FAMILIAR_PLACE"
  if (group.some((o) => o.entry.placeIds.length === 0)) return "WORLD_WIDE"
  return null
}

function toChange(worldId: string, subjectId: string, sinceTick: number, g: ChangeGroup & { relevance: VisitorRelevance }): SinceYouWereHereChange {
  const latest = g.occurrences[0]!
  const more = g.occurrences.length - 1
  return {
    changeId: changeIdFor(worldId, subjectId, sinceTick, g.factType),
    kind: FACT_TO_CHANGE[g.factType],
    placeIds: [...new Set(g.occurrences.flatMap((o) => o.entry.placeIds))],
    summary: more > 0 ? `${latest.entry.summary} (${more} earlier related ${more === 1 ? "change" : "changes"}.)` : latest.entry.summary,
    worldTime: latest.entry.worldTime,
    worldSignificance: g.occurrences.some((o) => o.entry.significance === "LANDMARK") ? "LANDMARK" : "MEANINGFUL",
    visitorRelevance: g.relevance,
    linkedOccurrenceIds: g.occurrences.map((o) => o.entry.occurrenceId),
  }
}

function deriveSinceYouWereHere(input: VisitorProjectionInput, continuity: ContinuityRecord): SinceYouWereHere {
  const { binding, facts, publicProjection, subjectId } = input
  const sinceTick = continuity.lastSeenTick
  const currentTick = facts.sharedState.clock.tick
  const unavailable = (reason: "NO_CONTINUITY_RECORD" | "SOURCE_UNAVAILABLE"): SinceYouWereHere => ({
    state: "UNAVAILABLE", interval: null, summary: null, changes: [], omittedChangeCount: 0, selectionPolicy: null, unavailableReason: reason,
  })
  if (publicProjection.status !== "OK" || !publicProjection.projection || sinceTick > currentTick) return unavailable("SOURCE_UNAVAILABLE")

  const interval = {
    since: { at: continuity.lastSeenAt, worldTick: sinceTick },
    through: { at: facts.observedAt, worldTick: currentTick },
  }
  const selectionPolicy = { policyId: SINCE_YOU_WERE_HERE_POLICY.policyId, version: SINCE_YOU_WERE_HERE_POLICY.version }

  const eventsSince = facts.worldEvents.filter((e) => e.tick > sinceTick && e.tick <= currentTick)
  const recognition = computeReturnRecognition(facts.runtimeWorldId, subjectId, sinceTick, currentTick, eventsSince)

  // Only occurrences the public projection actually lists may be linked.
  const publicIds = new Set(publicProjection.projection.history.entries.map((e) => e.occurrenceId))
  const occurrencesSince = publicOccurrences(facts, binding).filter((o) => o.event.tick > sinceTick && o.event.tick <= currentTick && publicIds.has(o.entry.occurrenceId))

  const encounteredEntityIds = new Set(input.encounteredEntityIds)
  const encounteredPlaceIds = new Set(continuity.encounteredPlaceIds)
  const groups: ChangeGroup[] = recognition.facts
    .map((fact) => {
      const occurrences = occurrencesSince.filter((o) => factTypeOf(facts.runtimeWorldId, subjectId, o.event) === fact.type)
      return { factType: fact.type, occurrences, relevance: relevanceOf(occurrences, encounteredEntityIds, encounteredPlaceIds) }
    })
    .filter((g) => g.occurrences.length > 0)

  if (groups.length === 0) {
    return { state: "NO_MEANINGFUL_CHANGES", interval, summary: null, changes: [], omittedChangeCount: 0, selectionPolicy, unavailableReason: null }
  }

  const byRank = (a: ChangeGroup, b: ChangeGroup) =>
    RELEVANCE_RANK[a.relevance ?? "WORLD_WIDE"] - RELEVANCE_RANK[b.relevance ?? "WORLD_WIDE"] ||
    Number(b.occurrences.some((o) => o.entry.significance === "LANDMARK")) - Number(a.occurrences.some((o) => o.entry.significance === "LANDMARK")) ||
    b.occurrences[0]!.event.tick - a.occurrences[0]!.event.tick
  let selected = groups.filter((g): g is ChangeGroup & { relevance: VisitorRelevance } => g.relevance !== null).sort(byRank).slice(0, SINCE_YOU_WERE_HERE_POLICY.maxChanges)

  // M07's SinceYouWereHere never lets a world with public changes read as
  // "nothing changed" (NO_MEANINGFUL_CHANGES requires omittedChangeCount 0).
  // If no change is personally relevant, the policy selects the single
  // most significant, most recent change for every returning visitor
  // (M07: WORLD_WIDE = "selected for every returning visitor").
  if (selected.length === 0) {
    const top = [...groups].sort(byRank)[0]!
    selected = [{ ...top, relevance: "WORLD_WIDE" }]
  }

  const changes = selected.map((g) => toChange(binding.consumerWorldId, subjectId, sinceTick, g))
  const linked = new Set(changes.flatMap((c) => c.linkedOccurrenceIds))
  const omittedChangeCount = occurrencesSince.filter((o) => !linked.has(o.entry.occurrenceId)).length
  const season = changes.find((c) => c.kind === "SEASON_CHANGED")
  const summary = season
    ? `${season.summary.replace(/\.$/, "")} while you were away.`
    : `${changes.length} meaningful ${changes.length === 1 ? "change" : "changes"} while you were away.`

  return { state: "CHANGES", interval, summary, changes, omittedChangeCount, selectionPolicy, unavailableReason: null }
}

// ── Producer ───────────────────────────────────────────────────────

export function produceVisitorWorldProjection(input: VisitorProjectionInput): VisitorWorldProjection {
  const { binding, publicProjection, subjectId, continuity, priorVisitEvidence, now } = input
  const worldId = binding.consumerWorldId
  if (publicProjection.status === "WORLD_NOT_FOUND") return worldNotFoundVisitorProjection(worldId, now)
  if (publicProjection.status !== "OK") {
    return unavailableVisitorProjection(worldId, subjectId, now, publicProjection.freshness.reason === "NOT_YET_PUBLISHED" ? "NOT_YET_PUBLISHED" : "SOURCE_OFFLINE")
  }

  const reason = classifyContinuity(continuity, priorVisitEvidence)
  let body: VisitorWorldProjectionBody

  if (reason === "first_entry") {
    body = {
      relationship: { state: "NO_PRIOR_VISIT", visitCount: 0, firstEnteredAt: null, lastEnteredAt: null, lastLeftAt: null, lastSeen: null, encounteredPlaceIds: [] },
      returnContext: { arrivalKind: "FIRST_VISIT", lastPlaceId: null, continuity: "NOT_APPLICABLE" },
      sinceYouWereHere: { state: "NOT_APPLICABLE_FIRST_VISIT", interval: null, summary: null, changes: [], omittedChangeCount: 0, selectionPolicy: null, unavailableReason: null },
    }
  } else if (reason === "return_claimed_without_continuity_record") {
    const ev = priorVisitEvidence!
    const lastPlaceId = ev.lastPlaceId && publicProjection.projection!.places.some((p) => p.placeId === ev.lastPlaceId) ? ev.lastPlaceId : null
    body = {
      relationship: {
        state: "VISITED",
        visitCount: ev.visitCount,
        firstEnteredAt: ev.firstEnteredAt,
        lastEnteredAt: ev.lastEnteredAt,
        lastLeftAt: ev.lastLeftAt,
        lastSeen: null, // no durable continuity: never fabricated
        encounteredPlaceIds: lastPlaceId ? [lastPlaceId] : [],
      },
      returnContext: { arrivalKind: "RETURNING", lastPlaceId, continuity: "NO_CONTINUITY_RECORD" },
      sinceYouWereHere: { state: "UNAVAILABLE", interval: null, summary: null, changes: [], omittedChangeCount: 0, selectionPolicy: null, unavailableReason: "NO_CONTINUITY_RECORD" },
    }
  } else {
    const c = continuity!
    const publicPlaces = new Set(publicProjection.projection!.places.map((p) => p.placeId))
    const lastPlaceId = c.lastPlaceId && publicPlaces.has(c.lastPlaceId) ? c.lastPlaceId : null
    body = {
      relationship: {
        state: "VISITED",
        visitCount: c.visitCount,
        firstEnteredAt: c.firstEnteredAt,
        lastEnteredAt: c.lastEnteredAt,
        lastLeftAt: c.lastLeftAt,
        lastSeen: { at: c.lastSeenAt, worldTick: c.lastSeenTick, basis: c.lastSeenBasis },
        encounteredPlaceIds: c.encounteredPlaceIds.filter((p) => publicPlaces.has(p)),
      },
      returnContext: { arrivalKind: "RETURNING", lastPlaceId, continuity: "RECOGNIZED" },
      sinceYouWereHere: deriveSinceYouWereHere(input, c),
    }
  }

  // The visitor view is built from the same world facts: it shares their freshness.
  return envelope(worldId, "OK", subjectId, publicProjection.freshness, body)
}
