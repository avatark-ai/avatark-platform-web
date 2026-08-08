import type { WorldId } from "@avatark/runtime-contracts"
import type { EnvironmentalState } from "./environmentalState.ts"
import type { SeasonState } from "./season.ts"
import type { WorldClock } from "./worldClock.ts"

// The objective, shared-across-visitors state of a Living World (Sprint
// 7 "SHARED WORLD STATE" domain) -- world clock, season, and resolved
// environmental state. Deliberately excludes anything visitor-specific
// (that's VisitorWorldMemory) and anything per-entity (that's
// LivingEntityState) -- this is the aggregate the whole world shares,
// nothing more.
export interface SharedWorldState {
  worldId: WorldId
  worldVersion: number
  clock: WorldClock
  season: SeasonState
  environment: EnvironmentalState
}
