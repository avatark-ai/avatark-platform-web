import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveEnvironmentPresentation } from "./environmentPresentationResolver.ts"
import type { EnvironmentalState } from "@avatark/living-systems-contracts"
import type { LocationExperience } from "@avatark/renderer-contracts"

const YAMUNA_EXPERIENCE: LocationExperience = {
  id: "yamuna",
  environment: { biome: "riverbank" },
  atmosphere: { quality: "contemplative" },
  time: { preferredState: "unspecified" },
  soundscape: { motifs: ["flowing-water"] },
  interaction: { reflectionAvailable: true },
  presentation: { intensity: "restrained", pacing: "slow" },
}

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

test("atmosphere.semantic comes from the location's authored intent, unchanged by season", () => {
  const vasanta = resolveEnvironmentPresentation(YAMUNA_EXPERIENCE, VASANTA_ENV, false)
  const grishma = resolveEnvironmentPresentation(YAMUNA_EXPERIENCE, GRISHMA_ENV, false)
  assert.equal(vasanta.atmosphere.semantic, "contemplative")
  assert.equal(grishma.atmosphere.semantic, "contemplative")
})

test("water/vegetation presentation genuinely differs between Vasanta and Grishma for the SAME location -- causal, not cosmetic", () => {
  const vasanta = resolveEnvironmentPresentation(YAMUNA_EXPERIENCE, VASANTA_ENV, false)
  const grishma = resolveEnvironmentPresentation(YAMUNA_EXPERIENCE, GRISHMA_ENV, false)
  assert.notEqual(vasanta.water.semantic, grishma.water.semantic)
  assert.notEqual(vasanta.vegetation.semantic, grishma.vegetation.semantic)
  assert.equal(vasanta.water.levelBand, "moderate")
  assert.equal(grishma.water.levelBand, "low")
})

test("sensory cues are empty when sound is disabled, populated (from the authored soundscape) when enabled", () => {
  const disabled = resolveEnvironmentPresentation(YAMUNA_EXPERIENCE, VASANTA_ENV, false)
  const enabled = resolveEnvironmentPresentation(YAMUNA_EXPERIENCE, VASANTA_ENV, true)
  assert.deepEqual(disabled.sensoryCues, [])
  assert.deepEqual(enabled.sensoryCues, [{ channel: "ambientAudio", semantic: "flowing-water" }])
})

test("a location with no authored soundscape motifs never fabricates a sensory cue, even with sound enabled", () => {
  const silentExperience: LocationExperience = { ...YAMUNA_EXPERIENCE, soundscape: { motifs: [] } }
  const result = resolveEnvironmentPresentation(silentExperience, VASANTA_ENV, true)
  assert.deepEqual(result.sensoryCues, [])
})

test("resolution is deterministic -- identical inputs produce identical output", () => {
  const a = resolveEnvironmentPresentation(YAMUNA_EXPERIENCE, VASANTA_ENV, true)
  const b = resolveEnvironmentPresentation(YAMUNA_EXPERIENCE, VASANTA_ENV, true)
  assert.deepEqual(a, b)
})
