import { createHash } from "node:crypto"

// Sprint 15: a deliberate, documented RESTATEMENT of
// @avatark/encounter-realization-runtime's own `deriveEncounterRecordId`
// (itself a documented restatement of @avatark/world-memory-runtime's
// own `deriveMemoryRecordId`) -- NOT an import, for the exact same
// reason: the dependency-boundary discipline every existing
// `*-runtime` package's own test enforces forbids one runtime package
// depending on a sibling runtime package. Content-derived from
// (worldId, ruleId, subjectId, tier) -- deliberately INCLUDING `tier`,
// not merely the encounter/tick that produced it, so recomputing the
// SAME tier on a later or replayed wake reproduces the IDENTICAL id
// (idempotent, "duplicate_ignored" on re-append) while crossing into a
// NEW tier produces a genuinely new, distinct effect id -- this is the
// entire "bounded accumulation, not per-wake amplification" mechanism
// (see docs/SPRINT15_FINAL_REPORT.md).
export function deriveAdaptationEffectId(worldId: string, ruleId: string, subjectId: string, tier: number): string {
  const hash = createHash("sha256")
  hash.update(worldId)
  hash.update("|")
  hash.update(ruleId)
  hash.update("|")
  hash.update(subjectId)
  hash.update("|")
  hash.update(String(tier))
  return hash.digest("hex")
}
