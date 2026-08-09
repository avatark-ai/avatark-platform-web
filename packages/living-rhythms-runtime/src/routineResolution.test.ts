import assert from "node:assert/strict"
import { test } from "node:test"
import type { DailyRhythmDefinition, RoutineWindow } from "@avatark/living-rhythms-contracts"
import { resolveRoutineBonus, resolveRoutineWindow } from "./routineResolution.ts"

const MORNING_WINDOW: RoutineWindow = { dayPhase: "MORNING", eligibleActivities: ["GRAZE", "REST", "MOVE_TO_RESOURCE"], preferredResourceTypes: ["vegetation"], socialAffinity: 0.1, restBias: 0.4, movementBias: 0.25 }
const DEFINITION: DailyRhythmDefinition = { id: "test-routine", entries: [MORNING_WINDOW] }

test("resolveRoutineWindow finds the entry matching the current day phase", () => {
  assert.equal(resolveRoutineWindow(DEFINITION, "MORNING"), MORNING_WINDOW)
})

test("resolveRoutineWindow returns null for a day phase with no matching window -- an honest default, not an error", () => {
  assert.equal(resolveRoutineWindow(DEFINITION, "NIGHT"), null)
})

test("resolveRoutineBonus is zero when there is no routine window at all", () => {
  assert.equal(resolveRoutineBonus("REST", null), 0)
})

test("resolveRoutineBonus is zero for a candidate not named in eligibleActivities -- tendency, never override", () => {
  assert.equal(resolveRoutineBonus("SOCIALIZE", MORNING_WINDOW), 0)
})

test("resolveRoutineBonus returns restBias for an eligible REST candidate", () => {
  assert.equal(resolveRoutineBonus("REST", MORNING_WINDOW), 0.4)
})

test("resolveRoutineBonus returns movementBias for an eligible movement-shaped candidate", () => {
  assert.equal(resolveRoutineBonus("MOVE_TO_RESOURCE", MORNING_WINDOW), 0.25)
})

test("resolveRoutineBonus returns a small flat nudge for an eligible candidate with no dedicated bias field", () => {
  assert.equal(resolveRoutineBonus("GRAZE", MORNING_WINDOW), 0.1)
})
