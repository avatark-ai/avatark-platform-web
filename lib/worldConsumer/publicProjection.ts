// PublicWorldProjection v1 producer. Owner: AvatarK Platform Living World Host.
//
// Maps authoritative runtime facts (WorldFacts) into the frozen M07 public
// contract. Rules (M09 §9):
// - never emits a raw WorldSnapshot, visitorContext, WorldLease, runtime id,
//   simulation internals or infrastructure — every field is re-projected;
// - history is an aggregate READ over stored World Memory events (PLT-ADR-009),
//   never a second history store;
// - stories are discovery links only;
// - the producer declares freshness;
// - runtime facts that have no public binding are omitted, not guessed.

import { createHash } from "node:crypto"
import type { WorldEvent, WorldEventCategory } from "@avatark/world-memory-contracts"
import type {
  Activity,
  Condition,
  ConsequenceKind,
  Freshness,
  HistoryEntry,
  HistoryKind,
  PlaceProjection,
  PublicWorldProjection,
  PublicWorldProjectionBody,
  WorldTime,
} from "@avatark/world-consumer-contracts"
import { WORLD_CONSUMER_CONTRACT_VERSION } from "@avatark/world-consumer-contracts"
import { placeByRuntimeLocation, type PlaceBinding, type WorldBinding } from "./bindings.ts"
import type { WorldFacts } from "./facts.ts"

export const PUBLIC_PROJECTION_POLICY = {
  /** How long a projection built from LIVE facts may be presented as CURRENT. */
  staleAfterMs: 60_000,
  historyLimit: 50,
  activityLimit: 5,
} as const

// ── Id minting: consumer ids are opaque digests, never raw runtime ids ─

export function occurrenceIdFor(consumerWorldId: string, event: Pick<WorldEvent, "id">): string {
  return `occ-${createHash("sha256").update(`${consumerWorldId}:${event.id}`).digest("hex").slice(0, 20)}`
}

function activityIdFor(consumerWorldId: string, key: string): string {
  return `act-${createHash("sha256").update(`${consumerWorldId}:activity:${key}`).digest("hex").slice(0, 20)}`
}

// ── Vocabulary mappings (M07 §5) ───────────────────────────────────

const HISTORY_KIND: Record<WorldEventCategory, HistoryKind> = {
  SEASON_TRANSITION: "SEASON",
  ENVIRONMENTAL_THRESHOLD: "ENVIRONMENT",
  RESOURCE_CONDITION_CHANGED: "ENVIRONMENT",
  LOCATION_CONDITION_CHANGED: "ENVIRONMENT",
  POPULATION_MOVEMENT: "POPULATION",
  GROUP_FORMED: "POPULATION",
  GROUP_DISPERSED: "POPULATION",
  ENCOUNTER_BECAME_AVAILABLE: "ENCOUNTER",
  ENCOUNTER_RESOLVED: "ENCOUNTER",
  ENTITY_ACTIVITY_TRANSITION: "ENTITY",
  SEPARATION_OCCURRED: "SOCIAL",
  REUNION_OCCURRED: "SOCIAL",
  CANONICAL_EVENT_OCCURRED: "CANONICAL_EVENT",
}

const CONSEQUENCE_KIND: Record<string, ConsequenceKind> = {
  HISTORICAL_MARKER: "PLACE_MARKED",
  LOCATION_HISTORY_MARKER: "PLACE_MARKED",
  RESOURCE_PREFERENCE: "RESOURCE_CHANGED",
  ENCOUNTER_ELIGIBILITY_CHANGE: "ENCOUNTER_ELIGIBILITY_CHANGED",
  GROUP_HISTORY_RELATIONSHIP: "GROUP_RELATIONSHIP_CHANGED",
}

const CONSEQUENCE_TEXT: Record<ConsequenceKind, string> = {
  PLACE_MARKED: "The place carries a record of it",
  RESOURCE_CHANGED: "Where life seeks resources shifted",
  ENCOUNTER_ELIGIBILITY_CHANGED: "What can be encountered here changed",
  GROUP_RELATIONSHIP_CHANGED: "A group's shared history changed",
}

// ── World time ─────────────────────────────────────────────────────

function seasonName(facts: WorldFacts, seasonId: string): string {
  return facts.seasonDefinitions.find((s) => s.id === seasonId)?.name ?? "An unnamed season"
}

