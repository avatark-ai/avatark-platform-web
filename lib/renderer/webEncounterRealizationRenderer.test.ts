import { test } from "node:test"
import assert from "node:assert/strict"
import { labelizeEncounterCategory, labelizeRealizationStatus, summarizeCausalReferences, summarizeEncounterRecords } from "./webEncounterRealizationRenderer.ts"

test("labelizeRealizationStatus maps every EncounterRealizationStatus to a fixed phrase, never a sentence", () => {
  assert.equal(labelizeRealizationStatus("REALIZED"), "Realized")
  assert.equal(labelizeRealizationStatus("EXPIRED"), "Did not occur")
  assert.equal(labelizeRealizationStatus("BLOCKED"), "Blocked")
})

test("an unrecognized status falls back to itself, never a fabricated label", () => {
  assert.equal(labelizeRealizationStatus("SOMETHING_NEW"), "SOMETHING_NEW")
})

test("labelizeEncounterCategory maps every EncounterCategory to a fixed phrase", () => {
  assert.equal(labelizeEncounterCategory("narrative-protected"), "Narrative")
  assert.equal(labelizeEncounterCategory("practice-linked"), "Practice")
})

test("summarizeCausalReferences renders one flat 'kind: ref' line per reference, in order, never a re-narrated sentence", () => {
  assert.deepEqual(summarizeCausalReferences([{ kind: "presence", ref: "2" }, { kind: "groupCohesion", ref: "1.00" }]), ["presence: 2", "groupCohesion: 1.00"])
})

test("summarizeEncounterRecords orders most-recently-started first, one line per record, with only status/category/location/participant count -- no participant identity prose", () => {
  const lines = summarizeEncounterRecords([
    { ruleId: "yamuna-flowering-reflection", category: "environmental", locationId: "yamuna", status: "CONSEQUENCES_APPLIED", startTick: 3, participantEntityIds: ["cow-1", "cow-2"] },
    { ruleId: "kadamba-grove-ambient-presence", category: "ambient", locationId: "kadamba-grove", status: "EXPIRED", startTick: 9, participantEntityIds: ["bird-1"] },
  ])
  assert.deepEqual(lines, ["kadamba-grove-ambient-presence (kadamba-grove): Did not occur -- Ambient, 1 participant", "yamuna-flowering-reflection (yamuna): Realized -- Environmental, 2 participants"])
})
