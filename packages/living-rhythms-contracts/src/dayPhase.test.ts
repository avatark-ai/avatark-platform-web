import assert from "node:assert/strict"
import { test } from "node:test"
import { orderedDayPhases } from "./dayPhase.ts"
import type { DayPhaseSchedule } from "./dayPhase.ts"

const SCHEDULE: DayPhaseSchedule = {
  id: "test-schedule",
  ticksPerCycle: 7,
  entries: [
    { phase: "NIGHT", startFractionOfDay: 6 / 7 },
    { phase: "DAWN", startFractionOfDay: 0 },
    { phase: "MIDDAY", startFractionOfDay: 2 / 7 },
    { phase: "MORNING", startFractionOfDay: 1 / 7 },
  ],
}

test("orderedDayPhases sorts entries by startFractionOfDay regardless of declaration order", () => {
  assert.deepEqual(orderedDayPhases(SCHEDULE), ["DAWN", "MORNING", "MIDDAY", "NIGHT"])
})

test("orderedDayPhases does not mutate the schedule's own entries array", () => {
  const before = [...SCHEDULE.entries]
  orderedDayPhases(SCHEDULE)
  assert.deepEqual(SCHEDULE.entries, before)
})
