import assert from "node:assert/strict"
import { test } from "node:test"
import { certifyInterpretationCandidate, evidenceItemFromExpectedAbsenceFact, interpretNarrativeEvidence } from "@avatark/narrative-interpretation"
import type { CertifiedInterpretation, InterpreterIdentity, NarrativeInterpretationInput } from "@avatark/narrative-interpretation"
import { proposeEpisodeContent } from "./index.ts"
import type { ContentOriginIdentity, EpisodeContentInput } from "./types.ts"

// Same real-shaped fixture pattern @avatark/episode-compiler's own
// compile.test.ts uses -- built without importing
// @avatark/narrative-ir-adapter (this package has no dependency on it
// either; see authorityBoundary.test.ts).
const INTERPRETER_IDENTITY: InterpreterIdentity = { name: "narrative-interpretation", version: "0.1.0" }

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
  assert.equal(result.decision, "CERTIFIED", "test fixture must itself be certifiable")
  if (result.decision !== "CERTIFIED") throw new Error("unreachable")
  return result.certifiedInterpretation
}

const REAL_EVIDENCE_ID = "expectation-place/waiting-hollow"

const HUMAN_ORIGIN: ContentOriginIdentity = { kind: "human", name: "writer-domain-boundary", version: "1" }

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

// 1. valid human semantic input creates proposal
test("PG1: valid human semantic input, against a real CertifiedInterpretation, creates a PROPOSED result", () => {
  const result = proposeEpisodeContent(realCertifiedInterpretation(), validContent(), HUMAN_ORIGIN)
  assert.equal(result.decision, "PROPOSED")
})

// 2. proposal is non-authoritative
test("PG2: the proposal carries an explicit, non-authoritative status", () => {
  const result = proposeEpisodeContent(realCertifiedInterpretation(), validContent(), HUMAN_ORIGIN)
  assert.equal(result.decision, "PROPOSED")
  if (result.decision !== "PROPOSED") throw new Error("unreachable")
  assert.equal(result.proposal.status, "proposal")
  assert.equal(result.proposal.kind, "EPISODE_CONTENT_PROPOSAL")
})

// 3. proposal cannot be CertifiedEpisode
test("PG3: the proposal shape carries no certifiedEpisodeId, no certified:true, and no certification identity fields -- it cannot be mistaken for a CertifiedEpisode", () => {
  const result = proposeEpisodeContent(realCertifiedInterpretation(), validContent(), HUMAN_ORIGIN)
  assert.equal(result.decision, "PROPOSED")
  if (result.decision !== "PROPOSED") throw new Error("unreachable")
  const record = result.proposal as unknown as Record<string, unknown>
  assert.equal("certifiedEpisodeId" in record, false)
  assert.equal("certificationAuthorityIdentity" in record, false)
  assert.equal("certified" in record, false)
})

// 5. CertifiedInterpretation required
test("PG5: an absent/undefined CertifiedInterpretation is rejected", () => {
  const result = proposeEpisodeContent(undefined, validContent(), HUMAN_ORIGIN)
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_CERTIFIED_INTERPRETATION")
})

// 6. invalid CertifiedInterpretation rejected
test("PG6: a structurally malformed CertifiedInterpretation is rejected, never thrown", () => {
  const result = proposeEpisodeContent({ certifiedInterpretationId: "fake" }, validContent(), HUMAN_ORIGIN)
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_CERTIFIED_INTERPRETATION")
})

test("PG6b: a raw, uncertified NarrativeInterpretationCandidate (carrying status/certified) is rejected as not a CertifiedInterpretation", () => {
  const input = realInput()
  const candidate = interpretNarrativeEvidence(input, INTERPRETER_IDENTITY)
  const result = proposeEpisodeContent(candidate, validContent(), HUMAN_ORIGIN)
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_CERTIFIED_INTERPRETATION")
})

// 7. title required
test("PG7: missing title is rejected", () => {
  const content = { ...validContent(), title: "" }
  const result = proposeEpisodeContent(realCertifiedInterpretation(), content, HUMAN_ORIGIN)
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "MISSING_TITLE")
})

// 8. premise required
test("PG8: missing premise is rejected", () => {
  const content = { ...validContent(), premise: "" }
  const result = proposeEpisodeContent(realCertifiedInterpretation(), content, HUMAN_ORIGIN)
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "MISSING_PREMISE")
})

// 9. at least one segment required
test("PG9: an empty segments array is rejected", () => {
  const content = { ...validContent(), segments: [] }
  const result = proposeEpisodeContent(realCertifiedInterpretation(), content, HUMAN_ORIGIN)
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "MISSING_SEGMENTS")
})

// 10. segment semantic statement required
test("PG10: a segment missing its semantic statement is rejected", () => {
  const content = { ...validContent(), segments: [{ label: "Arrival", statement: "" }] }
  const result = proposeEpisodeContent(realCertifiedInterpretation(), content, HUMAN_ORIGIN)
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_SEGMENT")
})

test("PG10b: a segment missing its label is rejected", () => {
  const content = { ...validContent(), segments: [{ label: "", statement: "something happens" }] }
  const result = proposeEpisodeContent(realCertifiedInterpretation(), content, HUMAN_ORIGIN)
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_SEGMENT")
})

// 16. valid evidence reference accepted
test("PG16: a segment referencing a real evidenceId present in the CertifiedInterpretation's own provenance is accepted", () => {
  const result = proposeEpisodeContent(realCertifiedInterpretation(), validContent(), HUMAN_ORIGIN)
  assert.equal(result.decision, "PROPOSED")
  if (result.decision !== "PROPOSED") throw new Error("unreachable")
  assert.deepEqual(result.proposal.content.segments[0].evidenceReferences, [{ evidenceId: REAL_EVIDENCE_ID }])
})

