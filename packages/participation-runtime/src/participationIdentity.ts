import { createHash } from "node:crypto"

// Sprint 19: a deliberate, documented RESTATEMENT of
// @avatark/encounter-realization-runtime's own `deriveEncounterRecordId`
// -- NOT an import, for the exact same dependency-boundary reason that
// function's own doc comment already states (no runtime package may
// depend on a sibling runtime package). Content-derived and
// deterministic over (worldId, userId, ruleId, locationId, tick): a
// retried "select-encounter" intent at the identical tick recomputes the
// identical id, so the Host layer's pre-check-then-work lookup dedupes
// correctly instead of duplicating a ParticipationRecord.
export function deriveParticipationRecordId(worldId: string, userId: string, ruleId: string, locationId: string, tick: number): string {
  const hash = createHash("sha256")
  hash.update(worldId)
  hash.update("|")
  hash.update(userId)
  hash.update("|")
  hash.update(ruleId)
  hash.update("|")
  hash.update(locationId)
  hash.update("|")
  hash.update(String(tick))
  return hash.digest("hex")
}
