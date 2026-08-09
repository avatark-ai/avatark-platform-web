import type { RhythmPhase, RhythmSchedule } from "@avatark/living-population-contracts"

// Sprint 10, Phase 4: pure function of LOGICAL tick -> rhythm phase.
// `tick % ticksPerCycle` derives a cycle-relative position; the entry
// whose `startFractionOfDay` is the largest one <= that position's
// fraction is the current phase. No wall-clock read anywhere -- a
// dormant world can advance through many full cycles between visitors
// (Phase 4's own requirement), and this function produces the exact
// same phase whether called once per tick or once for a large tick
// jump, because it is a pure function of `tick` alone.
export function resolveRhythmPhase(schedule: RhythmSchedule, tick: number): RhythmPhase {
  if (schedule.entries.length === 0) throw new RangeError(`rhythm schedule "${schedule.id}" has no entries`)

  const cyclePosition = ((tick % schedule.ticksPerCycle) + schedule.ticksPerCycle) % schedule.ticksPerCycle
  const fraction = cyclePosition / schedule.ticksPerCycle

  const sorted = [...schedule.entries].sort((a, b) => a.startFractionOfDay - b.startFractionOfDay)
  let current = sorted[0]
  for (const entry of sorted) {
    if (entry.startFractionOfDay <= fraction) current = entry
  }
  return current.phase
}
