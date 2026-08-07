import type { KnownExperienceType } from "./eventTypes.ts"

// Opaque string aliases -- named per the mission's core model so call sites
// and signatures stay self-documenting, matching this repo's existing
// convention (e.g. @avatark/timeline's TimelineEntry) of plain string
// aliases over branded types.
export type ExperienceEventId = string
/** ISO 8601 string. */
export type ExperienceTimestamp = string
export type ExperienceCorrelationId = string
export type ExperienceSessionId = string

// Extensible by design: the curated KnownExperienceType literals give
// autocomplete for the initial vocabulary, but `string & {}` (rather than
// plain `string`) keeps that autocomplete while still accepting any other
// well-formed "namespace.verb_phrase" string -- see validation.ts's
// isWellFormedExperienceType for the format this is checked against at
// recordEvent() time.
export type ExperienceType = KnownExperienceType | (string & {})

export interface ExperienceSource {
  /** Matches @avatark/product-registry's AvatarKProduct.id. */
  productId: string
  /** Optional finer-grained origin within the product (a route, a service, a worker). */
  component?: string
}

/** The user this event is scoped to. Every event belongs to exactly one user. */
export interface ExperienceActor {
  userId: string
  role?: "user" | "system" | "admin"
}

/** An optional secondary subject the event acted on (a world, an episode, an organization, ...). */
export interface ExperienceTarget {
  type: string
  id: string
}

// Flat and primitive-only, on purpose: this is the enforcement mechanism
// behind "no arbitrary blobs" and "metadata size bounded" (see
// validation.ts) -- there is nowhere for a nested object, an array, or a
// binary payload to hide.
export type ExperienceMetadataValue = string | number | boolean | null
export type ExperienceMetadata = Record<string, ExperienceMetadataValue>

export const CURRENT_EXPERIENCE_SCHEMA_VERSION = 1

/** The canonical, immutable record. Never constructed directly -- always via ExperienceRegistry.recordEvent(). */
export interface ExperienceEvent {
  readonly id: ExperienceEventId
  /** Stamped from CURRENT_EXPERIENCE_SCHEMA_VERSION at write time -- lets future readers run per-version migrations without a table rewrite. */
  readonly schemaVersion: number
  readonly type: ExperienceType
  readonly source: ExperienceSource
  readonly actor: ExperienceActor
  readonly target?: ExperienceTarget
  readonly metadata: ExperienceMetadata
  /** When the experience actually happened, as reported by the producer. */
  readonly occurredAt: ExperienceTimestamp
  /** When the registry durably stored it. Server-assigned, never caller-supplied. */
  readonly recordedAt: ExperienceTimestamp
  readonly correlationId?: ExperienceCorrelationId
  readonly sessionId?: ExperienceSessionId
}

/** What a producer supplies to recordEvent() -- everything ExperienceEvent has except the fields the registry itself assigns (id, schemaVersion, recordedAt). */
export interface ExperienceEventInput {
  type: ExperienceType
  source: ExperienceSource
  actor: ExperienceActor
  target?: ExperienceTarget
  metadata?: ExperienceMetadata
  /** Defaults to the record time if the producer doesn't know a distinct occurrence time. */
  occurredAt?: ExperienceTimestamp
  correlationId?: ExperienceCorrelationId
  sessionId?: ExperienceSessionId
}

export interface ExperienceEventQuery {
  /** Most recent first, capped at this count. */
  limit?: number
  /** Exclusive cursor: only events recorded strictly before this timestamp. */
  before?: ExperienceTimestamp
  /** Exclusive cursor: only events recorded strictly after this timestamp. */
  after?: ExperienceTimestamp
  types?: ExperienceType[]
}
