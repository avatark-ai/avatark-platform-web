import { test } from "node:test"
import assert from "node:assert/strict"
import { emptyProtectedNarrativeProjection } from "@avatark/living-systems-contracts"
import type { EncounterRule, EnvironmentalState, LivingEntityState } from "@avatark/living-systems-contracts"
import type { LocationResourceAffordance } from "@avatark/living-population-contracts"
import { resolvePerception } from "./perception.ts"
import { buildUndirectedLocationGraph } from "./locationGraph.ts"

const GRAPH = buildUndirectedLocationGraph([{ from: "meadow", to: "river" }])
const AFFORDANCES: LocationResourceAffordance[] = [
  { locationId: "river", resourceTags: ["water"] },
  { locationId: "meadow", resourceTags: ["vegetation"] },
]
const ENTITY: LivingEntityState = { id: "cow-1", archetypeId: "cow", locationId: "meadow", lifecyclePhase: "ACTIVE", attributes: {}, lastUpdatedTick: 0 }

function environment(overrides: Partial<EnvironmentalState> = {}): EnvironmentalState {
  return {
    weather: { temperatureBand: "moderate", precipitationBand: "moderate", humidityBand: "moderate" },
    hydrology: { hydrologyBand: "moderate", soilMoistureBand: "moderate" },
    ecology: { vegetationActivityBand: "high", animalActivityBand: "moderate" },
    ...overrides,
  }
}

function baseParams(overrides: Partial<Parameters<typeof resolvePerception>[0]> = {}) {
  return {
    entity: ENTITY,
    worldLocationGraph: GRAPH,
    resourceAffordances: AFFORDANCES,
    environment: environment(),
    allEntities: [ENTITY],
    groupsByEntityId: new Map(),
    encounterRules: [] as EncounterRule[],
    protectedNarrative: emptyProtectedNarrativeProjection("test-world"),
    ...overrides,
  }
}

test("perception reports the entity's current + reachable locations from the world graph", () => {
  const perception = resolvePerception(baseParams())
  assert.equal(perception.currentLocationId, "meadow")
  assert.deepEqual(perception.reachableLocationIds, ["river"])
})

test("vegetation is available at meadow (tagged + high activity), water is not (tagged only at river, not reachable-and-available check fails here since it IS reachable)", () => {
  const perception = resolvePerception(baseParams())
  assert.equal(perception.vegetationAvailable, true)
  assert.equal(perception.waterAvailable, false, "meadow itself has no water tag")
  assert.deepEqual(perception.reachableWaterLocationIds, ["river"])
})

// Phase 9's own causal requirement: the SAME location, tagged the SAME
// way, stops offering a resource once the causal band degrades -- no
// tag or location changed.
test("low hydrology makes water unavailable everywhere, even at a location tagged water", () => {
  const perception = resolvePerception(baseParams({ environment: environment({ hydrology: { hydrologyBand: "low", soilMoistureBand: "low" } }) }))
  assert.deepEqual(perception.reachableWaterLocationIds, [], "hydrology gates availability, not just the tag")
})

test("nearby entities are those sharing the current location, excluding self", () => {
  const other: LivingEntityState = { ...ENTITY, id: "cow-2" }
  const elsewhere: LivingEntityState = { ...ENTITY, id: "cow-3", locationId: "river" }
  const perception = resolvePerception(baseParams({ allEntities: [ENTITY, other, elsewhere] }))
  assert.deepEqual(perception.nearbyEntityIds, ["cow-2"])
})

test("groupId is looked up from the supplied membership map, defaulting to null", () => {
  const withGroup = resolvePerception(baseParams({ groupsByEntityId: new Map([["cow-1", "herd-1"]]) }))
  assert.equal(withGroup.groupId, "herd-1")
  const withoutGroup = resolvePerception(baseParams())
  assert.equal(withoutGroup.groupId, null)
})

test("available encounters reuse Sprint 7's own resolveAvailableEncounters unmodified", () => {
  const rule: EncounterRule = { id: "meadow-ambient", locationId: "meadow", category: "ambient", condition: { band: "vegetationActivityBand", atLeast: "high" } }
  const perception = resolvePerception(baseParams({ encounterRules: [rule] }))
  assert.deepEqual(perception.availableEncounterRuleIds, ["meadow-ambient"])
})
