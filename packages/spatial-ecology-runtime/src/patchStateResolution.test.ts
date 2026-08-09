import assert from "node:assert/strict"
import { test } from "node:test"
import type { EnvironmentalState } from "@avatark/living-systems-contracts"
import type { PlaceOccupancy, ResourceOpportunity } from "@avatark/living-rhythms-contracts"
import type { AdaptationEffect } from "@avatark/world-adaptation-contracts"
import type { PatchDefinition, SpatialEdge } from "@avatark/spatial-ecology-contracts"
import { resolvePatchState } from "./patchStateResolution.ts"

const PATCH: PatchDefinition = { id: "patch-river", quadrantId: null, habitatType: "riverbank", containedLocationIds: ["loc-river"] }

function environment(hydrologyBand: EnvironmentalState["hydrology"]["hydrologyBand"]): EnvironmentalState {
  return {
    weather: { temperatureBand: "moderate", precipitationBand: "moderate", humidityBand: "moderate" },
    hydrology: { hydrologyBand, soilMoistureBand: "moderate" },
    ecology: { vegetationActivityBand: "moderate", animalActivityBand: "moderate" },
  }
}

test("resolvePatchState: reflects Sprint 7's own world-global environment bands, never a second value", () => {
  const state = resolvePatchState({
    patch: PATCH,
    tick: 5,
    environment: environment("low"),
    resourceOpportunities: [],
    placeOccupancies: [],
    edges: [],
    placeAdaptationEffects: [],
  })
  assert.equal(state.hydrologyCondition, "low")
  assert.equal(state.vegetationCondition, "moderate")
  assert.equal(state.patchId, "patch-river")
  assert.equal(state.tick, 5)
})

test("resolvePatchState: resourceAvailability is the union of AVAILABLE categories at contained locations only", () => {
  const resourceOpportunities: ResourceOpportunity[] = [
    { locationId: "loc-river", category: "water", available: true, tick: 5 },
    { locationId: "loc-river", category: "shelter", available: false, tick: 5 },
    { locationId: "loc-elsewhere", category: "gathering", available: true, tick: 5 },
  ]
  const state = resolvePatchState({ patch: PATCH, tick: 5, environment: environment("moderate"), resourceOpportunities, placeOccupancies: [], edges: [], placeAdaptationEffects: [] })
  assert.deepEqual(state.resourceAvailability, ["water"])
})

test("resolvePatchState: rolls up occupancy from every contained location, never a second occupancy engine", () => {
  const placeOccupancies: PlaceOccupancy[] = [
    { locationId: "loc-river", tick: 5, presentEntityIds: ["cow-1"], presentGroupIds: ["herd-1"], entityCountsByArchetype: { cow: 1 }, activityMix: {}, occupancyLevel: "ACTIVE" },
  ]
  const state = resolvePatchState({ patch: PATCH, tick: 5, environment: environment("moderate"), resourceOpportunities: [], placeOccupancies, edges: [], placeAdaptationEffects: [] })
  assert.equal(state.occupancyLevel, "ACTIVE")
  assert.deepEqual(state.presentEntityIds, ["cow-1"])
  assert.deepEqual(state.presentGroupIds, ["herd-1"])
})

test("resolvePatchState: movementPermeability reflects this patch's own topology", () => {
  const edges: SpatialEdge[] = [{ id: "e1", fromPatchId: "patch-river", toPatchId: "patch-other", relation: "BARRIER", traversable: false }]
  const state = resolvePatchState({ patch: PATCH, tick: 5, environment: environment("moderate"), resourceOpportunities: [], placeOccupancies: [], edges, placeAdaptationEffects: [] })
  assert.equal(state.movementPermeability, 0)
})

test("resolvePatchState: ecologicalPressure reflects a currently-active PLACE-domain AdaptationEffect targeting a contained location", () => {
  const effect: AdaptationEffect = {
    id: "effect-1",
    worldId: "world-1",
    ruleId: "rule-1",
    domain: "PLACE",
    locationId: "loc-river",
    kind: "RESOURCE_PRESSURE",
    tier: 1,
    appliedTick: 5,
    reversible: true,
    causalReferences: [],
  }
  const withEffect = resolvePatchState({ patch: PATCH, tick: 5, environment: environment("moderate"), resourceOpportunities: [], placeOccupancies: [], edges: [], placeAdaptationEffects: [effect] })
  const withoutEffect = resolvePatchState({ patch: PATCH, tick: 5, environment: environment("moderate"), resourceOpportunities: [], placeOccupancies: [], edges: [], placeAdaptationEffects: [] })
  assert.equal(withEffect.ecologicalPressure, 1)
  assert.equal(withoutEffect.ecologicalPressure, 0)
})

test("resolvePatchState: an AdaptationEffect for a DIFFERENT location does not leak pressure into this patch", () => {
  const effect: AdaptationEffect = {
    id: "effect-2",
    worldId: "world-1",
    ruleId: "rule-1",
    domain: "PLACE",
    locationId: "loc-elsewhere",
    kind: "RESOURCE_PRESSURE",
    tier: 1,
    appliedTick: 5,
    reversible: true,
    causalReferences: [],
  }
  const state = resolvePatchState({ patch: PATCH, tick: 5, environment: environment("moderate"), resourceOpportunities: [], placeOccupancies: [], edges: [], placeAdaptationEffects: [effect] })
  assert.equal(state.ecologicalPressure, 0)
})
