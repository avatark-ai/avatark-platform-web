import { test } from "node:test"
import assert from "node:assert/strict"
import { computeSpatialLayout } from "./spatialLayout.ts"
import { resolveWorldEmbodiment } from "./worldEmbodimentResolver.ts"
import { translateToUnrealCommands } from "./unrealCommandTranslator.ts"
import type { EntityArchetype, WorldSnapshot } from "@avatark/living-systems-contracts"
import type { LocationExperience } from "@avatark/renderer-contracts"
import type { WorldLocation } from "@avatark/living-world-runtime"

// Sprint 8, Phase 18: proves the SAME engine this file's sibling tests
// already exercise for Living Vrindavan also embodies a wholly different,
// fictional, non-canonical world -- through configuration/data alone,
// never a code fork. Mirrors Sprint 7's own otherWorldGrammar.test.ts
// proof one layer up the stack (World Snapshot -> Embodiment Resolver ->
// renderer adapter, not just the causal simulation). No import here, and
// no line in spatialLayout.ts/worldEmbodimentResolver.ts/
// unrealCommandTranslator.ts, mentions "forest," "vrindavan," or any
// franchise name -- this does not pretend Living Forest has been
// authored; it proves the architecture would admit it without a core
// change if it were.

const FOREST_LOCATIONS: WorldLocation[] = [
  { id: "forest-clearing", name: "Forest Clearing", order: 0 },
  { id: "deep-canopy", name: "Deep Canopy", order: 1, requiresLocationIds: ["forest-clearing"] },
]
const FOREST_LAYOUT = computeSpatialLayout(FOREST_LOCATIONS)

const CLEARING_EXPERIENCE: LocationExperience = {
  id: "forest-clearing",
  environment: { biome: "clearing" },
  atmosphere: { quality: "open" },
  time: { preferredState: "unspecified" },
  soundscape: { motifs: ["rustling-leaves"] },
  interaction: { reflectionAvailable: false },
  presentation: { intensity: "standard", pacing: "moderate" },
}

const DEER_HERD_ARCHETYPE: EntityArchetype = { id: "deer-herd", name: "Deer Herd", locationId: "forest-clearing", lifecyclePhases: ["scattered", "grazing"], initialLifecyclePhase: "grazing" }

function forestSnapshot(): WorldSnapshot {
  return {
    worldId: "living-forest-fixture",
    worldVersion: 1,
    simulationTick: 2,
    locationId: "forest-clearing",
    season: { id: "canopy-wet", name: "Canopy Wet" },
    weather: { temperatureBand: "moderate", precipitationBand: "high", humidityBand: "high" },
    hydrology: { hydrologyBand: "high", soilMoistureBand: "high" },
    ecology: { vegetationActivityBand: "high", animalActivityBand: "high" },
    presentEntities: [{ id: "herd-1", archetypeId: "deer-herd", locationId: "forest-clearing", lifecyclePhase: "grazing", attributes: {}, lastUpdatedTick: 2 }],
    availableEncounters: [{ ruleId: "forest-clearing-grazing-sign", locationId: "forest-clearing", category: "ambient" }],
    visitorContext: { userId: "u1", lastLocationId: "forest-clearing", meaningfulEncounterCount: 0, reflectionCount: 0 },
    protectedNarrative: { worldId: "living-forest-fixture", episodeRef: null, sceneRef: null, resolved: false },
    generatedAt: "2026-08-08T00:00:00.000Z",
    provenance: { worldArtifactSpecId: "FICTIONAL", systemsArtifactSpecId: "FICTIONAL", canonDocIds: ["STK-CAN-999"] },
  }
}

test("a fictional world's own season/entity/encounter fixtures resolve to a full WorldEmbodimentSnapshot through the unmodified resolver", () => {
  const snapshot = resolveWorldEmbodiment({
    currentSnapshot: forestSnapshot(),
    reachableSnapshots: [],
    locationNames: { "forest-clearing": "Forest Clearing" },
    spatialLayout: FOREST_LAYOUT,
    experienceByLocation: { "forest-clearing": CLEARING_EXPERIENCE },
    archetypesById: { "deer-herd": DEER_HERD_ARCHETYPE },
    transitions: [],
    soundEnabled: true,
    provenance: { worldArtifactSpecId: "FICTIONAL", experienceArtifactSpecId: "FICTIONAL", systemsArtifactSpecId: "FICTIONAL", canonDocIds: ["STK-CAN-999"] },
  })

  assert.equal(snapshot.worldId, "living-forest-fixture")
  assert.equal(snapshot.current.locationId, "forest-clearing")
  assert.equal(snapshot.current.entities[0].entityId, "herd-1")
  assert.equal(snapshot.current.encounters[0].ruleId, "forest-clearing-grazing-sign")
  assert.deepEqual(snapshot.current.environment.sensoryCues, [{ channel: "ambientAudio", semantic: "rustling-leaves" }])
})

test("the same fictional embodiment translates into Unreal-compatible commands through the unmodified translator", () => {
  const snapshot = resolveWorldEmbodiment({
    currentSnapshot: forestSnapshot(),
    reachableSnapshots: [],
    locationNames: { "forest-clearing": "Forest Clearing" },
    spatialLayout: FOREST_LAYOUT,
    experienceByLocation: { "forest-clearing": CLEARING_EXPERIENCE },
    archetypesById: { "deer-herd": DEER_HERD_ARCHETYPE },
    transitions: [],
    soundEnabled: false,
    provenance: { worldArtifactSpecId: "FICTIONAL", experienceArtifactSpecId: "FICTIONAL", systemsArtifactSpecId: "FICTIONAL", canonDocIds: ["STK-CAN-999"] },
  })

  const commands = translateToUnrealCommands(snapshot)
  assert.ok(commands.some((c) => c.op === "CreateRegion" && c.regionId === "forest-clearing"))
  assert.ok(commands.some((c) => c.op === "PlaceEntity" && c.entityId === "herd-1"))
  assert.ok(commands.some((c) => c.op === "CreateInteractionAnchor" && c.ruleId === "forest-clearing-grazing-sign"))
})
