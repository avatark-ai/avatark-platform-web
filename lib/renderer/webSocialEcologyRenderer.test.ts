import { test } from "node:test"
import assert from "node:assert/strict"
import { labelizeRelationshipBand, labelizeRelationshipType, labelizeSeparationSubjectType, summarizeActiveSeparations, summarizeRelationshipsPresent } from "./webSocialEcologyRenderer.ts"

test("labelizeRelationshipType maps every known RelationshipType to a short, fixed phrase, never a sentence", () => {
  assert.equal(labelizeRelationshipType("PARENT_OFFSPRING"), "Parent/offspring")
  assert.equal(labelizeRelationshipType("GROUP_MEMBER"), "Group member")
})

test("an unrecognized relationship type falls back to itself, never a fabricated label", () => {
  assert.equal(labelizeRelationshipType("SOMETHING_NEW"), "SOMETHING_NEW")
})

test("labelizeRelationshipBand maps every RelationshipBand to a fixed phrase", () => {
  assert.equal(labelizeRelationshipBand("WEAK"), "Newly forming")
  assert.equal(labelizeRelationshipBand("STRONG"), "Strong")
})

test("labelizeSeparationSubjectType maps both SeparationSubjectType values to a fixed phrase", () => {
  assert.equal(labelizeSeparationSubjectType("RELATIONSHIP"), "Separated from a related entity")
  assert.equal(labelizeSeparationSubjectType("GROUP_MEMBERSHIP"), "Separated from its group")
})

test("summarizeRelationshipsPresent produces one line per relationship, no prose assembly", () => {
  const lines = summarizeRelationshipsPresent([{ relationshipType: "PARENT_OFFSPRING", band: "ESTABLISHED" }])
  assert.deepEqual(lines, ["Parent/offspring (Established)"])
})

test("summarizeActiveSeparations orders most-recently-begun first and includes the tick", () => {
  const lines = summarizeActiveSeparations([
    { subjectType: "GROUP_MEMBERSHIP", separatedSinceTick: 2 },
    { subjectType: "RELATIONSHIP", separatedSinceTick: 9 },
  ])
  assert.deepEqual(lines, ["Separated from a related entity (since tick 9)", "Separated from its group (since tick 2)"])
})
