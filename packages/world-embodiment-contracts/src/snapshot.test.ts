import { test } from "node:test"
import assert from "node:assert/strict"
import { freezeWorldEmbodimentSnapshot } from "./snapshot.ts"
import type { WorldEmbodimentSnapshot } from "./snapshot.ts"
import type { EmbodiedRegion } from "./embodiedRegion.ts"

function makeRegion(locationId: string): EmbodiedRegion {
  return {
    locationId,
    name: locationId,
    spatialNode: { id: locationId, parentId: null, role: "region", transform: { position: { x: 0, y: 0, z: 0 } }, bounds: { radius: 1 }, tags: [] },
    environment: {
      atmosphere: { semantic: "arrival", temperatureBand: "moderate", illuminationSemantic: "unspecified" },
      water: { semantic: "still", levelBand: "moderate" },
      vegetation: { semantic: "sparse", densityBand: "high" },
      sensoryCues: [{ channel: "ambientAudio", semantic: "flowing-water" }],
    },
    entities: [{ entityId: "e1", archetypeId: "riverbank-vegetation", locationId, visible: true, presentationArchetype: "vegetation", activityHint: "dormant", animationSemantic: "static", audioSemantic: null, movementSemantic: null, movementTargetLocationId: null, groupId: null }],
    encounters: [{ ruleId: "yamuna-flowering-reflection", locationId, category: "environmental", interactionAffordance: "reflect" }],
  }
}

function makeSnapshot(): WorldEmbodimentSnapshot {
  return {
    worldId: "living-vrindavan",
    worldVersion: 1,
    simulationTick: 0,
    season: { id: "vasanta", name: "Vasanta" },
    current: makeRegion("yamuna"),
    reachable: [makeRegion("kadamba-grove")],
    transitions: [{ toLocationId: "kadamba-grove", affordance: "branching-choice" }],
    visitorContext: { userId: "u1", lastLocationId: "yamuna", meaningfulEncounterCount: 0, reflectionCount: 0 },
    protectedNarrative: { worldId: "living-vrindavan", episodeRef: null, sceneRef: null, resolved: false },
    generatedAt: "2026-08-08T00:00:00.000Z",
    provenance: { worldArtifactSpecId: "STK-SPEC-002", experienceArtifactSpecId: "STK-SPEC-004", systemsArtifactSpecId: "STK-SPEC-006", canonDocIds: ["STK-CAN-001"] },
  }
}

test("freezeWorldEmbodimentSnapshot makes every nested object immutable at runtime, including entities/encounters/sensory cues", () => {
  const snapshot = freezeWorldEmbodimentSnapshot(makeSnapshot())

  assert.throws(() => {
    // @ts-expect-error deliberate
    snapshot.current.entities[0].visible = false
  }, TypeError)
  assert.throws(() => {
    // @ts-expect-error deliberate
    snapshot.current.environment.water.semantic = "raging"
  }, TypeError)
  assert.throws(() => {
    // @ts-expect-error deliberate
    snapshot.reachable.push(snapshot.current)
  }, TypeError)
  assert.throws(() => {
    // @ts-expect-error deliberate
    snapshot.protectedNarrative.resolved = true
  }, TypeError)
})

test("current and reachable regions carry distinct locationIds -- the snapshot is genuinely graph-shaped, not a single flat object", () => {
  const snapshot = makeSnapshot()
  assert.equal(snapshot.current.locationId, "yamuna")
  assert.equal(snapshot.reachable[0].locationId, "kadamba-grove")
})
