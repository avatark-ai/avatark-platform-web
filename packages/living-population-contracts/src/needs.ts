// Sprint 10, Phase 3: a minimal, deterministic needs model -- four
// dimensions, not a biological simulation. `pressure` is a bounded
// [0, 1] scalar: 0 = fully satisfied, 1 = maximally urgent. No hidden
// derived fields (no "health," no "mood") -- pressure is the only
// currency, and it is legible enough that a test can assert on it
// directly.
export type NeedDimension = "hunger" | "thirst" | "rest" | "social"

export interface NeedState {
  dimension: NeedDimension
  pressure: number
}

// Per-entity need state is carried inside EntityBehaviorState
// (entityBehaviorState.ts), not stored separately -- all of an entity's
// Sprint 10 state (needs, rhythm phase, activity, movement, group) is
// written together, once per tick, by the same population-simulation
// step, exactly the way Sprint 9's DurableWorldState bundles
// SharedWorldState + entities for the same reason (they always change
// together; splitting the write would only reintroduce a
// consistency race).
export interface NeedThresholds {
  /** Above this pressure, the associated behavior becomes eligible even
   * outside its "natural" rhythm phase -- an urgent need can override
   * the daily schedule (Phase 4/6's own intended interaction). */
  urgentAbove: number
}

export interface NeedDefinition {
  dimension: NeedDimension
  /** Pressure gained per tick under baseline conditions -- modulated by
   * environment in the runtime, never a fixed constant applied blindly
   * (Phase 9's own "must not merely swap labels" requirement). */
  baselinePressurePerTick: number
  thresholds: NeedThresholds
}

// Fully-satisfied (pressure 0) starting state for every need dimension a
// profile tracks -- the deterministic seed a fresh entity starts from,
// mirroring @avatark/living-systems-contracts's own
// emptyVisitorWorldMemory/emptyProtectedNarrativeProjection convention.
export function freshNeedStates(definitions: NeedDefinition[]): NeedState[] {
  return definitions.map((definition) => ({ dimension: definition.dimension, pressure: 0 }))
}
