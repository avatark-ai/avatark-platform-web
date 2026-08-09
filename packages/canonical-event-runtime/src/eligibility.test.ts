import assert from "node:assert/strict"
import { test } from "node:test"
import type { CanonicalEventDefinition } from "@avatark/canonical-event-contracts"
import { evaluateCanonicalEventEligibility } from "./eligibility.ts"
import type { CanonicalEventEligibilityContext } from "./eligibility.ts"

const BASE_CONTEXT: CanonicalEventEligibilityContext = {
  tick: 10,
  seasonId: "season-a",
  worldInstancePhase: "phase-1",
  completedCanonicalEventIds: new Set(["canonical-event-prior"]),
  reachedLocationIds: new Set(["location-x"]),
  narrativeGatesResolved: { "gate-1": true },
}

function definitionWith(conditions: CanonicalEventDefinition["activationConditions"]): CanonicalEventDefinition {
  return {
    identity: { canonicalEventId: "canonical-event-test", definitionContentHash: "hash" },
    category: "REQUIRED",
    activationConditions: conditions,
    mandatedFacts: [],
    scope: { level: "WORLD" },
    provenance: { canonDocIds: [], specId: "spec", specVersion: 1, definitionContentHash: "hash" },
  }
}

test("WORLD_TIME_AT_LEAST is eligible once tick has reached the authored threshold, not before", () => {
  assert.equal(evaluateCanonicalEventEligibility(definitionWith([{ kind: "WORLD_TIME_AT_LEAST", tick: 10 }]), "w1", BASE_CONTEXT).eligible, true)
  assert.equal(evaluateCanonicalEventEligibility(definitionWith([{ kind: "WORLD_TIME_AT_LEAST", tick: 11 }]), "w1", BASE_CONTEXT).eligible, false)
})

test("SEASON_EQUALS, SEQUENCE_POSITION, LOCATION_REACHED, WORLD_INSTANCE_PHASE, NARRATIVE_GATE_OPEN each judge their own single fact", () => {
  assert.equal(evaluateCanonicalEventEligibility(definitionWith([{ kind: "SEASON_EQUALS", seasonId: "season-a" }]), "w1", BASE_CONTEXT).eligible, true)
  assert.equal(evaluateCanonicalEventEligibility(definitionWith([{ kind: "SEASON_EQUALS", seasonId: "season-b" }]), "w1", BASE_CONTEXT).eligible, false)
  assert.equal(evaluateCanonicalEventEligibility(definitionWith([{ kind: "SEQUENCE_POSITION", afterCanonicalEventId: "canonical-event-prior" }]), "w1", BASE_CONTEXT).eligible, true)
  assert.equal(evaluateCanonicalEventEligibility(definitionWith([{ kind: "SEQUENCE_POSITION", afterCanonicalEventId: "canonical-event-never-happened" }]), "w1", BASE_CONTEXT).eligible, false)
  assert.equal(evaluateCanonicalEventEligibility(definitionWith([{ kind: "LOCATION_REACHED", locationId: "location-x" }]), "w1", BASE_CONTEXT).eligible, true)
  assert.equal(evaluateCanonicalEventEligibility(definitionWith([{ kind: "LOCATION_REACHED", locationId: "location-never-reached" }]), "w1", BASE_CONTEXT).eligible, false)
  assert.equal(evaluateCanonicalEventEligibility(definitionWith([{ kind: "WORLD_INSTANCE_PHASE", phase: "phase-1" }]), "w1", BASE_CONTEXT).eligible, true)
  assert.equal(evaluateCanonicalEventEligibility(definitionWith([{ kind: "WORLD_INSTANCE_PHASE", phase: "phase-2" }]), "w1", BASE_CONTEXT).eligible, false)
  assert.equal(evaluateCanonicalEventEligibility(definitionWith([{ kind: "NARRATIVE_GATE_OPEN", gateId: "gate-1" }]), "w1", BASE_CONTEXT).eligible, true)
  assert.equal(evaluateCanonicalEventEligibility(definitionWith([{ kind: "NARRATIVE_GATE_OPEN", gateId: "gate-unresolved" }]), "w1", BASE_CONTEXT).eligible, false)
})

test("multiple authored conditions are ANDed -- all must hold, never an OR", () => {
  const definition = definitionWith([
    { kind: "WORLD_TIME_AT_LEAST", tick: 10 },
    { kind: "LOCATION_REACHED", locationId: "location-never-reached" },
  ])
  const result = evaluateCanonicalEventEligibility(definition, "w1", BASE_CONTEXT)
  assert.equal(result.eligible, false)
  assert.equal(result.reasons.length, 2, "one structured reason per authored condition, never a single collapsed boolean")
})

test("zero authored conditions is vacuously eligible -- an event with no gates always activates immediately", () => {
  assert.equal(evaluateCanonicalEventEligibility(definitionWith([]), "w1", BASE_CONTEXT).eligible, true)
})

test("eligibility is pure -- identical definition and context always produce the identical result", () => {
  const definition = definitionWith([{ kind: "SEASON_EQUALS", seasonId: "season-a" }])
  const first = evaluateCanonicalEventEligibility(definition, "w1", BASE_CONTEXT)
  const second = evaluateCanonicalEventEligibility(definition, "w1", BASE_CONTEXT)
  assert.deepEqual(first, second)
})
