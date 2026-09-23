// @avatark/world-consumer-contracts — WorldK consumer contracts v1.
//
// OWNER:      AvatarK Platform
// CONSUMERS:  WorldK and future approved consumer surfaces
// WORLDK:     consumer only — it never produces or amends these contracts
// VERSION:    1.0
//
// Source of truth: schemas/v1/*.schema.json — byte-identical to the frozen
// WORLDK-M07-CONSUMPTION-CONTRACT-FREEZE-01 pack (checksums in
// schemas/v1/CHECKSUMS.sha256). These TypeScript types are typed
// equivalents; the schemas win on any disagreement, and producer output is
// validated against them in the conformance tests.
//
// Deliberately contains NO runtime/kernel/compiler/infrastructure types.

export type SchemaVersion = `1.${number}`

export type WorldId = string
export type PlaceId = string
export type OpaqueId = string
export type SubjectId = string
export type Timestamp = string

/** Authoritative logical world time. Machine-only: never display it. */
export type WorldTick = number

export interface WorldTime {
  worldTick: WorldTick
  label: string
}

export interface Labelled {
  id: string
  label: string
}

export type WorldSignificance = "MEANINGFUL" | "LANDMARK"

// ── Freshness (common) ─────────────────────────────────────────────

export type FreshnessState = "CURRENT" | "STALE" | "UNAVAILABLE"
export type FreshnessReason = "SOURCE_LAGGING" | "SOURCE_OFFLINE" | "NOT_YET_PUBLISHED" | "WORLD_NOT_FOUND"

export interface Freshness {
  state: FreshnessState
  generatedAt: Timestamp
  validAsOf: Timestamp | null
  staleAfter: Timestamp | null
  source: {
    worldTick: WorldTick | null
    worldVersion: number | null
    sourceRevision: string | null
  }
  reason: FreshnessReason | null
}

// ── Contract 01: PublicWorldProjection ─────────────────────────────

export type PublicWorldStatus = "OK" | "WORLD_NOT_FOUND" | "PROJECTION_UNAVAILABLE"
export type WorldLifecycle = "PREVIEW" | "OPEN" | "PAUSED" | "CLOSED"
export type ConditionKind = "WEATHER" | "WATER" | "ECOLOGY" | "OTHER"
export type AvailabilityState = "AVAILABLE" | "EMPTY" | "UNAVAILABLE"

export interface Condition {
  kind: ConditionKind
  id: string
  label: string
}

export interface WorldIdentity {
  worldId: WorldId
  slug: string
  displayName: string
  worldType: "PERSISTENT_LIVING_WORLD"
  lifecycle: WorldLifecycle
}

export interface WorldNow {
  worldTime: WorldTime
  summary: string
  season: Labelled | null
  dayPhase: Labelled | null
  conditions: Condition[]
  activeProcesses: { processId: string; label: string; placeIds: PlaceId[] }[]
  highlightActivityIds: OpaqueId[]
}

export interface PlaceProjection {
  placeId: PlaceId
  slug: string
  displayName: string
  summary: string
  state: { summary: string; conditions: Condition[] }
  recentChange: { occurrenceId: OpaqueId; summary: string; worldTime: WorldTime } | null
  history: { state: AvailabilityState; entryCount: number }
}

export type ActivityKind = "OCCURRENCE" | "ONGOING_PROCESS" | "ENCOUNTER_AVAILABLE"

export interface Activity {
  activityId: OpaqueId
  kind: ActivityKind
  placeIds: PlaceId[]
  summary: string
  worldTime: WorldTime
  significance: WorldSignificance
  occurrenceId: OpaqueId | null
}

export type HistoryKind = "SEASON" | "ENVIRONMENT" | "POPULATION" | "ENCOUNTER" | "ENTITY" | "SOCIAL" | "CANONICAL_EVENT"
export type ConsequenceKind = "PLACE_MARKED" | "RESOURCE_CHANGED" | "ENCOUNTER_ELIGIBILITY_CHANGED" | "GROUP_RELATIONSHIP_CHANGED"

export interface HistoryEntry {
  occurrenceId: OpaqueId
  kind: HistoryKind
  placeIds: PlaceId[]
  summary: string
  worldTime: WorldTime
  significance: WorldSignificance
  provenance: "EMERGENT" | "CANONICAL_EVENT"
  consequences: { kind: ConsequenceKind; placeId: PlaceId | null; summary: string }[]
}

export interface HistoryProjection {
  state: AvailabilityState
  entries: HistoryEntry[]
  hasMore: boolean
}

export interface StoryLink {
  source: "streamk"
  storySlug: string
  episodeSlug: string | null
  title: string
  relation: "SET_IN_WORLD" | "ENTERS_WORLD"
}

export interface PublicWorldProjectionBody {
  world: WorldIdentity
  now: WorldNow
  places: PlaceProjection[]
  activity: Activity[]
  history: HistoryProjection
  stories: StoryLink[]
}

export interface PublicWorldProjection {
  schemaVersion: SchemaVersion
  contract: "public-world-projection"
  worldId: WorldId
  status: PublicWorldStatus
  freshness: Freshness
  projection: PublicWorldProjectionBody | null
}

// ── Contract 02: VisitorWorldProjection (+ SinceYouWereHere) ───────

export type VisitorWorldStatus = "OK" | "UNAUTHENTICATED" | "UNAUTHORIZED" | "WORLD_NOT_FOUND" | "PROJECTION_UNAVAILABLE"

