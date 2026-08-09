import assert from "node:assert/strict"
import { test } from "node:test"
import { deriveEncounterRecordId } from "./encounterIdentity.ts"

test("deriveEncounterRecordId is deterministic -- identical inputs always produce the identical id", () => {
  assert.equal(deriveEncounterRecordId("w1", "rule-1", "loc-1", ["a", "b"], 10), deriveEncounterRecordId("w1", "rule-1", "loc-1", ["a", "b"], 10))
})

test("deriveEncounterRecordId is order-independent over participant ids -- the same two entities in either order derive the same id", () => {
  assert.equal(deriveEncounterRecordId("w1", "rule-1", "loc-1", ["a", "b"], 10), deriveEncounterRecordId("w1", "rule-1", "loc-1", ["b", "a"], 10))
})

test("deriveEncounterRecordId differs when any single input differs", () => {
  const base = deriveEncounterRecordId("w1", "rule-1", "loc-1", ["a", "b"], 10)
  assert.notEqual(deriveEncounterRecordId("w2", "rule-1", "loc-1", ["a", "b"], 10), base)
  assert.notEqual(deriveEncounterRecordId("w1", "rule-2", "loc-1", ["a", "b"], 10), base)
  assert.notEqual(deriveEncounterRecordId("w1", "rule-1", "loc-2", ["a", "b"], 10), base)
  assert.notEqual(deriveEncounterRecordId("w1", "rule-1", "loc-1", ["a", "c"], 10), base)
  assert.notEqual(deriveEncounterRecordId("w1", "rule-1", "loc-1", ["a", "b"], 11), base)
})
