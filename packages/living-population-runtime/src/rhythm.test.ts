import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveRhythmPhase } from "./rhythm.ts"
import type { RhythmSchedule } from "@avatark/living-population-contracts"

const SCHEDULE: RhythmSchedule = {
  id: "test-schedule",
  ticksPerCycle: 8,
  entries: [
    { phase: "WAKE", startFractionOfDay: 0 },
    { phase: "FORAGE", startFractionOfDay: 0.125 },
    { phase: "DRINK", startFractionOfDay: 0.375 },
    { phase: "SOCIAL", startFractionOfDay: 0.5 },
    { phase: "REST", startFractionOfDay: 0.625 },
  ],
}

test("resolveRhythmPhase picks the entry whose fraction the tick falls into", () => {
  assert.equal(resolveRhythmPhase(SCHEDULE, 0), "WAKE")
  assert.equal(resolveRhythmPhase(SCHEDULE, 1), "FORAGE")
  assert.equal(resolveRhythmPhase(SCHEDULE, 3), "DRINK")
  assert.equal(resolveRhythmPhase(SCHEDULE, 4), "SOCIAL")
  assert.equal(resolveRhythmPhase(SCHEDULE, 5), "REST")
})

test("resolveRhythmPhase wraps around the cycle -- tick 8 is the same phase as tick 0", () => {
  assert.equal(resolveRhythmPhase(SCHEDULE, 8), resolveRhythmPhase(SCHEDULE, 0))
  assert.equal(resolveRhythmPhase(SCHEDULE, 100), resolveRhythmPhase(SCHEDULE, 100 % 8))
})

test("resolveRhythmPhase depends only on logical tick, never wall-clock time -- same tick always yields the same phase", () => {
  const a = resolveRhythmPhase(SCHEDULE, 42)
  const b = resolveRhythmPhase(SCHEDULE, 42)
  assert.equal(a, b)
})

test("an empty schedule throws rather than silently returning an arbitrary phase", () => {
  assert.throws(() => resolveRhythmPhase({ id: "empty", ticksPerCycle: 4, entries: [] }, 0), RangeError)
})
