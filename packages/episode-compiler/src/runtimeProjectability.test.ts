import assert from "node:assert/strict"
import { test } from "node:test"
import { certifyInterpretationCandidate, evidenceItemFromExpectedAbsenceFact, interpretNarrativeEvidence } from "@avatark/narrative-interpretation"
import type { CertifiedInterpretation, InterpreterIdentity, NarrativeInterpretationInput } from "@avatark/narrative-interpretation"
import { proposeEpisodeContent } from "@avatark/episode-semantic-generation"
import type { ContentOriginIdentity, EpisodeContentInput } from "@avatark/episode-semantic-generation"
import { compileEpisodeCandidate } from "./episodeCandidate.ts"
import { compileEpisodeCandidateWithProposal } from "./episodeCandidateContent.ts"
import { certifyEpisodeCandidate } from "./episodeCertify.ts"
import { certifyEpisodeCandidateWithProposal } from "./episodeCertifyContent.ts"
import { runtimeProjectabilityOf } from "./runtimeProjectability.ts"
import type { EpisodeCompilerIdentity } from "./types.ts"

const INTERPRETER_IDENTITY: InterpreterIdentity = { name: "narrative-interpretation", version: "0.1.0" }
const COMPILER_IDENTITY: EpisodeCompilerIdentity = { name: "episode-compiler", version: "0.1.0" }
const HUMAN_ORIGIN: ContentOriginIdentity = { kind: "human", name: "writer-domain-boundary", version: "1" }
const REAL_EVIDENCE_ID = "expectation-place/waiting-hollow"

function realLookingFact() {
  return {
    expectationId: REAL_EVIDENCE_ID,
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

function validContent(): EpisodeContentInput {
  return {
    title: "The Flute Across Yamuna",
    premise: "A quiet, repeated absence at the waiting hollow becomes noticeable.",
    segments: [{ label: "Arrival", statement: "The visitor approaches the waiting hollow and finds it unusually still.", evidenceReferences: [REAL_EVIDENCE_ID] }],
  }
}

// 21. content-free CertifiedEpisode marked non-runtime-projectable
test("RP1: a content-free CertifiedEpisode (Phase F's own shape) is NOT_RUNTIME_PROJECTABLE", () => {
  const certified = realCertifiedInterpretation()
  const candidate = compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  assert.equal(candidate.decision, "COMPILED")
  if (candidate.decision !== "COMPILED") throw new Error("unreachable")
  const certifiedEpisode = certifyEpisodeCandidate(candidate.episodeCandidate, certified, COMPILER_IDENTITY)
  assert.equal(certifiedEpisode.decision, "CERTIFIED")
  if (certifiedEpisode.decision !== "CERTIFIED") throw new Error("unreachable")
  assert.equal(runtimeProjectabilityOf(certifiedEpisode.certifiedEpisode), "NOT_RUNTIME_PROJECTABLE")
})

// 22. semantic CertifiedEpisode marked runtime-projectable
test("RP2: a real, content-bearing CertifiedEpisode is RUNTIME_PROJECTABLE", () => {
  const certified = realCertifiedInterpretation()
  const proposalResult = proposeEpisodeContent(certified, validContent(), HUMAN_ORIGIN)
  assert.equal(proposalResult.decision, "PROPOSED")
  if (proposalResult.decision !== "PROPOSED") throw new Error("unreachable")
  const candidate = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, proposalResult.proposal)
  assert.equal(candidate.decision, "COMPILED")
  if (candidate.decision !== "COMPILED") throw new Error("unreachable")
  const certifiedEpisode = certifyEpisodeCandidateWithProposal(candidate.episodeCandidate, certified, COMPILER_IDENTITY, proposalResult.proposal)
  assert.equal(certifiedEpisode.decision, "CERTIFIED")
  if (certifiedEpisode.decision !== "CERTIFIED") throw new Error("unreachable")
  assert.equal(runtimeProjectabilityOf(certifiedEpisode.certifiedEpisode), "RUNTIME_PROJECTABLE")
})

test("RP3: runtimeProjectabilityOf is a pure predicate -- calling it twice on the same object produces the same result and does not mutate the object", () => {
  const certified = realCertifiedInterpretation()
  const proposalResult = proposeEpisodeContent(certified, validContent(), HUMAN_ORIGIN)
  assert.equal(proposalResult.decision, "PROPOSED")
  if (proposalResult.decision !== "PROPOSED") throw new Error("unreachable")
  const candidate = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, proposalResult.proposal)
  assert.equal(candidate.decision, "COMPILED")
  if (candidate.decision !== "COMPILED") throw new Error("unreachable")
  const certifiedEpisode = certifyEpisodeCandidateWithProposal(candidate.episodeCandidate, certified, COMPILER_IDENTITY, proposalResult.proposal)
  assert.equal(certifiedEpisode.decision, "CERTIFIED")
  if (certifiedEpisode.decision !== "CERTIFIED") throw new Error("unreachable")
  const before = JSON.stringify(certifiedEpisode.certifiedEpisode)
  assert.equal(runtimeProjectabilityOf(certifiedEpisode.certifiedEpisode), runtimeProjectabilityOf(certifiedEpisode.certifiedEpisode))
  assert.equal(JSON.stringify(certifiedEpisode.certifiedEpisode), before)
})
