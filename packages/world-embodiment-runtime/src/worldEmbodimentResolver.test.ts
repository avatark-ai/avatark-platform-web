import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveWorldEmbodiment } from "./worldEmbodimentResolver.ts"
import { computeSpatialLayout } from "./spatialLayout.ts"
import type { EntityArchetype, WorldSnapshot } from "@avatark/living-systems-contracts"
import type { LocationExperience } from "@avatark/renderer-contracts"
import type { WorldLocation } from "@avatark/living-world-runtime"

const LOCATIONS: WorldLocation[] = [
  { id: "vrindavan-entry", name: "Vrindavan Entry", order: 0 },
  { id: "yamuna", name: "Yamuna", order: 1, requiresLocationIds: ["vrindavan-entry"] },
]
const SPATIAL_LAYOUT = computeSpatialLayout(LOCATIONS)

const YAMUNA_EXPERIENCE: LocationExperience = {
  id: "yamuna",
  environment: { biome: "riverbank" },
  atmosphere: { quality: "contemplative" },
  time: { preferredState: "unspecified" },
  soundscape: { motifs: ["flowing-water"] },
  interaction: { reflectionAvailable: true },
  presentation: { intensity: "restrained", pacing: "slow" },
}

const VEGETATION_ARCHETYPE: EntityArchetype = { id: "riverbank-vegetation", name: "Riverbank Vegetation", locationId: "yamuna", lifecyclePhases: ["dormant", "budding", "flowering"], initialLifecyclePhase: "dormant" }

