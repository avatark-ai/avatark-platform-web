import assert from "node:assert/strict"
import { test } from "node:test"
import type { DayPhaseSchedule } from "@avatark/living-rhythms-contracts"
import { resolveDayPhase } from "./dayPhaseResolution.ts"

const SCHEDULE: DayPhaseSchedule = {
  id: "test-day-phase-schedule",
  ticksPerCycle: 7,
  entries: [
    { phase: "DAWN", startFractionOfDay: 0 },
    { phase: "MORNING", startFractionOfDay: 1 / 7 },
    { phase: "MIDDAY", startFractionOfDay: 2 / 7 },
    { phase: "AFTERNOON", startFractionOfDay: 3 / 7 },
    { phase: "DUSK", startFractionOfDay: 4 / 7 },
    { phase: "EVENING", startFractionOfDay: 5 / 7 },
    { phase: "NIGHT", startFractionOfDay: 6 / 7 },
  ],
}

test("resolveDayPhase maps each tick within one cycle to its own phase", () => {
  assert.equal(resolveDayPhase(SCHEDULE, 0), "DAWN")
  assert.equal(resolveDayPhase(SCHEDULE, 1), "MORNING")
  assert.equal(resolveDayPhase(SCHEDULE, 6), "NIGHT")
})

test("resolveDayPhase wraps around at the cycle boundary -- tick 7 is the same as tick 0", () => {
  assert.equal(resolveDayPhase(SCHEDULE, 7), "DAWN")
  assert.equal(resolveDayPhase(SCHEDULE, 8), "MORNING")
})

test("resolveDayPhase produces the identical phase for a large tick jump as for the equivalent small one -- pure function of tick alone", () => {
  assert.equal(resolveDayPhase(SCHEDULE, 3), resolveDayPhase(SCHEDULE, 3 + 7 * 1000))
})

test("resolveDayPhase handles negative ticks (never expected in practice, but must not throw or misbehave)", () => {
  assert.equal(resolveDayPhase(SCHEDULE, -1), "NIGHT")
})

test("resolveDayPhase throws a clear error for an empty schedule rather than returning a fabricated phase", () => {
  assert.throws(() => resolveDayPhase({ id: "empty", ticksPerCycle: 7, entries: [] }, 0), RangeError)
})

test("resolveDayPhase is unaffected by declaration order -- entries need not be pre-sorted", () => {
  const shuffled: DayPhaseSchedule = { ...SCHEDULE, entries: [...SCHEDULE.entries].reverse() }
  assert.equal(resolveDayPhase(shuffled, 2), "MIDDAY")
})
