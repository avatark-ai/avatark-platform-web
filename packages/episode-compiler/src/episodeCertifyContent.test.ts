import assert from "node:assert/strict"
import { test } from "node:test"
import { certifyInterpretationCandidate, evidenceItemFromExpectedAbsenceFact, interpretNarrativeEvidence } from "@avatark/narrative-interpretation"
import type { CertifiedInterpretation, InterpreterIdentity, NarrativeInterpretationInput } from "@avatark/narrative-interpretation"
import * as episodeSemanticGeneration from "@avatark/episode-semantic-generation"
import { proposeEpisodeContent } from "@avatark/episode-semantic-generation"
import type { ContentOriginIdentity, EpisodeContentInput, EpisodeContentProposal } from "@avatark/episode-semantic-generation"
import { compileEpisodeCandidateWithProposal } from "./episodeCandidateContent.ts"
import { certifyEpisodeCandidateWithProposal } from "./episodeCertifyContent.ts"
import { certifyEpisodeCandidate } from "./episodeCertify.ts"
import { compileEpisodeCandidate } from "./episodeCandidate.ts"
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

function realProposal(certified: CertifiedInterpretation): EpisodeContentProposal {
  const result = proposeEpisodeContent(certified, validContent(), HUMAN_ORIGIN)
  assert.equal(result.decision, "PROPOSED")
  if (result.decision !== "PROPOSED") throw new Error("unreachable")
  return result.proposal
}

// 15. valid semantic candidate certifies
test("SCT1: a real, untampered content-bearing candidate certifies successfully", () => {
  const certified = realCertifiedInterpretation()
  const proposal = realProposal(certified)
  const compiled = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, proposal)
  assert.equal(compiled.decision, "COMPILED")
  if (compiled.decision !== "COMPILED") throw new Error("unreachable")
  const result = certifyEpisodeCandidateWithProposal(compiled.episodeCandidate, certified, COMPILER_IDENTITY, proposal)
  assert.equal(result.decision, "CERTIFIED")
})

// 17. CertifiedEpisode carries exact certified content
test("SCT2: the CertifiedEpisode carries the exact certified content, contentIdentity, contentOriginIdentity, and sourceProposalId", () => {
  const certified = realCertifiedInterpretation()
  const proposal = realProposal(certified)
  const compiled = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, proposal)
  assert.equal(compiled.decision, "COMPILED")
  if (compiled.decision !== "COMPILED") throw new Error("unreachable")
  const result = certifyEpisodeCandidateWithProposal(compiled.episodeCandidate, certified, COMPILER_IDENTITY, proposal)
  assert.equal(result.decision, "CERTIFIED")
  if (result.decision !== "CERTIFIED") throw new Error("unreachable")
  assert.deepEqual(result.certifiedEpisode.content, proposal.content)
  assert.equal(result.certifiedEpisode.contentIdentity, proposal.contentIdentity)
  assert.deepEqual(result.certifiedEpisode.contentOriginIdentity, proposal.contentOriginIdentity)
  assert.equal(result.certifiedEpisode.sourceProposalId, proposal.proposalId)
})

// 16. tampered semantic candidate refused
test("SCT3: a presented candidate whose content was hand-tampered after compilation is refused, not trusted", () => {
  const certified = realCertifiedInterpretation()
  const proposal = realProposal(certified)
  const compiled = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, proposal)
  assert.equal(compiled.decision, "COMPILED")
  if (compiled.decision !== "COMPILED") throw new Error("unreachable")
  const tampered = { ...compiled.episodeCandidate, content: { ...compiled.episodeCandidate.content, title: "A Hand-Tampered Title" } }
  const result = certifyEpisodeCandidateWithProposal(tampered, certified, COMPILER_IDENTITY, proposal)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "CONTENT_MISMATCH")
})

