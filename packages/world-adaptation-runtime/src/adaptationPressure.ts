import type { AdaptationDomain, AdaptationPressure, AdaptationSignalKind } from "@avatark/world-adaptation-contracts"

export interface AccumulateAdaptationPressureParams {
  worldId: string
  domain: AdaptationDomain
  subjectId: string
  kind: AdaptationSignalKind
  existing: AdaptationPressure | null
  // The sum of every new signal's own weight for this exact (domain,
  // subjectId, kind) this wake -- the Host/orchestrator groups signals
  // before calling this, so this function stays a plain arithmetic
  // rule over a single number, never a signal-shape-aware loop itself.
  signalWeightSum: number
  decayPerTick: number
  tick: number
}

// Sprint 15, mission's own "TEMPORAL BEHAVIOR" section: a pure,
// deterministic decay-then-accumulate rule. `existing.lastUpdatedTick`
// is BOTH the decay baseline AND the entire replay-idempotency guard --
// a caller that recomputes this at the identical tick a SECOND time
// (a replayed wake) must skip calling this function at all for that
// subject (see @avatark/world-adaptation-runtime's own
// `runWorldAdaptation`, which enforces the guard before ever calling
// this), so this function itself never needs to special-case "was this
// tick already applied."
export function accumulateAdaptationPressure(params: AccumulateAdaptationPressureParams): AdaptationPressure {
  const elapsedTicks = params.existing ? Math.max(0, params.tick - params.existing.lastUpdatedTick) : 0
  const decayedValue = params.existing ? Math.max(0, params.existing.value - params.decayPerTick * elapsedTicks) : 0
  return {
    worldId: params.worldId,
    domain: params.domain,
    subjectId: params.subjectId,
    kind: params.kind,
    value: decayedValue + params.signalWeightSum,
    lastUpdatedTick: params.tick,
  }
}
