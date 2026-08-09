import type { EncounterCategory, EncounterRuleId, EntityId } from "@avatark/living-systems-contracts"
import type { GroupId } from "@avatark/living-population-contracts"
import type { LocationId, WorldId } from "@avatark/runtime-contracts"
import type { RelationshipBand, RelationshipId, RelationshipType } from "@avatark/social-ecology-contracts"
import type { CausalReference, EncounterHistoryEntryId, WorldEventId } from "@avatark/world-memory-contracts"
import type { EncounterRecordId } from "./ids.ts"

// Sprint 14, Phase 0: EncounterRecord is a NEW, finer grain than either
// pre-existing encounter type -- it does not replace them.
//
// - Sprint 7's `AvailableEncounter` (living-systems-contracts) stays the
//   POTENTIAL layer: a rule is environmentally/narratively eligible at a
//   location. Unchanged.
// - Sprint 10's `EncounterOpportunity` (living-population-contracts)
//   stays the AVAILABLE layer: population presence makes an
//   AvailableEncounter meaningful, world/tick-scoped. Unchanged.
// - Sprint 11's `EncounterHistoryEntry` (world-memory-contracts) stays a
//   COARSE, per-(ruleId, locationId) status-transition breadcrumb
//   (AVAILABLE/RESOLVED/NO_LONGER_AVAILABLE) -- it carries no
//   participant list beyond `contributingEntityIds`, no consequences, no
//   encounterId. Unchanged; its own `RESOLVED` status is finally
//   populated this sprint by calling the two-sprint-dormant
//   `recordEncounterResolved` at the moment an EncounterRecord below
//   reaches REALIZED, closing that debt for real rather than
//   superseding it.
// - `EncounterRecord` (this type) is the per-INSTANCE historical truth:
//   one record per actual realized-or-rejected attempt, with a real
//   content-derived id, its own participant/group lists, causal
//   provenance, and consequence references. This is what Sprint 14's
//   mission means by "encounter realization" -- a materially richer
//   grain than either prior type, not a duplicate of one.
export type EncounterRealizationStatus =
  | "REALIZING" // transient: resolution is in progress this same wake -- see docs/SPRINT14_GROUND_TRUTH.md
  | "REALIZED"
  | "CONSEQUENCES_APPLIED"
  | "REMEMBERED" // consequences applied AND a WorldEvent/EntityMemoryEntry reference has been attached
  | "EXPIRED" // the opportunity lapsed without a strong enough causal signal
  | "BLOCKED" // a hard gate (protected narrative) prevented realization
  | "SUPERSEDED" // a later opportunity for the same participants/location/rule replaced this one before it resolved

export interface EncounterRecord {
  id: EncounterRecordId
  worldId: WorldId
  ruleId: EncounterRuleId
  category: EncounterCategory
  locationId: LocationId
  participantEntityIds: EntityId[]
  participantGroupIds: GroupId[]
  startTick: number
  realizationTick: number | null
  completionTick: number | null
  status: EncounterRealizationStatus
  causalReferences: CausalReference[]
  // Reference-only, never a copy of RelationshipState's own fields --
  // the participants' relationship (if any) at the tick this record was
  // resolved, named by id so a reader can look up the live, current
  // relationship separately.
  relationshipContext: { relationshipId: RelationshipId; relationshipType: RelationshipType; band: RelationshipBand }[]
  // True only when this encounter's own category is NOT
  // "narrative-protected", or the protected-narrative gate was actually
  // resolved open at realization time -- see docs/SPRINT14_GROUND_TRUTH.md's
  // protected-narrative enforcement section.
  protectedNarrativeGateOpen: boolean
  worldEventId: WorldEventId | null
  encounterHistoryEntryId: EncounterHistoryEntryId | null
  // The exact deterministic-variation value (see
  // @avatark/living-systems-contracts' own `deriveDeterministicVariation`)
  // consulted while resolving this record, if bounded ambiguity required
  // one -- recorded so a replay proof can assert the identical value was
  // reproduced, never a fresh random draw.
  variationConsulted: number | null
}

// Sprint 14, Phase 9/16: `get` by the record's own content-derived id is
// the ENTIRE replay-idempotency mechanism -- a replayed wake recomputes
// the identical id (see @avatark/encounter-realization-runtime's own
// `deriveEncounterRecordId`), finds the already-CONSEQUENCES_APPLIED
// record here, and the Host layer skips re-deriving/re-applying
// anything. No separate "already processed" flag anywhere else.
export interface EncounterRecordRepository {
  save(record: EncounterRecord): Promise<void>
  get(worldId: WorldId, id: EncounterRecordId): Promise<EncounterRecord | null>
  listByLocation(worldId: WorldId, locationId: LocationId): Promise<EncounterRecord[]>
  listRecent(worldId: WorldId, limit: number): Promise<EncounterRecord[]>
}