/** Consumer-safe label for a tick: day number + day phase. Never the raw tick. */
export function worldTimeFor(facts: WorldFacts, tick: number, withSeason = false): WorldTime {
  const phase = facts.dayPhaseForTick(tick)
  const day = facts.ticksPerDay ? `Day ${Math.floor(tick / facts.ticksPerDay) + 1}` : null
  const parts = [withSeason ? seasonName(facts, facts.sharedState.season.currentSeasonId) : null, day, phase?.label ?? null].filter(Boolean)
  return { worldTick: tick, label: parts.length > 0 ? parts.join(", ") : "A moment in this world" }
}

// ── Public occurrence mapping (shared with the visitor producer) ───

export interface PublicOccurrence {
  event: WorldEvent
  entry: HistoryEntry
}

function eventSummary(event: WorldEvent, place: PlaceBinding | null, facts: WorldFacts): string {
  switch (event.category) {
    case "SEASON_TRANSITION": {
      const to = event.causalReferences.find((r) => r.kind === "season")?.ref
      return to ? `The season turned to ${seasonName(facts, to)}.` : "The season turned."
    }
    case "POPULATION_MOVEMENT":
      return place ? `Life moved to ${place.displayName}.` : "Life moved across the world."
    case "GROUP_FORMED":
      return place ? `A group formed at ${place.displayName}.` : "A group formed."
    case "GROUP_DISPERSED":
      return place ? `A group dispersed at ${place.displayName}.` : "A group dispersed."
    case "ENCOUNTER_RESOLVED":
      return place ? `An encounter took place at ${place.displayName}.` : "An encounter took place."
    case "ENCOUNTER_BECAME_AVAILABLE":
      return place ? `Something became possible to encounter at ${place.displayName}.` : "Something became possible to encounter."
    case "ENVIRONMENTAL_THRESHOLD":
      return "Conditions crossed a threshold across the world."
    case "RESOURCE_CONDITION_CHANGED":
    case "LOCATION_CONDITION_CHANGED":
      return place ? `Conditions changed at ${place.displayName}.` : "Conditions changed."
    case "ENTITY_ACTIVITY_TRANSITION":
      return place ? `An inhabitant of ${place.displayName} changed what it was doing.` : "An inhabitant changed what it was doing."
    case "SEPARATION_OCCURRED":
      return place ? `Companions parted at ${place.displayName}.` : "Companions parted."
    case "REUNION_OCCURRED":
      return place ? `Companions were reunited at ${place.displayName}.` : "Companions were reunited."
    case "CANONICAL_EVENT_OCCURRED":
      return place ? `A world event took place at ${place.displayName}.` : "A world event took place."
  }
}

/**
 * Maps one stored World Memory event to a public history entry, or null
 * when the event concerns a location with no public binding (omitted,
 * never presented as world-wide).
 */
export function toPublicOccurrence(event: WorldEvent, facts: WorldFacts, binding: WorldBinding): PublicOccurrence | null {
  const place = placeByRuntimeLocation(binding, event.locationId)
  if (event.locationId !== null && !place) return null
  const consequences: HistoryEntry["consequences"] = []
  const seen = new Set<string>()
  for (const c of event.consequences) {
    const kind = CONSEQUENCE_KIND[c.type]
    if (!kind) continue
    const cPlace = c.targetLocationId ? placeByRuntimeLocation(binding, c.targetLocationId) : null
    if (c.targetLocationId && !cPlace) continue // unbound runtime location: omit
    const key = `${kind}:${cPlace?.projectionPlaceId ?? ""}`
    if (seen.has(key)) continue // same public fact repeated per participant
    seen.add(key)
    consequences.push({
      kind,
      placeId: cPlace?.projectionPlaceId ?? null,
      summary: cPlace ? `${CONSEQUENCE_TEXT[kind]} at ${cPlace.displayName}.` : `${CONSEQUENCE_TEXT[kind]}.`,
    })
  }
  return {
    event,
    entry: {
      occurrenceId: occurrenceIdFor(binding.consumerWorldId, event),
      kind: HISTORY_KIND[event.category] ?? "ENVIRONMENT",
      placeIds: place ? [place.projectionPlaceId] : [],
      summary: eventSummary(event, place, facts),
      worldTime: worldTimeFor(facts, event.tick),
      significance: event.significance === "LANDMARK" ? "LANDMARK" : "MEANINGFUL",
      provenance: event.category === "CANONICAL_EVENT_OCCURRED" ? "CANONICAL_EVENT" : "EMERGENT",
      consequences,
    },
  }
}

