import assert from "node:assert/strict"
import { test } from "node:test"
import {
  CertificationAttemptRejectedError,
  interpretNarrativeEvidence,
  MalformedInterpretationInputError,
  MissingInterpreterIdentityError,
  UnsupportedInputSchemaVersionError,
} from "./index.ts"
import type { InterpreterIdentity, NarrativeInterpretationInput } from "./types.ts"

const IDENTITY: InterpreterIdentity = { name: "narrative-interpretation", version: "0.1.0" }

function validInput(): NarrativeInterpretationInput {
  return {
    schemaVersion: "1",
    evidence: [
      { evidenceId: "ev-1", sourceKind: "TEST_FIXTURE", payload: { note: "a" } },
      { evidenceId: "ev-2", sourceKind: "TEST_FIXTURE", payload: { note: "b" } },
    ],
  }
}

test("T1: package exports load without error and expose the documented public surface", () => {
  assert.equal(typeof interpretNarrativeEvidence, "function")
})

test("T2: valid input produces a derived interpretation candidate", () => {
  const candidate = interpretNarrativeEvidence(validInput(), IDENTITY)
  assert.equal(typeof candidate.candidateId, "string")
  assert.ok(candidate.candidateId.length > 0)
})

test("T3: identical input and identity produce an identical candidate (determinism)", () => {
  const a = interpretNarrativeEvidence(validInput(), IDENTITY)
  const b = interpretNarrativeEvidence(validInput(), IDENTITY)
  assert.deepStrictEqual(a, b)
})

test("T4: deterministic behavior survives repeated execution across many calls", () => {
  const results = Array.from({ length: 5 }, () => interpretNarrativeEvidence(validInput(), IDENTITY))
  for (const result of results) {
    assert.deepStrictEqual(result, results[0])
  }
})

test("T5: the candidate is explicitly non-certified", () => {
  const candidate = interpretNarrativeEvidence(validInput(), IDENTITY)
  assert.equal(candidate.status, "candidate")
  assert.equal(candidate.certified, false)
})

test("T6: interpreter identity and version are present in the candidate's provenance", () => {
  const candidate = interpretNarrativeEvidence(validInput(), IDENTITY)
  assert.deepStrictEqual(candidate.provenance.interpreterIdentity, IDENTITY)
})

test("T7: structurally invalid input fails closed instead of being repaired", () => {
  assert.throws(() => interpretNarrativeEvidence(null, IDENTITY), MalformedInterpretationInputError)
  assert.throws(() => interpretNarrativeEvidence("not an object", IDENTITY), MalformedInterpretationInputError)
  assert.throws(() => interpretNarrativeEvidence([], IDENTITY), MalformedInterpretationInputError)
})

test("T8: malformed evidence entries fail closed rather than being silently repaired", () => {
  const missingEvidenceId = { schemaVersion: "1", evidence: [{ sourceKind: "TEST_FIXTURE", payload: {} }] }
  assert.throws(() => interpretNarrativeEvidence(missingEvidenceId, IDENTITY), MalformedInterpretationInputError)
  const missingPayload = { schemaVersion: "1", evidence: [{ evidenceId: "ev-1", sourceKind: "TEST_FIXTURE" }] }
  assert.throws(() => interpretNarrativeEvidence(missingPayload, IDENTITY), MalformedInterpretationInputError)
})

test("T9: missing or invalid interpreter identity fails closed", () => {
  assert.throws(() => interpretNarrativeEvidence(validInput(), undefined as unknown as InterpreterIdentity), MissingInterpreterIdentityError)
  assert.throws(() => interpretNarrativeEvidence(validInput(), { name: "narrative-interpretation", version: "" }), MissingInterpreterIdentityError)
})

test("T10: unsupported input schema version fails closed", () => {
  const input = { ...validInput(), schemaVersion: "999" }
  assert.throws(() => interpretNarrativeEvidence(input, IDENTITY), UnsupportedInputSchemaVersionError)
})

test("T11: input attempting to present itself as already certified or having a status is rejected", () => {
  const withCertified = { ...validInput(), certified: true }
  assert.throws(() => interpretNarrativeEvidence(withCertified, IDENTITY), CertificationAttemptRejectedError)
  const withStatus = { ...validInput(), status: "certified" }
  assert.throws(() => interpretNarrativeEvidence(withStatus, IDENTITY), CertificationAttemptRejectedError)
})

test("T12: no fabricated evidence ids -- derivedFromEvidenceIds contains exactly and only the supplied evidence ids", () => {
  const candidate = interpretNarrativeEvidence(validInput(), IDENTITY)
  assert.deepStrictEqual(candidate.derivedFromEvidenceIds, ["ev-1", "ev-2"])
  assert.deepStrictEqual(candidate.provenance.sourceEvidenceIds, ["ev-1", "ev-2"])
})

test("T13: provenance is honest about what Phase A cannot yet populate", () => {
  const candidate = interpretNarrativeEvidence(validInput(), IDENTITY)
  assert.ok(candidate.provenance.notYetIntegrated.includes("worldHistoryLineage"))
})

test("T14: input objects are not mutated by interpretation", () => {
  const input = validInput()
  const snapshot = JSON.parse(JSON.stringify(input))
  interpretNarrativeEvidence(input, IDENTITY)
  assert.deepStrictEqual(input, snapshot)
})

test("T15: an empty evidence list is structurally valid and still produces a deterministic candidate", () => {
  const input: NarrativeInterpretationInput = { schemaVersion: "1", evidence: [] }
  const a = interpretNarrativeEvidence(input, IDENTITY)
  const b = interpretNarrativeEvidence(input, IDENTITY)
  assert.deepStrictEqual(a, b)
  assert.deepStrictEqual(a.derivedFromEvidenceIds, [])
})