// 17 / 18. unknown evidence reference rejected / no fabricated World ref
test("PG17: a segment referencing an evidenceId absent from the CertifiedInterpretation's own provenance is rejected -- never invented", () => {
  const content = { ...validContent(), segments: [{ label: "Arrival", statement: "something happens", evidenceReferences: ["not-a-real-evidence-id"] }] }
  const result = proposeEpisodeContent(realCertifiedInterpretation(), content, HUMAN_ORIGIN)
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "UNKNOWN_EVIDENCE_REFERENCE")
})

test("PG18: an empty evidenceReferences array is accepted -- evidence references are optional, never fabricated to satisfy a requirement", () => {
  const content = { ...validContent(), segments: [{ label: "Arrival", statement: "something happens" }] }
  const result = proposeEpisodeContent(realCertifiedInterpretation(), content, HUMAN_ORIGIN)
  assert.equal(result.decision, "PROPOSED")
  if (result.decision !== "PROPOSED") throw new Error("unreachable")
  assert.deepEqual(result.proposal.content.segments[0].evidenceReferences, [])
})

// 19. source CertifiedInterpretation unchanged
test("PG19: proposeEpisodeContent never mutates the supplied CertifiedInterpretation", () => {
  const certified = realCertifiedInterpretation()
  const before = JSON.stringify(certified)
  proposeEpisodeContent(certified, validContent(), HUMAN_ORIGIN)
  assert.equal(JSON.stringify(certified), before)
})

// 25. human origin recorded
test("PG25: the proposal records the exact human contentOriginIdentity supplied", () => {
  const result = proposeEpisodeContent(realCertifiedInterpretation(), validContent(), HUMAN_ORIGIN)
  assert.equal(result.decision, "PROPOSED")
  if (result.decision !== "PROPOSED") throw new Error("unreachable")
  assert.deepEqual(result.proposal.contentOriginIdentity, HUMAN_ORIGIN)
  assert.equal(result.proposal.generationExecutionIdentity.kind, "human")
})

// 26. future model kind cannot execute model generation
test("PG26: a contentOriginIdentity with kind \"model\" is a ratified type but has zero operational code path -- rejected, not executed", () => {
  const result = proposeEpisodeContent(realCertifiedInterpretation(), validContent(), { kind: "model", name: "some-future-model", version: "1" })
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "UNSUPPORTED_CONTENT_ORIGIN_KIND")
})

test("PG26b: a contentOriginIdentity with kind \"rule_engine\" is likewise rejected, not executed", () => {
  const result = proposeEpisodeContent(realCertifiedInterpretation(), validContent(), { kind: "rule_engine", name: "some-future-rules", version: "1" })
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "UNSUPPORTED_CONTENT_ORIGIN_KIND")
})

test("PG26c: an unrecognized contentOriginIdentity.kind is rejected as structurally invalid, not merely unsupported", () => {
  const result = proposeEpisodeContent(realCertifiedInterpretation(), validContent(), { kind: "alien", name: "x", version: "1" })
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_CONTENT_ORIGIN_IDENTITY")
})

// 27. revision produces new content identity
test("PG27: a revision (different content, same source) produces a different contentIdentity and a different proposalId, and may carry supersedesProposalId", () => {
  const certified = realCertifiedInterpretation()
  const original = proposeEpisodeContent(certified, validContent(), HUMAN_ORIGIN)
  assert.equal(original.decision, "PROPOSED")
  if (original.decision !== "PROPOSED") throw new Error("unreachable")

  const revisedContent = { ...validContent(), title: "The Flute Across Yamuna (Revised)" }
  const revised = proposeEpisodeContent(certified, revisedContent, HUMAN_ORIGIN, original.proposal.proposalId)
  assert.equal(revised.decision, "PROPOSED")
  if (revised.decision !== "PROPOSED") throw new Error("unreachable")

  assert.notEqual(revised.proposal.contentIdentity, original.proposal.contentIdentity)
  assert.notEqual(revised.proposal.proposalId, original.proposal.proposalId)
  assert.equal(revised.proposal.supersedesProposalId, original.proposal.proposalId)
})

test("PG27b: supersedesProposalId, when supplied, must be a non-empty string", () => {
  const result = proposeEpisodeContent(realCertifiedInterpretation(), validContent(), HUMAN_ORIGIN, "")
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_SUPERSEDES_PROPOSAL_ID")
})

// 28. provenance retains source interpretation identity
test("PG28: the proposal's sourceCertifiedInterpretationId exactly matches the supplied CertifiedInterpretation's own identity", () => {
  const certified = realCertifiedInterpretation()
  const result = proposeEpisodeContent(certified, validContent(), HUMAN_ORIGIN)
  assert.equal(result.decision, "PROPOSED")
  if (result.decision !== "PROPOSED") throw new Error("unreachable")
  assert.equal(result.proposal.sourceCertifiedInterpretationId, certified.certifiedInterpretationId)
})

test("PG29: proposeEpisodeContent never throws, even for wildly malformed input", () => {
  assert.doesNotThrow(() => proposeEpisodeContent(null, null, null))
  assert.doesNotThrow(() => proposeEpisodeContent(123, "not an object", []))
  assert.doesNotThrow(() => proposeEpisodeContent(undefined, undefined, undefined))
})
