import { test } from "node:test"
import assert from "node:assert/strict"
import { evolveNeeds, isUrgent } from "./needsEvolution.ts"
import type { EnvironmentalState } from "@avatark/living-systems-contracts"
import type { NeedDefinition, NeedState } from "@avatark/living-population-contracts"

const DEFINITIONS: NeedDefinition[] = [
  { dimension: "hunger", baselinePressurePerTick: 0.1, thresholds: { urgentAbove: 0.8 } },
  { dimension: "thirst", baselinePressurePerTick: 0.1, thresholds: { urgentAbove: 0.8 } },
  { dimension: "rest", baselinePressurePerTick: 0.1, thresholds: { urgentAbove: 0.8 } },
  { dimension: "social", baselinePressurePerTick: 0.05, thresholds: { urgentAbove: 0.8 } },
]

function environment(overrides: Partial<EnvironmentalState> = {}): EnvironmentalState {
  return {
    weather: { temperatureBand: "moderate", precipitationBand: "moderate", humidityBand: "moderate" },
    hydrology: { hydrologyBand: "moderate", soilMoistureBand: "moderate" },
    ecology: { vegetationActivityBand: "high", animalActivityBand: "moderate" },
    ...overrides,
  }
}

test("an unsatisfied need rises by its baseline rate each tick", () => {
  const start = [{ dimension: "rest" as const, pressure: 0 }]
  const after = evolveNeeds({ needs: start, definitions: DEFINITIONS, environment: environment(), satisfiedDimensions: [] })
  assert.ok(after[0].pressure > 0)
  assert.ok(after[0].pressure < 0.2)
})

test("a satisfied need falls instead of rising, clamped at zero", () => {
  const start = [{ dimension: "rest" as const, pressure: 0.2 }]
  const after = evolveNeeds({ needs: start, definitions: DEFINITIONS, environment: environment(), satisfiedDimensions: ["rest"] })
  assert.equal(after[0].pressure, 0)
})

test("pressure never exceeds 1 no matter how long it accumulates", () => {
  let needs: NeedState[] = [{ dimension: "hunger", pressure: 0.95 }]
  for (let i = 0; i < 20; i++) {
    needs = evolveNeeds({ needs, definitions: DEFINITIONS, environment: environment(), satisfiedDimensions: [] })
  }
  assert.equal(needs[0].pressure, 1)
})

// Phase 9's own named causal example: temperature up -> thirst pressure
// rises FASTER, a genuine environmental effect, not a label swap.
test("higher temperature accelerates thirst pressure accumulation", () => {
  const cool = evolveNeeds({ needs: [{ dimension: "thirst", pressure: 0 }], definitions: DEFINITIONS, environment: environment({ weather: { temperatureBand: "low", precipitationBand: "moderate", humidityBand: "moderate" } }), satisfiedDimensions: [] })
  const hot = evolveNeeds({ needs: [{ dimension: "thirst", pressure: 0 }], definitions: DEFINITIONS, environment: environment({ weather: { temperatureBand: "high", precipitationBand: "moderate", humidityBand: "moderate" } }), satisfiedDimensions: [] })
  assert.ok(hot[0].pressure > cool[0].pressure, "hot weather must raise thirst pressure faster than cool weather, for the identical starting state")
})

// Mission's other named example: available vegetation up -> grazing
// pressure accumulates more slowly (grazing is more efficient/available).
test("higher vegetation activity slows hunger pressure accumulation", () => {
  const lush = evolveNeeds({ needs: [{ dimension: "hunger", pressure: 0 }], definitions: DEFINITIONS, environment: environment({ ecology: { vegetationActivityBand: "high", animalActivityBand: "moderate" } }), satisfiedDimensions: [] })
  const sparse = evolveNeeds({ needs: [{ dimension: "hunger", pressure: 0 }], definitions: DEFINITIONS, environment: environment({ ecology: { vegetationActivityBand: "low", animalActivityBand: "moderate" } }), satisfiedDimensions: [] })
  assert.ok(sparse[0].pressure > lush[0].pressure, "sparse vegetation must raise hunger pressure faster than lush vegetation")
})

test("isUrgent compares a need's pressure against its own defined threshold", () => {
  assert.equal(isUrgent({ dimension: "rest", pressure: 0.9 }, DEFINITIONS), true)
  assert.equal(isUrgent({ dimension: "rest", pressure: 0.1 }, DEFINITIONS), false)
})
