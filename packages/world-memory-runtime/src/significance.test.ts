import { test } from "node:test"
import assert from "node:assert/strict"
import { evaluateSignificance } from "./significance.ts"
import type { WorldEventCandidate } from "./significance.ts"

function candidate(overrides: Partial<WorldEventCandidate>): WorldEventCandidate {
  return { category: "SEASON_TRANSITION", tick: 4, locationId: null, participantEntityIds: [], causalReferences: [], detail: {}, ...overrides }
}

test("season transitions and group formation/dispersal are always LANDMARK", () => {
  assert.equal(evaluateSignificance(candidate({ category: "SEASON_TRANSITION" })), "LANDMARK")
  assert.equal(evaluateSignificance(candidate({ category: "GROUP_FORMED" })), "LANDMARK")
  assert.equal(evaluateSignificance(candidate({ category: "GROUP_DISPERSED" })), "LANDMARK")
})

test("an environmental band change is meaningful only when it crosses into or out of scarcity", () => {
  const slight = candidate({ category: "ENVIRONMENTAL_THRESHOLD", detail: { fromBand: "moderate", toBand: "high" } })
  assert.equal(evaluateSignificance(slight), "NOT_SIGNIFICANT", "moderate -> high is a real change but never touches scarcity")

  const intoScarcity = candidate({ category: "ENVIRONMENTAL_THRESHOLD", detail: { fromBand: "moderate", toBand: "low" } })
  assert.equal(evaluateSignificance(intoScarcity), "MEANINGFUL")

  const outOfScarcity = candidate({ category: "ENVIRONMENTAL_THRESHOLD", detail: { fromBand: "low", toBand: "moderate" } })
  assert.equal(evaluateSignificance(outOfScarcity), "MEANINGFUL")

  const noChange = candidate({ category: "ENVIRONMENTAL_THRESHOLD", detail: { fromBand: "moderate", toBand: "moderate" } })
  assert.equal(evaluateSignificance(noChange), "NOT_SIGNIFICANT")
})

test("scarcity bands are world-grammar configurable, not hardcoded", () => {
  const change = candidate({ category: "ENVIRONMENTAL_THRESHOLD", detail: { fromBand: "moderate", toBand: "critical" } })
  assert.equal(evaluateSignificance(change), "NOT_SIGNIFICANT", "with the default config, 'critical' isn't a recognized scarcity value")
  assert.equal(evaluateSignificance(change, { scarcityBands: ["critical"] }), "MEANINGFUL", "a different world's own config can recognize it")
})

test("a resource/location condition change is meaningful only on an actual availability flip", () => {
  const flipped = candidate({ category: "LOCATION_CONDITION_CHANGED", detail: { wasAvailable: true, isAvailable: false } })
  assert.equal(evaluateSignificance(flipped), "MEANINGFUL")
  const unchanged = candidate({ category: "RESOURCE_CONDITION_CHANGED", detail: { wasAvailable: true, isAvailable: true } })
  assert.equal(evaluateSignificance(unchanged), "NOT_SIGNIFICANT")
})

test("population movement is meaningful only for a group-level relocation, never routine individual movement", () => {
  const routine = candidate({ category: "POPULATION_MOVEMENT", detail: { isGroupRelocation: false } })
  assert.equal(evaluateSignificance(routine), "NOT_SIGNIFICANT", "one cow performing routine grazing is not history")

  const relocation = candidate({ category: "POPULATION_MOVEMENT", detail: { isGroupRelocation: true } })
  assert.equal(evaluateSignificance(relocation), "MEANINGFUL", "a herd relocating because its resource became unavailable is potentially meaningful")
})

test("a bare entity activity transition is never significant on its own", () => {
  assert.equal(evaluateSignificance(candidate({ category: "ENTITY_ACTIVITY_TRANSITION" })), "NOT_SIGNIFICANT")
})

test("encounter availability/resolution changes are always meaningful", () => {
  assert.equal(evaluateSignificance(candidate({ category: "ENCOUNTER_BECAME_AVAILABLE" })), "MEANINGFUL")
  assert.equal(evaluateSignificance(candidate({ category: "ENCOUNTER_RESOLVED" })), "MEANINGFUL")
})
