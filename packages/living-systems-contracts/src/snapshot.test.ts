import { test } from "node:test"
import assert from "node:assert/strict"
import { freezeWorldSnapshot } from "./snapshot.ts"
import type { WorldSnapshot } from "./snapshot.ts"

function makeSnapshot(): WorldSnapshot {
  return {
    worldId: "living-vrindavan",
    worldVersion: 1,
    simulationTick: 3,
    locationId: "yamuna",
    season: { id: "vasanta", name: "Vasanta" },
    weather: { temperatureBand: "moderate", precipitationBand: "moderate", humidityBand: "moderate" },
    hydrology: { hydrologyBand: "moderate", soilMoistureBand: "moderate" },
    ecology: { vegetationActivityBand: "high", animalActivityBand: "moderate" },
    presentEntities: [{ id: "e1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "flowering", attributes: {}, lastUpdatedTick: 3 }],
    availableEncounters: [{ ruleId: "yamuna-flowering-reflection", locationId: "yamuna", category: "environmental" }],
    visitorContext: { userId: "u1", lastLocationId: "yamuna", meaningfulEncounterCount: 0, reflectionCount: 0 },
    protectedNarrative: { worldId: "living-vrindavan", episodeRef: null, sceneRef: null, resolved: false },
    generatedAt: "2026-08-08T00:00:00.000Z",
    provenance: { worldArtifactSpecId: "STK-SPEC-002", systemsArtifactSpecId: "STK-SPEC-006", canonDocIds: ["STK-CAN-006"] },
  }
}

test("freezeWorldSnapshot makes every nested object genuinely immutable at runtime, not only readonly at compile time", () => {
  const snapshot = freezeWorldSnapshot(makeSnapshot())

  assert.throws(() => {
    // @ts-expect-error -- deliberately violating readonly to prove the runtime freeze, not just the type
    snapshot.season.name = "Grishma"
  }, TypeError)
  assert.throws(() => {
    // @ts-expect-error
    snapshot.weather.temperatureBand = "high"
  }, TypeError)
  assert.throws(() => {
    // @ts-expect-error
    snapshot.presentEntities.push({} as never)
  }, TypeError)
  assert.throws(() => {
    // @ts-expect-error
    snapshot.presentEntities[0].lifecyclePhase = "dormant"
  }, TypeError)
  assert.throws(() => {
    // @ts-expect-error
    snapshot.visitorContext.lastLocationId = "kadamba-grove"
  }, TypeError)
  assert.throws(() => {
    // @ts-expect-error
    snapshot.provenance.canonDocIds.push("STK-CAN-999")
  }, TypeError)
})

test("freezeWorldSnapshot returns the same object it froze (identity-preserving), not a copy", () => {
  const original = makeSnapshot()
  const frozen = freezeWorldSnapshot(original)
  assert.equal(frozen, original)
})
