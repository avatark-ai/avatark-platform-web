import { test } from "node:test"
import assert from "node:assert/strict"
import type { PlaceContinuityView } from "@avatark/world-experience-contracts"
import { composeOrientation } from "./orientation.ts"

function place(overrides: Partial<PlaceContinuityView> = {}): PlaceContinuityView {
  return {
    worldId: "forest-world",
    locationId: "forest-clearing",
    tick: 10,
    season: { id: "growth", name: "Growth" },
    region: {
      locationId: "forest-clearing",
      name: "Forest Clearing",
      spatialNode: { id: "forest-clearing", parentId: null, role: "clearing", transform: { position: { x: 0, y: 0, z: 0 } }, bounds: { radius: 10 }, tags: [] },
      environment: { atmosphere: { semantic: "still", temperatureBand: "moderate", illuminationSemantic: "dappled" }, water: { semantic: "none", levelBand: "low" }, vegetation: { semantic: "dense", densityBand: "high" }, sensoryCues: [] },
      entities: [],
      encounters: [],
    },
    patchState: null,
    territoryPressure: null,
    dayPhase: "MORNING",
    occupancy: { locationId: "forest-clearing", tick: 10, presentEntityIds: [], presentGroupIds: [], entityCountsByArchetype: {}, activityMix: {}, occupancyLevel: "QUIET" },
    groupRoutineIntents: [],
    resourceOpportunities: [],
    nearbyEntities: [],
    encounterOpportunities: [],
    nearbyDestinations: [{ locationId: "forest-river", reachable: true, viaRouteId: null, routeTraversable: null }],
    routeStates: [],
    canonicalPresence: [],
    rememberedConsequences: [],
    presentationHints: [],
    visitor: { userId: "forest-visitor-1", hasVisitedBefore: true, meaningfulEncounterCount: 0, reflectionCount: 0 },
    ...overrides,
  }
}

const ARRIVAL = { locationId: "forest-clearing", reason: "RETURNING_TO_PRIOR_PLACE" as const, isFirstEverVisit: false, priorLocationId: "forest-clearing", worldChangedSinceLastVisit: false }

test("whereAmI/whatIsAroundMe/whatIsHappening/whereCanIGo are each a direct, honest read of the place view -- no new query", () => {
  const orientation = composeOrientation({ worldId: "forest-world", userId: "forest-visitor-1", generatedAt: "2026-01-01T00:00:00.000Z", place: place(), arrival: ARRIVAL, changeFacts: [] })
  assert.equal(orientation.whereAmI.locationId, "forest-clearing")
  assert.equal(orientation.whatIsAroundMe.occupancyLevel, "QUIET")
  assert.equal(orientation.whatIsHappening.encounterOpportunityCount, 0)
  assert.deepEqual(orientation.whereCanIGo, [{ locationId: "forest-river", reachable: true, viaRouteId: null, routeTraversable: null }])
})

test("a DORMANT canonical projection is never surfaced as 'happening now'", () => {
  const orientation = composeOrientation({
    worldId: "forest-world",
    userId: "forest-visitor-1",
    generatedAt: "2026-01-01T00:00:00.000Z",
    place: place({ canonicalPresence: [{ canonicalEventId: "forest-event", status: "DORMANT", isApprovedCanon: false }] }),
    arrival: ARRIVAL,
    changeFacts: [],
  })
  assert.deepEqual(orientation.whatIsHappening.activeCanonicalPresence, [])
})

test("an ACTIVATED canonical projection IS surfaced as 'happening now'", () => {
  const orientation = composeOrientation({
    worldId: "forest-world",
    userId: "forest-visitor-1",
    generatedAt: "2026-01-01T00:00:00.000Z",
    place: place({ canonicalPresence: [{ canonicalEventId: "forest-event", status: "ACTIVATED", isApprovedCanon: false }] }),
    arrival: ARRIVAL,
    changeFacts: [],
  })
  assert.equal(orientation.whatIsHappening.activeCanonicalPresence.length, 1)
})

test("whatHasChanged.sinceLastVisit is true only when real ReturnRecognition facts exist -- never fabricated", () => {
  const noChange = composeOrientation({ worldId: "forest-world", userId: "u", generatedAt: "2026-01-01T00:00:00.000Z", place: place(), arrival: ARRIVAL, changeFacts: [] })
  assert.equal(noChange.whatHasChanged.sinceLastVisit, false)

  const withChange = composeOrientation({
    worldId: "forest-world",
    userId: "u",
    generatedAt: "2026-01-01T00:00:00.000Z",
    place: place(),
    arrival: ARRIVAL,
    changeFacts: [{ type: "season_changed", sourceCategories: [], occurrenceCount: 1 }],
  })
  assert.equal(withChange.whatHasChanged.sinceLastVisit, true)
  assert.equal(withChange.whatHasChanged.facts.length, 1)
})

test("the arrival decision is carried through unchanged", () => {
  const orientation = composeOrientation({ worldId: "forest-world", userId: "u", generatedAt: "2026-01-01T00:00:00.000Z", place: place(), arrival: ARRIVAL, changeFacts: [] })
  assert.deepEqual(orientation.arrival, ARRIVAL)
})
