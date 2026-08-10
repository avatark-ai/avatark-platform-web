// Build 04, mission §B: a renderer-neutral Experience Graph describing
// POSSIBLE visitor-experience transitions -- never a scripted
// theme-park sequence, and never a gate on the autonomous living-world
// simulation. This graph is consulted (by a future presentation layer,
// or by tests asserting a proposed transition is a legitimate one), it
// never enforces anything against the simulation itself: the world
// keeps advancing on its own regardless of which stage any visitor's
// own experience happens to be in, exactly as Build 01-03 already
// established for leave/return.
export type ExperienceStage =
  | "WORLD_ENTRY"
  | "ARRIVAL"
  | "ORIENTATION"
  | "LOCAL_MOVEMENT"
  | "DISCOVERY"
  | "ENCOUNTER"
  | "OBSERVATION_OR_PARTICIPATION"
  | "CONSEQUENCE"
  | "CONTINUED_EXPLORATION"
  | "DEPARTURE"
  | "ABSENCE"
  | "RETURN"
  | "RECOGNITION_OF_CHANGE"

export interface ExperienceTransition {
  from: ExperienceStage
  to: ExperienceStage
}

// Deliberately branching, not linear: ORIENTATION/LOCAL_MOVEMENT/
// CONTINUED_EXPLORATION each have more than one legitimate next stage,
// and several stages can lead directly to DEPARTURE -- a visitor may
// leave from anywhere, not only after a scripted "ending."
export const EXPERIENCE_GRAPH: readonly ExperienceTransition[] = [
  { from: "WORLD_ENTRY", to: "ARRIVAL" },
  { from: "ARRIVAL", to: "ORIENTATION" },
  { from: "ORIENTATION", to: "LOCAL_MOVEMENT" },
  { from: "ORIENTATION", to: "DISCOVERY" },
  { from: "ORIENTATION", to: "ENCOUNTER" },
  { from: "ORIENTATION", to: "DEPARTURE" },
  { from: "LOCAL_MOVEMENT", to: "DISCOVERY" },
  { from: "LOCAL_MOVEMENT", to: "ENCOUNTER" },
  { from: "LOCAL_MOVEMENT", to: "ORIENTATION" },
  { from: "LOCAL_MOVEMENT", to: "DEPARTURE" },
  { from: "DISCOVERY", to: "ENCOUNTER" },
  { from: "DISCOVERY", to: "CONTINUED_EXPLORATION" },
  { from: "DISCOVERY", to: "DEPARTURE" },
  { from: "ENCOUNTER", to: "OBSERVATION_OR_PARTICIPATION" },
  { from: "OBSERVATION_OR_PARTICIPATION", to: "CONSEQUENCE" },
  { from: "CONSEQUENCE", to: "CONTINUED_EXPLORATION" },
  { from: "CONSEQUENCE", to: "DEPARTURE" },
  { from: "CONTINUED_EXPLORATION", to: "LOCAL_MOVEMENT" },
  { from: "CONTINUED_EXPLORATION", to: "DISCOVERY" },
  { from: "CONTINUED_EXPLORATION", to: "ENCOUNTER" },
  { from: "CONTINUED_EXPLORATION", to: "DEPARTURE" },
  { from: "DEPARTURE", to: "ABSENCE" },
  { from: "ABSENCE", to: "RETURN" },
  { from: "RETURN", to: "RECOGNITION_OF_CHANGE" },
  { from: "RECOGNITION_OF_CHANGE", to: "ORIENTATION" },
]

export function isValidExperienceTransition(from: ExperienceStage, to: ExperienceStage): boolean {
  return EXPERIENCE_GRAPH.some((transition) => transition.from === from && transition.to === to)
}

export function reachableStagesFrom(stage: ExperienceStage): ExperienceStage[] {
  return EXPERIENCE_GRAPH.filter((transition) => transition.from === stage).map((transition) => transition.to)
}
