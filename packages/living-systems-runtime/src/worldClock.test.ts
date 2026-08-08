import { test } from "node:test"
import assert from "node:assert/strict"
import { advanceClock, pauseClock, resumeClock } from "./worldClock.ts"
import type { WorldClock } from "@avatark/living-systems-contracts"

function clock(overrides: Partial<WorldClock> = {}): WorldClock {
  return { worldId: "living-vrindavan", tick: 0, paused: false, ...overrides }
}

test("advanceClock advances tick deterministically", () => {
  assert.equal(advanceClock(clock(), 5).tick, 5)
  assert.equal(advanceClock(advanceClock(clock(), 5), 3).tick, 8)
})

test("advanceClock never moves a paused clock", () => {
  const paused = pauseClock(clock({ tick: 10 }))
  assert.equal(advanceClock(paused, 5).tick, 10)
})

test("resumeClock allows advancement again", () => {
  const resumed = resumeClock(pauseClock(clock({ tick: 10 })))
  assert.equal(advanceClock(resumed, 5).tick, 15)
})

test("advanceClock rejects a negative tick count", () => {
  assert.throws(() => advanceClock(clock(), -1))
})

test("advanceClock with 0 ticks is a no-op value-wise", () => {
  assert.equal(advanceClock(clock({ tick: 7 }), 0).tick, 7)
})
