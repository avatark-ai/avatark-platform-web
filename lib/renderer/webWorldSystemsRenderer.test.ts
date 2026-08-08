import { test } from "node:test"
import assert from "node:assert/strict"
import { labelizeLifecyclePhase, presentSeason, summarizeEnvironment } from "./webWorldSystemsRenderer.ts"

test("presentSeason gives Vasanta and Grishma genuinely distinct accent colors", () => {
  const vasanta = presentSeason("vasanta", "Vasanta")
  const grishma = presentSeason("grishma", "Grīṣma")
  assert.notEqual(vasanta.accentColor, grishma.accentColor)
  assert.equal(vasanta.seasonLabel, "Vasanta")
  assert.equal(grishma.seasonLabel, "Grīṣma")
})

test("presentSeason falls back to a neutral default for an unrecognized season id, never throws", () => {
  assert.doesNotThrow(() => presentSeason("some-future-season", "Some Future Season"))
})

test("summarizeEnvironment produces one line covering temperature/rainfall/river/vegetation/animal presence", () => {
  const line = summarizeEnvironment(
    { temperatureBand: "moderate", precipitationBand: "moderate", humidityBand: "moderate" },
    { hydrologyBand: "moderate", soilMoistureBand: "moderate" },
    { vegetationActivityBand: "high", animalActivityBand: "moderate" },
  )
  assert.match(line, /Temperature Moderate/)
  assert.match(line, /River Moderate/)
  assert.match(line, /Vegetation High/)
})

test("labelizeLifecyclePhase title-cases and replaces hyphens with spaces", () => {
  assert.equal(labelizeLifecyclePhase("dormant"), "Dormant")
  assert.equal(labelizeLifecyclePhase("ambient-bird-flock"), "Ambient Bird Flock")
})
