import { test } from "node:test"
import assert from "node:assert/strict"
import { advanceEntityLifecycle } from "./entityLifecycle.ts"
import type { EntityArchetype, LivingEntityState } from "@avatark/living-systems-contracts"

const VEGETATION: EntityArchetype = {
  id: "riverbank-vegetation",
  name: "Riverbank Vegetation",
  locationId: "yamuna",
  lifecyclePhases: ["dormant", "budding", "flowering", "seeding"],
  initialLifecyclePhase: "dormant",
}

function entity(overrides: Partial<LivingEntityState> = {}): LivingEntityState {
  return { id: "e1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "dormant", attributes: {}, lastUpdatedTick: 0, ...overrides }
}

test("high ecological favorability with a variation value above the pacing threshold advances one phase forward", () => {
  const advanced = advanceEntityLifecycle(entity(), VEGETATION, { vegetationActivityBand: "high", animalActivityBand: "moderate" }, 0.9, 5)
  assert.equal(advanced.lifecyclePhase, "budding")
  assert.equal(advanced.lastUpdatedTick, 5)
})

test("high favorability with a variation value below the pacing threshold holds -- not every tick advances", () => {
  const held = advanceEntityLifecycle(entity(), VEGETATION, { vegetationActivityBand: "high", animalActivityBand: "moderate" }, 0.1, 5)
  assert.equal(held.lifecyclePhase, "dormant")
})

test("an entity already at the final phase never advances past it", () => {
  const atEnd = entity({ lifecyclePhase: "seeding" })
  const advanced = advanceEntityLifecycle(atEnd, VEGETATION, { vegetationActivityBand: "high", animalActivityBand: "moderate" }, 0.9, 5)
  assert.equal(advanced.lifecyclePhase, "seeding")
})

test("low favorability regresses one phase, regardless of variation", () => {
  const budding = entity({ lifecyclePhase: "budding" })
  const regressed = advanceEntityLifecycle(budding, VEGETATION, { vegetationActivityBand: "low", animalActivityBand: "moderate" }, 0.9, 5)
  assert.equal(regressed.lifecyclePhase, "dormant")
})

test("an entity already at the first phase never regresses past it", () => {
  const regressed = advanceEntityLifecycle(entity(), VEGETATION, { vegetationActivityBand: "low", animalActivityBand: "moderate" }, 0.9, 5)
  assert.equal(regressed.lifecyclePhase, "dormant")
})

test("moderate favorability holds, and an unchanged phase returns the same object reference (no spurious mutation)", () => {
  const original = entity({ lifecyclePhase: "budding" })
  const held = advanceEntityLifecycle(original, VEGETATION, { vegetationActivityBand: "moderate", animalActivityBand: "moderate" }, 0.9, 5)
  assert.equal(held, original)
})

test("advancing an entity whose current lifecyclePhase isn't in its own archetype's vocabulary throws, rather than silently defaulting", () => {
  const corrupt = entity({ lifecyclePhase: "nonexistent-phase" })
  assert.throws(() => advanceEntityLifecycle(corrupt, VEGETATION, { vegetationActivityBand: "high", animalActivityBand: "moderate" }, 0.9, 5))
})
