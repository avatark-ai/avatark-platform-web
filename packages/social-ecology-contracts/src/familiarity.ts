import type { EntityId } from "@avatark/living-systems-contracts"
import type { WorldId } from "@avatark/runtime-contracts"

// Sprint 12, Phase 6: bounded, discrete, evidence-based -- never a
// generic emotional score, never inferred personality.
export type FamiliarityBand = "UNKNOWN" | "SEEN" | "FAMILIAR"

export interface FamiliarityEvidence {
  coPresenceTicks: number
  sharedGroupTicks: number
  encounterCount: number
}

// Keyed by an UNORDERED entity pair -- `entityAId`/`entityBId` are
// normalized (lexicographically) by whatever constructs this, so a pair
// is never stored twice in both orders.
export interface FamiliarityState {
  worldId: WorldId
  entityAId: EntityId
  entityBId: EntityId
  band: FamiliarityBand
  evidence: FamiliarityEvidence
  lastUpdatedTick: number
}

export interface FamiliarityRepository {
  save(state: FamiliarityState): Promise<void>
  get(worldId: WorldId, entityAId: EntityId, entityBId: EntityId): Promise<FamiliarityState | null>
  listByEntity(worldId: WorldId, entityId: EntityId): Promise<FamiliarityState[]>
}

// The one normalization rule every producer/consumer of an unordered
// entity pair must share -- lexicographic order -- so a pair is never
// stored twice under both orderings.
export function normalizeEntityPair(entityAId: EntityId, entityBId: EntityId): [EntityId, EntityId] {
  return entityAId <= entityBId ? [entityAId, entityBId] : [entityBId, entityAId]
}
