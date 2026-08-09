import assert from "node:assert/strict"
import { test } from "node:test"
import type { AdaptationEffect } from "@avatark/world-adaptation-contracts"
import type { SpatialEdge, SpatialGrammar, TerritoryClaim } from "@avatark/spatial-ecology-contracts"
import { buildSpatialMembershipIndex } from "./membershipIndex.ts"
import { buildSpatialMovementContext } from "./movementContext.ts"

const GRAMMAR: SpatialGrammar = {
  domains: [{ id: "domain-1", name: "d", sectorIds: ["sector-1"] }],
  sectors: [{ id: "sector-1", domainId: "domain-1", name: "s", quadrantIds: ["quadrant-1"] }],
  quadrants: [{ id: "quadrant-1", sectorId: "sector-1", label: "q", patchIds: ["patch-a", "patch-b"] }],
  patches: [
    { id: "patch-a", quadrantId: "quadrant-1", habitatType: "test", containedLocationIds: ["loc-a"] },
    { id: "patch-b", quadrantId: "quadrant-1", habitatType: "test", containedLocationIds: ["loc-b"] },
  ],
  localPlaces: [
    { id: "place-a", patchId: "patch-a", locationId: "loc-a" },
    { id: "place-b", patchId: "patch-b", locationId: "loc-b" },
  ],
}
const EDGES: SpatialEdge[] = [{ id: "e1", fromPatchId: "patch-a", toPatchId: "patch-b", relation: "CONNECTED_TO", traversable: true }]

test("buildSpatialMovementContext: resolves current patch and reachable patches from currentLocationId", () => {
  const index = buildSpatialMembershipIndex(GRAMMAR)
  const context = buildSpatialMovementContext({
    entityId: "cow-1",
    currentLocationId: "loc-a",
    groupId: "herd-1",
    membershipIndex: index,
    edges: EDGES,
    allTerritoryClaims: [],
    allAdaptationEffects: [],
  })
  assert.equal(context.currentPatchId, "patch-a")
  assert.deepEqual([...context.reachablePatchIds].sort(), ["patch-a", "patch-b"])
})

test("buildSpatialMovementContext: filters territory claims to this entity's own group, never another owner's", () => {
  const index = buildSpatialMembershipIndex(GRAMMAR)
  const claims: TerritoryClaim[] = [
    { id: "c1", worldId: "world-1", homeRangeId: "hr-1", ownerType: "GROUP", ownerId: "herd-1", patchId: "patch-a", strength: "PRIMARY", establishedTick: 0 },
    { id: "c2", worldId: "world-1", homeRangeId: "hr-2", ownerType: "GROUP", ownerId: "flock-1", patchId: "patch-b", strength: "PRIMARY", establishedTick: 0 },
  ]
  const context = buildSpatialMovementContext({
    entityId: "cow-1",
    currentLocationId: "loc-a",
    groupId: "herd-1",
    membershipIndex: index,
    edges: EDGES,
    allTerritoryClaims: claims,
    allAdaptationEffects: [],
  })
  assert.equal(context.ownTerritoryClaims.length, 1)
  assert.equal(context.ownTerritoryClaims[0].ownerId, "herd-1")
})

test("buildSpatialMovementContext: surfaces ENTITY/GROUP/PLACE adaptation effects relevant to this entity, never an unrelated one", () => {
  const index = buildSpatialMembershipIndex(GRAMMAR)
  const effects: AdaptationEffect[] = [
    { id: "e1", worldId: "world-1", ruleId: "r1", domain: "ENTITY", entityId: "cow-1", kind: "RESOURCE_PREFERENCE_BIAS", tier: 1, appliedTick: 0, reversible: true, causalReferences: [] },
    { id: "e2", worldId: "world-1", ruleId: "r2", domain: "ENTITY", entityId: "cow-2", kind: "RESOURCE_PREFERENCE_BIAS", tier: 1, appliedTick: 0, reversible: true, causalReferences: [] },
    { id: "e3", worldId: "world-1", ruleId: "r3", domain: "PLACE", locationId: "loc-a", kind: "RESOURCE_PRESSURE", tier: 1, appliedTick: 0, reversible: true, causalReferences: [] },
  ]
  const context = buildSpatialMovementContext({
    entityId: "cow-1",
    currentLocationId: "loc-a",
    groupId: null,
    membershipIndex: index,
    edges: EDGES,
    allTerritoryClaims: [],
    allAdaptationEffects: effects,
  })
  const ids = context.relevantAdaptationEffects.map((e) => e.id).sort()
  assert.deepEqual(ids, ["e1", "e3"])
})

test("buildSpatialMovementContext: a LocationId outside the spatial grammar yields no patch and no reachable patches", () => {
  const index = buildSpatialMembershipIndex(GRAMMAR)
  const context = buildSpatialMovementContext({
    entityId: "cow-1",
    currentLocationId: "loc-unresolved",
    groupId: null,
    membershipIndex: index,
    edges: EDGES,
    allTerritoryClaims: [],
    allAdaptationEffects: [],
  })
  assert.equal(context.currentPatchId, null)
  assert.deepEqual(context.reachablePatchIds, [])
})