/** All public occurrences, newest first. NOT_SIGNIFICANT events are never stored, so never mapped. */
export function publicOccurrences(facts: WorldFacts, binding: WorldBinding): PublicOccurrence[] {
  return facts.worldEvents
    .filter((e) => e.significance === "MEANINGFUL" || e.significance === "LANDMARK")
    .map((e) => toPublicOccurrence(e, facts, binding))
    .filter((o): o is PublicOccurrence => o !== null)
    .sort((a, b) => b.event.tick - a.event.tick || a.entry.occurrenceId.localeCompare(b.entry.occurrenceId))
}

// ── Conditions ─────────────────────────────────────────────────────

function worldConditions(facts: WorldFacts): Condition[] {
  const env = facts.sharedState.environment
  return [
    { kind: "WEATHER", id: `precipitation-${env.weather.precipitationBand}`, label: `Rainfall ${env.weather.precipitationBand}` },
    { kind: "WEATHER", id: `temperature-${env.weather.temperatureBand}`, label: `Temperature ${env.weather.temperatureBand}` },
    { kind: "WATER", id: `water-${env.hydrology.hydrologyBand}`, label: `Water ${env.hydrology.hydrologyBand}` },
    { kind: "ECOLOGY", id: `vegetation-${env.ecology.vegetationActivityBand}`, label: `Plant activity ${env.ecology.vegetationActivityBand}` },
    { kind: "ECOLOGY", id: `animal-${env.ecology.animalActivityBand}`, label: `Animal activity ${env.ecology.animalActivityBand}` },
  ]
}

// Same availability rule lib/worldMemory/hostService.ts applies per location.
function placeConditions(facts: WorldFacts, place: PlaceBinding): Condition[] {
  const env = facts.sharedState.environment
  const affordance = facts.resourceAffordances.find((a) => a.locationId === place.runtimeLocationId)
  if (!affordance) return []
  const out: Condition[] = []
  if (affordance.resourceTags.includes("water")) {
    const ok = env.hydrology.hydrologyBand !== "low"
    out.push({ kind: "WATER", id: ok ? "water-available" : "water-scarce", label: ok ? "Water available" : "Water scarce" })
  }
  if (affordance.resourceTags.includes("vegetation")) {
    const ok = env.ecology.vegetationActivityBand !== "low"
    out.push({ kind: "ECOLOGY", id: ok ? "forage-available" : "forage-scarce", label: ok ? "Forage available" : "Forage scarce" })
  }
  return out
}

function presenceSummary(count: number): string {
  if (count === 0) return "No inhabitants are here right now."
  return count === 1 ? "One inhabitant is here right now." : `${count} inhabitants are here right now.`
}

// ── Freshness ──────────────────────────────────────────────────────

function declareFreshness(facts: WorldFacts, now: Date): Freshness {
  const generatedAt = now.toISOString()
  const source = { worldTick: facts.sharedState.clock.tick, worldVersion: facts.sharedState.worldVersion, sourceRevision: facts.sourceRevision }
  const staleAfter = new Date(Date.parse(facts.observedAt) + PUBLIC_PROJECTION_POLICY.staleAfterMs).toISOString()
  if (facts.sourceStatus === "LIVE" && now.getTime() <= Date.parse(staleAfter)) {
    return { state: "CURRENT", generatedAt, validAsOf: facts.observedAt, staleAfter, source, reason: null }
  }
  return { state: "STALE", generatedAt, validAsOf: facts.observedAt, staleAfter, source, reason: "SOURCE_LAGGING" }
}

export function unavailableFreshness(now: Date, reason: NonNullable<Freshness["reason"]>): Freshness {
  return {
    state: "UNAVAILABLE",
    generatedAt: now.toISOString(),
    validAsOf: null,
    staleAfter: null,
    source: { worldTick: null, worldVersion: null, sourceRevision: null },
    reason,
  }
}

// ── Producer ───────────────────────────────────────────────────────

export function worldNotFoundProjection(consumerWorldId: string, now: Date): PublicWorldProjection {
  return {
    schemaVersion: WORLD_CONSUMER_CONTRACT_VERSION,
    contract: "public-world-projection",
    worldId: consumerWorldId,
    status: "WORLD_NOT_FOUND",
    freshness: unavailableFreshness(now, "WORLD_NOT_FOUND"),
    projection: null,
  }
}

