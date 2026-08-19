import { test } from "node:test"
import assert from "node:assert/strict"
import fixture from "../test/fixtures/bh-e002-expected-absence-fragment.json" with { type: "json" }
import { checkActivation, MINIMAL_RUNTIME_CAPABILITIES } from "./runtimeCapabilities.ts"
import type { RuntimeCapabilities } from "./runtimeCapabilities.ts"
import type { ExpectationReference } from "./expectationReference.ts"
import { evaluateExpectation } from "./expectationEvaluation.ts"
import type { ExpectationEvaluationContext } from "./expectationEvaluation.ts"

function expectationFromFixture(): ExpectationReference {
  return {
    expectationId: fixture.expectation.id,
    subjectId: fixture.expectation.subject,
    property: fixture.expectation.property,
    origin: fixture.expectation.origin as ExpectationReference["origin"],
    patternEvidence: fixture.expectation.patternEvidence,
    artifactReference: {
      sourceId: fixture.provenance.sourceId,
      digest: fixture.provenance.digest,
      ruleId: fixture.provenance.ruleId,
      eventId: fixture.provenance.eventId,
    },
  }
}

function baseContext(overrides: Partial<ExpectationEvaluationContext> = {}): ExpectationEvaluationContext {
  return {
    observedOutcome: "DEVIATED",
    withinPatternWindow: false,
    evidenceCompleteness: "COMPLETE",
    logicalTick: 10,
    disconfirmationCountSoFar: 0,
    ...overrides,
  }
}

test("T1: capability supported -> activation allowed", () => {
  const capabilities: RuntimeCapabilities = { schemaVersion: "1.0.0", supports: { EXPECTED_STATE_COMPARISON: true } }
  assert.deepStrictEqual(checkActivation(["EXPECTED_STATE_COMPARISON"], capabilities), { activation: "ALLOWED" })
})

test("T2: capability unsupported -> activation rejected", () => {
  const result = checkActivation(["EXPECTED_STATE_COMPARISON"], MINIMAL_RUNTIME_CAPABILITIES)
  assert.equal(result.activation, "REJECTED")
  assert.equal(result.activation === "REJECTED" && result.requirement, "EXPECTED_STATE_COMPARISON")
})

test("T3: no expectation basis (empty patternEvidence) -> NOT_APPLICABLE, no fact", () => {
  const expectation: ExpectationReference = { ...expectationFromFixture(), patternEvidence: [] }
  const result = evaluateExpectation(expectation, baseContext())
  assert.equal(result.status, "NOT_APPLICABLE")
})

test("T4: expectation satisfied -> SATISFIED", () => {
  const result = evaluateExpectation(expectationFromFixture(), baseContext({ observedOutcome: "CONFIRMED" }))
  assert.deepStrictEqual(result, { status: "SATISFIED" })
})

test("T5: temporarily not present (within pattern window) -> WITHIN_PATTERN_WINDOW, no fact", () => {
  const result = evaluateExpectation(expectationFromFixture(), baseContext({ withinPatternWindow: true }))
  assert.deepStrictEqual(result, { status: "WITHIN_PATTERN_WINDOW" })
})

test("T6: expected absence -> EXPECTED_ABSENCE with fact", () => {
  const result = evaluateExpectation(expectationFromFixture(), baseContext())
  assert.equal(result.status, "EXPECTED_ABSENCE")
  if (result.status === "EXPECTED_ABSENCE") {
    assert.equal(result.fact.subjectId, fixture.expectation.subject)
    assert.equal(result.fact.expectationId, fixture.expectation.id)
  }
})

test("T7: unobserved -> UNKNOWN, no fact", () => {
  const result = evaluateExpectation(expectationFromFixture(), baseContext({ observedOutcome: "UNOBSERVED" }))
  assert.deepStrictEqual(result, { status: "UNKNOWN", reason: "actual state could not be observed" })
})

test("T8: incomplete evidence -> INCOMPLETE_EVIDENCE, no fact, never EXPECTED_ABSENCE", () => {
  const result = evaluateExpectation(expectationFromFixture(), baseContext({ evidenceCompleteness: "INCOMPLETE" }))
  assert.equal(result.status, "INCOMPLETE_EVIDENCE")
})

