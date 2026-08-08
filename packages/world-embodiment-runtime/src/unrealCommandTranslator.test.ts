import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveWorldEmbodiment } from "./worldEmbodimentResolver.ts"
import { diffWorldEmbodiment } from "./embodimentDelta.ts"
import { translateEmbodimentDeltaToUnrealCommands, translateToUnrealCommands } from "./unrealCommandTranslator.ts"
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

test("translateToUnrealCommands produces a CreateRegion + UpdateEnvironment for the current region, a PlaceEntity per entity, an anchor per encounter", () => {
  const commands = translateToUnrealCommands(embody(snapshot({})))
  assert.ok(commands.some((c) => c.op === "CreateRegion" && c.regionId === "yamuna"))
  assert.ok(commands.some((c) => c.op === "UpdateEnvironment" && c.regionId === "yamuna"))
  assert.ok(commands.some((c) => c.op === "PlaceEntity" && c.entityId === "e1"))
  assert.ok(commands.some((c) => c.op === "CreateInteractionAnchor" && c.ruleId === "yamuna-flowering-reflection"))
})

test("no command in the core vocabulary contains an Unreal class/asset reference -- structurally checked", () => {
  const commands = translateToUnrealCommands(embody(snapshot({})))
  const serialized = JSON.stringify(commands)
  for (const forbidden of ["UObject", "AActor", "Blueprint", "Niagara", "Landscape", "/Game/", "Nanite", "Lumen", "PCG"]) {
    assert.ok(!serialized.includes(forbidden), `command payload unexpectedly contains "${forbidden}"`)
  }
})

test("Phase 17: Web adapter data and Unreal-compatible commands agree on world/season/entities/encounters for the SAME snapshot", () => {
  const embodiment = embody(snapshot({}))
  const commands = translateToUnrealCommands(embodiment)

  // "Web adapter view" -- the exact fields components/account/LivingSystemsSnapshotView.tsx renders.
  const webEntityIds = embodiment.current.entities.map((e) => e.entityId)
  const webEncounterRuleIds = embodiment.current.encounters.map((e) => e.ruleId)

  const unrealEntityIds = commands.filter((c) => c.op === "PlaceEntity").map((c) => c.entityId)
  const unrealEncounterRuleIds = commands.filter((c) => c.op === "CreateInteractionAnchor").map((c) => c.ruleId)

  assert.deepEqual(new Set(webEntityIds), new Set(unrealEntityIds))
  assert.deepEqual(new Set(webEncounterRuleIds), new Set(unrealEncounterRuleIds))

  const unrealEnvironment = commands.find((c) => c.op === "UpdateEnvironment")
  assert.deepEqual(unrealEnvironment?.water, embodiment.current.environment.water)
  assert.deepEqual(unrealEnvironment?.vegetation, embodiment.current.environment.vegetation)
})

test("translateEmbodimentDeltaToUnrealCommands: a Vasanta -> Grishma delta produces SetWaterState/SetVegetationIntent/UpdateEntity, never a full rebuild", () => {
  const vasanta = embody(snapshot({}))
  const grishma = embody(
    snapshot({
      season: { id: "grishma", name: "Grīṣma" },
      simulationTick: 4,
      hydrology: { hydrologyBand: "low", soilMoistureBand: "low" },
      ecology: { vegetationActivityBand: "moderate", animalActivityBand: "low" },
      presentEntities: [{ id: "e1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "budding", attributes: {}, lastUpdatedTick: 4 }],
      availableEncounters: [],
    }),
  )

  const delta = diffWorldEmbodiment(vasanta, grishma)
  const commands = translateEmbodimentDeltaToUnrealCommands(delta)

  assert.ok(commands.some((c) => c.op === "SetWaterState" && c.levelBand === "low"))
  assert.ok(commands.some((c) => c.op === "SetVegetationIntent" && c.densityBand === "moderate"))
  assert.ok(commands.some((c) => c.op === "UpdateEntity" && c.entityId === "e1" && c.activityHint === "budding"))
  assert.ok(!commands.some((c) => c.op === "CreateRegion"), "no full-world rebuild commands for an incremental delta")
})

test("an UNCHANGED delta produces zero commands", () => {
  const a = embody(snapshot({}))
  const delta = diffWorldEmbodiment(a, a)
  assert.deepEqual(translateEmbodimentDeltaToUnrealCommands(delta), [])
})
