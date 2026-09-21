import assert from "node:assert/strict"
import { test } from "node:test"
import {
  certifyInterpretationCandidate,
  evidenceItemFromExpectedAbsenceFact,
  interpretNarrativeEvidence,
} from "@avatark/narrative-interpretation"
import type { CertifiedInterpretation, InterpreterIdentity, NarrativeInterpretationInput } from "@avatark/narrative-interpretation"
import { compileEpisodeFoundation, isCertifiedInterpretation } from "./index.ts"
import type { EpisodeCompilerIdentity } from "./types.ts"

const INTERPRETER_IDENTITY: InterpreterIdentity = { name: "narrative-interpretation", version: "0.1.0" }
const COMPILER_IDENTITY: EpisodeCompilerIdentity = { name: "episode-compiler", version: "0.1.0" }

// A hand-constructed, real-shaped ExpectedAbsenceFact -- deliberately built
// without importing @avatark/narrative-ir-adapter (episode-compiler has no
// dependency on it, including in tests; see authorityBoundary.test.ts).
// The digest embedded here is the same real, compiler-produced SHA-256
// this arc's prior gates (G10C-3/G10C-4) already independently verified --
// reused for realism, not re-derived here.
function realLookingFact() {
  return {
    expectationId: "expectation-place/waiting-hollow",
    subjectId: "place/waiting-hollow",
    property: "occupancy",
    origin: "WORLD_PATTERN" as const,
    irVersion: "0.3.0",
    evidenceStateIds: [
      "expectation-place/waiting-hollow-evidence-0",
      "expectation-place/waiting-hollow-evidence-1",
      "expectation-place/waiting-hollow-evidence-2",
      "expectation-place/waiting-hollow-evidence-3",
    ],
    logicalTick: 10,
    disconfirmationCount: 1,
    artifactReference: {
      sourceId: "C-repeated-pattern-gap-perceptible-absence",
      digest: "7a823c5abc98bc21c53f4be3ea7444625ca89b7baa679731ab514ba77d84efba",
      ruleId: "runtime-requirements/occupancy-pattern",
      eventId: "place/waiting-hollow",
    },
  }
}

function realInput(): NarrativeInterpretationInput {
  return { schemaVersion: "1", evidence: [evidenceItemFromExpectedAbsenceFact(realLookingFact())] }
}

function realCertifiedInterpretation(): CertifiedInterpretation {
  const input = realInput()
  const candidate = interpretNarrativeEvidence(input, INTERPRETER_IDENTITY)
  const result = certifyInterpretationCandidate(candidate, input, INTERPRETER_IDENTITY)
  assert.equal(result.decision, "CERTIFIED", "test fixture must itself be certifiable -- if this fails, the fixture or upstream behavior changed")
  if (result.decision !== "CERTIFIED") throw new Error("unreachable")
  return result.certifiedInterpretation
}

// 1. Package loads/exports correctly.
test("E1: package exports load without error and expose the documented public surface", () => {
  assert.equal(typeof compileEpisodeFoundation, "function")
  assert.equal(typeof isCertifiedInterpretation, "function")
})

// 2. Valid CertifiedInterpretation is accepted.
test("E2: a valid, real CertifiedInterpretation is compiled", () => {
  const certified = realCertifiedInterpretation()
  const result = compileEpisodeFoundation(certified, COMPILER_IDENTITY)
  assert.equal(result.decision, "COMPILED")
})

// 3. Raw NarrativeInterpretationCandidate is rejected.
test("E3: a raw, uncertified NarrativeInterpretationCandidate is rejected", () => {
  const input = realInput()
  const candidate = interpretNarrativeEvidence(input, INTERPRETER_IDENTITY)
  const result = compileEpisodeFoundation(candidate, COMPILER_IDENTITY)
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_CERTIFIED_INTERPRETATION")
})

// 4. A structurally similar uncertified object is rejected.
test("E4: an object with the right field names but a fabricated certifiedInterpretationId is rejected", () => {
  const certified = realCertifiedInterpretation()
  const lookalike = { ...certified, certifiedInterpretationId: "0".repeat(64) }
  const result = compileEpisodeFoundation(lookalike, COMPILER_IDENTITY)
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_CERTIFIED_INTERPRETATION")
})

test("E4b: an object claiming a different certification authority/policy is rejected even if otherwise well-formed", () => {
  const certified = realCertifiedInterpretation()
  const lookalike = { ...certified, certificationAuthorityIdentity: { name: "a-different-authority", version: "0.1.0" } }
  const result = compileEpisodeFoundation(lookalike, COMPILER_IDENTITY)
  assert.equal(result.decision, "REJECTED")
})

// 5. Episode Compiler does not invoke certification -- proven statically in authorityBoundary.test.ts (T-series).

// 6. Same certified input + compiler version -> same deterministic result.
test("E5: identical certified input and compiler identity produce an identical foundationId", () => {
  const certified = realCertifiedInterpretation()
  const a = compileEpisodeFoundation(certified, COMPILER_IDENTITY)
  const b = compileEpisodeFoundation(certified, COMPILER_IDENTITY)
  assert.equal(a.decision, "COMPILED")
  assert.equal(b.decision, "COMPILED")
  if (a.decision !== "COMPILED" || b.decision !== "COMPILED") throw new Error("unreachable")
  assert.deepStrictEqual(a.foundation, b.foundation)
})

