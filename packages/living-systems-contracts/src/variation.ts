import type { LocationId, WorldId } from "@avatark/runtime-contracts"
import type { SeasonId } from "./ids.ts"

// Sprint 7, Phase 7: deterministic variation, never renderer-side
// Math.random(). The same input always produces the same output --
// reproducible in tests, replayable, and safe to call from both the
// simulation layer and a test asserting the simulation's own output.
export interface DeterministicVariationInput {
  worldId: WorldId
  worldVersion: number
  tick: number
  locationId: LocationId
  seasonId: SeasonId
  seed: string
}

// A deliberately simple, non-cryptographic FNV-1a-style string hash --
// this is variation, not security. Returns a value in [0, 1).
export function deriveDeterministicVariation(input: DeterministicVariationInput): number {
  const key = `${input.worldId}:${input.worldVersion}:${input.tick}:${input.locationId}:${input.seasonId}:${input.seed}`
  let hash = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  // Unsigned 32-bit, normalized to [0, 1).
  return (hash >>> 0) / 0x100000000
}
