import type { RelationshipBand, RelationshipEvidence } from "@avatark/social-ecology-contracts"

// Sprint 12, Phase 2/6: a deterministic, weighted evidence score --
// shared-group ticks and reunions count for more than mere co-presence,
// reflecting sustained/repeated association rather than a single
// passing overlap, but the whole computation stays a plain arithmetic
// rule, never inferred psychology.
// Sprint 14, Phase 8: `encounterCount` weighs the same as
// `reunionCount` -- both represent a genuinely realized event between
// the two entities, not mere co-location. `?? 0` reads every
// pre-Sprint-14 `RelationshipEvidence` literal (which never set this
// field) as zero, so no existing score changes.
export function deriveRelationshipBand(evidence: RelationshipEvidence): RelationshipBand {
  const score = evidence.coPresenceTicks + evidence.sharedGroupTicks * 2 + evidence.reunionCount * 3 + (evidence.encounterCount ?? 0) * 3
  if (score >= 20) return "STRONG"
  if (score >= 5) return "ESTABLISHED"
  return "WEAK"
}

export function evolveRelationshipEvidence(current: RelationshipEvidence, coPresentThisTick: boolean, sharedGroupThisTick: boolean, reunionOccurredThisTick: boolean, encounterRealizedThisTick: boolean = false): RelationshipEvidence {
  const next: RelationshipEvidence = {
    coPresenceTicks: current.coPresenceTicks + (coPresentThisTick ? 1 : 0),
    sharedGroupTicks: current.sharedGroupTicks + (sharedGroupThisTick ? 1 : 0),
    reunionCount: current.reunionCount + (reunionOccurredThisTick ? 1 : 0),
  }
  // Only ever appears once a relationship's own evidence has genuinely
  // touched an encounter -- keeps this function's return shape BYTE-
  // IDENTICAL for every pre-Sprint-14 caller that never passes
  // `encounterRealizedThisTick` and never carried the field on `current`
  // (Sprint 12/13's own existing tests assert on the exact object
  // shape, not just the derived band).
  if (current.encounterCount !== undefined || encounterRealizedThisTick) {
    next.encounterCount = (current.encounterCount ?? 0) + (encounterRealizedThisTick ? 1 : 0)
  }
  return next
}
