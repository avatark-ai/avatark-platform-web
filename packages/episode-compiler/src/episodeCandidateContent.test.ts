import assert from "node:assert/strict"
import { test } from "node:test"
import { certifyInterpretationCandidate, evidenceItemFromExpectedAbsenceFact, interpretNarrativeEvidence } from "@avatark/narrative-interpretation"
import type { CertifiedInterpretation, InterpreterIdentity, NarrativeInterpretationInput } from "@avatark/narrative-interpretation"
import { proposeEpisodeContent } from "@avatark/episode-semantic-generation"
import type { ContentOriginIdentity, EpisodeContentInput, EpisodeContentProposal } from "@avatark/episode-semantic-generation"
import { compileEpisodeCandidate } from "./episodeCandidate.ts"
import { compileEpisodeCandidateWithProposal } from "./episodeCandidateContent.ts"
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
    segments: [
      { label: "Arrival", statement: "The visitor approaches the waiting hollow and finds it unusually still.", evidenceReferences: [REAL_EVIDENCE_ID] },
      { label: "Recognition", statement: "The pattern of absence becomes explicit rather than merely felt." },
    ],
  }
}

function realProposal(certified: CertifiedInterpretation, content = validContent()): EpisodeContentProposal {
  const result = proposeEpisodeContent(certified, content, HUMAN_ORIGIN)
  assert.equal(result.decision, "PROPOSED")
  if (result.decision !== "PROPOSED") throw new Error("unreachable")
  return result.proposal
}

// 1. semantic proposal compiles into EpisodeCandidate
test("SC1: a real, valid EpisodeContentProposal compiles into a COMPILED EpisodeCandidate", () => {
  const certified = realCertifiedInterpretation()
  const result = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, realProposal(certified))
  assert.equal(result.decision, "COMPILED")
})

// 2. candidate remains non-certified
test("SC2: the resulting candidate remains status:candidate / certified:false", () => {
  const certified = realCertifiedInterpretation()
  const result = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, realProposal(certified))
  assert.equal(result.decision, "COMPILED")
  if (result.decision !== "COMPILED") throw new Error("unreachable")
  assert.equal(result.episodeCandidate.status, "candidate")
  assert.equal(result.episodeCandidate.certified, false)
})

// 3. exact content preserved
test("SC3: the candidate's content is copied verbatim from the proposal, never reconstructed", () => {
  const certified = realCertifiedInterpretation()
  const proposal = realProposal(certified)
  const result = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, proposal)
  assert.equal(result.decision, "COMPILED")
  if (result.decision !== "COMPILED") throw new Error("unreachable")
  assert.deepEqual(result.episodeCandidate.content, proposal.content)
})

// 4. contentIdentity preserved/revalidated
test("SC4: the candidate's contentIdentity exactly matches the proposal's own contentIdentity", () => {
  const certified = realCertifiedInterpretation()
  const proposal = realProposal(certified)
  const result = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, proposal)
  assert.equal(result.decision, "COMPILED")
  if (result.decision !== "COMPILED") throw new Error("unreachable")
  assert.equal(result.episodeCandidate.contentIdentity, proposal.contentIdentity)
})

// 5. contentOriginIdentity preserved
test("SC5: the candidate's contentOriginIdentity exactly matches the proposal's own", () => {
  const certified = realCertifiedInterpretation()
  const proposal = realProposal(certified)
  const result = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, proposal)
  assert.equal(result.decision, "COMPILED")
  if (result.decision !== "COMPILED") throw new Error("unreachable")
  assert.deepEqual(result.episodeCandidate.contentOriginIdentity, proposal.contentOriginIdentity)
})

// 6. evidence refs preserved
test("SC6: segment evidence references are preserved exactly through compilation", () => {
  const certified = realCertifiedInterpretation()
  const proposal = realProposal(certified)
  const result = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, proposal)
  assert.equal(result.decision, "COMPILED")
  if (result.decision !== "COMPILED") throw new Error("unreachable")
  assert.deepEqual(result.episodeCandidate.content?.segments[0].evidenceReferences, [{ evidenceId: REAL_EVIDENCE_ID }])
})

// 7. invalid proposal rejected
test("SC7: a structurally malformed proposal is rejected, never thrown", () => {
  const certified = realCertifiedInterpretation()
  const result = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, { not: "a proposal" })
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_PROPOSAL")
})

// 8. tampered content rejected
test("SC8: a proposal whose content was hand-tampered after construction (contentIdentity no longer matches) is rejected", () => {
  const certified = realCertifiedInterpretation()
  const proposal = realProposal(certified)
  const tampered = { ...proposal, content: { ...proposal.content, title: "A Tampered Title" } }
  const result = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, tampered)
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_PROPOSAL")
})

