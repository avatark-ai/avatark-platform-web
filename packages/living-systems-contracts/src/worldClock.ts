import type { WorldId } from "@avatark/runtime-contracts"

// Logical world time, deliberately decoupled from wall-clock time (Sprint
// 7, Phase 3). `tick` is the only authoritative time value -- a
// consumer world defines its own scale for what one tick means (a
// natural-cycle unit for Living Vrindavan, a slower symbolic unit for
// Living Stillness, a rhythm/cycle unit for Living Symphony, a
// process/stage unit for Living Forge). Nothing in this type assumes any
// particular mapping to wall-clock time.
export interface WorldClock {
  worldId: WorldId
  tick: number
  paused: boolean
}

// A bounded advance request -- never "advance forever." Keeps simulation
// windows explicit and testable rather than implicit in a loop.
export interface SimulationWindow {
  ticks: number
}
