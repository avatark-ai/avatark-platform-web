import type { SimulationTick } from "./ids.ts"

// Sprint 17: a thin, world-neutral descriptor of what one wake attempt's
// deterministic catch-up actually did -- for logging/test assertions
// only. It carries no new causal mechanism and is never itself
// persisted; every field is derived from data
// @avatark/world-persistence-runtime's own computeDeterministicCatchUp/
// resolveTicksToApply already produce.
export interface WakeCatchUpPlan {
  readonly fromTick: SimulationTick
  readonly toTick: SimulationTick
  readonly ticksToApply: number
  readonly seasonCrossings: number
}
