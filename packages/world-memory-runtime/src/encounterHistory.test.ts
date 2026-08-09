import { test } from "node:test"
import assert from "node:assert/strict"
import { recordEncounterResolved, trackEncounterHistory } from "./encounterHistory.ts"
import type { EncounterOpportunity } from "@avatark/living-population-contracts"

function opportunity(overrides: Partial<EncounterOpportunity>): EncounterOpportunity {
  return { ruleId: "kadamba-grove-ambient-presence", locationId: "kadamba-grove", category: "ambient", contributingEntityIds: ["bird-1"], tick: 1, ...overrides }
}

test("a newly-present opportunity produces an AVAILABLE entry", () => {
  const entries = trackEncounterHistory("w1", [], [opportunity({})], 5)
  assert.equal(entries.length, 1)
  assert.equal(entries[0].status, "AVAILABLE")
})

test("an opportunity present before but gone now produces a NO_LONGER_AVAILABLE entry", () => {
  const entries = trackEncounterHistory("w1", [opportunity({})], [], 6)
  assert.equal(entries.length, 1)
  assert.equal(entries[0].status, "NO_LONGER_AVAILABLE")
})

test("an opportunity present in both ticks produces no history entry at all", () => {
  const entries = trackEncounterHistory("w1", [opportunity({})], [opportunity({})], 6)
  assert.deepEqual(entries, [])
})

test("recordEncounterResolved produces a RESOLVED entry for the given opportunity", () => {
  const entry = recordEncounterResolved("w1", opportunity({}), 7)
  assert.equal(entry.status, "RESOLVED")
  assert.equal(entry.ruleId, "kadamba-grove-ambient-presence")
})
