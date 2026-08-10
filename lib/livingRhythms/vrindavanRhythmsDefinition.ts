import type { DailyRhythmDefinition, DayPhaseSchedule } from "@avatark/living-rhythms-contracts"
import { COW_ARCHETYPE_ID, BIRD_FLOCK_ARCHETYPE_ID } from "../livingPopulation/vrindavanPopulationDefinition.ts"

// Sprint 13, Phase 2: a Host-layer, non-canonical judgment call for
// `ticksPerCycle` -- longer than either archetype's own asynchronous
// rhythm cycle (cow: 8, bird-flock: 6, see vrindavanPopulationDefinition.ts),
// deliberately, since this is the WORLD's own shared day, not an
// individual archetype's activity loop (see
// docs/SPRINT13_GROUND_TRUTH.md's decision 1). The exact number is
// arbitrary but stable -- easy to retune without touching the engine.
export const VRINDAVAN_DAY_PHASE_SCHEDULE: DayPhaseSchedule = {
  id: "avatark-vrindavan-day-phase-schedule",
  ticksPerCycle: 14,
  entries: [
    { phase: "DAWN", startFractionOfDay: 0 / 7 },
    { phase: "MORNING", startFractionOfDay: 1 / 7 },
    { phase: "MIDDAY", startFractionOfDay: 2 / 7 },
    { phase: "AFTERNOON", startFractionOfDay: 3 / 7 },
    { phase: "DUSK", startFractionOfDay: 4 / 7 },
    { phase: "EVENING", startFractionOfDay: 5 / 7 },
    { phase: "NIGHT", startFractionOfDay: 6 / 7 },
  ],
}

// Sprint 13, Phase 6: tendency and eligibility, never a scripted
// timetable -- each entry only nudges which of Sprint 10's own
// already-existing candidates wins, never forces one. Cows graze/drink
// in the morning near Yamuna/Kadamba Grove's own vegetation and water,
// and rest at dusk/night in Kadamba Grove's own new "rest" affordance
// (Sprint 13, Phase 4).
export const COW_DAILY_RHYTHM: DailyRhythmDefinition = {
  id: "avatark-population-cow-routine",
  entries: [
    { dayPhase: "MORNING", eligibleActivities: ["GRAZE", "DRINK"], preferredResourceTypes: ["vegetation", "water"], socialAffinity: 0.05, restBias: 0, movementBias: 0.15 },
    // Build 03, Phase0 §13/§35's own recommended Grishma-readiness
    // content delta: the real MIDDAY gap, filled with reduced activity
    // and a rest/water preference -- the concrete realization of "heat
    // rises -> shelter/water preference increases," composing the
    // existing rhythm + resource-affordance mechanism (§15), zero new
    // engine capability, zero new season.
    { dayPhase: "MIDDAY", eligibleActivities: ["REST"], preferredResourceTypes: ["water", "rest"], socialAffinity: 0, restBias: 0.25, movementBias: 0.05 },
    { dayPhase: "DUSK", eligibleActivities: ["REST"], preferredResourceTypes: ["rest"], socialAffinity: 0.05, restBias: 0.35, movementBias: 0.1 },
    { dayPhase: "NIGHT", eligibleActivities: ["REST"], preferredResourceTypes: ["rest"], socialAffinity: 0, restBias: 0.4, movementBias: 0 },
  ],
}

// The bird flock gathers/socializes in the morning at Govardhan Path's
// own "gathering" affordance, travels its own "corridor" affordance in
// the afternoon, and rests at dusk -- never GRAZE (bird-flock's own
// capabilities are "can_forage," not "can_graze"; see behaviorSelection.ts's
// eligibility gate).
export const BIRD_FLOCK_DAILY_RHYTHM: DailyRhythmDefinition = {
  id: "avatark-population-bird-flock-routine",
  entries: [
    { dayPhase: "MORNING", eligibleActivities: ["SOCIALIZE"], preferredResourceTypes: ["gathering"], socialAffinity: 0.3, restBias: 0, movementBias: 0.1 },
    // Build 03, Phase0 §13/§35: the same MIDDAY content delta as the
    // cow's own entry above, biasing toward shelter/rest instead of the
    // afternoon corridor travel this archetype otherwise prefers.
    { dayPhase: "MIDDAY", eligibleActivities: ["REST"], preferredResourceTypes: ["shelter", "rest"], socialAffinity: 0, restBias: 0.25, movementBias: 0.05 },
    { dayPhase: "AFTERNOON", eligibleActivities: ["MOVE_TO_RESOURCE", "FOLLOW_GROUP"], preferredResourceTypes: ["corridor"], socialAffinity: 0.1, restBias: 0, movementBias: 0.3 },
    { dayPhase: "DUSK", eligibleActivities: ["REST"], preferredResourceTypes: ["rest"], socialAffinity: 0, restBias: 0.35, movementBias: 0 },
  ],
}

export const VRINDAVAN_DAILY_RHYTHMS_BY_ARCHETYPE_ID: ReadonlyMap<string, DailyRhythmDefinition> = new Map([
  [COW_ARCHETYPE_ID, COW_DAILY_RHYTHM],
  [BIRD_FLOCK_ARCHETYPE_ID, BIRD_FLOCK_DAILY_RHYTHM],
])
