import type { WorldId } from "@avatark/runtime-contracts"
import type { WorldEventId } from "@avatark/world-memory-contracts"
import type { MandatedFact } from "./mandatedFact.ts"
import type { CanonicalEventProjectionScope } from "./scope.ts"
import type { CanonicalEventProvenance } from "./provenance.ts"

// Sprint 18, Phase 0 §8: names a projection INTO a world instance,
// never a state of Canon itself. Naming deliberately parallels
// `EncounterRealizationStatus`'s `REALIZING -> REALIZED ->
// CONSEQUENCES_APPLIED -> REMEMBERED` shape. `PROJECTING` is
// synchronous/transient in this reference implementation -- never left
// dangling between wakes, the same posture Sprint 14's own `REALIZING`
// already holds. `DEFERRED` is deliberately NOT modeled (Phase 0's own
// STOP gate #3: "do not add speculative lifecycle states" --
// `NARRATIVE_GATE_OPEN` activation conditions already cover every real
// gating case this sprint needs).
export type CanonicalEventProjectionStatus = "DORMANT" | "ELIGIBLE" | "ACTIVATED" | "PROJECTING" | "COMPLETED"

// Sprint 18, Phase 0 §10/§11, RECONCILED: Phase 0's own §25 explicitly
// sanctions collapsing `CanonicalEventProjection` into
// `WorldInstanceCanonicalProjectionState` ("several candidates collapse
// ... rather than each warranting a distinct type") -- this is that
// collapse, deliberately, not an oversight. One record per (world
// instance, canonical event): Global Canonical Identity
// (`CanonicalEventIdentity`) is single/shared/immutable; THIS record is
// per-instance and mutable-by-projection-only. World instance A having
// `COMPLETED` and world instance B having `DORMANT` for the SAME
// `canonicalEventId` is not two Canons -- it is one Canon with two
// independent projection histories (the same relationship
// `EncounterRecord`'s per-world-instance isolation already proves for
// encounters).
export interface WorldInstanceCanonicalProjectionState {
  worldInstanceId: WorldId
  canonicalEventId: string
  status: CanonicalEventProjectionStatus
  /** Set once, at ACTIVATED, from `deriveCanonicalActivationId` --
   * never recomputed differently on a later call for the SAME
   * (worldInstanceId, canonicalEventId): this is the entire
   * idempotency mechanism (checked BEFORE any consequence work runs,
   * mirroring `deriveEncounterRecordId`'s pre-check-then-work order). */
  activationId: string | null
  mandatedFacts: MandatedFact[]
  scope: CanonicalEventProjectionScope
  provenance: CanonicalEventProvenance
  activatedAtTick: number | null
  completedAtTick: number | null
  /** Links to the durable `CANONICAL_EVENT_OCCURRED` WorldEvent this
   * projection produced, mirroring `EncounterRecord.worldEventId`'s own
   * reference-only convention -- never a copy of that event's own
   * fields. */
  worldEventId: WorldEventId | null
}

export interface WorldInstanceCanonicalProjectionStateRepository {
  get(worldId: WorldId, canonicalEventId: string): Promise<WorldInstanceCanonicalProjectionState | null>
  save(state: WorldInstanceCanonicalProjectionState): Promise<void>
  listByWorld(worldId: WorldId): Promise<WorldInstanceCanonicalProjectionState[]>
}
