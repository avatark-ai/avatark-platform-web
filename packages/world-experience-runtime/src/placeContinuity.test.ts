import { test } from "node:test"
import assert from "node:assert/strict"
import type { EmbodiedRegion } from "@avatark/world-embodiment-contracts"
import type { PatchState } from "@avatark/spatial-ecology-contracts"
import type { PlaceOccupancy } from "@avatark/living-rhythms-contracts"
import type { WorldInstanceCanonicalProjectionState } from "@avatark/canonical-event-contracts"
import { composePlaceContinuity } from "./placeContinuity.ts"

const REGION: EmbodiedRegion = {
  locationId: "forest-clearing",
  name: "Forest Clearing",
  spatialNode: { id: "forest-clearing", parentId: null, role: "clearing", transform: { position: { x: 0, y: 0, z: 0 } }, bounds: { radius: 10 }, tags: [] },
  environment: {
    atmosphere: { semantic: "still", temperatureBand: "moderate", illuminationSemantic: "dappled" },
    water: { semantic: "none", levelBand: "low" },
    vegetation: { semantic: "dense", densityBand: "high" },
    sensoryCues: [],
  },
  entities: [{ entityId: "forest-deer-1", archetypeId: "deer", locationId: "forest-clearing", visible: true, presentationArchetype: "deer", activityHint: "grazing", animationSemantic: "idle", audioSemantic: null, movementSemantic: null, movementTargetLocationId: null, groupId: null }],
  encounters: [{ ruleId: "forest-deer-greeting", locationId: "forest-clearing", category: "ambient", interactionAffordance: "observe" }],
}

const PATCH_STATE: PatchState = {
  patchId: "patch-clearing",
  tick: 10,
  vegetationCondition: "high",
  hydrologyCondition: "low",
  resourceAvailability: ["shelter"],
  occupancyLevel: "QUIET",
  presentEntityIds: ["forest-deer-1"],
  presentGroupIds: [],
  movementPermeability: 1,
  ecologicalPressure: 0,
}

const OCCUPANCY: PlaceOccupancy = {
  locationId: "forest-clearing",
  tick: 10,
  presentEntityIds: ["forest-deer-1"],
  presentGroupIds: [],
  entityCountsByArchetype: { deer: 1 },
  activityMix: {},
  occupancyLevel: "QUIET",
}

function canonicalProjection(overrides: Partial<WorldInstanceCanonicalProjectionState>): WorldInstanceCanonicalProjectionState {
  return {
    worldInstanceId: "forest-world",
    canonicalEventId: "forest-event",
    status: "DORMANT",
    activationId: null,
    mandatedFacts: [],
    scope: { level: "WORLD" },
    provenance: { canonDocIds: [], specId: "test-spec", specVersion: 1, definitionContentHash: "hash" },
    activatedAtTick: null,
    completedAtTick: null,
    worldEventId: null,
    ...overrides,
  }
}

function baseInput() {
  return {
    worldId: "forest-world",
    locationId: "forest-clearing",
    tick: 10,
    season: { id: "growth", name: "Growth" },
    region: REGION,
    patchState: PATCH_STATE,
    territoryPressure: null,
    dayPhase: "MORNING" as const,
    occupancy: OCCUPANCY,
    groupRoutineIntents: [],
    resourceOpportunities: [],
    nearbyDestinations: [{ locationId: "forest-river", reachable: true, viaRouteId: null, routeTraversable: null }],
    routeStates: [],
    canonicalProjectionsAtThisPlace: [],
    rememberedConsequences: [],
    presentationHints: [{ kind: "microhabitat", id: "clearing-edge", label: "Clearing Edge" }],
    visitor: { userId: "forest-visitor-1", hasVisitedBefore: true, meaningfulEncounterCount: 2, reflectionCount: 1 },
  }
}

test("nearbyEntities/encounterOpportunities restate the region's own entities/encounters, never a manufactured scene", () => {
  const view = composePlaceContinuity(baseInput())
  assert.deepEqual(view.nearbyEntities, REGION.entities)
  assert.deepEqual(view.encounterOpportunities, REGION.encounters)
})

test("a Host-authored canonical event (empty canonDocIds) is never presented as Approved Canon", () => {
  const view = composePlaceContinuity({ ...baseInput(), canonicalProjectionsAtThisPlace: [canonicalProjection({ status: "ACTIVATED", canonicalEventId: "host-fixture" })] })
  assert.deepEqual(view.canonicalPresence, [{ canonicalEventId: "host-fixture", status: "ACTIVATED", isApprovedCanon: false }])
})

test("a genuinely Approved canonical event (non-empty canonDocIds) is presented as such", () => {
  const view = composePlaceContinuity({
    ...baseInput(),
    canonicalProjectionsAtThisPlace: [canonicalProjection({ status: "ACTIVATED", canonicalEventId: "approved-event", provenance: { canonDocIds: ["STK-CAN-999"], specId: "test-spec", specVersion: 1, definitionContentHash: "hash" } })],
  })
  assert.equal(view.canonicalPresence[0].isApprovedCanon, true)
})

test("every other field passes through verbatim -- this function recombines, it never re-derives", () => {
  const input = baseInput()
  const view = composePlaceContinuity(input)
  assert.equal(view.patchState, input.patchState)
  assert.equal(view.occupancy, input.occupancy)
  assert.deepEqual(view.nearbyDestinations, input.nearbyDestinations)
  assert.deepEqual(view.presentationHints, input.presentationHints)
  assert.deepEqual(view.visitor, input.visitor)
})

test("determinism: identical input produces byte-identical output", () => {
  const input = baseInput()
  assert.deepEqual(composePlaceContinuity(input), composePlaceContinuity(input))
})
