import { createHash } from "node:crypto"

// Sprint 18: a deliberate, documented RESTATEMENT of
// @avatark/encounter-realization-runtime's own `deriveEncounterRecordId`
// (itself a restatement of @avatark/world-memory-runtime's own
// `deriveMemoryRecordId`, and @avatark/world-adaptation-runtime's own
// `deriveAdaptationEffectId`) -- NOT an import, for the exact same
// reason every one of those restatements already documents: the
// dependency-boundary discipline every existing `*-runtime` package's
// own test enforces forbids one runtime package depending on a sibling
// runtime package. Content-derived from (worldInstanceId,
// canonicalEventId, definitionContentHash, activationTick) -- computed
// and checked BEFORE any consequence work runs (Phase 0 §12's own
// explicit requirement), the entire idempotency mechanism: a replayed
// wake recomputes the identical id, finds the already-ACTIVATED/
// COMPLETED state, and the Host layer skips re-deriving/re-applying
// anything.
export function deriveCanonicalActivationId(worldInstanceId: string, canonicalEventId: string, definitionContentHash: string, activationTick: number): string {
  const hash = createHash("sha256")
  hash.update(worldInstanceId)
  hash.update("|")
  hash.update(canonicalEventId)
  hash.update("|")
  hash.update(definitionContentHash)
  hash.update("|")
  hash.update(String(activationTick))
  return hash.digest("hex")
}

// Sprint 18: the Host-computed substitute for a real StudioK vendored-
// artifact checksum (see @avatark/canonical-event-contracts' own
// `identity.ts` doc comment -- no real `*.canonical-events.json`
// artifact exists yet, Phase 0's own STOP gate #5). Hashes the
// DEFINITION's own stable content fields -- never includes anything
// world-instance-scoped, so the SAME definition produces the SAME hash
// regardless of which world instance executes it, and a genuinely
// different authored definition (different conditions/facts/scope)
// produces a genuinely different one.
export function deriveDefinitionContentHash(canonicalEventId: string, activationConditions: unknown, mandatedFacts: unknown, scope: unknown): string {
  const hash = createHash("sha256")
  hash.update(canonicalEventId)
  hash.update("|")
  hash.update(JSON.stringify(activationConditions))
  hash.update("|")
  hash.update(JSON.stringify(mandatedFacts))
  hash.update("|")
  hash.update(JSON.stringify(scope))
  return hash.digest("hex")
}
