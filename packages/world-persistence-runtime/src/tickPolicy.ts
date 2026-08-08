import type { SimulationTick } from "@avatark/world-persistence-contracts"

// Sprint 9, Phase 4/5: the mapping from elapsed WALL-CLOCK time to how
// many LOGICAL ticks a dormant world should catch up by is product
// policy, not core runtime semantics -- Phase 5 explicitly says "keep
// lifecycle policy configurable above the core." TickPolicy is that
// seam: the core (catchUp.ts) takes a tick COUNT, never a Date, and
// never reads the wall clock itself. Nothing in @avatark/living-systems-
// runtime's advanceWorldSimulation changes -- it already only accepts
// an explicit `ticks: number` (packages/living-systems-runtime/src/
// simulation.ts:13).
export interface TickPolicy {
  ticksElapsed(lastAdvancedAtMs: number, nowMs: number): SimulationTick
}

// A reference policy only -- callers above the core are free to supply
// their own (e.g. "1 tick per real day," "no advancement on weekends").
// This one is deliberately simple: N milliseconds of wall-clock time per
// logical tick, floor-divided, never negative.
export function fixedRateTickPolicy(msPerTick: number): TickPolicy {
  if (msPerTick <= 0) throw new RangeError("msPerTick must be positive")
  return {
    ticksElapsed(lastAdvancedAtMs, nowMs) {
      const elapsed = nowMs - lastAdvancedAtMs
      if (elapsed <= 0) return 0
      return Math.floor(elapsed / msPerTick)
    },
  }
}