export interface VisitorRelationship {
  state: "NO_PRIOR_VISIT" | "VISITED"
  visitCount: number
  firstEnteredAt: Timestamp | null
  lastEnteredAt: Timestamp | null
  lastLeftAt: Timestamp | null
  lastSeen: { at: Timestamp; worldTick: WorldTick; basis: "LEAVE_RECORDED" | "PRESENCE_TIMEOUT" | "ENTRY_CONFIRMED" } | null
  encounteredPlaceIds: PlaceId[]
}

export interface ReturnContext {
  arrivalKind: "FIRST_VISIT" | "RETURNING"
  lastPlaceId: PlaceId | null
  continuity: "NOT_APPLICABLE" | "RECOGNIZED" | "NO_CONTINUITY_RECORD"
}

export type SinceYouWereHereState = "NOT_APPLICABLE_FIRST_VISIT" | "NO_MEANINGFUL_CHANGES" | "CHANGES" | "UNAVAILABLE"
export type ChangeKind =
  | "SEASON_CHANGED"
  | "ENVIRONMENT_CHANGED"
  | "POPULATION_MOVED"
  | "ENCOUNTER_CHANGED"
  | "KNOWN_ENTITY_CHANGED"
  | "RELATIONSHIP_CHANGED"
  | "WORLD_EVENT"
export type VisitorRelevance = "DIRECT" | "FAMILIAR_PLACE" | "WORLD_WIDE"

export interface IntervalPoint {
  at: Timestamp
  worldTick: WorldTick
}

export interface SinceYouWereHereChange {
  changeId: OpaqueId
  kind: ChangeKind
  placeIds: PlaceId[]
  summary: string
  worldTime: WorldTime
  /** World truth — identical for every viewer. */
  worldSignificance: WorldSignificance
  /** Private selection reason — chosen by the platform, never by WorldK. */
  visitorRelevance: VisitorRelevance
  linkedOccurrenceIds: OpaqueId[]
}

export interface SinceYouWereHere {
  state: SinceYouWereHereState
  interval: { since: IntervalPoint; through: IntervalPoint } | null
  summary: string | null
  changes: SinceYouWereHereChange[]
  omittedChangeCount: number
  selectionPolicy: { policyId: string; version: string } | null
  unavailableReason: "NO_CONTINUITY_RECORD" | "SOURCE_UNAVAILABLE" | null
}

export interface VisitorWorldProjectionBody {
  relationship: VisitorRelationship
  returnContext: ReturnContext
  sinceYouWereHere: SinceYouWereHere
}

export interface VisitorWorldProjection {
  schemaVersion: SchemaVersion
  contract: "visitor-world-projection"
  worldId: WorldId
  status: VisitorWorldStatus
  subjectId: SubjectId | null
  cacheScope: "PRIVATE"
  freshness: Freshness
  projection: VisitorWorldProjectionBody | null
}

// ── Contract 03: WorldEntryIntent / WorldEntryResult ───────────────

export interface ClientCapabilities {
  webgl2: boolean
  touchPrimary: boolean
  viewportClass: "COMPACT" | "MEDIUM" | "EXPANDED"
  reducedMotion: boolean
}

export interface WorldEntryIntent {
  schemaVersion: SchemaVersion
  contract: "world-entry-intent"
  intentId: string
  worldId: WorldId
  requestedPlaceId: PlaceId | null
  narrativeContext: NarrativeContext | null
  client: { surface: "WEB"; capabilities: ClientCapabilities }
}

export type WorldEntryOutcome = "READY" | "PENDING" | "UNAVAILABLE" | "DENIED" | "AUTHENTICATION_REQUIRED"

export interface WorldEntryArrival {
  kind: "FIRST_VISIT" | "RETURNING"
  placeId: PlaceId
  reason: "FIRST_VISIT_ENTRY" | "PRIOR_PLACE" | "WORLD_DIRECTED" | "SAFE_FALLBACK"
  requestedPlaceHonored: boolean
}

/** Opaque, short-lived, single-use. Never parse, persist or log `href`. */
export interface WorldEntryHandoff {
  kind: "NAVIGATE"
  href: string
  expiresAt: Timestamp
  singleUse: true
}

export interface WorldEntryResult {
  schemaVersion: SchemaVersion
  contract: "world-entry-result"
  intentId: string
  worldId: WorldId
  subjectId: SubjectId | null
  outcome: WorldEntryOutcome
  arrival: WorldEntryArrival | null
  handoff: WorldEntryHandoff | null
  pending: { reason: "PREPARING" | "QUEUED"; retryAfterSeconds: number } | null
  unavailable: {
    reason: "WORLD_NOT_FOUND" | "NOT_YET_OPEN" | "WORLD_CLOSED" | "RUNTIME_UNAVAILABLE" | "AT_CAPACITY" | "CLIENT_UNSUPPORTED"
    retryAfterSeconds: number | null
  } | null
  denied: { reason: "NOT_ENTITLED" | "ACCOUNT_RESTRICTED" } | null
}

// ── Contract 04: StreamK → WorldK NarrativeContext ─────────────────

export interface NarrativeContext {
  schemaVersion: SchemaVersion
  contract: "streamk-worldk-narrative-context"
  source: "streamk"
  worldId: WorldId
  storySlug: string
  episodeSlug: string
  entryExperienceId: string
  placeHint: PlaceId | null
  continuity: { signal: string; mode: "continue" | "recover"; cueId: string | null } | null
  /** Structural guard: narrative context is never world state. */
  worldStateAuthority: "NONE"
}

export const CONTRACT_SCHEMA_VERSION: SchemaVersion = "1.0"

/** Consumers accept any 1.x (M07 §13). */
export function isSupportedSchemaVersion(v: unknown): boolean {
  return typeof v === "string" && /^1\.[0-9]+$/.test(v)
}
