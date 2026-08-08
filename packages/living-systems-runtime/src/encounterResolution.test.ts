import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveAvailableEncounters } from "./encounterResolution.ts"
import type { EncounterRule, EnvironmentalState } from "@avatark/living-systems-contracts"

const RULES: EncounterRule[] = [
  { id: "yamuna-flowering-reflection", locationId: "yamuna", category: "environmental", condition: { band: "vegetationActivityBand", atLeast: "high" } },
  { id: "kadamba-grove-ambient-presence", locationId: "kadamba-grove", category: "ambient", condition: { band: "animalActivityBand", atLeast: "moderate" } },
  { id: "govardhan-path-practice-linked", locationId: "govardhan-path", category: "practice-linked", condition: { band: "temperatureBand", atLeast: "low" } },
  { id: "yamuna-narrative-gate", locationId: "yamuna", category: "narrative-protected", condition: { band: "vegetationActivityBand", atLeast: "low" } },
]

const VASANTA_ENV: EnvironmentalState = {
  weather: { temperatureBand: "moderate", precipitationBand: "moderate", humidityBand: "moderate" },
  hydrology: { hydrologyBand: "moderate", soilMoistureBand: "moderate" },
  ecology: { vegetationActivityBand: "high", animalActivityBand: "moderate" },
}

const GRISHMA_ENV: EnvironmentalState = {
  weather: { temperatureBand: "high", precipitationBand: "low", humidityBand: "low" },
  hydrology: { hydrologyBand: "low", soilMoistureBand: "low" },
  ecology: { vegetationActivityBand: "moderate", animalActivityBand: "low" },
}

const UNRESOLVED_NARRATIVE = { worldId: "living-vrindavan", episodeRef: null, sceneRef: null, resolved: false }
const RESOLVED_NARRATIVE = { worldId: "living-vrindavan", episodeRef: "ep-1", sceneRef: "sc-1", resolved: true }

test("only rules for the requested location are ever returned", () => {
  const result = resolveAvailableEncounters(RULES, "yamuna", VASANTA_ENV, UNRESOLVED_NARRATIVE)
  assert.ok(result.every((e) => e.locationId === "yamuna"))
})

test("a narrative-protected rule never surfaces while the protected-narrative projection is unresolved, no matter how favorable the environmental condition is", () => {
  const result = resolveAvailableEncounters(RULES, "yamuna", VASANTA_ENV, UNRESOLVED_NARRATIVE)
  assert.equal(result.some((e) => e.ruleId === "yamuna-narrative-gate"), false)
})

test("the same narrative-protected rule DOES surface once a real narrative system explicitly resolves/grants it", () => {
  const result = resolveAvailableEncounters(RULES, "yamuna", VASANTA_ENV, RESOLVED_NARRATIVE)
  assert.equal(result.some((e) => e.ruleId === "yamuna-narrative-gate"), true)
})

test("Vasanta's high vegetation activity makes the environmental encounter at Yamuna available", () => {
  const result = resolveAvailableEncounters(RULES, "yamuna", VASANTA_ENV, UNRESOLVED_NARRATIVE)
  assert.equal(result.some((e) => e.ruleId === "yamuna-flowering-reflection"), true)
})

test("Grishma's moderate (not high) vegetation activity makes the same environmental encounter unavailable -- the encounter set genuinely changes across seasons", () => {
  const result = resolveAvailableEncounters(RULES, "yamuna", GRISHMA_ENV, UNRESOLVED_NARRATIVE)
  assert.equal(result.some((e) => e.ruleId === "yamuna-flowering-reflection"), false)
})

test("an always-available rule (threshold at the band floor) is available in both seasons", () => {
  const vasanta = resolveAvailableEncounters(RULES, "govardhan-path", VASANTA_ENV, UNRESOLVED_NARRATIVE)
  const grishma = resolveAvailableEncounters(RULES, "govardhan-path", GRISHMA_ENV, UNRESOLVED_NARRATIVE)
  assert.equal(vasanta.some((e) => e.ruleId === "govardhan-path-practice-linked"), true)
  assert.equal(grishma.some((e) => e.ruleId === "govardhan-path-practice-linked"), true)
})

test("Kadamba Grove's ambient presence rule tracks animal activity across the season transition", () => {
  const vasanta = resolveAvailableEncounters(RULES, "kadamba-grove", VASANTA_ENV, UNRESOLVED_NARRATIVE)
  const grishma = resolveAvailableEncounters(RULES, "kadamba-grove", GRISHMA_ENV, UNRESOLVED_NARRATIVE)
  assert.equal(vasanta.some((e) => e.ruleId === "kadamba-grove-ambient-presence"), true)
  assert.equal(grishma.some((e) => e.ruleId === "kadamba-grove-ambient-presence"), false)
})

test("a location with no matching rules returns an empty set, never throws", () => {
  const result = resolveAvailableEncounters(RULES, "vrindavan-entry", VASANTA_ENV, UNRESOLVED_NARRATIVE)
  assert.deepEqual(result, [])
})
