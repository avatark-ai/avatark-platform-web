import assert from "node:assert/strict"
import { test } from "node:test"
import {
  certifyInterpretationCandidate,
  evidenceItemFromExpectedAbsenceFact,
  interpretNarrativeEvidence,
} from "@avatark/narrative-interpretation"
import type { CertifiedInterpretation, InterpreterIdentity, NarrativeInterpretationInput } from "@avatark/narrative-interpretation"
import { compileEpisodeCandidate } from "./episodeCandidate.ts"
import type { EpisodeCompilerIdentity } from "./types.ts"

const INTERPRETER_IDENTITY: InterpreterIdentity = { name: "narrative-interpretation", version: "0.1.0" }
const COMPILER_IDENTITY: EpisodeCompilerIdentity = { name: "episode-compiler", version: "0.1.0" }

// Hand-constructed, real-shaped ExpectedAbsenceFact -- see compile.test.ts
// for why this avoids importing @avatark/narrative-ir-adapter directly.
function realLookingFact(overrides?: { logicalTick?: number }) {
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
    logicalTick: overrides?.logicalTick ?? 10,
    disconfirmationCount: 1,
    artifactReference: {
      sourceId: "C-repeated-pattern-gap-perceptible-absence",
      digest: "7a823c5abc98bc21c53f4be3ea7444625ca89b7baa679731ab514ba77d84efba",
      ruleId: "runtime-requirements/occupancy-pattern",
      eventId: "place/waiting-hollow",
    },
  }
}

function realInput(overrides?: { logicalTick?: number }): NarrativeInterpretationInput {
  return { schemaVersion: "1", evidence: [evidenceItemFromExpectedAbsenceFact(realLookingFact(overrides))] }
}

function realCertifiedInterpretation(overrides?: { logicalTick?: number }): CertifiedInterpretation {
  const input = realInput(overrides)
  const candidate = interpretNarrativeEvidence(input, INTERPRETER_IDENTITY)
  const result = certifyInterpretationCandidate(candidate, input, INTERPRETER_IDENTITY)
  assert.equal(result.decision, "CERTIFIED")
  if (result.decision !== "CERTIFIED") throw new Error("unreachable")
  return result.certifiedInterpretation
}

// 1, 2, 3. EpisodeCandidate produced from a valid CertifiedInterpretation, explicitly candidate/non-certified.
test("F1: a valid CertifiedInterpretation compiles into an explicitly candidate, non-certified EpisodeCandidate", () => {
  const certified = realCertifiedInterpretation()
  const result = compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  assert.equal(result.decision, "COMPILED")
  if (result.decision !== "COMPILED") throw new Error("unreachable")
  assert.equal(result.episodeCandidate.status, "candidate")
  assert.equal(result.episodeCandidate.certified, false)
})

// 4. Raw NarrativeInterpretationCandidate rejected.
test("F2: a raw, uncertified NarrativeInterpretationCandidate is rejected", () => {
  const candidate = interpretNarrativeEvidence(realInput(), INTERPRETER_IDENTITY)
  const result = compileEpisodeCandidate(candidate, COMPILER_IDENTITY)
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_CERTIFIED_INTERPRETATION")
})

// 5. Malformed CertifiedInterpretation rejected.
test("F3: malformed input is rejected, never thrown", () => {
  assert.doesNotThrow(() => compileEpisodeCandidate(null, COMPILER_IDENTITY))
  const result = compileEpisodeCandidate({ certifiedInterpretationId: "x" }, COMPILER_IDENTITY)
  assert.equal(result.decision, "REJECTED")
})

// 6. Certification is not invoked -- proven statically in authorityBoundary.test.ts (T5/T5b).

// 7. Identical certified input + compiler identity -> identical candidate ID.
test("F4: identical certified input and compiler identity produce an identical episodeCandidateId", () => {
  const certified = realCertifiedInterpretation()
  const a = compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  const b = compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  assert.equal(a.decision, "COMPILED")
  assert.equal(b.decision, "COMPILED")
  if (a.decision !== "COMPILED" || b.decision !== "COMPILED") throw new Error("unreachable")
  assert.deepStrictEqual(a.episodeCandidate, b.episodeCandidate)
})

