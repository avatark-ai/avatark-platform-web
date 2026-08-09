import type { RhythmScheduleId } from "./ids.ts"

// Sprint 10, Phase 4: a reusable daily-rhythm abstraction, derived from
// LOGICAL world time (tick modulo cycle length) -- never wall-clock
// time. A world can advance through many full rhythm cycles while no
// visitor is present, exactly like season transitions already do.
export type RhythmPhase = "REST" | "WAKE" | "FORAGE" | "DRINK" | "MOVE" | "SOCIAL" | "RETURN"

// `startFractionOfDay` is in [0, 1) -- a fraction of one RhythmSchedule
// cycle, not an absolute tick. World-specific data configures the
// generic engine (Phase 4's own requirement); the runtime only knows
// how to look up "which entry's fraction range contains this tick,"
// never a hardcoded schedule.
export interface RhythmScheduleEntry {
  phase: RhythmPhase
  startFractionOfDay: number
}

export interface RhythmSchedule {
  id: RhythmScheduleId
  ticksPerCycle: number
  entries: RhythmScheduleEntry[]
}
