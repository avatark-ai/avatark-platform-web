import { createHash } from "node:crypto"
import type { WorldSystemEvent } from "@avatark/living-systems-contracts"
import type { WorldInstanceId, WorldSystemEventId } from "@avatark/world-persistence-contracts"

// Sprint 9, Phase 9: a deterministic idempotency key for one
// WorldSystemEvent produced during one catch-up/advance call. Content-
// derived (never random) so that retrying the EXACT SAME deterministic
// catch-up call -- same starting state, same tick count, same seed,
// which @avatark/living-systems-runtime's advanceWorldSimulation
// guarantees produces the exact same events array, in the exact same
// order -- regenerates the exact same event ids, letting
// DurableWorldSystemEventRepository.append() dedupe correctly instead of
// double-recording a season transition or an entity lifecycle change.
//
// `positionInBatch` disambiguates two otherwise-identical events at the
// same tick (e.g. two entities crossing a lifecycle phase on the same
// tick with coincidentally identical detail) -- it is the event's index
// within the ordered array `advanceWorldSimulation` returned for this
// call, not a random nonce.
export function deriveWorldSystemEventId(worldInstanceId: WorldInstanceId, event: WorldSystemEvent, positionInBatch: number): WorldSystemEventId {
  const hash = createHash("sha256")
  hash.update(worldInstanceId)
  hash.update("|")
  hash.update(String(event.tick))
  hash.update("|")
  hash.update(event.type)
  hash.update("|")
  hash.update(JSON.stringify(event.detail, Object.keys(event.detail).sort()))
  hash.update("|")
  hash.update(String(positionInBatch))
  return hash.digest("hex")
}
