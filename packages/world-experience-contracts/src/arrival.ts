import type { LocationId } from "@avatark/runtime-contracts"

// Build 04, mission §D: "where should this visitor materialize" as an
// explicit, closed, named decision -- never a bare fallback chain
// buried in a route handler. Every reason below corresponds to one of
// the mission's own seven named arrival scenarios; "returning visitor"
// (scenario 2) is the umbrella RETURNING_TO_PRIOR_PLACE/
// STALE_PRIOR_LOCATION_FALLBACK both fall under, and "world-state-
// changed-since-last-visit" (scenario 7) is `worldChangedSinceLastVisit`
// below, a flag alongside placement rather than a placement outcome of
// its own -- it does not change WHERE a visitor arrives.
export type ArrivalReason =
  | "FIRST_EVER_VISIT"
  | "RETURNING_TO_PRIOR_PLACE"
  | "CANON_DIRECTED_ENTRY"
  | "STALE_PRIOR_LOCATION_FALLBACK"
  | "SAFE_FALLBACK_ENTRY"

// Deliberately plain-data, no injected predicate/function fields --
// `knownLocationIds` is a snapshot of which LocationIds are currently
// addressable in this world instance, not a callback, keeping this
// input (and therefore `resolveArrivalDecision`'s output) trivially
// JSON-serializable and determinism-testable, the same discipline
// SpatialMovementContext's own plain `reachablePatchIds` array already
// holds.
export interface ArrivalDecisionInput {
  entryLocationId: LocationId
  /** The visitor's own last-known position, from their own visitor-scoped
   * position record -- null means this visitor has never entered this
   * world instance before. */
  priorLocationId: LocationId | null
  knownLocationIds: LocationId[]
  /** LocationIds a currently-active/eligible canonical event's own
   * authored scope resolves to, already Canon-safe (never invented) --
   * empty when no canonical event is currently directing entry. */
  canonDirectedLocationIds: LocationId[]
  /** Whether the world meaningfully changed since this visitor's own
   * last-known tick (via ReturnRecognition) -- irrelevant, and always
   * false, for a first-ever visit. */
  worldChangedSinceLastVisit: boolean
}

export interface ArrivalDecision {
  locationId: LocationId
  reason: ArrivalReason
  isFirstEverVisit: boolean
  priorLocationId: LocationId | null
  worldChangedSinceLastVisit: boolean
}
