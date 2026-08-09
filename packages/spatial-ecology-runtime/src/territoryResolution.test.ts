import assert from "node:assert/strict"
import { test } from "node:test"
import type { HomeRange } from "@avatark/social-ecology-contracts"
import type { SpatialGrammar } from "@avatark/spatial-ecology-contracts"
import { buildSpatialMembershipIndex } from "./membershipIndex.ts"
import { deriveTerritoryClaimId, resolveTerritoryClaims, resolveTerritoryPressure } from "./territoryResolution.ts"

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

test("resolveTerritoryClaims: derives one PRIMARY claim from a HomeRange's first preferred location", () => {
  const index = buildSpatialMembershipIndex(GRAMMAR)
  const homeRange: HomeRange = { id: "hr-1", worldId: "world-1", ownerType: "GROUP", ownerId: "herd-1", preferredLocationIds: ["loc-a"], establishedTick: 0 }
  const claims = resolveTerritoryClaims("world-1", [homeRange], index, 10)
  assert.equal(claims.length, 1)
  assert.equal(claims[0].patchId, "patch-a")
  assert.equal(claims[0].strength, "PRIMARY")
  assert.equal(claims[0].homeRangeId, "hr-1")
  assert.equal(claims[0].ownerId, "herd-1")
  assert.equal(claims[0].id, deriveTerritoryClaimId("hr-1", "patch-a"))
})

test("resolveTerritoryClaims: a second preferred location in a DIFFERENT patch is SECONDARY", () => {
  const index = buildSpatialMembershipIndex(GRAMMAR)
  const homeRange: HomeRange = { id: "hr-1", worldId: "world-1", ownerType: "GROUP", ownerId: "herd-1", preferredLocationIds: ["loc-a", "loc-b"], establishedTick: 0 }
  const claims = resolveTerritoryClaims("world-1", [homeRange], index, 10)
  assert.equal(claims.length, 2)
  assert.deepEqual(
    claims.map((c) => c.strength).sort(),
    ["PRIMARY", "SECONDARY"],
  )
})

test("resolveTerritoryClaims: a preferred location outside the known spatial grammar produces no fabricated claim", () => {
  const index = buildSpatialMembershipIndex(GRAMMAR)
  const homeRange: HomeRange = { id: "hr-1", worldId: "world-1", ownerType: "ENTITY", ownerId: "cow-1", preferredLocationIds: ["loc-unresolved"], establishedTick: 0 }
  const claims = resolveTerritoryClaims("world-1", [homeRange], index, 10)
  assert.deepEqual(claims, [])
})

test("resolveTerritoryPressure: no overlap when only one HomeRange claims a Patch", () => {
  const index = buildSpatialMembershipIndex(GRAMMAR)
  const homeRange: HomeRange = { id: "hr-1", worldId: "world-1", ownerType: "GROUP", ownerId: "herd-1", preferredLocationIds: ["loc-a"], establishedTick: 0 }
  const claims = resolveTerritoryClaims("world-1", [homeRange], index, 10)
  const pressure = resolveTerritoryPressure(claims, 10)
  assert.equal(pressure.length, 1)
  assert.equal(pressure[0].overlappingClaimCount, 1)
  assert.deepEqual(pressure[0].contestedOwnerIds, [])
})

test("resolveTerritoryPressure: two distinct owners claiming the same Patch are contested", () => {
  const index = buildSpatialMembershipIndex(GRAMMAR)
  const homeRanges: HomeRange[] = [
    { id: "hr-1", worldId: "world-1", ownerType: "GROUP", ownerId: "herd-1", preferredLocationIds: ["loc-a"], establishedTick: 0 },
    { id: "hr-2", worldId: "world-1", ownerType: "GROUP", ownerId: "flock-1", preferredLocationIds: ["loc-a"], establishedTick: 0 },
  ]
  const claims = resolveTerritoryClaims("world-1", homeRanges, index, 10)
  const pressure = resolveTerritoryPressure(claims, 10)
  assert.equal(pressure.length, 1)
  assert.equal(pressure[0].overlappingClaimCount, 2)
  assert.deepEqual(pressure[0].contestedOwnerIds.sort(), ["flock-1", "herd-1"])
})