test("SCT4: a presented candidate whose contentIdentity was hand-tampered (content object left alone) is refused", () => {
  const certified = realCertifiedInterpretation()
  const proposal = realProposal(certified)
  const compiled = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, proposal)
  assert.equal(compiled.decision, "COMPILED")
  if (compiled.decision !== "COMPILED") throw new Error("unreachable")
  const tampered = { ...compiled.episodeCandidate, contentIdentity: "0".repeat(64) }
  const result = certifyEpisodeCandidateWithProposal(tampered, certified, COMPILER_IDENTITY, proposal)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "CONTENT_MISMATCH")
})

// 14. certification independently recomputes
test("SCT5: certification recomputes the candidate fresh from the raw source inputs -- it does not merely trust the presented candidate's claimed episodeCandidateId", () => {
  const certified = realCertifiedInterpretation()
  const proposal = realProposal(certified)
  const compiled = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, proposal)
  assert.equal(compiled.decision, "COMPILED")
  if (compiled.decision !== "COMPILED") throw new Error("unreachable")
  const forgedId = { ...compiled.episodeCandidate, episodeCandidateId: "a-forged-id-that-was-never-derived" }
  const result = certifyEpisodeCandidateWithProposal(forgedId, certified, COMPILER_IDENTITY, proposal)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_CANDIDATE_IDENTITY")
})

// 7/8/9 at the certification stage: invalid/tampered proposal rejected
test("SCT6: certifying against an invalid source proposal is refused, not silently certified", () => {
  const certified = realCertifiedInterpretation()
  const proposal = realProposal(certified)
  const compiled = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, proposal)
  assert.equal(compiled.decision, "COMPILED")
  if (compiled.decision !== "COMPILED") throw new Error("unreachable")
  const result = certifyEpisodeCandidateWithProposal(compiled.episodeCandidate, certified, COMPILER_IDENTITY, { not: "a real proposal" })
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_SOURCE_CERTIFIED_INTERPRETATION")
})

// content-free candidates go through the untouched, original certifier
test("SCT7: certifyEpisodeCandidateWithProposal refuses a content-free candidate -- it is not this function's job (use certifyEpisodeCandidate instead)", () => {
  const certified = realCertifiedInterpretation()
  const contentFree = compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  assert.equal(contentFree.decision, "COMPILED")
  if (contentFree.decision !== "COMPILED") throw new Error("unreachable")
  const result = certifyEpisodeCandidateWithProposal(contentFree.episodeCandidate, certified, COMPILER_IDENTITY, realProposal(certified))
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_PROPOSAL")
})

test("SCT8: the original content-free certifyEpisodeCandidate is completely untouched and still certifies a content-free candidate", () => {
  const certified = realCertifiedInterpretation()
  const contentFree = compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  assert.equal(contentFree.decision, "COMPILED")
  if (contentFree.decision !== "COMPILED") throw new Error("unreachable")
  const result = certifyEpisodeCandidate(contentFree.episodeCandidate, certified, COMPILER_IDENTITY)
  assert.equal(result.decision, "CERTIFIED")
  if (result.decision !== "CERTIFIED") throw new Error("unreachable")
  assert.equal(result.certifiedEpisode.content, undefined)
})

// 18. generator cannot certify -- @avatark/episode-semantic-generation
// exports no certify-named symbol, proven here as a cross-package check
// (Stage 2's own authorityBoundary.test.ts already proves this from the
// generator's own side; this proves it from the consumer's side too).
test("SCT9: @avatark/episode-semantic-generation exports no certify-named symbol -- the generator cannot certify its own proposal", () => {
  const exportNames = Object.keys(episodeSemanticGeneration).map((n) => n.toLowerCase())
  assert.ok(!exportNames.some((n) => n.includes("certify")), "episode-semantic-generation must export no certify-named symbol")
})

test("SCT_never_throws: certifyEpisodeCandidateWithProposal never throws, even for wildly malformed input", () => {
  assert.doesNotThrow(() => certifyEpisodeCandidateWithProposal(null, null, null, null))
  assert.doesNotThrow(() => certifyEpisodeCandidateWithProposal(undefined, undefined, undefined, undefined))
  assert.doesNotThrow(() => certifyEpisodeCandidateWithProposal({}, {}, {}, {}))
})