// 7. Changed certifiedInterpretationId changes compiler result identity.
test("E6: a different (but still self-consistent) certified interpretation produces a different foundationId", () => {
  const factA = realLookingFact()
  const factB = { ...factA, logicalTick: 99 }
  const inputA: NarrativeInterpretationInput = { schemaVersion: "1", evidence: [evidenceItemFromExpectedAbsenceFact(factA)] }
  const inputB: NarrativeInterpretationInput = { schemaVersion: "1", evidence: [evidenceItemFromExpectedAbsenceFact(factB)] }
  const candidateA = interpretNarrativeEvidence(inputA, INTERPRETER_IDENTITY)
  const candidateB = interpretNarrativeEvidence(inputB, INTERPRETER_IDENTITY)
  const certifiedA = certifyInterpretationCandidate(candidateA, inputA, INTERPRETER_IDENTITY)
  const certifiedB = certifyInterpretationCandidate(candidateB, inputB, INTERPRETER_IDENTITY)
  assert.equal(certifiedA.decision, "CERTIFIED")
  assert.equal(certifiedB.decision, "CERTIFIED")
  if (certifiedA.decision !== "CERTIFIED" || certifiedB.decision !== "CERTIFIED") throw new Error("unreachable")
  assert.notEqual(certifiedA.certifiedInterpretation.certifiedInterpretationId, certifiedB.certifiedInterpretation.certifiedInterpretationId)

  const resultA = compileEpisodeFoundation(certifiedA.certifiedInterpretation, COMPILER_IDENTITY)
  const resultB = compileEpisodeFoundation(certifiedB.certifiedInterpretation, COMPILER_IDENTITY)
  assert.equal(resultA.decision, "COMPILED")
  assert.equal(resultB.decision, "COMPILED")
  if (resultA.decision !== "COMPILED" || resultB.decision !== "COMPILED") throw new Error("unreachable")
  assert.notEqual(resultA.foundation.foundationId, resultB.foundation.foundationId)
})

// 8. Changed compiler version changes compiler result identity.
test("E7: a different compiler identity/version produces a different foundationId for the identical certified input", () => {
  const certified = realCertifiedInterpretation()
  const resultV1 = compileEpisodeFoundation(certified, COMPILER_IDENTITY)
  const resultV2 = compileEpisodeFoundation(certified, { name: "episode-compiler", version: "0.2.0" })
  assert.equal(resultV1.decision, "COMPILED")
  assert.equal(resultV2.decision, "COMPILED")
  if (resultV1.decision !== "COMPILED" || resultV2.decision !== "COMPILED") throw new Error("unreachable")
  assert.notEqual(resultV1.foundation.foundationId, resultV2.foundation.foundationId)
})

// 9. Exact CertifiedInterpretation identity preserved in provenance.
test("E8: the foundation preserves the exact upstream identity chain", () => {
  const certified = realCertifiedInterpretation()
  const result = compileEpisodeFoundation(certified, COMPILER_IDENTITY)
  assert.equal(result.decision, "COMPILED")
  if (result.decision !== "COMPILED") throw new Error("unreachable")
  assert.equal(result.foundation.sourceCertifiedInterpretationId, certified.certifiedInterpretationId)
  assert.equal(result.foundation.sourceCandidateId, certified.candidateId)
  assert.equal(result.foundation.sourceInterpretationInputIdentity, certified.interpretationInputIdentity)
})

// 10. Source evidence provenance is not fabricated -- the foundation carries only identities that trace back to the real certified input, nothing invented.
test("E9: the foundation invents no identifier -- every carried value traces back to the certified input", () => {
  const certified = realCertifiedInterpretation()
  const result = compileEpisodeFoundation(certified, COMPILER_IDENTITY)
  assert.equal(result.decision, "COMPILED")
  if (result.decision !== "COMPILED") throw new Error("unreachable")
  const knownValues = [certified.certifiedInterpretationId, certified.candidateId, certified.interpretationInputIdentity]
  assert.ok(knownValues.includes(result.foundation.sourceCertifiedInterpretationId))
  assert.ok(knownValues.includes(result.foundation.sourceCandidateId))
  assert.ok(knownValues.includes(result.foundation.sourceInterpretationInputIdentity))
})

// 28. Input CertifiedInterpretation is not mutated.
test("E10: compilation does not mutate the certified interpretation or compiler identity passed to it", () => {
  const certified = realCertifiedInterpretation()
  const certifiedSnapshot = JSON.parse(JSON.stringify(certified))
  const identitySnapshot = JSON.parse(JSON.stringify(COMPILER_IDENTITY))
  compileEpisodeFoundation(certified, COMPILER_IDENTITY)
  assert.deepStrictEqual(certified, certifiedSnapshot)
  assert.deepStrictEqual(COMPILER_IDENTITY, identitySnapshot)
})

// 29. Invalid/tampered CertifiedInterpretation fails closed -- never throws.
test("E11: malformed input is rejected, never thrown", () => {
  assert.doesNotThrow(() => compileEpisodeFoundation(null, COMPILER_IDENTITY))
  const result = compileEpisodeFoundation(null, COMPILER_IDENTITY)
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_CERTIFIED_INTERPRETATION")
})

test("E12: a malformed compiler identity is rejected", () => {
  const certified = realCertifiedInterpretation()
  const result = compileEpisodeFoundation(certified, { name: "" })
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_COMPILER_IDENTITY")
})

// isCertifiedInterpretation as its own public type guard.
test("E13: isCertifiedInterpretation agrees with compileEpisodeFoundation's own acceptance decision", () => {
  const certified = realCertifiedInterpretation()
  assert.equal(isCertifiedInterpretation(certified), true)
  const candidate = interpretNarrativeEvidence(realInput(), INTERPRETER_IDENTITY)
  assert.equal(isCertifiedInterpretation(candidate), false)
})
