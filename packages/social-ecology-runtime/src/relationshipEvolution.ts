import type { RelationshipBand, RelationshipEvidence } from "@avatark/social-ecology-contracts"

// Sprint 12, Phase 2/6: a deterministic, weighted evidence score --
// shared-group ticks and reunions count for more than mere co-presence,
// reflecting sustained/repeated association rather than a single
// passing overlap, but the whole computation stays a plain arithmetic
// rule, never inferred psychology.
export function deriveRelationshipBand(evidence: RelationshipEvidence): RelationshipBand {
  const score = evidence.coPresenceTicks + evidence.sharedGroupTicks * 2 + evidence.reunionCount * 3
  if (score >= 20) return "STRONG"
  if (score >= 5) return "ESTABLISHED"
  return "WEAK"
}

export function evolveRelationshipEvidence(current: RelationshipEvidence, coPresentThisTick: boolean, sharedGroupThisTick: boolean, reunionOccurredThisTick: boolean): RelationshipEvidence {
  return {
    coPresenceTicks: current.coPresenceTicks + (coPresentThisTick ? 1 : 0),
    sharedGroupTicks: current.sharedGroupTicks + (sharedGroupThisTick ? 1 : 0),
    reunionCount: current.reunionCount + (reunionOccurredThisTick ? 1 : 0),
  }
}
