import assert from "node:assert/strict"
import { test } from "node:test"
import { deriveAdaptationSignals } from "./adaptationSignals.ts"

test("a realized encounter with two participants and one relationship produces one ENTITY signal per participant, one RELATIONSHIP signal, one PLACE signal, and one WORLD_POSSIBILITY signal", () => {
  const signals = deriveAdaptationSignals({
    realizedEncounters: [{ ruleId: "rule-1", locationId: "loc-1", participantEntityIds: ["cow-1", "cow-2"], relationshipIdsInvolved: ["rel-1"], tick: 10, causalReferences: [{ kind: "test", ref: "x" }] }],
    resourceReadings: [],
  })

  assert.deepEqual(
    signals.filter((s) => s.domain === "ENTITY").map((s) => s.subjectId),
    ["cow-1", "cow-2"],
  )
  assert.equal(signals.filter((s) => s.domain === "RELATIONSHIP" && s.subjectId === "rel-1").length, 1)
  assert.equal(signals.filter((s) => s.domain === "PLACE" && s.subjectId === "loc-1" && s.kind === "ENCOUNTER_INVOLVEMENT").length, 1)
  assert.equal(signals.filter((s) => s.domain === "WORLD_POSSIBILITY" && s.subjectId === "rule-1").length, 1)
  assert.equal(signals.length, 5)
})

test("zero realized encounters produce zero encounter-derived signals", () => {
  const signals = deriveAdaptationSignals({ realizedEncounters: [], resourceReadings: [] })
  assert.deepEqual(signals, [])
})

test("an unavailable resource reading produces exactly one PLACE RESOURCE_SCARCITY signal keyed by locationId:category", () => {
  const signals = deriveAdaptationSignals({ realizedEncounters: [], resourceReadings: [{ locationId: "yamuna", category: "water", available: false, tick: 5 }] })
  assert.equal(signals.length, 1)
  assert.deepEqual(signals[0], { domain: "PLACE", subjectId: "yamuna:water", kind: "RESOURCE_SCARCITY", tick: 5, weight: 1, causalReferences: [{ kind: "resource", ref: "water:unavailable" }] })
})

test("an available resource reading produces exactly one PLACE RESOURCE_ABUNDANCE signal -- reserved vocabulary, not consumed by any Vrindavan rule this sprint", () => {
  const signals = deriveAdaptationSignals({ realizedEncounters: [], resourceReadings: [{ locationId: "yamuna", category: "water", available: true, tick: 5 }] })
  assert.equal(signals.length, 1)
  assert.equal(signals[0].kind, "RESOURCE_ABUNDANCE")
})
