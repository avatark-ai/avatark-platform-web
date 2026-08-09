import type { FamiliarityBand, FamiliarityEvidence, FamiliarityState } from "@avatark/social-ecology-contracts"
import { normalizeEntityPair } from "@avatark/social-ecology-contracts"
import type { EntityId } from "@avatark/living-systems-contracts"
import type { WorldId } from "@avatark/runtime-contracts"

// Sprint 12, Phase 6: bounded, evidence-based, deterministic --
// evidence only ever ACCUMULATES from legitimate co-presence/shared
// group ticks this function is told actually occurred; nothing here
// infers anything from a single data point, and nothing decays into a
// negative/emotional reading.
export interface FamiliarityThresholds {
  seenAbove: number
  familiarAbove: number
}

export const DEFAULT_FAMILIARITY_THRESHOLDS: FamiliarityThresholds = { seenAbove: 0, familiarAbove: 5 }

export function deriveFamiliarityBand(evidence: FamiliarityEvidence, thresholds: FamiliarityThresholds = DEFAULT_FAMILIARITY_THRESHOLDS): FamiliarityBand {
  const total = evidence.coPresenceTicks + evidence.sharedGroupTicks
  if (total > thresholds.familiarAbove) return "FAMILIAR"
  if (total > thresholds.seenAbove) return "SEEN"
  return "UNKNOWN"
}

export function evolveFamiliarity(worldId: WorldId, entityAId: EntityId, entityBId: EntityId, current: FamiliarityState | null, coPresentThisTick: boolean, sharedGroupThisTick: boolean, tick: number, thresholds: FamiliarityThresholds = DEFAULT_FAMILIARITY_THRESHOLDS): FamiliarityState {
  const [a, b] = normalizeEntityPair(entityAId, entityBId)
  const evidence: FamiliarityEvidence = {
    coPresenceTicks: (current?.evidence.coPresenceTicks ?? 0) + (coPresentThisTick ? 1 : 0),
    sharedGroupTicks: (current?.evidence.sharedGroupTicks ?? 0) + (sharedGroupThisTick ? 1 : 0),
    encounterCount: current?.evidence.encounterCount ?? 0,
  }
  return { worldId, entityAId: a, entityBId: b, band: deriveFamiliarityBand(evidence, thresholds), evidence, lastUpdatedTick: tick }
}
