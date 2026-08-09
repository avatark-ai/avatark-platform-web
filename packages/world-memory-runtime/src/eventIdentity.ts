import { createHash } from "node:crypto"
import type { CausalReference } from "@avatark/world-memory-contracts"

// Sprint 11, Phase 18: a deterministic, content-derived identity for one
// WorldEvent/EntityMemoryEntry -- the same discipline Sprint 9's own
// deriveWorldSystemEventId already established for durable events.
// Replaying the exact same deterministic catch-up interval regenerates
// the exact same ids, letting an idempotent append dedupe correctly
// instead of duplicating memory (Phase 18's own replay proof).
export function deriveMemoryRecordId(worldId: string, tick: number, category: string, causalReferences: CausalReference[], participantIds: string[], positionInBatch: number): string {
  const hash = createHash("sha256")
  hash.update(worldId)
  hash.update("|")
  hash.update(String(tick))
  hash.update("|")
  hash.update(category)
  hash.update("|")
  hash.update(JSON.stringify(causalReferences))
  hash.update("|")
  hash.update(JSON.stringify([...participantIds].sort()))
  hash.update("|")
  hash.update(String(positionInBatch))
  return hash.digest("hex")
}
