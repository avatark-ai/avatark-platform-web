import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import type { EmbodiedRegion } from "@avatark/world-embodiment-contracts"
import { resolveArrivalDecision } from "./arrivalDecision.ts"
import { resolveCanonicalScopeLocationIds } from "./canonicalScope.ts"
import { composePlaceContinuity } from "./placeContinuity.ts"
import { composeOrientation } from "./orientation.ts"
import { composeWorldExperienceSnapshot } from "./worldExperienceSnapshot.ts"

// Build 04, mission §M/§L (portability): the identical functions
// Vrindavan's own Host layer will call, run end-to-end against a
// wholly fictional, non-Vrindavan world -- the same fictional-fixture
// convention every sibling sprint's own "livingForest*Portability.test.ts"
// already established.
test("Living Forest fixture: arrival -> canonical scope -> place continuity -> orientation -> world experience snapshot compose end-to-end for a wholly fictional world", () => {
  const grammar = {
    domains: [{ id: "forest-domain", name: "Forest Domain", sectorIds: ["forest-sector"] }],
    sectors: [{ id: "forest-sector", domainId: "forest-domain", name: "Forest Sector", quadrantIds: ["forest-quadrant"] }],
    quadrants: [{ id: "forest-quadrant", sectorId: "forest-sector", label: "N", patchIds: ["forest-patch-clearing"] }],
    patches: [{ id: "forest-patch-clearing", quadrantId: "forest-quadrant", habitatType: "clearing", containedLocationIds: ["forest-clearing"] }],
    localPlaces: [{ id: "forest-local-clearing", patchId: "forest-patch-clearing", locationId: "forest-clearing" }],
  }

  const canonDirectedLocationIds = resolveCanonicalScopeLocationIds(grammar, { level: "PATCH", patchId: "forest-patch-clearing" })
  assert.deepEqual(canonDirectedLocationIds, ["forest-clearing"])

  const arrival = resolveArrivalDecision({
    entryLocationId: "forest-clearing",
    priorLocationId: null,
    knownLocationIds: grammar.localPlaces.map((lp) => lp.locationId),
    canonDirectedLocationIds: [],
    worldChangedSinceLastVisit: false,
  })
  assert.equal(arrival.reason, "FIRST_EVER_VISIT")

  const region: EmbodiedRegion = {
    locationId: "forest-clearing",
    name: "Forest Clearing",
    spatialNode: { id: "forest-clearing", parentId: null, role: "clearing", transform: { position: { x: 0, y: 0, z: 0 } }, bounds: { radius: 10 }, tags: [] },
    environment: { atmosphere: { semantic: "still", temperatureBand: "moderate", illuminationSemantic: "dappled" }, water: { semantic: "none", levelBand: "low" }, vegetation: { semantic: "dense", densityBand: "high" }, sensoryCues: [] },
    entities: [{ entityId: "forest-deer-1", archetypeId: "deer", locationId: "forest-clearing", visible: true, presentationArchetype: "deer", activityHint: "grazing", animationSemantic: "idle", audioSemantic: null, movementSemantic: null, movementTargetLocationId: null, groupId: null }],
    encounters: [],
  }

  const place = composePlaceContinuity({
    worldId: "forest-world",
    locationId: "forest-clearing",
    tick: 0,
    season: { id: "growth", name: "Growth" },
    region,
    patchState: null,
    territoryPressure: null,
    dayPhase: "MORNING",
    occupancy: { locationId: "forest-clearing", tick: 0, presentEntityIds: ["forest-deer-1"], presentGroupIds: [], entityCountsByArchetype: { deer: 1 }, activityMix: {}, occupancyLevel: "QUIET" },
    groupRoutineIntents: [],
    resourceOpportunities: [],
    nearbyDestinations: [],
    routeStates: [],
    canonicalProjectionsAtThisPlace: [],
    rememberedConsequences: [],
    presentationHints: [],
    visitor: { userId: "forest-visitor-1", hasVisitedBefore: false, meaningfulEncounterCount: 0, reflectionCount: 0 },
  })
  assert.equal(place.nearbyEntities.length, 1)

  const orientation = composeOrientation({ worldId: "forest-world", userId: "forest-visitor-1", generatedAt: "2026-01-01T00:00:00.000Z", place, arrival, changeFacts: [] })
  assert.equal(orientation.whereAmI.locationId, "forest-clearing")

  const snapshot = composeWorldExperienceSnapshot({
    worldId: "forest-world",
    userId: "forest-visitor-1",
    generatedAt: "2026-01-01T00:00:00.000Z",
    arrival,
    orientation,
    place,
    nearbyPlaces: [],
    recentWorldChanges: [],
    embodiment: {
      worldId: "forest-world",
      worldVersion: 1,
      simulationTick: 0,
      season: { id: "growth", name: "Growth" },
      current: region,
      reachable: [],
      transitions: [],
      visitorContext: { userId: "forest-visitor-1", lastLocationId: "forest-clearing", meaningfulEncounterCount: 0, reflectionCount: 0 },
      protectedNarrative: { worldId: "forest-world", episodeRef: null, sceneRef: null, resolved: false },
      generatedAt: "2026-01-01T00:00:00.000Z",
      provenance: { worldArtifactSpecId: "spec", experienceArtifactSpecId: "spec", systemsArtifactSpecId: "spec", canonDocIds: [] },
    },
  })
  assert.equal(snapshot.suggestedStage, "ORIENTATION")
})

// Proof I's own source-inspection method (Build 02), restated for this
// package: zero occurrence of "vrindavan," "yamuna," "krishna," or any
// franchise/reference-entity name anywhere in world-experience-contracts/
// world-experience-runtime's own production source.
test("source inspection: neither world-experience-contracts nor world-experience-runtime's own production source names Vrindavan or any franchise-specific entity", () => {
  const repoRoot = join(import.meta.dirname, "..", "..", "..")
  const forbidden = ["vrindavan", "yamuna", "kadamba", "govardhan", "krishna", "radha", "nanda", "yashoda"]
  const violations: string[] = []
  for (const pkg of ["world-experience-contracts", "world-experience-runtime"]) {
    const srcDir = join(repoRoot, "packages", pkg, "src")
    for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
      if (!entry.isFile() || entry.name.endsWith(".test.ts")) continue
      const content = readFileSync(join(srcDir, entry.name), "utf-8").toLowerCase()
      for (const token of forbidden) {
        if (content.includes(token)) violations.push(`${pkg}/src/${entry.name} contains "${token}"`)
      }
    }
  }
  assert.deepEqual(violations, [])
})