test("T9: disconfirmation count increments exactly once on qualification", () => {
  const result = evaluateExpectation(expectationFromFixture(), baseContext({ disconfirmationCountSoFar: 1 }))
  assert.equal(result.status, "EXPECTED_ABSENCE")
  if (result.status === "EXPECTED_ABSENCE") {
    assert.equal(result.fact.disconfirmationCount, 2)
  }
})

test("T10: no incremented fact emitted for SATISFIED / WITHIN_PATTERN_WINDOW / UNKNOWN / INCOMPLETE_EVIDENCE", () => {
  const nonFactResults = [
    evaluateExpectation(expectationFromFixture(), baseContext({ observedOutcome: "CONFIRMED" })),
    evaluateExpectation(expectationFromFixture(), baseContext({ withinPatternWindow: true })),
    evaluateExpectation(expectationFromFixture(), baseContext({ observedOutcome: "UNOBSERVED" })),
    evaluateExpectation(expectationFromFixture(), baseContext({ evidenceCompleteness: "INCOMPLETE" })),
  ]
  for (const result of nonFactResults) {
    assert.ok(!("fact" in result), `status ${result.status} must not carry a fact`)
  }
})

test("T11: WORLD_PATTERN origin survives into the derived fact", () => {
  const expectation: ExpectationReference = { ...expectationFromFixture(), origin: "WORLD_PATTERN" }
  const result = evaluateExpectation(expectation, baseContext())
  assert.equal(result.status, "EXPECTED_ABSENCE")
  if (result.status === "EXPECTED_ABSENCE") assert.equal(result.fact.origin, "WORLD_PATTERN")
})

test("T12: OBSERVER_KNOWLEDGE origin survives into the derived fact, never converted to WORLD_PATTERN", () => {
  const expectation: ExpectationReference = { ...expectationFromFixture(), origin: "OBSERVER_KNOWLEDGE" }
  const result = evaluateExpectation(expectation, baseContext())
  assert.equal(result.status, "EXPECTED_ABSENCE")
  if (result.status === "EXPECTED_ABSENCE") assert.equal(result.fact.origin, "OBSERVER_KNOWLEDGE")
})

test("T13: artifact provenance and identity survive into the derived fact", () => {
  const result = evaluateExpectation(expectationFromFixture(), baseContext())
  assert.equal(result.status, "EXPECTED_ABSENCE")
  if (result.status === "EXPECTED_ABSENCE") {
    assert.deepStrictEqual(result.fact.artifactReference, {
      sourceId: "BH-E002",
      digest: fixture.provenance.digest,
      ruleId: "meaningful-absence-requires-relational-evidence",
      eventId: "occupancy-check-fails",
    })
    assert.equal(result.fact.expectationId, "occupancy-expectation")
    assert.equal(result.fact.subjectId, "the-role-bearing-object")
    assert.equal(result.fact.property, "occupancy")
    assert.deepStrictEqual(result.fact.evidenceStateIds, ["object-wear-evidence", "other-entity-orientation"])
  }
})

test("T14: determinism -- identical inputs produce a deep-equal result", () => {
  const first = evaluateExpectation(expectationFromFixture(), baseContext())
  const second = evaluateExpectation(expectationFromFixture(), baseContext())
  assert.deepStrictEqual(first, second)
})

test("T15: causal humility -- ExpectedAbsenceFact contains no invented causal conclusion", () => {
  const result = evaluateExpectation(expectationFromFixture(), baseContext())
  assert.equal(result.status, "EXPECTED_ABSENCE")
  if (result.status === "EXPECTED_ABSENCE") {
    assert.deepStrictEqual(Object.keys(result.fact), [
      "expectationId",
      "subjectId",
      "property",
      "origin",
      "evidenceStateIds",
      "logicalTick",
      "disconfirmationCount",
      "artifactReference",
      "persistenceIntent",
    ])
  }
})
