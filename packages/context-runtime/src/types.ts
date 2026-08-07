// ============================================================
// @avatark/context-runtime — Core Types
//
// Answers one question, for any product: "Where is this user right now?"
// Product-agnostic, user-scoped, adapter-driven. No field is required —
// every axis below is independently optional, and "unknown" is always
// represented honestly (null), never fabricated or inferred.
// ============================================================

// The thirteen context axes this runtime tracks. Every one maps to a
// plain, product-neutral id string — this package has zero knowledge of
// what any id "means" (no franchise logic, no product-specific shape).
export const CONTEXT_FIELD_KEYS = [
  'currentProductId',
  'currentOrganizationId',
  'currentExperienceId',
  'currentNarrativeId',
  'currentEpisodeId',
  'currentSceneId',
  'currentLivingWorldId',
  'currentLocationId',
  'currentPracticeId',
  'currentReflectionId',
  'currentCohortId',
  'currentInvitationId',
  'currentAvatarId',
] as const

export type ContextFieldKey = (typeof CONTEXT_FIELD_KEYS)[number]

export const CONTEXT_FIELD_KEY_SET: ReadonlySet<string> = new Set(CONTEXT_FIELD_KEYS)

// Precedence tiers, highest first. See resolver.ts for how ties and
// cross-tier writes are decided.
export const CONTEXT_SCOPES = ['session', 'persisted', 'product_default'] as const
export type ContextScope = (typeof CONTEXT_SCOPES)[number]

// Explicit provenance for a single field's current value — never
// implicit, never guessed. `writtenAt` is the timestamp the *value* is
// known to be true as of (not necessarily when it was persisted), so
// stale-update rejection has something honest to compare against.
export interface ContextSource {
  scope: ContextScope
  /** Which product supplied this value. Null only for runtime-internal operations (e.g. a restore) that don't originate from a specific product. */
  productId: string | null
  writtenAt: string
  reason?: string
}

export interface ContextFieldValue {
  value: string | null
  /** Null only when the field has never been set by anything — the honest "empty" state. */
  source: ContextSource | null
}

export type ContextFields = Record<ContextFieldKey, ContextFieldValue>

// The full resolved "where is this user right now" answer for one user.
// Always contains all thirteen keys — a field with no data is present as
// `{ value: null, source: null }`, never omitted, so callers never have
// to guess whether a key was left out or genuinely empty.
export interface ContextSnapshot {
  userId: string
  fields: ContextFields
  /** Timestamp of the most recent field write reflected in this snapshot. Null for a snapshot with no data at all. */
  updatedAt: string | null
}

// A caller's request to change one or more fields. Fields not present in
// `fields` are left untouched — this is what makes partial context safe:
// no caller is ever forced to restate the fields it doesn't know about.
// An explicit `null` clears a field.
export interface ContextPatch {
  /** The product making this write. Required — the runtime never infers who is writing. */
  productId: string
  scope: ContextScope
  fields: Partial<Record<ContextFieldKey, string | null>>
  /** When this patch's data was actually captured/known true. Defaults to now if omitted. Used for stale-update rejection against same-scope writes. */
  occurredAt?: string
  reason?: string
}

export type ContextRejectionReason = 'stale' | 'lower_precedence' | 'invalid_value'

export interface ContextRejection {
  field: ContextFieldKey
  reason: ContextRejectionReason
  /** The value that was rejected, for caller-side logging/debugging. */
  attemptedValue: string | null
}

// Every mutating operation returns this — rejections are always surfaced
// to the caller, never silently dropped, per the "do not silently
// overwrite newer context with stale context" requirement.
export interface ContextPatchOutcome {
  snapshot: ContextSnapshot
  applied: ContextFieldKey[]
  rejected: ContextRejection[]
}

export interface ContextHistoryEntry {
  id: string
  userId: string
  snapshot: ContextSnapshot
  /** The patch that produced this entry. Null for the synthetic entry created by an explicit pushContext() with no field changes. */
  patch: ContextPatch | null
  recordedAt: string
}
