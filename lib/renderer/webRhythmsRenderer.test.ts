import { test } from "node:test"
import assert from "node:assert/strict"
import {
  labelizeDayPhase,
  labelizeGroupRoutineIntent,
  labelizeOccupancyLevel,
  labelizeSocialInteractionCategory,
  summarizeGroupRoutineIntents,
  summarizePlaceOccupancy,
} from "./webRhythmsRenderer.ts"

test("labelizeDayPhase maps every known DayPhase to a short, fixed phrase, never a sentence", () => {
  assert.equal(labelizeDayPhase("DAWN"), "Dawn")
  assert.equal(labelizeDayPhase("NIGHT"), "Night")
})

test("an unrecognized day phase falls back to itself, never a fabricated label", () => {
  assert.equal(labelizeDayPhase("SOMETHING_NEW"), "SOMETHING_NEW")
})

test("labelizeOccupancyLevel maps every OccupancyLevel to a fixed phrase", () => {
  assert.equal(labelizeOccupancyLevel("QUIET"), "Quiet")
  assert.equal(labelizeOccupancyLevel("GATHERING"), "Gathering")
})

test("labelizeGroupRoutineIntent maps every GroupRoutineIntentType to a fixed phrase", () => {
  assert.equal(labelizeGroupRoutineIntent("REST_TOGETHER"), "Resting together")
  assert.equal(labelizeGroupRoutineIntent("OCCUPY_PLACE"), "Occupying this place")
})

test("labelizeSocialInteractionCategory maps every SocialInteractionCategory to a fixed phrase", () => {
  assert.equal(labelizeSocialInteractionCategory("approach"), "Approaching")
  assert.equal(labelizeSocialInteractionCategory("rest_together"), "Resting together")
})

test("summarizePlaceOccupancy produces one line combining day phase and occupancy level, no prose assembly", () => {
  assert.equal(summarizePlaceOccupancy({ dayPhase: "DUSK", occupancyLevel: "RESTING" }), "Dusk -- Resting")
})

test("summarizeGroupRoutineIntents orders most-recently-resolved first, one line per group", () => {
  const lines = summarizeGroupRoutineIntents([
    { groupId: "herd-1", intent: "REST_TOGETHER", tick: 2 },
    { groupId: "flock-1", intent: "GATHER", tick: 9 },
  ])
  assert.deepEqual(lines, ["flock-1: Gathered", "herd-1: Resting together"])
})
