import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveWorldEmbodiment } from "./worldEmbodimentResolver.ts"
import { diffWorldEmbodiment } from "./embodimentDelta.ts"
import { computeSpatialLayout } from "./spatialLayout.ts"
import type { EntityArchetype, WorldSnapshot } from "@avatark/living-systems-contracts"
import type { LocationExperience } from "@avatark/renderer-contracts"
import type { WorldLocation } from "@avatark/living-world-runtime"

const LOCATIONS: WorldLocation[] = [{ id: "yamuna", name: "Yamuna", order: 0 }]
const SPATIAL_LAYOUT = computeSpatialLayout(LOCATIONS)
const YAMUNA_EXPERIENCE: LocationExperience = {
  id: "yamuna",
  environment: { biome: "riverbank" },
  atmosphere: { quality: "contemplative" },
  time: { preferredState: "unspecified" },
  soundscape: { motifs: [] },
  interaction: { reflectionAvailable: true },
  presentation: { intensity: "restrained", pacing: "slow" },
}
const VEGETATION_ARCHETYPE: EntityArchetype = { id: "riverbank-vegetation", name: "Riverbank Vegetation", locationId: "yamuna", lifecyclePhases: ["dormant", "budding", "flowering"], initialLifecyclePhase: "dormant" }

function snapshot(overrides: Partial<WorldSnapshot>): WorldSnapshot {
  return {
    worldId: "living-vrindavan",
    worldVersion: 1,
    simulationTick: 0,
    locationId: "yamuna",
    season: { id: "vasanta", name: "Vasanta" },
    weather: { temperatureBand: "moderate", precipitationBand: "moderate", humidityBand: "moderate" },
    hydrology: { hydrologyBand: "moderate", soilMoistureBand: "moderate" },
    ecology: { vegetationActivityBand: "high", animalActivityBand: "moderate" },
    presentEntities: [{ id: "e1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "dormant", attributes: {}, lastUpdatedTick: 0 }],
    availableEncounters: [{ ruleId: "yamuna-flowering-reflection", locationId: "yamuna", category: "environmental" }],
    visitorContext: { userId: "u1", lastLocationId: "yamuna", meaningfulEncounterCount: 0, reflectionCount: 0 },
    protectedNarrative: { worldId: "living-vrindavan", episodeRef: null, sceneRef: null, resolved: false },
    generatedAt: "2026-08-08T00:00:00.000Z",
    provenance: { worldArtifactSpecId: "STK-SPEC-002", systemsArtifactSpecId: "STK-SPEC-006", canonDocIds: ["STK-CAN-001"] },
    ...overrides,
  }
}

function embody(s: WorldSnapshot) {
  return resolveWorldEmbodiment({
    currentSnapshot: s,
    reachableSnapshots: [],
    locationNames: { yamuna: "Yamuna" },
    spatialLayout: SPATIAL_LAYOUT,
    experienceByLocation: { yamuna: YAMUNA_EXPERIENCE },
    archetypesById: { "riverbank-vegetation": VEGETATION_ARCHETYPE },
    transitions: [],
    soundEnabled: false,
    provenance: { worldArtifactSpecId: "STK-SPEC-002", experienceArtifactSpecId: "STK-SPEC-004", systemsArtifactSpecId: "STK-SPEC-006", canonDocIds: ["STK-CAN-001"] },
  })
}

test("diffing a snapshot against itself yields only UNCHANGED entries", () => {
  const a = embody(snapshot({}))
  const delta = diffWorldEmbodiment(a, a)
  assert.ok(delta.entries.length > 0)
  assert.ok(delta.entries.every((e) => e.op === "UNCHANGED"))
})

test("Vasanta -> Grishma delta: environment UPDATEs, entity UPDATEs by stable id, encounter REMOVEs", () => {
  const vasanta = embody(snapshot({}))
  const grishma = embody(
    snapshot({
      season: { id: "grishma", name: "Grīṣma" },
      simulationTick: 4,
      weather: { temperatureBand: "high", precipitationBand: "low", humidityBand: "low" },
      hydrology: { hydrologyBand: "low", soilMoistureBand: "low" },
      ecology: { vegetationActivityBand: "moderate", animalActivityBand: "low" },
      presentEntities: [{ id: "e1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "budding", attributes: {}, lastUpdatedTick: 4 }],
      availableEncounters: [],
    }),
  )

  const delta = diffWorldEmbodiment(vasanta, grishma)

  const envEntry = delta.entries.find((e) => e.path === "region:yamuna.environment")
  assert.equal(envEntry?.op, "UPDATE")

  const entityEntry = delta.entries.find((e) => e.path === "entity:e1")
  assert.equal(entityEntry?.op, "UPDATE", "same stable id -- UPDATE, never REMOVE+ADD")

  const encounterEntry = delta.entries.find((e) => e.path.startsWith("encounter:"))
  assert.equal(encounterEntry?.op, "REMOVE")

  assert.equal(delta.fromTick, 0)
  assert.equal(delta.toTick, 4)
})

test("a genuinely new entity produces ADD, a vanished one produces REMOVE, keyed by stable id", () => {
  const before = embody(snapshot({ presentEntities: [{ id: "e1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "dormant", attributes: {}, lastUpdatedTick: 0 }] }))
  const after = embody(snapshot({ presentEntities: [{ id: "e2", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "dormant", attributes: {}, lastUpdatedTick: 0 }] }))

  const delta = diffWorldEmbodiment(before, after)
  assert.equal(delta.entries.find((e) => e.path === "entity:e1")?.op, "REMOVE")
  assert.equal(delta.entries.find((e) => e.path === "entity:e2")?.op, "ADD")
})
