import type { WorldId } from "@avatark/runtime-contracts"
import type { AdaptationDomain } from "./domain.ts"
import type { AdaptationSignalKind } from "./signal.ts"

// Sprint 15: the ACCUMULATED, DECAYING state one AdaptationRule
// consults -- distinct from a single AdaptationSignal (one wake's worth
// of raw evidence) and distinct from an AdaptationEffect (a MATERIALIZED
// change once pressure crosses a rule's own threshold). This is the
// mission's own "PERSISTENT CHANGE -> ADAPTATION PRESSURE" step: a
// single realized encounter raises `value` a bounded amount; it decays
// back down over elapsed ticks with no reinforcement (see
// @avatark/world-adaptation-runtime's own `accumulateAdaptationPressure`)
// -- "one encounter should not automatically transform an entire world"
// (mission's own TEMPORAL BEHAVIOR section).
export interface AdaptationPressure {
  worldId: WorldId
  domain: AdaptationDomain
  subjectId: string
  kind: AdaptationSignalKind
  value: number
  // The tick this pressure was last recomputed. Decay is applied
  // lazily, evaluated only the next time a new signal touches this
  // exact (domain, subjectId, kind) -- never a background per-tick
  // sweep over every subject that has ever existed (see
  // docs/SPRINT15_FINAL_REPORT.md's determinism/bounded-workload
  // section). This same field is the entire replay-idempotency guard:
  // a replayed wake recomputing the identical tick for a subject whose
  // pressure was already advanced to that tick is a no-op.
  lastUpdatedTick: number
}

export interface AdaptationPressureRepository {
  get(worldId: WorldId, domain: AdaptationDomain, subjectId: string, kind: AdaptationSignalKind): Promise<AdaptationPressure | null>
  save(pressure: AdaptationPressure): Promise<void>
  listByWorld(worldId: WorldId): Promise<AdaptationPressure[]>
}
