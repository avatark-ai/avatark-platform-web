import type { ArrivalDecision, ArrivalDecisionInput } from "@avatark/world-experience-contracts"

// Build 04, mission §D. Pure, deterministic, no I/O -- the Host layer
// resolves every input (prior position, known locations, active
// canon-directed scopes, whether the world changed) and this function
// only decides where that adds up to. Precedence, in order:
//   1. a currently-active canonical event's own authored scope, if it
//      resolves to a KNOWN location (Canon-directed entry always wins
//      when legitimately available -- but never over an unknown
//      location, which would be a real bug in the caller, not a
//      reason to materialize a visitor somewhere nonexistent);
//   2. first-ever visit -> the world's own entry location;
//   3. a valid, still-known prior location -> return there;
//   4. a stale/no-longer-known prior location -> fall back to entry,
//      but distinguish WHY (STALE_PRIOR_LOCATION_FALLBACK) from a
//      first-ever visit, so an orientation layer can say something
//      honest about it rather than presenting it as a fresh start;
//   5. the ultimate defensive fallback (entry location not even in the
//      known set -- should never happen for a well-formed world, but
//      an arrival resolver must always produce SOME location rather
//      than throwing).
export function resolveArrivalDecision(input: ArrivalDecisionInput): ArrivalDecision {
  const isFirstEverVisit = input.priorLocationId === null
  const knownLocationIds = new Set(input.knownLocationIds)
  const worldChangedSinceLastVisit = isFirstEverVisit ? false : input.worldChangedSinceLastVisit

  const canonDirectedLocationId = input.canonDirectedLocationIds.find((locationId) => knownLocationIds.has(locationId)) ?? null
  if (canonDirectedLocationId !== null) {
    return {
      locationId: canonDirectedLocationId,
      reason: "CANON_DIRECTED_ENTRY",
      isFirstEverVisit,
      priorLocationId: input.priorLocationId,
      worldChangedSinceLastVisit,
    }
  }

  if (isFirstEverVisit) {
    return {
      locationId: input.entryLocationId,
      reason: "FIRST_EVER_VISIT",
      isFirstEverVisit: true,
      priorLocationId: null,
      worldChangedSinceLastVisit: false,
    }
  }

  if (knownLocationIds.has(input.priorLocationId as string)) {
    return {
      locationId: input.priorLocationId as string,
      reason: "RETURNING_TO_PRIOR_PLACE",
      isFirstEverVisit: false,
      priorLocationId: input.priorLocationId,
      worldChangedSinceLastVisit,
    }
  }

  return {
    locationId: input.entryLocationId,
    reason: knownLocationIds.has(input.entryLocationId) ? "STALE_PRIOR_LOCATION_FALLBACK" : "SAFE_FALLBACK_ENTRY",
    isFirstEverVisit: false,
    priorLocationId: input.priorLocationId,
    worldChangedSinceLastVisit,
  }
}