export function unavailableProjection(consumerWorldId: string, now: Date, reason: "SOURCE_OFFLINE" | "NOT_YET_PUBLISHED"): PublicWorldProjection {
  return {
    schemaVersion: WORLD_CONSUMER_CONTRACT_VERSION,
    contract: "public-world-projection",
    worldId: consumerWorldId,
    status: "PROJECTION_UNAVAILABLE",
    freshness: unavailableFreshness(now, reason),
    projection: null,
  }
}

export function producePublicWorldProjection(facts: WorldFacts, binding: WorldBinding, now: Date): PublicWorldProjection {
  if (facts.sourceStatus === "OFFLINE") return unavailableProjection(binding.consumerWorldId, now, "SOURCE_OFFLINE")
  if (facts.sourceStatus === "NOT_PUBLISHED") return unavailableProjection(binding.consumerWorldId, now, "NOT_YET_PUBLISHED")

  const tick = facts.sharedState.clock.tick
  const occurrences = publicOccurrences(facts, binding)
  const history = occurrences.slice(0, PUBLIC_PROJECTION_POLICY.historyLimit).map((o) => o.entry)
  const currentSeason = facts.sharedState.season.currentSeasonId
  const phase = facts.dayPhaseForTick(tick)

  const places: PlaceProjection[] = binding.places.map((place) => {
    const here = occurrences.filter((o) => o.entry.placeIds.includes(place.projectionPlaceId))
    const latest = here[0]
    const present = facts.populationEntities.filter((e) => e.locationId === place.runtimeLocationId).length
    return {
      placeId: place.projectionPlaceId,
      slug: place.slug,
      displayName: place.displayName,
      summary: place.summary,
      state: { summary: presenceSummary(present), conditions: placeConditions(facts, place) },
      recentChange: latest ? { occurrenceId: latest.entry.occurrenceId, summary: latest.entry.summary, worldTime: latest.entry.worldTime } : null,
      history: { state: here.length > 0 ? "AVAILABLE" : "EMPTY", entryCount: here.length },
    }
  })

  const activity: Activity[] = occurrences.slice(0, PUBLIC_PROJECTION_POLICY.activityLimit).map((o) => ({
    activityId: activityIdFor(binding.consumerWorldId, o.entry.occurrenceId),
    kind: "OCCURRENCE",
    placeIds: o.entry.placeIds,
    summary: o.entry.summary,
    worldTime: o.entry.worldTime,
    significance: o.entry.significance,
    occurrenceId: o.entry.occurrenceId,
  }))

  const busiest = places.map((p, i) => ({ p, n: facts.populationEntities.filter((e) => e.locationId === binding.places[i]!.runtimeLocationId).length })).sort((a, b) => b.n - a.n)[0]
  const summary = [
    `${seasonName(facts, currentSeason)} season${phase ? `, ${phase.label}` : ""}.`,
    `Water is ${facts.sharedState.environment.hydrology.hydrologyBand}.`,
    busiest && busiest.n > 0 ? `Life gathers at ${busiest.p.displayName}.` : "No inhabitants are gathered anywhere in view.",
  ].join(" ")

  const body: PublicWorldProjectionBody = {
    world: {
      worldId: binding.consumerWorldId,
      slug: binding.slug,
      displayName: binding.displayName,
      worldType: "PERSISTENT_LIVING_WORLD",
      // Fixture-backed facts are never presented as an OPEN production world.
      lifecycle: facts.fixtureBacked || binding.status !== "CANONICAL" ? "PREVIEW" : "OPEN",
    },
    now: {
      worldTime: worldTimeFor(facts, tick, true),
      summary,
      season: { id: currentSeason, label: seasonName(facts, currentSeason) },
      dayPhase: phase,
      conditions: worldConditions(facts),
      activeProcesses: [{ processId: `season-${currentSeason}`, label: `${seasonName(facts, currentSeason)} season`, placeIds: [] }],
      highlightActivityIds: activity.filter((a) => a.significance === "LANDMARK").map((a) => a.activityId),
    },
    places,
    activity,
    history: {
      state: history.length > 0 ? "AVAILABLE" : "EMPTY",
      entries: history,
      hasMore: occurrences.length > history.length,
    },
    stories: [...facts.storyLinks],
  }

  return {
    schemaVersion: WORLD_CONSUMER_CONTRACT_VERSION,
    contract: "public-world-projection",
    worldId: binding.consumerWorldId,
    status: "OK",
    freshness: declareFreshness(facts, now),
    projection: body,
  }
}