function snapshotAt(season: "vasanta" | "grishma", tick: number): WorldSnapshot {
  const vasanta = season === "vasanta"
  return {
    worldId: "living-vrindavan",
    worldVersion: 1,
    simulationTick: tick,
    locationId: "yamuna",
    season: { id: season, name: vasanta ? "Vasanta" : "Grīṣma" },
    weather: { temperatureBand: vasanta ? "moderate" : "high", precipitationBand: vasanta ? "moderate" : "low", humidityBand: vasanta ? "moderate" : "low" },
    hydrology: { hydrologyBand: vasanta ? "moderate" : "low", soilMoistureBand: vasanta ? "moderate" : "low" },
    ecology: { vegetationActivityBand: vasanta ? "high" : "moderate", animalActivityBand: vasanta ? "moderate" : "low" },
    presentEntities: [{ id: "riverbank-vegetation-1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: vasanta ? "budding" : "dormant", attributes: {}, lastUpdatedTick: tick }],
    availableEncounters: vasanta ? [{ ruleId: "yamuna-flowering-reflection", locationId: "yamuna", category: "environmental" }] : [],
    visitorContext: { userId: "u1", lastLocationId: "yamuna", meaningfulEncounterCount: 0, reflectionCount: 0 },
    protectedNarrative: { worldId: "living-vrindavan", episodeRef: null, sceneRef: null, resolved: false },
    generatedAt: "2026-08-08T00:00:00.000Z",
    provenance: { worldArtifactSpecId: "STK-SPEC-002", systemsArtifactSpecId: "STK-SPEC-006", canonDocIds: ["STK-CAN-001"] },
  }
}

function resolve(season: "vasanta" | "grishma", tick: number) {
  return resolveWorldEmbodiment({
    currentSnapshot: snapshotAt(season, tick),
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

test("resolution is a pure projection: identical input always produces identical output", () => {
  const a = resolve("vasanta", 0)
  const b = resolve("vasanta", 0)
  assert.deepEqual(a, b)
})

test("the current region carries the resolved spatial node from the layout, not a fabricated one", () => {
  const snapshot = resolve("vasanta", 0)
  assert.equal(snapshot.current.spatialNode.id, "yamuna")
  assert.equal(snapshot.current.spatialNode, SPATIAL_LAYOUT.yamuna)
})

test("Vasanta and Grishma embodiments of the SAME location genuinely differ", () => {
  const vasanta = resolve("vasanta", 0)
  const grishma = resolve("grishma", 4)
  assert.notDeepEqual(vasanta.current.environment, grishma.current.environment)
  assert.equal(vasanta.current.encounters.length, 1)
  assert.equal(grishma.current.encounters.length, 0)
})

test("entity identity (entityId) stays stable across the season transition even though its lifecyclePhase changes", () => {
  const vasanta = resolve("vasanta", 0)
  const grishma = resolve("grishma", 4)
  assert.equal(vasanta.current.entities[0].entityId, grishma.current.entities[0].entityId)
  assert.notEqual(vasanta.current.entities[0].activityHint, grishma.current.entities[0].activityHint)
})

test("protectedNarrative and visitorContext pass through from the source WorldSnapshot unchanged", () => {
  const snapshot = resolve("vasanta", 0)
  assert.equal(snapshot.protectedNarrative.resolved, false)
  assert.equal(snapshot.visitorContext.lastLocationId, "yamuna")
})

test("the resolver never calls a mutator -- resolving twice does not change simulationTick or season by itself", () => {
  const first = resolve("vasanta", 2)
  const second = resolve("vasanta", 2)
  assert.equal(first.simulationTick, 2)
  assert.equal(second.simulationTick, 2)
})

// Sprint 10, Phase 15: additionalEntityPresentationsByLocation merges a
// second domain's already-built EntityPresentation values into the
// current region, without this package importing anything about that
// domain.
test("additionalEntityPresentationsByLocation merges a population entity into the current region alongside the vegetation-roster one", () => {
  const populationEntity = { entityId: "cow-1", archetypeId: "avatark-population-cow", locationId: "yamuna", visible: true, presentationArchetype: "Cow", activityHint: "ACTIVE", animationSemantic: "GRAZE", audioSemantic: null, movementSemantic: "Remain", movementTargetLocationId: null, groupId: "avatark-population-cow-herd" }
  const embodiment = resolveWorldEmbodiment({
    currentSnapshot: snapshotAt("vasanta", 0),
    reachableSnapshots: [],
    locationNames: { yamuna: "Yamuna" },
    spatialLayout: SPATIAL_LAYOUT,
    experienceByLocation: { yamuna: YAMUNA_EXPERIENCE },
    archetypesById: { "riverbank-vegetation": VEGETATION_ARCHETYPE },
    transitions: [],
    soundEnabled: false,
    provenance: { worldArtifactSpecId: "STK-SPEC-002", experienceArtifactSpecId: "STK-SPEC-004", systemsArtifactSpecId: "STK-SPEC-006", canonDocIds: ["STK-CAN-001"] },
    additionalEntityPresentationsByLocation: { yamuna: [populationEntity] },
  })

  assert.equal(embodiment.current.entities.length, 2, "the vegetation entity and the population entity both appear")
  assert.ok(embodiment.current.entities.some((e) => e.entityId === "cow-1" && e.groupId === "avatark-population-cow-herd"))
})

test("omitting additionalEntityPresentationsByLocation entirely is identical to passing an empty object -- no behavior change for any existing caller", () => {
  const without = resolve("vasanta", 0)
  const withEmpty = resolveWorldEmbodiment({
    currentSnapshot: snapshotAt("vasanta", 0),
    reachableSnapshots: [],
    locationNames: { yamuna: "Yamuna" },
    spatialLayout: SPATIAL_LAYOUT,
    experienceByLocation: { yamuna: YAMUNA_EXPERIENCE },
    archetypesById: { "riverbank-vegetation": VEGETATION_ARCHETYPE },
    transitions: [],
    soundEnabled: false,
    provenance: { worldArtifactSpecId: "STK-SPEC-002", experienceArtifactSpecId: "STK-SPEC-004", systemsArtifactSpecId: "STK-SPEC-006", canonDocIds: ["STK-CAN-001"] },
    additionalEntityPresentationsByLocation: {},
  })
  assert.deepEqual(without.current.entities, withEmpty.current.entities)
})
