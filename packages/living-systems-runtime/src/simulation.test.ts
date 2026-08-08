import { test } from "node:test"
import assert from "node:assert/strict"
import { advanceWorldSimulation } from "./simulation.ts"
import type { EntityArchetype, LivingEntityState, SeasonDefinition, SharedWorldState } from "@avatark/living-systems-contracts"

const VASANTA_ENVELOPE = { temperatureBand: "moderate" as const, precipitationBand: "moderate" as const, humidityBand: "moderate" as const, hydrologyBaselineBand: "moderate" as const, vegetationActivityBand: "high" as const, animalActivityBand: "moderate" as const }
const GRISHMA_ENVELOPE = { temperatureBand: "high" as const, precipitationBand: "low" as const, humidityBand: "low" as const, hydrologyBaselineBand: "low" as const, vegetationActivityBand: "moderate" as const, animalActivityBand: "low" as const }

const VASANTA: SeasonDefinition = { id: "vasanta", name: "Vasanta", order: 1, canonId: "STK-CAN-006", environmentalEnvelope: VASANTA_ENVELOPE, minDurationTicks: 4, allowedNextSeasonIds: ["grishma"] }
const GRISHMA: SeasonDefinition = { id: "grishma", name: "Grīṣma", order: 2, canonId: "STK-CAN-006", environmentalEnvelope: GRISHMA_ENVELOPE, minDurationTicks: 4, allowedNextSeasonIds: [] }
const SEASONS = [VASANTA, GRISHMA]

const VEGETATION: EntityArchetype = { id: "riverbank-vegetation", name: "Riverbank Vegetation", locationId: "yamuna", lifecyclePhases: ["dormant", "budding", "flowering", "seeding"], initialLifecyclePhase: "dormant" }

function freshSharedState(): SharedWorldState {
  return {
    worldId: "living-vrindavan",
    worldVersion: 1,
    clock: { worldId: "living-vrindavan", tick: 0, paused: false },
    season: { currentSeasonId: "vasanta", enteredAtTick: 0 },
    environment: {
      weather: { temperatureBand: "moderate", precipitationBand: "moderate", humidityBand: "moderate" },
      hydrology: { hydrologyBand: "moderate", soilMoistureBand: "moderate" },
      ecology: { vegetationActivityBand: "high", animalActivityBand: "moderate" },
    },
  }
}

function freshEntity(): LivingEntityState {
  return { id: "e1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "dormant", attributes: {}, lastUpdatedTick: 0 }
}

function freshRunParams(ticks: number) {
  return { sharedState: freshSharedState(), seasonDefinitions: SEASONS, entityArchetypes: [VEGETATION], entities: [freshEntity()], ticks, seed: "test-seed", now: () => "2026-08-08T00:00:00.000Z" }
}

test("advancing fewer ticks than minDurationTicks stays in Vasanta", () => {
  const result = advanceWorldSimulation(freshRunParams(3))
  assert.equal(result.sharedState.season.currentSeasonId, "vasanta")
  assert.equal(result.sharedState.clock.tick, 3)
})

test("advancing exactly minDurationTicks transitions to Grishma, and emits a season.transitioned system event", () => {
  const result = advanceWorldSimulation(freshRunParams(4))
  assert.equal(result.sharedState.season.currentSeasonId, "grishma")
  assert.ok(result.events.some((e) => e.type === "season.transitioned" && e.detail.from === "vasanta" && e.detail.to === "grishma"))
})

test("the environment genuinely differs before and after the season transition -- not a cosmetic label change", () => {
  const before = advanceWorldSimulation(freshRunParams(3)).sharedState.environment
  const after = advanceWorldSimulation(freshRunParams(4)).sharedState.environment
  assert.notDeepEqual(before.ecology, after.ecology)
});

test("determinism/replay: identical inputs always produce identical outputs, bit for bit", () => {
  const a = advanceWorldSimulation(freshRunParams(6))
  const b = advanceWorldSimulation(freshRunParams(6))
  assert.deepEqual(a.sharedState, b.sharedState)
  assert.deepEqual(a.entities, b.entities)
  assert.deepEqual(a.events, b.events)
})

test("a different seed can change entity-lifecycle pacing (deterministic variation), while the causal environment itself stays identical", () => {
  const seedA = advanceWorldSimulation({ ...freshRunParams(8), seed: "seed-a" })
  const seedB = advanceWorldSimulation({ ...freshRunParams(8), seed: "seed-b" })
  assert.deepEqual(seedA.sharedState.environment, seedB.sharedState.environment, "environment is seed-independent")
  // Entity pacing MAY differ by seed -- not asserted equal or unequal here,
  // only that both runs stay internally consistent (each is still
  // deterministic against itself, proven by the replay test above).
  assert.ok(VEGETATION.lifecyclePhases.includes(seedA.entities[0].lifecyclePhase))
  assert.ok(VEGETATION.lifecyclePhases.includes(seedB.entities[0].lifecyclePhase))
})

test("clock advances by exactly the requested number of ticks", () => {
  const result = advanceWorldSimulation(freshRunParams(10))
  assert.equal(result.sharedState.clock.tick, 10)
})

test("advancing 0 ticks is a true no-op: no events, unchanged state", () => {
  const result = advanceWorldSimulation(freshRunParams(0))
  assert.deepEqual(result.events, [])
  assert.deepEqual(result.sharedState, freshSharedState())
})

test("an unknown archetypeId on an entity is skipped gracefully, never throws the whole simulation", () => {
  const params = freshRunParams(4)
  params.entities = [{ ...freshEntity(), archetypeId: "nonexistent-archetype" }]
  assert.doesNotThrow(() => advanceWorldSimulation(params))
})
