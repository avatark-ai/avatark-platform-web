import assert from "node:assert/strict"
import { test } from "node:test"
import { certifyInterpretationCandidate, evidenceItemFromExpectedAbsenceFact, interpretNarrativeEvidence } from "@avatark/narrative-interpretation"
import type { CertifiedInterpretation, InterpreterIdentity, NarrativeInterpretationInput } from "@avatark/narrative-interpretation"
import { compileEpisodeCandidate } from "./episodeCandidate.ts"
import { certifyEpisodeCandidate as certifyEpisodeCandidateReal } from "./episodeCertify.ts"
import { CERTIFIED_EPISODE_CONTRACT_VERSION, serializeCertifiedEpisodeContract } from "./contractSerialization.ts"
import type { EpisodeCompilerIdentity } from "./types.ts"

const INTERPRETER_IDENTITY: InterpreterIdentity = { name: "narrative-interpretation", version: "0.1.0" }
const COMPILER_IDENTITY: EpisodeCompilerIdentity = { name: "episode-compiler", version: "0.1.0" }

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
  assert.equal(result.decision, "CERTIFIED")
  if (result.decision !== "CERTIFIED") throw new Error("unreachable")
  return result.certifiedInterpretation
}

test("CS1: a real, content-free CertifiedEpisode serializes into a versioned contract document", () => {
  const certified = realCertifiedInterpretation()
  const candidate = compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  assert.equal(candidate.decision, "COMPILED")
  if (candidate.decision !== "COMPILED") throw new Error("unreachable")
  const certifiedEpisode = certifyEpisodeCandidateReal(candidate.episodeCandidate, certified, COMPILER_IDENTITY)
  assert.equal(certifiedEpisode.decision, "CERTIFIED")
  if (certifiedEpisode.decision !== "CERTIFIED") throw new Error("unreachable")

  const result = serializeCertifiedEpisodeContract(certifiedEpisode.certifiedEpisode)
  assert.equal(result.decision, "SERIALIZED")
  if (result.decision !== "SERIALIZED") throw new Error("unreachable")
  assert.equal(result.document.contractVersion, CERTIFIED_EPISODE_CONTRACT_VERSION)
  assert.equal(result.document.certifiedEpisode.certifiedEpisodeId, certifiedEpisode.certifiedEpisode.certifiedEpisodeId)
})

test("CS2: serialization never mutates the supplied CertifiedEpisode", () => {
  const certified = realCertifiedInterpretation()
  const candidate = compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  assert.equal(candidate.decision, "COMPILED")
  if (candidate.decision !== "COMPILED") throw new Error("unreachable")
  const certifiedEpisode = certifyEpisodeCandidateReal(candidate.episodeCandidate, certified, COMPILER_IDENTITY)
  assert.equal(certifiedEpisode.decision, "CERTIFIED")
  if (certifiedEpisode.decision !== "CERTIFIED") throw new Error("unreachable")
  const before = JSON.stringify(certifiedEpisode.certifiedEpisode)
  serializeCertifiedEpisodeContract(certifiedEpisode.certifiedEpisode)
  assert.equal(JSON.stringify(certifiedEpisode.certifiedEpisode), before)
})

test("CS3: a malformed/non-CertifiedEpisode input is rejected, never wrapped as if it were real", () => {
  const result = serializeCertifiedEpisodeContract({ not: "a real certified episode" })
  assert.equal(result.decision, "REJECTED")
})

test("CS4: serialization round-trips through JSON.stringify/JSON.parse without losing any field", () => {
  const certified = realCertifiedInterpretation()
  const candidate = compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  assert.equal(candidate.decision, "COMPILED")
  if (candidate.decision !== "COMPILED") throw new Error("unreachable")
  const certifiedEpisode = certifyEpisodeCandidateReal(candidate.episodeCandidate, certified, COMPILER_IDENTITY)
  assert.equal(certifiedEpisode.decision, "CERTIFIED")
  if (certifiedEpisode.decision !== "CERTIFIED") throw new Error("unreachable")
  const result = serializeCertifiedEpisodeContract(certifiedEpisode.certifiedEpisode)
  assert.equal(result.decision, "SERIALIZED")
  if (result.decision !== "SERIALIZED") throw new Error("unreachable")
  const roundTripped = JSON.parse(JSON.stringify(result.document))
  assert.deepEqual(roundTripped, result.document)
})

test("CS_never_throws: serializeCertifiedEpisodeContract never throws", () => {
  assert.doesNotThrow(() => serializeCertifiedEpisodeContract(null))
  assert.doesNotThrow(() => serializeCertifiedEpisodeContract(undefined))
  assert.doesNotThrow(() => serializeCertifiedEpisodeContract("not an object"))
})
