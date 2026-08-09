import assert from "node:assert/strict"
import { test } from "node:test"
import type { RelationshipState } from "@avatark/social-ecology-contracts"
import { resolveSocialInteractionOpportunities } from "./socialInteractionResolution.ts"

function relationship(overrides: Partial<RelationshipState>): RelationshipState {
  return {
    id: "rel-1",
    worldId: "world-1",
    entityAId: "a",
    entityBId: "b",
    relationshipType: "PARENT_OFFSPRING",
    band: "ESTABLISHED",
    evidence: { coPresenceTicks: 0, sharedGroupTicks: 0, reunionCount: 0 },
    establishedTick: 0,
    lastRelevantTick: 0,
    ...overrides,
  }
}

test("same location + STRONG band resolves to rest_together", () => {
  const opportunities = resolveSocialInteractionOpportunities({
    relationships: [relationship({ band: "STRONG" })],
    entityLocationsById: new Map([["a", "loc-1"], ["b", "loc-1"]]),
    separatedRelationshipIds: new Set(),
    tick: 5,
  })
  assert.equal(opportunities.length, 1)
  assert.equal(opportunities[0].category, "rest_together")
  assert.equal(opportunities[0].locationId, "loc-1")
})

test("same location + non-STRONG band resolves to remain_near", () => {
  for (const band of ["WEAK", "ESTABLISHED"] as const) {
    const opportunities = resolveSocialInteractionOpportunities({
      relationships: [relationship({ band })],
      entityLocationsById: new Map([["a", "loc-1"], ["b", "loc-1"]]),
      separatedRelationshipIds: new Set(),
      tick: 5,
    })
    assert.equal(opportunities[0].category, "remain_near", `band ${band} should resolve to remain_near`)
  }
})

test("different locations + relationship id in separatedRelationshipIds resolves to approach, at entityB's own location", () => {
  const opportunities = resolveSocialInteractionOpportunities({
    relationships: [relationship({ id: "rel-1" })],
    entityLocationsById: new Map([["a", "loc-1"], ["b", "loc-2"]]),
    separatedRelationshipIds: new Set(["rel-1"]),
    tick: 5,
  })
  assert.equal(opportunities.length, 1)
  assert.equal(opportunities[0].category, "approach")
  assert.equal(opportunities[0].locationId, "loc-2")
})

test("different locations + NOT separated produces no opportunity", () => {
  const opportunities = resolveSocialInteractionOpportunities({
    relationships: [relationship({ id: "rel-1" })],
    entityLocationsById: new Map([["a", "loc-1"], ["b", "loc-2"]]),
    separatedRelationshipIds: new Set(),
    tick: 5,
  })
  assert.deepEqual(opportunities, [])
})

test("either entity missing from entityLocationsById is skipped entirely", () => {
  const missingA = resolveSocialInteractionOpportunities({
    relationships: [relationship({})],
    entityLocationsById: new Map([["b", "loc-1"]]),
    separatedRelationshipIds: new Set(["rel-1"]),
    tick: 5,
  })
  assert.deepEqual(missingA, [])

  const missingB = resolveSocialInteractionOpportunities({
    relationships: [relationship({})],
    entityLocationsById: new Map([["a", "loc-1"]]),
    separatedRelationshipIds: new Set(["rel-1"]),
    tick: 5,
  })
  assert.deepEqual(missingB, [])
})

test("relationshipType and tick pass through unchanged onto the resolved opportunity", () => {
  const opportunities = resolveSocialInteractionOpportunities({
    relationships: [relationship({ relationshipType: "PREFERRED_ASSOCIATE" })],
    entityLocationsById: new Map([["a", "loc-1"], ["b", "loc-1"]]),
    separatedRelationshipIds: new Set(),
    tick: 42,
  })
  assert.equal(opportunities[0].relationshipType, "PREFERRED_ASSOCIATE")
  assert.equal(opportunities[0].tick, 42)
})
