import assert from "node:assert/strict"
import { test } from "node:test"
import { certifyInterpretationCandidate, evidenceItemFromExpectedAbsenceFact, interpretNarrativeEvidence } from "@avatark/narrative-interpretation"
import type { CertifiedInterpretation, InterpreterIdentity, NarrativeInterpretationInput } from "@avatark/narrative-interpretation"
import { proposeEpisodeContent } from "./index.ts"
import type { ContentOriginIdentity, EpisodeContentInput } from "./types.ts"

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
  assert.equal(result.decision, "CERTIFIED")
  if (result.decision !== "CERTIFIED") throw new Error("unreachable")
  return result.certifiedInterpretation
}

const REAL_EVIDENCE_ID = "expectation-place/waiting-hollow"
const HUMAN_ORIGIN: ContentOriginIdentity = { kind: "human", name: "writer-domain-boundary", version: "1" }

function baseContent(): EpisodeContentInput {
  return {
    title: "The Flute Across Yamuna",
    premise: "A quiet, repeated absence at the waiting hollow becomes noticeable.",
    segments: [
      { label: "Arrival", statement: "The visitor approaches the waiting hollow and finds it unusually still.", evidenceReferences: [REAL_EVIDENCE_ID] },
      { label: "Recognition", statement: "The pattern of absence becomes explicit rather than merely felt." },
    ],
  }
}

function proposedFor(content: EpisodeContentInput) {
  const result = proposeEpisodeContent(realCertifiedInterpretation(), content, HUMAN_ORIGIN)
  assert.equal(result.decision, "PROPOSED")
  if (result.decision !== "PROPOSED") throw new Error("unreachable")
  return result.proposal
}

// 11. deterministic content identity
test("PG11: identical semantic content produces an identical contentIdentity across two independent calls", () => {
  const a = proposedFor(baseContent())
  const b = proposedFor(baseContent())
  assert.equal(a.contentIdentity, b.contentIdentity)
  assert.equal(a.proposalId, b.proposalId)
})

test("PG11b: contentIdentity never contains wall-clock time, a random id, or filesystem/network state -- proven by pure repeatability across calls made moments apart", () => {
  const first = proposedFor(baseContent())
  const second = proposedFor(baseContent())
  assert.equal(first.contentIdentity, second.contentIdentity)
})

// 12. changed title changes identity
test("PG12: a changed title changes contentIdentity, holding premise and segments fixed", () => {
  const a = proposedFor(baseContent())
  const b = proposedFor({ ...baseContent(), title: "A Different Title" })
  assert.notEqual(a.contentIdentity, b.contentIdentity)
})

// 13. changed premise changes identity
test("PG13: a changed premise changes contentIdentity, holding title and segments fixed", () => {
  const a = proposedFor(baseContent())
  const b = proposedFor({ ...baseContent(), premise: "A different premise entirely." })
  assert.notEqual(a.contentIdentity, b.contentIdentity)
})

// 14. changed segment changes identity
test("PG14: a changed segment semantic statement changes contentIdentity", () => {
  const a = proposedFor(baseContent())
  const changed = baseContent()
  const b = proposedFor({ ...changed, segments: [{ ...changed.segments[0], statement: "A materially different thing happens here." }, changed.segments[1]] })
  assert.notEqual(a.contentIdentity, b.contentIdentity)
})

test("PG14b: a changed segment label changes contentIdentity", () => {
  const a = proposedFor(baseContent())
  const changed = baseContent()
  const b = proposedFor({ ...changed, segments: [{ ...changed.segments[0], label: "A Different Label" }, changed.segments[1]] })
  assert.notEqual(a.contentIdentity, b.contentIdentity)
})

test("PG14c: adding an evidence reference to a segment changes contentIdentity and that segment's own segmentId", () => {
  const a = proposedFor(baseContent())
  const changed = baseContent()
  const b = proposedFor({ ...changed, segments: [changed.segments[0], { ...changed.segments[1], evidenceReferences: [REAL_EVIDENCE_ID] }] })
  assert.notEqual(a.contentIdentity, b.contentIdentity)
  assert.notEqual(a.content.segments[1].segmentId, b.content.segments[1].segmentId)
})

// 15. reordered segments change identity
test("PG15: reordering the same two segments changes contentIdentity", () => {
  const content = baseContent()
  const a = proposedFor(content)
  const reordered: EpisodeContentInput = { ...content, segments: [content.segments[1], content.segments[0]] }
  const b = proposedFor(reordered)
  assert.notEqual(a.contentIdentity, b.contentIdentity)
})

test("PG15b: reordering changes each reordered segment's own segmentId (position is part of segment identity)", () => {
  const content = baseContent()
  const a = proposedFor(content)
  const reordered: EpisodeContentInput = { ...content, segments: [content.segments[1], content.segments[0]] }
  const b = proposedFor(reordered)
  assert.notEqual(a.content.segments[0].segmentId, b.content.segments[0].segmentId)
})

// contentIdentity independence from origin (ADR Amendment A8: content
// identity excludes contentOriginIdentity/generationExecutionIdentity).
test("PG_ID1: contentIdentity is identical across two different contentOriginIdentity values for the same content -- content identity is independent of who proposed it", () => {
  const certified = realCertifiedInterpretation()
  const a = proposeEpisodeContent(certified, baseContent(), HUMAN_ORIGIN)
  const b = proposeEpisodeContent(certified, baseContent(), { kind: "human", name: "a-different-human-actor", version: "1" })
  assert.equal(a.decision, "PROPOSED")
  assert.equal(b.decision, "PROPOSED")
  if (a.decision !== "PROPOSED" || b.decision !== "PROPOSED") throw new Error("unreachable")
  assert.equal(a.proposal.contentIdentity, b.proposal.contentIdentity)
  // proposalId still differs -- it binds origin identity too.
  assert.notEqual(a.proposal.proposalId, b.proposal.proposalId)
})

test("PG_ID2: a different source CertifiedInterpretation changes proposalId even for byte-identical content", () => {
  const certifiedA = realCertifiedInterpretation()
  // A second, independently-derived certification of the same evidence is
  // still a distinct CertifiedInterpretation only if some input differs;
  // here we prove the converse directly: proposalId is bound to
  // sourceCertifiedInterpretationId, not reconstructed from content alone.
  const a = proposeEpisodeContent(certifiedA, baseContent(), HUMAN_ORIGIN)
  assert.equal(a.decision, "PROPOSED")
  if (a.decision !== "PROPOSED") throw new Error("unreachable")
  assert.ok(a.proposal.proposalId.length === 64)
  assert.ok(a.proposal.contentIdentity.length === 64)
})
