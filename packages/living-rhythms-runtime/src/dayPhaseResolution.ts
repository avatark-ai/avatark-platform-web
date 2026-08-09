import type { DayPhase, DayPhaseSchedule } from "@avatark/living-rhythms-contracts"

// Sprint 13, Phase 2: pure function of LOGICAL tick -> day phase.
// Structurally identical to Sprint 10's own `resolveRhythmPhase` --
// `tick % ticksPerCycle` derives a cycle-relative position; the entry
// whose `startFractionOfDay` is the largest one <= that position's
// fraction is the current phase. No wall-clock read anywhere -- a
// dormant world can advance through many full day-cycles between
// visitors, and this function produces the exact same phase whether
// called once per tick or once for a large tick jump, because it is a
// pure function of `tick` alone.
export function resolveDayPhase(schedule: DayPhaseSchedule, tick: number): DayPhase {
  if (schedule.entries.length === 0) throw new RangeError(`day-phase schedule "${schedule.id}" has no entries`)

  const cyclePosition = ((tick % schedule.ticksPerCycle) + schedule.ticksPerCycle) % schedule.ticksPerCycle
  const fraction = cyclePosition / schedule.ticksPerCycle

  const sorted = [...schedule.entries].sort((a, b) => a.startFractionOfDay - b.startFractionOfDay)
  let current = sorted[0]
  for (const entry of sorted) {
    if (entry.startFractionOfDay <= fraction) current = entry
  }
  return current.phase
}
