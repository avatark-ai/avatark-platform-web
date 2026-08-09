import assert from "node:assert/strict"
import { test } from "node:test"
import type { EnvironmentalState } from "@avatark/living-systems-contracts"
import type { ResourceOpportunity } from "@avatark/living-rhythms-contracts"
import type { HomeRange } from "@avatark/social-ecology-contracts"
import type { DomainDefinition, LocalPlaceDefinition, PatchDefinition, QuadrantDefinition, SectorDefinition, SpatialEdge, SpatialGrammar } from "@avatark/spatial-ecology-contracts"
import { buildSpatialMembershipIndex } from "./membershipIndex.ts"
import { reachablePatchIds } from "./topologyResolution.ts"
import { resolvePatchState } from "./patchStateResolution.ts"
import { resolveTerritoryClaims, resolveTerritoryPressure } from "./territoryResolution.ts"
import { buildSpatialMovementContext } from "./movementContext.ts"

// Sprint 16: the SAME fictional, non-canonical "living-forest" fixture
// convention every prior sprint's own portability test already
// established (see e.g. @avatark/social-ecology-runtime's own
// livingForestSocialEcologyPortability.test.ts) -- run here through
// this package's own pure functions to prove none of them is
// Living-Vrindavan-specific. No line in this package's own src/ (outside
// this one test file) mentions "vrindavan," "forest," or any
// franchise/reference-entity name.
//
// Living Forest's own established planning grammar: F01 = one 1mi x 1mi
// Sector, 4 Quadrants (NW/NE/SW/SE), 4 ~40-acre Patches per Quadrant --
// built here programmatically (16 Patches) to prove the SAME runtime
// that serves Living Vrindavan's single degenerate Sector/Quadrant
// (lib/spatialEcology/vrindavanSpatialDefinition.ts) also serves a
// world an order of magnitude larger, with zero core branching.

const QUADRANT_LABELS = ["NW", "NE", "SW", "SE"] as const

function buildForestGrammar(): SpatialGrammar {
  const domain: DomainDefinition = { id: "forest-domain", name: "Living Forest", sectorIds: ["forest-f01"] }
  const sector: SectorDefinition = {
    id: "forest-f01",
    domainId: "forest-domain",
    name: "F01",
    nominalExtentDescription: "1 mile x 1 mile (~640 acres / ~2.59 km2)",
    quadrantIds: QUADRANT_LABELS.map((label) => `forest-f01-${label}`),
  }

  const quadrants: QuadrantDefinition[] = QUADRANT_LABELS.map((label) => ({
    id: `forest-f01-${label}`,
    sectorId: "forest-f01",
    label,
    nominalExtentDescription: "~160 acres",
    patchIds: [1, 2, 3, 4].map((n) => `forest-f01-${label}-${n}`),
  }))

  const patches: PatchDefinition[] = quadrants.flatMap((quadrant) =>
    [1, 2, 3, 4].map((n) => ({
      id: `${quadrant.id}-${n}`,
      quadrantId: quadrant.id,
      habitatType: n === 1 ? "clearing" : "understory",
      containedLocationIds: [`${quadrant.id}-${n}-place`],
      nominalExtentDescription: "~40 acres",
    })),
  )

  const localPlaces: LocalPlaceDefinition[] = patches.map((patch) => ({
    id: `${patch.id}-local-place`,
    patchId: patch.id,
    locationId: patch.containedLocationIds[0],
  }))

  return { domains: [domain], sectors: [sector], quadrants, patches, localPlaces }
}

const GRAMMAR = buildForestGrammar()

test("Living Forest fixture: builds the full F01 -> 4 Quadrants -> 4 Patches-per-Quadrant hierarchy (16 Patches)", () => {
  assert.equal(GRAMMAR.quadrants.length, 4)
  assert.equal(GRAMMAR.patches.length, 16)
  assert.equal(GRAMMAR.localPlaces.length, 16)
})

test("Living Forest fixture: spatial membership resolves a deep Local Place all the way to its Domain, identical mechanism to Vrindavan", () => {
  const index = buildSpatialMembershipIndex(GRAMMAR)
  const membership = index.get("forest-f01-NW-1-place")
  assert.ok(membership)
  assert.equal(membership!.patchId, "forest-f01-NW-1")
  assert.equal(membership!.quadrantId, "forest-f01-NW")
  assert.equal(membership!.sectorId, "forest-f01")
  assert.equal(membership!.domainId, "forest-domain")
})

