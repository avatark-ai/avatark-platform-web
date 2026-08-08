import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveWorldSnapshot } from "./snapshotResolver.ts"
import { emptyProtectedNarrativeProjection, emptyVisitorWorldMemory } from "@avatark/living-systems-contracts"
import type { EncounterRule, LivingEntityState, SeasonDefinition, SharedWorldState } from "@avatark/living-systems-contracts"

const envelope = { temperatureBand: "moderate" as const, precipitationBand: "moderate" as const, humidityBand: "moderate" as const, hydrologyBaselineBand: "moderate" as const, vegetationActivityBand: "high" as const, animalActivityBand: "moderate" as const }
const VASANTA: SeasonDefinition = { id: "vasanta", name: "Vasanta", order: 1, canonId: "STK-CAN-006", environmentalEnvelope: envelope, minDurationTicks: 4, allowedNextSeasonIds: ["grishma"] }

function sharedState(): SharedWorldState {
  return {
    worldId: "living-vrindavan",
    worldVersion: 1,
    clock: { worldId: "living-vrindavan", tick: 2, paused: false },
    season: { currentSeasonId: "vasanta", enteredAtTick: 0 },
    environment: {
      weather: { temperatureBand: "moderate", precipitationBand: "moderate", humidityBand: "moderate" },
      hydrology: { hydrologyBand: "moderate", soilMoistureBand: "moderate" },
      ecology: { vegetationActivityBand: "high", animalActivityBand: "moderate" },
    },
  }
}

const ENTITIES: LivingEntityState[] = [
  { id: "e1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "flowering", attributes: {}, lastUpdatedTick: 2 },
  { id: "e2", archetypeId: "ambient-bird-flock", locationId: "kadamba-grove", lifecyclePhase: "present", attributes: {}, lastUpdatedTick: 2 },
]

const RULES: EncounterRule[] = [{ id: "yamuna-flowering-reflection", locationId: "yamuna", category: "environmental", condition: { band: "vegetationActivityBand", atLeast: "high" } }]

function baseParams() {
  return {
    sharedState: sharedState(),
    seasonDefinitions: [VASANTA],
    entities: ENTITIES,
    encounterRules: RULES,
    locationId: "yamuna",
    visitorMemory: emptyVisitorWorldMemory("u1", "living-vrindavan"),
    protectedNarrative: emptyProtectedNarrativeProjection("living-vrindavan"),
    provenance: { worldArtifactSpecId: "STK-SPEC-002", systemsArtifactSpecId: "STK-SPEC-006", canonDocIds: ["STK-CAN-006"] },
    now: () => "2026-08-08T00:00:00.000Z",
  }
}

test("resolveWorldSnapshot only includes entities present at the requested location", () => {
  const snapshot = resolveWorldSnapshot(baseParams())
  assert.equal(snapshot.presentEntities.length, 1)
  assert.equal(snapshot.presentEntities[0].id, "e1")
})

test("resolveWorldSnapshot resolves the season id to its human name from SeasonDefinition, never duplicating content", () => {
  const snapshot = resolveWorldSnapshot(baseParams())
  assert.deepEqual(snapshot.season, { id: "vasanta", name: "Vasanta" })
})

test("resolveWorldSnapshot carries a visitor-context PROJECTION, not the raw VisitorWorldMemory object", () => {
  const memory = emptyVisitorWorldMemory("u1", "living-vrindavan")
  memory.reflectionRefs.push({ kind: "reflection", id: "r1" })
  const snapshot = resolveWorldSnapshot({ ...baseParams(), visitorMemory: memory })
  assert.equal(snapshot.visitorContext.reflectionCount, 1)
  assert.ok(!("reflectionRefs" in snapshot.visitorContext), "raw ref array must not leak into the snapshot")
})

test("the returned snapshot is frozen -- immutable from a renderer's perspective", () => {
  const snapshot = resolveWorldSnapshot(baseParams())
  assert.throws(() => {
    // @ts-expect-error -- deliberately violating readonly
    snapshot.locationId = "kadamba-grove"
  }, TypeError)
})

test("an unresolved protected-narrative projection passes through unchanged, never fabricated or resolved by Living Systems itself", () => {
  const snapshot = resolveWorldSnapshot(baseParams())
  assert.equal(snapshot.protectedNarrative.resolved, false)
})
