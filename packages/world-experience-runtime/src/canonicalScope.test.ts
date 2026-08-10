import { test } from "node:test"
import assert from "node:assert/strict"
import type { SpatialGrammar } from "@avatark/spatial-ecology-contracts"
import { resolveCanonicalScopeLocationIds } from "./canonicalScope.ts"

// A wholly fictional, non-Vrindavan grammar -- the same fictional-fixture
// convention every sibling runtime's own "livingForest*Portability"
// test already established, used here directly rather than only in a
// separate portability file, since this function's whole point is to
// work for ANY world's grammar.
const GRAMMAR: SpatialGrammar = {
  domains: [{ id: "domain-1", name: "Domain", sectorIds: ["sector-1"] }],
  sectors: [{ id: "sector-1", domainId: "domain-1", name: "Sector", quadrantIds: ["quadrant-1", "quadrant-2"] }],
  quadrants: [
    { id: "quadrant-1", sectorId: "sector-1", label: "NW", patchIds: ["patch-1"] },
    { id: "quadrant-2", sectorId: "sector-1", label: "SE", patchIds: ["patch-2"] },
  ],
  patches: [
    { id: "patch-1", quadrantId: "quadrant-1", habitatType: "clearing", containedLocationIds: ["loc-1"] },
    { id: "patch-2", quadrantId: "quadrant-2", habitatType: "grove", containedLocationIds: ["loc-2"] },
  ],
  localPlaces: [
    { id: "local-1", patchId: "patch-1", locationId: "loc-1" },
    { id: "local-2", patchId: "patch-2", locationId: "loc-2" },
  ],
}

test("WORLD scope resolves to every LocalPlace's own locationId", () => {
  assert.deepEqual(resolveCanonicalScopeLocationIds(GRAMMAR, { level: "WORLD" }), ["loc-1", "loc-2"])
})

test("LOCAL_PLACE scope resolves to exactly that place's own locationId", () => {
  assert.deepEqual(resolveCanonicalScopeLocationIds(GRAMMAR, { level: "LOCAL_PLACE", localPlaceId: "local-2" }), ["loc-2"])
})

test("an unknown LOCAL_PLACE id resolves honestly to no locations, never a guess", () => {
  assert.deepEqual(resolveCanonicalScopeLocationIds(GRAMMAR, { level: "LOCAL_PLACE", localPlaceId: "nonexistent" }), [])
})

test("PATCH scope resolves to the LocalPlace(s) contained in that patch", () => {
  assert.deepEqual(resolveCanonicalScopeLocationIds(GRAMMAR, { level: "PATCH", patchId: "patch-1" }), ["loc-1"])
})

test("QUADRANT scope resolves through its own patches", () => {
  assert.deepEqual(resolveCanonicalScopeLocationIds(GRAMMAR, { level: "QUADRANT", quadrantId: "quadrant-2" }), ["loc-2"])
})

test("SECTOR scope resolves through every quadrant/patch beneath it", () => {
  const result = resolveCanonicalScopeLocationIds(GRAMMAR, { level: "SECTOR", sectorId: "sector-1" })
  assert.deepEqual([...result].sort(), ["loc-1", "loc-2"])
})

test("DOMAIN scope resolves through the entire sector/quadrant/patch chain beneath it", () => {
  const result = resolveCanonicalScopeLocationIds(GRAMMAR, { level: "DOMAIN", domainId: "domain-1" })
  assert.deepEqual([...result].sort(), ["loc-1", "loc-2"])
})

test("ENTITY_SET scope has no location-directed meaning and resolves honestly to no locations", () => {
  assert.deepEqual(resolveCanonicalScopeLocationIds(GRAMMAR, { level: "ENTITY_SET", entityIds: ["entity-1"] }), [])
})
