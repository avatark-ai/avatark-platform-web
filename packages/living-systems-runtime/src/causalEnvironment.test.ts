import { test } from "node:test"
import assert from "node:assert/strict"
import { deriveEcology, deriveHydrology, deriveWeather } from "./causalEnvironment.ts"
import type { HydrologyState, SeasonEnvironmentalEnvelope } from "@avatark/living-systems-contracts"

const VASANTA: SeasonEnvironmentalEnvelope = {
  temperatureBand: "moderate",
  precipitationBand: "moderate",
  humidityBand: "moderate",
  hydrologyBaselineBand: "moderate",
  vegetationActivityBand: "high",
  animalActivityBand: "moderate",
}

const GRISHMA: SeasonEnvironmentalEnvelope = {
  temperatureBand: "high",
  precipitationBand: "low",
  humidityBand: "low",
  hydrologyBaselineBand: "low",
  vegetationActivityBand: "moderate",
  animalActivityBand: "low",
}

test("deriveWeather is the direct expression of the season's own envelope", () => {
  const weather = deriveWeather(VASANTA)
  assert.deepEqual(weather, { temperatureBand: "moderate", precipitationBand: "moderate", humidityBand: "moderate" })
})

test("deriveHydrology trends toward the season baseline by one step per call, reflecting history not an instant snapshot", () => {
  const lowHistory: HydrologyState = { hydrologyBand: "low", soilMoistureBand: "low" }
  const weather = deriveWeather(VASANTA) // precipitationBand moderate -> no extra nudge
  const first = deriveHydrology(weather, lowHistory, VASANTA)
  assert.equal(first.hydrologyBand, "moderate", "one step from low toward the moderate baseline")

  const second = deriveHydrology(weather, first, VASANTA)
  assert.equal(second.hydrologyBand, "moderate", "already at baseline, holds")
})

test("deriveHydrology: weather's own precipitation nudges hydrology beyond the season baseline trend", () => {
  const atBaseline: HydrologyState = { hydrologyBand: "moderate", soilMoistureBand: "moderate" }
  const highRain = deriveHydrology({ temperatureBand: "moderate", precipitationBand: "high", humidityBand: "moderate" }, atBaseline, VASANTA)
  assert.equal(highRain.hydrologyBand, "high")

  const drought = deriveHydrology({ temperatureBand: "high", precipitationBand: "low", humidityBand: "low" }, atBaseline, VASANTA)
  assert.equal(drought.hydrologyBand, "low")
})

test("deriveHydrology clamps at the band floor and ceiling, never overflowing the enum", () => {
  const alreadyLow: HydrologyState = { hydrologyBand: "low", soilMoistureBand: "low" }
  const stillDry = deriveHydrology({ temperatureBand: "high", precipitationBand: "low", humidityBand: "low" }, alreadyLow, GRISHMA)
  assert.equal(stillDry.hydrologyBand, "low")
})

test("soilMoistureBand tracks hydrologyBand in this reference model", () => {
  const result = deriveHydrology(deriveWeather(VASANTA), { hydrologyBand: "moderate", soilMoistureBand: "moderate" }, VASANTA)
  assert.equal(result.soilMoistureBand, result.hydrologyBand)
})

test("deriveEcology: vegetation activity is capped by hydrology, even in a flowering-forward season", () => {
  const dryHydrology: HydrologyState = { hydrologyBand: "low", soilMoistureBand: "low" }
  const ecology = deriveEcology(dryHydrology, VASANTA, deriveWeather(VASANTA))
  assert.equal(ecology.vegetationActivityBand, "moderate", "capped below the season's own 'high' target by low hydrology")
})

test("deriveEcology: vegetation activity reaches the season's full target when hydrology doesn't cap it", () => {
  const healthyHydrology: HydrologyState = { hydrologyBand: "high", soilMoistureBand: "high" }
  const ecology = deriveEcology(healthyHydrology, VASANTA, deriveWeather(VASANTA))
  assert.equal(ecology.vegetationActivityBand, "high")
})

test("deriveEcology: animal activity drops one band when temperature is high, otherwise matches the season target", () => {
  const hotWeather = deriveWeather(GRISHMA)
  const ecologyHot = deriveEcology({ hydrologyBand: "moderate", soilMoistureBand: "moderate" }, GRISHMA, hotWeather)
  assert.equal(ecologyHot.animalActivityBand, "low", "already at the floor -- can't drop further")

  const mildWeather = deriveWeather(VASANTA)
  const ecologyMild = deriveEcology({ hydrologyBand: "moderate", soilMoistureBand: "moderate" }, VASANTA, mildWeather)
  assert.equal(ecologyMild.animalActivityBand, "moderate", "matches the season's own target when temperature isn't high")
})

test("Vasanta and Grishma produce genuinely distinct ecology outcomes at the same (moderate) hydrology, proving seasonal differentiation is causal, not cosmetic", () => {
  const hydrology: HydrologyState = { hydrologyBand: "moderate", soilMoistureBand: "moderate" }
  const vasantaEcology = deriveEcology(hydrology, VASANTA, deriveWeather(VASANTA))
  const grishmaEcology = deriveEcology(hydrology, GRISHMA, deriveWeather(GRISHMA))
  assert.notDeepEqual(vasantaEcology, grishmaEcology)
})
