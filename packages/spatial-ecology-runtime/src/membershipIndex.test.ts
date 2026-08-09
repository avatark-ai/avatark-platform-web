import assert from "node:assert/strict"
import { test } from "node:test"
import type { SpatialGrammar } from "@avatark/spatial-ecology-contracts"
import { buildSpatialMembershipIndex, membershipFor } from "./membershipIndex.ts"

const GRAMMAR: SpatialGrammar = {
  domains: [{ id: "domain-1", name: "Test Domain", sectorIds: ["sector-1"] }],
  sectors: [{ id: "sector-1", domainId: "domain-1", name: "Test Sector", quadrantIds: ["quadrant-1"] }],
  quadrants: [{ id: "quadrant-1", sectorId: "sector-1", label: "Test Quadrant", patchIds: ["patch-1"] }],
  patches: [{ id: "patch-1", quadrantId: "quadrant-1", habitatType: "test", containedLocationIds: ["loc-1"] }],
  localPlaces: [{ id: "place-1", patchId: "patch-1", locationId: "loc-1" }],
}

test("buildSpatialMembershipIndex: resolves the full hierarchy for a known LocationId", () => {
  const index = buildSpatialMembershipIndex(GRAMMAR)
  const membership = membershipFor(index, "loc-1")
  assert.ok(membership)
  assert.equal(membership!.localPlaceId, "place-1")
  assert.equal(membership!.patchId, "patch-1")
  assert.equal(membership!.quadrantId, "quadrant-1")
  assert.equal(membership!.sectorId, "sector-1")
  assert.equal(membership!.domainId, "domain-1")
})

test("buildSpatialMembershipIndex: an unknown LocationId resolves to no membership", () => {
  const index = buildSpatialMembershipIndex(GRAMMAR)
  assert.equal(membershipFor(index, "loc-unknown"), null)
})

test("buildSpatialMembershipIndex: a Patch with quadrantId null resolves quadrant/sector/domain to null without throwing", () => {
  const grammar: SpatialGrammar = {
    domains: [],
    sectors: [],
    quadrants: [],
    patches: [{ id: "patch-degenerate", quadrantId: null, habitatType: "test", containedLocationIds: ["loc-2"] }],
    localPlaces: [{ id: "place-2", patchId: "patch-degenerate", locationId: "loc-2" }],
  }
  const index = buildSpatialMembershipIndex(grammar)
  const membership = membershipFor(index, "loc-2")
  assert.ok(membership)
  assert.equal(membership!.patchId, "patch-degenerate")
  assert.equal(membership!.quadrantId, null)
  assert.equal(membership!.sectorId, null)
  assert.equal(membership!.domainId, null)
})