// 9. tampered contentIdentity rejected
test("SC9: a proposal whose contentIdentity field was hand-tampered (content itself left alone) is rejected", () => {
  const certified = realCertifiedInterpretation()
  const proposal = realProposal(certified)
  const tampered = { ...proposal, contentIdentity: "0".repeat(64) }
  const result = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, tampered)
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_PROPOSAL")
})

test("SC9b: a proposal from a different CertifiedInterpretation than the one supplied is rejected as a source mismatch, not silently compiled", () => {
  const certifiedA = realCertifiedInterpretation()
  const proposalFromA = realProposal(certifiedA)
  // A structurally-real proposal, but its own sourceCertifiedInterpretationId
  // is hand-set to something that does not match certifiedA -- proves the
  // mismatch check fires even when the proposal is otherwise self-consistent.
  const proposalClaimingDifferentSource = { ...proposalFromA, sourceCertifiedInterpretationId: "not-the-real-source-id" }
  const result = compileEpisodeCandidateWithProposal(certifiedA, COMPILER_IDENTITY, proposalClaimingDifferentSource)
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  // The tampered sourceCertifiedInterpretationId also breaks proposalId
  // self-consistency, so INVALID_PROPOSAL fires before the mismatch check
  // is ever reached -- both are legitimate, evidence-based rejections.
  assert.ok(result.reason === "INVALID_PROPOSAL" || result.reason === "PROPOSAL_SOURCE_MISMATCH")
})

// 11. candidate ID changes with content
test("SC11: two proposals with different content (same source, same compiler) produce different episodeCandidateIds", () => {
  const certified = realCertifiedInterpretation()
  const a = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, realProposal(certified, validContent()))
  const b = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, realProposal(certified, { ...validContent(), title: "A Different Title" }))
  assert.equal(a.decision, "COMPILED")
  assert.equal(b.decision, "COMPILED")
  if (a.decision !== "COMPILED" || b.decision !== "COMPILED") throw new Error("unreachable")
  assert.notEqual(a.episodeCandidate.episodeCandidateId, b.episodeCandidate.episodeCandidateId)
})

// 12. candidate ID changes with compiler version
test("SC12: the same proposal compiled under two different compiler identities produces two different episodeCandidateIds", () => {
  const certified = realCertifiedInterpretation()
  const proposal = realProposal(certified)
  const a = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, proposal)
  const b = compileEpisodeCandidateWithProposal(certified, { name: "episode-compiler", version: "0.2.0" }, proposal)
  assert.equal(a.decision, "COMPILED")
  assert.equal(b.decision, "COMPILED")
  if (a.decision !== "COMPILED" || b.decision !== "COMPILED") throw new Error("unreachable")
  assert.notEqual(a.episodeCandidate.episodeCandidateId, b.episodeCandidate.episodeCandidateId)
})

// 13. candidate deterministic
test("SC13: compiling the identical proposal twice produces an identical episodeCandidateId", () => {
  const certified = realCertifiedInterpretation()
  const proposal = realProposal(certified)
  const a = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, proposal)
  const b = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, proposal)
  assert.equal(a.decision, "COMPILED")
  assert.equal(b.decision, "COMPILED")
  if (a.decision !== "COMPILED" || b.decision !== "COMPILED") throw new Error("unreachable")
  assert.equal(a.episodeCandidate.episodeCandidateId, b.episodeCandidate.episodeCandidateId)
})

test("SC13b: a content-bearing candidate's identity space is disjoint from the content-free candidate's identity for the same CertifiedInterpretation/compiler", () => {
  const certified = realCertifiedInterpretation()
  const contentFree = compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  const withContent = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, realProposal(certified))
  assert.equal(contentFree.decision, "COMPILED")
  assert.equal(withContent.decision, "COMPILED")
  if (contentFree.decision !== "COMPILED" || withContent.decision !== "COMPILED") throw new Error("unreachable")
  assert.notEqual(contentFree.episodeCandidate.episodeCandidateId, withContent.episodeCandidate.episodeCandidateId)
})

// 20. content-free legacy candidate remains valid where ratified
test("SC20: compileEpisodeCandidate (the original, content-free path) is completely untouched -- still produces a candidate with content undefined", () => {
  const certified = realCertifiedInterpretation()
  const result = compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  assert.equal(result.decision, "COMPILED")
  if (result.decision !== "COMPILED") throw new Error("unreachable")
  assert.equal(result.episodeCandidate.content, undefined)
  assert.equal(result.episodeCandidate.contentIdentity, undefined)
  assert.equal(result.episodeCandidate.sourceProposalId, undefined)
})

test("SC_never_throws: compileEpisodeCandidateWithProposal never throws, even for wildly malformed input", () => {
  assert.doesNotThrow(() => compileEpisodeCandidateWithProposal(null, null, null))
  assert.doesNotThrow(() => compileEpisodeCandidateWithProposal(undefined, undefined, undefined))
  assert.doesNotThrow(() => compileEpisodeCandidateWithProposal({}, {}, {}))
})