test("Living Forest fixture: a BARRIER between two adjacent Patches blocks reachability; an authored CORRIDOR reaches across the Sector", () => {
  const edges: SpatialEdge[] = [
    { id: "e-barrier", fromPatchId: "forest-f01-NW-1", toPatchId: "forest-f01-NW-2", relation: "BARRIER", traversable: false },
    { id: "e-corridor", fromPatchId: "forest-f01-NW-1", toPatchId: "forest-f01-SE-4", relation: "CORRIDOR", traversable: true },
  ]
  const reachable = reachablePatchIds(edges, "forest-f01-NW-1")
  assert.ok(!reachable.includes("forest-f01-NW-2"))
  assert.ok(reachable.includes("forest-f01-SE-4"))
})

function environment(vegetationActivityBand: EnvironmentalState["ecology"]["vegetationActivityBand"]): EnvironmentalState {
  return {
    weather: { temperatureBand: "moderate", precipitationBand: "moderate", humidityBand: "moderate" },
    hydrology: { hydrologyBand: "moderate", soilMoistureBand: "moderate" },
    ecology: { vegetationActivityBand, animalActivityBand: "moderate" },
  }
}

test("Living Forest fixture: PatchState derives from the SAME resolvePatchState function Vrindavan uses, zero forest-specific branching in the resolver", () => {
  const patch = GRAMMAR.patches.find((p) => p.id === "forest-f01-NW-1")!
  const resourceOpportunities: ResourceOpportunity[] = [{ locationId: patch.containedLocationIds[0], category: "vegetation", available: true, tick: 1 }]
  const state = resolvePatchState({ patch, tick: 1, environment: environment("high"), resourceOpportunities, placeOccupancies: [], edges: [], placeAdaptationEffects: [] })
  assert.equal(state.vegetationCondition, "high")
  assert.deepEqual(state.resourceAvailability, ["vegetation"])
})

test("Living Forest fixture: territory claims and pressure derive from HomeRange the identical way, for a wholly fictional deer herd/wolf pack pair", () => {
  const index = buildSpatialMembershipIndex(GRAMMAR)
  const homeRanges: HomeRange[] = [
    { id: "deer-herd-home-range", worldId: "living-forest-fixture", ownerType: "GROUP", ownerId: "deer-herd-1", preferredLocationIds: ["forest-f01-NW-1-place"], establishedTick: 0 },
    { id: "wolf-pack-home-range", worldId: "living-forest-fixture", ownerType: "GROUP", ownerId: "wolf-pack-1", preferredLocationIds: ["forest-f01-NW-1-place"], establishedTick: 0 },
  ]
  const claims = resolveTerritoryClaims("living-forest-fixture", homeRanges, index, 3)
  const pressure = resolveTerritoryPressure(claims, 3)
  assert.equal(claims.length, 2)
  assert.equal(pressure.length, 1)
  assert.equal(pressure[0].overlappingClaimCount, 2)
  assert.deepEqual(pressure[0].contestedOwnerIds.sort(), ["deer-herd-1", "wolf-pack-1"])
})

test("Living Forest fixture: spatial movement context composes membership + topology + territory for a fictional entity, identical mechanism to Vrindavan", () => {
  const index = buildSpatialMembershipIndex(GRAMMAR)
  const edges: SpatialEdge[] = [{ id: "e1", fromPatchId: "forest-f01-NW-1", toPatchId: "forest-f01-NW-2", relation: "CONNECTED_TO", traversable: true }]
  const homeRange: HomeRange = { id: "deer-herd-home-range", worldId: "living-forest-fixture", ownerType: "GROUP", ownerId: "deer-herd-1", preferredLocationIds: ["forest-f01-NW-1-place"], establishedTick: 0 }
  const claims = resolveTerritoryClaims("living-forest-fixture", [homeRange], index, 3)

  const context = buildSpatialMovementContext({
    entityId: "deer-1",
    currentLocationId: "forest-f01-NW-1-place",
    groupId: "deer-herd-1",
    membershipIndex: index,
    edges,
    allTerritoryClaims: claims,
    allAdaptationEffects: [],
  })

  assert.equal(context.currentPatchId, "forest-f01-NW-1")
  assert.deepEqual(context.reachablePatchIds.sort(), ["forest-f01-NW-1", "forest-f01-NW-2"])
  assert.equal(context.ownTerritoryClaims.length, 1)
})

