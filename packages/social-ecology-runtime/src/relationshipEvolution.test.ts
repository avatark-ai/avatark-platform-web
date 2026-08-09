import assert from "node:assert/strict"
import { test } from "node:test"
import { deriveRelationshipBand, evolveRelationshipEvidence } from "./relationshipEvolution.ts"

test("deriveRelationshipBand: zero evidence is WEAK", () => {
  assert.equal(deriveRelationshipBand({ coPresenceTicks: 0, sharedGroupTicks: 0, reunionCount: 0 }), "WEAK")
})

test("deriveRelationshipBand: crosses into ESTABLISHED at score 5", () => {
  assert.equal(deriveRelationshipBand({ coPresenceTicks: 4, sharedGroupTicks: 0, reunionCount: 0 }), "WEAK")
  assert.equal(deriveRelationshipBand({ coPresenceTicks: 5, sharedGroupTicks: 0, reunionCount: 0 }), "ESTABLISHED")
})

test("deriveRelationshipBand: crosses into STRONG at score 20", () => {
  assert.equal(deriveRelationshipBand({ coPresenceTicks: 19, sharedGroupTicks: 0, reunionCount: 0 }), "ESTABLISHED")
  assert.equal(deriveRelationshipBand({ coPresenceTicks: 20, sharedGroupTicks: 0, reunionCount: 0 }), "STRONG")
})

test("deriveRelationshipBand: sharedGroupTicks are weighted double, reunionCount weighted triple", () => {
  assert.equal(deriveRelationshipBand({ coPresenceTicks: 0, sharedGroupTicks: 3, reunionCount: 0 }).length > 0, true)
  assert.equal(deriveRelationshipBand({ coPresenceTicks: 0, sharedGroupTicks: 3, reunionCount: 0 }), "ESTABLISHED")
  assert.equal(deriveRelationshipBand({ coPresenceTicks: 0, sharedGroupTicks: 0, reunionCount: 2 }), "ESTABLISHED")
})

test("evolveRelationshipEvidence: accumulates each field independently per tick", () => {
  const start = { coPresenceTicks: 0, sharedGroupTicks: 0, reunionCount: 0 }
  const afterOne = evolveRelationshipEvidence(start, true, true, false)
  assert.deepEqual(afterOne, { coPresenceTicks: 1, sharedGroupTicks: 1, reunionCount: 0 })
  const afterTwo = evolveRelationshipEvidence(afterOne, false, false, true)
  assert.deepEqual(afterTwo, { coPresenceTicks: 1, sharedGroupTicks: 1, reunionCount: 1 })
})

test("evolveRelationshipEvidence: a fully-idle tick leaves evidence unchanged", () => {
  const start = { coPresenceTicks: 2, sharedGroupTicks: 1, reunionCount: 1 }
  assert.deepEqual(evolveRelationshipEvidence(start, false, false, false), start)
})
