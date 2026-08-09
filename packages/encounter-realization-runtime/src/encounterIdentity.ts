import { createHash } from "node:crypto"

// Sprint 14: a deliberate, documented RESTATEMENT of
// @avatark/world-memory-runtime's own `deriveMemoryRecordId` -- NOT an
// import, because the dependency-boundary discipline every existing
// `*-runtime` package's own test already enforces forbids one runtime
// package depending on a sibling runtime package (only contracts
// packages may be shared). This is the same "second, independent
// implementation of a similar rule" posture Sprint 13's own
// `resolveResourceOpportunities` already used for `perception.ts`'s
// gate (docs/SPRINT13_GROUND_TRUTH.md's decision 2) -- content-derived,
// deterministic, so replaying the identical wake regenerates the
// identical id and an idempotent append dedupes correctly instead of
// duplicating an EncounterRecord.
export function deriveEncounterRecordId(worldId: string, ruleId: string, locationId: string, participantEntityIds: string[], startTick: number): string {
  const hash = createHash("sha256")
  hash.update(worldId)
  hash.update("|")
  hash.update(ruleId)
  hash.update("|")
  hash.update(locationId)
  hash.update("|")
  hash.update(JSON.stringify([...participantEntityIds].sort()))
  hash.update("|")
  hash.update(String(startTick))
  return hash.digest("hex")
}
