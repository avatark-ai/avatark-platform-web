import assert from "node:assert/strict"
import { test } from "node:test"
import type { EnvironmentalBand, EnvironmentalState } from "@avatark/living-systems-contracts"
import type { LocationResourceAffordance } from "@avatark/living-population-contracts"
import { resolveResourceOpportunities } from "./resourceOpportunityResolution.ts"

function envelope(overrides: Partial<{ hydrologyBand: EnvironmentalBand; vegetationActivityBand: EnvironmentalBand; temperatureBand: EnvironmentalBand; precipitationBand: EnvironmentalBand }>): EnvironmentalState {
  return {
    weather: { temperatureBand: overrides.temperatureBand ?? "moderate", precipitationBand: overrides.precipitationBand ?? "moderate", humidityBand: "moderate" },
    hydrology: { hydrologyBand: overrides.hydrologyBand ?? "high", soilMoistureBand: "moderate" },
    ecology: { vegetationActivityBand: overrides.vegetationActivityBand ?? "high", animalActivityBand: "moderate" },
  }
}

const AFFORDANCES: LocationResourceAffordance[] = [
  { locationId: "river", resourceTags: ["water"] },
  { locationId: "grove", resourceTags: ["vegetation", "shelter", "rest"] },
  { locationId: "path", resourceTags: ["gathering", "corridor"] },
]

test("water is available when hydrology is not low, unavailable when it is -- a causal consequence of environment, not an entity preference", () => {
  const available = resolveResourceOpportunities(AFFORDANCES, envelope({ hydrologyBand: "high" }), 1)
  assert.equal(available.find((o) => o.locationId === "river" && o.category === "water")?.available, true)

  const unavailable = resolveResourceOpportunities(AFFORDANCES, envelope({ hydrologyBand: "low" }), 1)
  assert.equal(unavailable.find((o) => o.locationId === "river" && o.category === "water")?.available, false)
})

test("vegetation and shelter both gate on the same ecology band -- a grove's shelter is canopy-dependent", () => {
  const degraded = resolveResourceOpportunities(AFFORDANCES, envelope({ vegetationActivityBand: "low" }), 1)
  assert.equal(degraded.find((o) => o.locationId === "grove" && o.category === "vegetation")?.available, false)
  assert.equal(degraded.find((o) => o.locationId === "grove" && o.category === "shelter")?.available, false)
})

test("gathering space has no environmental gate -- always available", () => {
  const harsh = resolveResourceOpportunities(AFFORDANCES, envelope({ hydrologyBand: "low", vegetationActivityBand: "low", temperatureBand: "high", precipitationBand: "high" }), 1)
  assert.equal(harsh.find((o) => o.locationId === "path" && o.category === "gathering")?.available, true)
})

test("resting space is unavailable under high temperature, movement corridors are unavailable under high precipitation", () => {
  const heat = resolveResourceOpportunities(AFFORDANCES, envelope({ temperatureBand: "high" }), 1)
  assert.equal(heat.find((o) => o.locationId === "grove" && o.category === "rest")?.available, false)

  const rain = resolveResourceOpportunities(AFFORDANCES, envelope({ precipitationBand: "high" }), 1)
  assert.equal(rain.find((o) => o.locationId === "path" && o.category === "corridor")?.available, false)
})

test("every affordance's every tag produces exactly one ResourceOpportunity, tagged with the caller's own tick", () => {
  const opportunities = resolveResourceOpportunities(AFFORDANCES, envelope({}), 42)
  assert.equal(opportunities.length, 6)
  assert.ok(opportunities.every((o) => o.tick === 42))
})
