import { test } from "node:test"
import assert from "node:assert/strict"
import { labelizeReturnRecognitionFact, labelizeWorldEventCategory, summarizeRecentWorldEvents, summarizeReturnRecognition } from "./webMemoryRenderer.ts"

test("labelizeReturnRecognitionFact maps every known fact type to a short, fixed phrase, never a sentence", () => {
  assert.equal(labelizeReturnRecognitionFact("season_changed"), "Season changed")
  assert.equal(labelizeReturnRecognitionFact("population_relocated"), "Population relocated")
})

test("an unrecognized fact type falls back to itself, never a fabricated label", () => {
  assert.equal(labelizeReturnRecognitionFact("something_new"), "something_new")
})

test("labelizeWorldEventCategory maps every WorldEventCategory to a fixed phrase", () => {
  assert.equal(labelizeWorldEventCategory("SEASON_TRANSITION"), "Season transitioned")
  assert.equal(labelizeWorldEventCategory("GROUP_FORMED"), "Group formed")
})

test("summarizeReturnRecognition produces one line per fact, no prose assembly", () => {
  const lines = summarizeReturnRecognition([{ type: "season_changed" }, { type: "encounter_changed" }])
  assert.deepEqual(lines, ["Season changed", "Encounter availability changed"])
})

test("summarizeRecentWorldEvents orders most-recent first and includes the tick", () => {
  const lines = summarizeRecentWorldEvents([{ category: "SEASON_TRANSITION", tick: 4 }, { category: "POPULATION_MOVEMENT", tick: 9 }])
  assert.deepEqual(lines, ["Population moved (tick 9)", "Season transitioned (tick 4)"])
})
