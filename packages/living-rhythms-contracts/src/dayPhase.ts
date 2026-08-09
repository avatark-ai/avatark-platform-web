import type { DayPhaseScheduleId } from "./ids.ts"

// Sprint 13, Phase 2: a WORLD-SHARED projection of logical `tick` --
// deliberately distinct from Sprint 10's own `RhythmPhase`, which is
// per-archetype and asynchronous (a cow's own 8-tick cycle has no
// relationship to a bird-flock's 6-tick cycle). Every entity in a world
// observes the SAME day phase at the same tick, the same category of
// shared truth as `SeasonState` -- never wall-clock time (see
// docs/SPRINT13_GROUND_TRUTH.md's decision 1). Names are the mission's
// own architectural examples; a different world grammar may define a
// schedule with different entries/counts without this type changing.
export type DayPhase = "DAWN" | "MORNING" | "MIDDAY" | "AFTERNOON" | "DUSK" | "EVENING" | "NIGHT"

// `startFractionOfDay` is in [0, 1) -- a fraction of one DayPhaseSchedule
// cycle, not an absolute tick. Structurally identical to Sprint 10's own
// `RhythmScheduleEntry`/`RhythmSchedule` shape, deliberately -- the same
// "world-specific data configures a generic engine" discipline, kept as
// its own type because it is WORLD-scoped (one per world/grammar), never
// per-archetype.
export interface DayPhaseScheduleEntry {
  phase: DayPhase
  startFractionOfDay: number
}

export interface DayPhaseSchedule {
  id: DayPhaseScheduleId
  ticksPerCycle: number
  entries: DayPhaseScheduleEntry[]
}

// A small, pure, renderer-facing helper -- the schedule's own phases in
// their natural cycle order, for diagnostic display. Lives here (not in
// `living-rhythms-runtime`) because it is a property of the data itself
// (sort order), never a tick-dependent resolution.
export function orderedDayPhases(schedule: DayPhaseSchedule): DayPhase[] {
  return [...schedule.entries].sort((a, b) => a.startFractionOfDay - b.startFractionOfDay).map((entry) => entry.phase)
}