// 8. Changed CertifiedInterpretation identity changes candidate ID.
test("F5: a different certified interpretation produces a different episodeCandidateId", () => {
  const certifiedA = realCertifiedInterpretation()
  const certifiedB = realCertifiedInterpretation({ logicalTick: 99 })
  assert.notEqual(certifiedA.certifiedInterpretationId, certifiedB.certifiedInterpretationId)
  const resultA = compileEpisodeCandidate(certifiedA, COMPILER_IDENTITY)
  const resultB = compileEpisodeCandidate(certifiedB, COMPILER_IDENTITY)
  assert.equal(resultA.decision, "COMPILED")
  assert.equal(resultB.decision, "COMPILED")
  if (resultA.decision !== "COMPILED" || resultB.decision !== "COMPILED") throw new Error("unreachable")
  assert.notEqual(resultA.episodeCandidate.episodeCandidateId, resultB.episodeCandidate.episodeCandidateId)
})

// 9. Changed compiler version changes candidate ID.
test("F6: a different compiler identity/version produces a different episodeCandidateId for the identical certified input", () => {
  const certified = realCertifiedInterpretation()
  const resultV1 = compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  const resultV2 = compileEpisodeCandidate(certified, { name: "episode-compiler", version: "0.2.0" })
  assert.equal(resultV1.decision, "COMPILED")
  assert.equal(resultV2.decision, "COMPILED")
  if (resultV1.decision !== "COMPILED" || resultV2.decision !== "COMPILED") throw new Error("unreachable")
  assert.notEqual(resultV1.episodeCandidate.episodeCandidateId, resultV2.episodeCandidate.episodeCandidateId)
})

// 10, 11, 12. Provenance preserves exact sourceCertifiedInterpretationId/sourceCandidateId/sourceInterpretationInputIdentity.
test("F7: the candidate preserves the exact upstream identity chain", () => {
  const certified = realCertifiedInterpretation()
  const result = compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  assert.equal(result.decision, "COMPILED")
  if (result.decision !== "COMPILED") throw new Error("unreachable")
  assert.equal(result.episodeCandidate.sourceCertifiedInterpretationId, certified.certifiedInterpretationId)
  assert.equal(result.episodeCandidate.sourceCandidateId, certified.candidateId)
  assert.equal(result.episodeCandidate.sourceInterpretationInputIdentity, certified.interpretationInputIdentity)
})

// 13. No World provenance fabricated -- every carried identity traces back to a known field on the certified input.
test("F8: the candidate invents no identifier -- every carried value traces back to the certified input", () => {
  const certified = realCertifiedInterpretation()
  const result = compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  assert.equal(result.decision, "COMPILED")
  if (result.decision !== "COMPILED") throw new Error("unreachable")
  const knownValues = [certified.certifiedInterpretationId, certified.candidateId, certified.interpretationInputIdentity]
  assert.ok(knownValues.includes(result.episodeCandidate.sourceCertifiedInterpretationId))
  assert.ok(knownValues.includes(result.episodeCandidate.sourceCandidateId))
  assert.ok(knownValues.includes(result.episodeCandidate.sourceInterpretationInputIdentity))
})

// 14. Source CertifiedInterpretation not mutated.
test("F9: compilation does not mutate the certified interpretation or compiler identity passed to it", () => {
  const certified = realCertifiedInterpretation()
  const certifiedSnapshot = JSON.parse(JSON.stringify(certified))
  const identitySnapshot = JSON.parse(JSON.stringify(COMPILER_IDENTITY))
  compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  assert.deepStrictEqual(certified, certifiedSnapshot)
  assert.deepStrictEqual(COMPILER_IDENTITY, identitySnapshot)
})

// 32. Semantic payload contains no unsupported invented narrative meaning -- the candidate's own field set is closed and provenance-only.
test("F10: the candidate carries exactly its documented fields, no invented semantic payload", () => {
  const certified = realCertifiedInterpretation()
  const result = compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  assert.equal(result.decision, "COMPILED")
  if (result.decision !== "COMPILED") throw new Error("unreachable")
  assert.deepStrictEqual(Object.keys(result.episodeCandidate).sort(), [
    "certified",
    "compilerIdentity",
    "episodeCandidateId",
    "sourceCandidateId",
    "sourceCertifiedInterpretationId",
    "sourceInterpretationInputIdentity",
    "status",
  ])
})
