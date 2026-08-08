import type { WorldClock } from "@avatark/living-systems-contracts"

// Sprint 7, Phase 3: pure, deterministic clock advancement. No wall-clock
// coupling anywhere in this file -- a caller decides when/how often to
// call this; the clock itself only ever counts logical ticks.
export function advanceClock(clock: WorldClock, ticks: number): WorldClock {
  if (ticks < 0) throw new Error(`advanceClock: ticks must be >= 0, got ${ticks}`)
  if (clock.paused) return clock
  return { ...clock, tick: clock.tick + ticks }
}

export function pauseClock(clock: WorldClock): WorldClock {
  return { ...clock, paused: true }
}

export function resumeClock(clock: WorldClock): WorldClock {
  return { ...clock, paused: false }
}
