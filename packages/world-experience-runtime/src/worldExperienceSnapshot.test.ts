import { test } from "node:test"
import assert from "node:assert/strict"
import type { OrientationProjection, PlaceContinuityView } from "@avatark/world-experience-contracts"
import type { WorldEmbodimentSnapshot } from "@avatark/world-embodiment-contracts"
import { composeWorldExperienceSnapshot } from "./worldExperienceSnapshot.ts"

const REGION = {
  locationId: "forest-clearing",
  name: "Forest Clearing",
  spatialNode: { id: "forest-clearing", parentId: null, role: "clearing", transform: { position: { x: 0, y: 0, z: 0 } }, bounds: { radius: 10 }, tags: [] },
  environment: { atmosphere: { semantic: "still", temperatureBand: "moderate" as const, illuminationSemantic: "dappled" }, water: { semantic: "none", levelBand: "low" as const }, vegetation: { semantic: "dense", densityBand: "high" as const }, sensoryCues: [] },
  entities: [],
  encounters: [],
}

const PLACE: PlaceContinuityView = {
  worldId: "forest-world",
  locationId: "forest-clearing",
  tick: 10,
  season: { id: "growth", name: "Growth" },
  region: REGION,
  patchState: null,
  territoryPressure: null,
  dayPhase: "MORNING",
  occupancy: { locationId: "forest-clearing", tick: 10, presentEntityIds: [], presentGroupIds: [], entityCountsByArchetype: {}, activityMix: {}, occupancyLevel: "QUIET" },
  groupRoutineIntents: [],
  resourceOpportunities: [],
  nearbyEntities: [],
  encounterOpportunities: [],
  nearbyDestinations: [],
  routeStates: [],
  canonicalPresence: [],
  rememberedConsequences: [],
  presentationHints: [],
  visitor: { userId: "forest-visitor-1", hasVisitedBefore: true, meaningfulEncounterCount: 0, reflectionCount: 0 },
}

const ORIENTATION: OrientationProjection = {
  worldId: "forest-world",
  userId: "forest-visitor-1",
  generatedAt: "2026-01-01T00:00:00.000Z",
  whereAmI: { locationId: "forest-clearing", name: "Forest Clearing", season: { id: "growth", name: "Growth" }, dayPhase: "MORNING" },
  whatIsAroundMe: { nearbyEntityCount: 0, occupancyLevel: "QUIET", presentationHints: [] },
  whatIsHappening: { encounterOpportunityCount: 0, activeCanonicalPresence: [], groupRoutineIntentCount: 0 },
  whereCanIGo: [],
  whatHasChanged: { sinceLastVisit: false, facts: [] },
  arrival: { locationId: "forest-clearing", reason: "FIRST_EVER_VISIT", isFirstEverVisit: true, priorLocationId: null, worldChangedSinceLastVisit: false },
}

const EMBODIMENT: WorldEmbodimentSnapshot = {
  worldId: "forest-world",
  worldVersion: 1,
  simulationTick: 10,
  season: { id: "growth", name: "Growth" },
  current: REGION,
  reachable: [],
  transitions: [],
  visitorContext: { userId: "forest-visitor-1", lastLocationId: "forest-clearing", meaningfulEncounterCount: 0, reflectionCount: 0 },
  protectedNarrative: { worldId: "forest-world", episodeRef: null, sceneRef: null, resolved: false },
  generatedAt: "2026-01-01T00:00:00.000Z",
  provenance: { worldArtifactSpecId: "spec", experienceArtifactSpecId: "spec", systemsArtifactSpecId: "spec", canonDocIds: [] },
}

function baseInput() {
  return {
    worldId: "forest-world",
    userId: "forest-visitor-1",
    generatedAt: "2026-01-01T00:00:00.000Z",
    arrival: ORIENTATION.arrival,
    orientation: ORIENTATION,
    place: PLACE,
    nearbyPlaces: [],
    recentWorldChanges: [],
    embodiment: EMBODIMENT,
  }
}

test("the embedded embodiment snapshot is carried through byte-identical -- never a second, re-derived world model", () => {
  const snapshot = composeWorldExperienceSnapshot(baseInput())
  assert.deepEqual(snapshot.embodiment, EMBODIMENT)
})

test("suggestedStage is ORIENTATION when nothing changed since last visit", () => {
  const snapshot = composeWorldExperienceSnapshot(baseInput())
  assert.equal(snapshot.suggestedStage, "ORIENTATION")
})

test("suggestedStage is RECOGNITION_OF_CHANGE when the world genuinely changed since the visitor's last visit", () => {
  const input = baseInput()
  input.arrival = { ...input.arrival, worldChangedSinceLastVisit: true }
  const snapshot = composeWorldExperienceSnapshot(input)
  assert.equal(snapshot.suggestedStage, "RECOGNITION_OF_CHANGE")
})

test("determinism: identical input produces byte-identical output", () => {
  const input = baseInput()
  assert.deepEqual(composeWorldExperienceSnapshot(input), composeWorldExperienceSnapshot(input))
})
