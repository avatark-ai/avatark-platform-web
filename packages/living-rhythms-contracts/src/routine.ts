import type { BehaviorType } from "@avatark/living-population-contracts"
import type { ResourceTag } from "@avatark/living-population-contracts"
import type { DayPhase } from "./dayPhase.ts"
import type { RoutineDefinitionId } from "./ids.ts"

// Sprint 13, Phase 6: a routine describes TENDENCY and ELIGIBILITY, not
// a guaranteed scripted action ("if time == 08:00 -> go to X" is
// explicitly out of scope, Phase 5's own instruction). `eligibleActivities`
// reuses Sprint 10's own closed `BehaviorType` vocabulary -- this is
// data that biases which of Sprint 10's already-existing candidates
// wins, never a new behavior mechanism. `preferredResourceTypes` reuses
// Sprint 10's own `ResourceTag` vocabulary for the same reason.
// `socialAffinity`/`restBias`/`movementBias` are small, deterministic
// utility nudges (see `living-rhythms-runtime`'s own
// `resolveRoutineBonus`), never a probability or an LLM weight.
export interface RoutineWindow {
  dayPhase: DayPhase
  eligibleActivities: BehaviorType[]
  preferredResourceTypes: ResourceTag[]
  socialAffinity: number
  restBias: number
  movementBias: number
}

// One per archetype (mirrors `EntityBehaviorProfile`/`RhythmSchedule`'s
// own per-archetype keying) -- a Host-layer, world-specific config, not
// a hardcoded engine rule.
export interface DailyRhythmDefinition {
  id: RoutineDefinitionId
  entries: RoutineWindow[]
}
