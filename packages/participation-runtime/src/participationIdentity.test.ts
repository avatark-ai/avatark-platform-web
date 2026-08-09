import assert from "node:assert/strict"
import { test } from "node:test"
import { deriveParticipationRecordId } from "./participationIdentity.ts"

test("deriveParticipationRecordId is deterministic -- the identical inputs always produce the identical id", () => {
  const a = deriveParticipationRecordId("living-vrindavan", "visitor-1", "yamuna-flowering-reflection", "yamuna", 4)
  const b = deriveParticipationRecordId("living-vrindavan", "visitor-1", "yamuna-flowering-reflection", "yamuna", 4)
  assert.equal(a, b)
})

test("deriveParticipationRecordId is sensitive to every field -- a different userId, tick, ruleId, or locationId produces a different id", () => {
  const base = deriveParticipationRecordId("living-vrindavan", "visitor-1", "yamuna-flowering-reflection", "yamuna", 4)
  assert.notEqual(deriveParticipationRecordId("living-vrindavan", "visitor-2", "yamuna-flowering-reflection", "yamuna", 4), base)
  assert.notEqual(deriveParticipationRecordId("living-vrindavan", "visitor-1", "other-rule", "yamuna", 4), base)
  assert.notEqual(deriveParticipationRecordId("living-vrindavan", "visitor-1", "yamuna-flowering-reflection", "kadamba-grove", 4), base)
  assert.notEqual(deriveParticipationRecordId("living-vrindavan", "visitor-1", "yamuna-flowering-reflection", "yamuna", 5), base)
})

test("two different visitors selecting the SAME encounter get two different ParticipationRecord ids -- one visitor's retry never collides with another visitor's own record", () => {
  const idA = deriveParticipationRecordId("living-vrindavan", "visitor-a", "yamuna-flowering-reflection", "yamuna", 4)
  const idB = deriveParticipationRecordId("living-vrindavan", "visitor-b", "yamuna-flowering-reflection", "yamuna", 4)
  assert.notEqual(idA, idB)
})
