import type { BehaviorType } from "@avatark/living-population-contracts"
import type { DailyRhythmDefinition, DayPhase, RoutineWindow } from "@avatark/living-rhythms-contracts"

// Sprint 13, Phase 6: a plain lookup -- a day phase with no matching
// window is simply "no routine tendency right now," never an error
// (mirrors `HomeRange`'s own "no record = always within range" honest
// default).
export function resolveRoutineWindow(definition: DailyRhythmDefinition, dayPhase: DayPhase): RoutineWindow | null {
  return definition.entries.find((entry) => entry.dayPhase === dayPhase) ?? null
}

const MOVEMENT_TYPES = new Set<BehaviorType>(["MOVE_TO_RESOURCE", "FOLLOW_GROUP", "RETURN_TO_GROUP", "APPROACH_RELATED_ENTITY", "RETURN_TO_HOME_RANGE"])

// Sprint 13, Phase 5/6: a small, deterministic utility nudge -- the SAME
// discipline `behaviorSelection.ts`'s own `rhythmBonus`/`socialBaseline`
// already use. A candidate not named in `eligibleActivities` gets ZERO
// bonus (tendency, not override); a movement-shaped candidate gets
// `movementBias`, `SOCIALIZE` gets `socialAffinity`, `REST` gets
// `restBias`, anything else eligible gets a small flat nudge. Never
// negative, never large enough alone to beat a genuinely urgent need
// (bounded by the same caller-side arithmetic every prior sprint's own
// bonus terms already are).
export function resolveRoutineBonus(candidateType: BehaviorType, routineWindow: RoutineWindow | null): number {
  if (!routineWindow || !routineWindow.eligibleActivities.includes(candidateType)) return 0
  if (candidateType === "REST") return routineWindow.restBias
  if (candidateType === "SOCIALIZE") return routineWindow.socialAffinity
  if (MOVEMENT_TYPES.has(candidateType)) return routineWindow.movementBias
  return 0.1
}
