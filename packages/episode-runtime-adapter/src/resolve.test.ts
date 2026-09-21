import assert from "node:assert/strict"
import { test } from "node:test"
import { certifyInterpretationCandidate, evidenceItemFromExpectedAbsenceFact, interpretNarrativeEvidence } from "@avatark/narrative-interpretation"
import type { CertifiedInterpretation, InterpreterIdentity, NarrativeInterpretationInput } from "@avatark/narrative-interpretation"
import { proposeEpisodeContent } from "@avatark/episode-semantic-generation"
import type { ContentOriginIdentity, EpisodeContentInput } from "@avatark/episode-semantic-generation"
import { certifyEpisodeCandidate, certifyEpisodeCandidateWithProposal, compileEpisodeCandidate, compileEpisodeCandidateWithProposal } from "@avatark/episode-compiler"
import type { CertifiedEpisode, EpisodeCompilerIdentity } from "@avatark/episode-compiler"
import { validateNarrativeDefinition } from "@avatark/narrative-runtime"
import { projectCertifiedEpisode } from "./project.ts"
import { resolveEpisodeSegmentProse } from "./resolve.ts"

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

function realCertifiedEpisode(content = validContent()): CertifiedEpisode {
  const certified = realCertifiedInterpretation()
  const proposalResult = proposeEpisodeContent(certified, content, HUMAN_ORIGIN)
  assert.equal(proposalResult.decision, "PROPOSED")
  if (proposalResult.decision !== "PROPOSED") throw new Error("unreachable")
  const candidateResult = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, proposalResult.proposal)
  assert.equal(candidateResult.decision, "COMPILED")
  if (candidateResult.decision !== "COMPILED") throw new Error("unreachable")
  const certResult = certifyEpisodeCandidateWithProposal(candidateResult.episodeCandidate, certified, COMPILER_IDENTITY, proposalResult.proposal)
  assert.equal(certResult.decision, "CERTIFIED")
  if (certResult.decision !== "CERTIFIED") throw new Error("unreachable")
  return certResult.certifiedEpisode
}

function contentFreeCertifiedEpisode(): CertifiedEpisode {
  const certified = realCertifiedInterpretation()
  const candidateResult = compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  assert.equal(candidateResult.decision, "COMPILED")
  if (candidateResult.decision !== "COMPILED") throw new Error("unreachable")
  const certResult = certifyEpisodeCandidate(candidateResult.episodeCandidate, certified, COMPILER_IDENTITY)
  assert.equal(certResult.decision, "CERTIFIED")
  if (certResult.decision !== "CERTIFIED") throw new Error("unreachable")
  return certResult.certifiedEpisode
}

// 1. exact semantic statement preserved
test("RE1: resolving a beat's real assetId returns the exact, real segment.statement -- byte-for-byte", () => {
  const episode = realCertifiedEpisode()
  const result = projectCertifiedEpisode(episode)
  assert.equal(result.decision, "PROJECTED")
  if (result.decision !== "PROJECTED") throw new Error("unreachable")
  const scenes = result.definition.seasons[0].episodes[0].scenes
  for (let i = 0; i < scenes.length; i += 1) {
    const beat = scenes[i].beats[0] as { refs?: { asset?: { assetId: string } } }
    const assetId = beat.refs?.asset?.assetId
    assert.ok(assetId)
    const resolved = resolveEpisodeSegmentProse(episode, assetId)
    assert.equal(resolved, episode.content?.segments[i].statement)
  }
})

// 2. no prose fabrication
test("RE2: an assetId that does not belong to this CertifiedEpisode resolves to undefined, never a fabricated string", () => {
  const episode = realCertifiedEpisode()
  const resolved = resolveEpisodeSegmentProse(episode, "0".repeat(64))
  assert.equal(resolved, undefined)
})

test("RE2b: malformed assetId input (empty string, non-string) resolves to undefined, never throws", () => {
  const episode = realCertifiedEpisode()
  assert.equal(resolveEpisodeSegmentProse(episode, ""), undefined)
  assert.doesNotThrow(() => resolveEpisodeSegmentProse(episode, undefined))
  assert.doesNotThrow(() => resolveEpisodeSegmentProse(episode, 12345))
})

test("RE2c: a content-free CertifiedEpisode resolves any assetId to undefined -- nothing to fabricate from", () => {
  const episode = contentFreeCertifiedEpisode()
  const resolved = resolveEpisodeSegmentProse(episode, "anything")
  assert.equal(resolved, undefined)
})

// 3. no mutation of CertifiedEpisode
test("RE3: resolving never mutates the supplied CertifiedEpisode", () => {
  const episode = realCertifiedEpisode()
  const before = JSON.stringify(episode)
  const result = projectCertifiedEpisode(episode)
  assert.equal(result.decision, "PROJECTED")
  if (result.decision !== "PROJECTED") throw new Error("unreachable")
  const assetId = (result.definition.seasons[0].episodes[0].scenes[0].beats[0] as { refs?: { asset?: { assetId: string } } }).refs?.asset?.assetId
  resolveEpisodeSegmentProse(episode, assetId)
  assert.equal(JSON.stringify(episode), before)
})

// 4. deterministic projection (assetId)
test("RE4: the same segment produces the same assetId across repeated projections", () => {
  const episode = realCertifiedEpisode()
  const a = projectCertifiedEpisode(episode)
  const b = projectCertifiedEpisode(episode)
  assert.equal(a.decision, "PROJECTED")
  assert.equal(b.decision, "PROJECTED")
  if (a.decision !== "PROJECTED" || b.decision !== "PROJECTED") throw new Error("unreachable")
  const assetIdA = (a.definition.seasons[0].episodes[0].scenes[0].beats[0] as { refs?: { asset?: { assetId: string } } }).refs?.asset?.assetId
  const assetIdB = (b.definition.seasons[0].episodes[0].scenes[0].beats[0] as { refs?: { asset?: { assetId: string } } }).refs?.asset?.assetId
  assert.equal(assetIdA, assetIdB)
})

test("RE4b: two different segments produce two different assetIds", () => {
  const episode = realCertifiedEpisode()
  const result = projectCertifiedEpisode(episode)
  assert.equal(result.decision, "PROJECTED")
  if (result.decision !== "PROJECTED") throw new Error("unreachable")
  const scenes = result.definition.seasons[0].episodes[0].scenes
  const assetId0 = (scenes[0].beats[0] as { refs?: { asset?: { assetId: string } } }).refs?.asset?.assetId
  const assetId1 = (scenes[1].beats[0] as { refs?: { asset?: { assetId: string } } }).refs?.asset?.assetId
  assert.notEqual(assetId0, assetId1)
})

// 5. runtime validation passes
test("RE5: a definition with real refs.asset populated still passes narrative-runtime's own, unmodified validateNarrativeDefinition()", () => {
  const result = projectCertifiedEpisode(realCertifiedEpisode())
  assert.equal(result.decision, "PROJECTED")
  if (result.decision !== "PROJECTED") throw new Error("unreachable")
  const validation = validateNarrativeDefinition(result.definition)
  assert.equal(validation.valid, true, validation.errors.join("; "))
})

// 6. content-free episode still fails closed
test("RE6: a content-free CertifiedEpisode still fails projection closed -- the payload closure does not weaken that invariant", () => {
  const result = projectCertifiedEpisode(contentFreeCertifiedEpisode())
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "NOT_RUNTIME_PROJECTABLE")
})

// 7. no fake asset id -- the assetId is always a real sha256 hex digest tied
// to a real segmentId, never a random UUID or sequential counter.
test("RE7: every assetId is a 64-hex-character sha256 digest, structurally indistinguishable from every other real runtime id in this adapter", () => {
  const episode = realCertifiedEpisode()
  const result = projectCertifiedEpisode(episode)
  assert.equal(result.decision, "PROJECTED")
  if (result.decision !== "PROJECTED") throw new Error("unreachable")
  for (const scene of result.definition.seasons[0].episodes[0].scenes) {
    const assetId = (scene.beats[0] as { refs?: { asset?: { assetId: string } } }).refs?.asset?.assetId
    assert.match(assetId ?? "", /^[0-9a-f]{64}$/)
  }
})

// 12. evidence refs handled according to their classified downstream role
// (G10D-6 Track A: OBSERVABILITY_REQUIRED / UI_PROVENANCE_ONLY /
// NOT_REQUIRED_DOWNSTREAM for runtime execution) -- real and present on
// the CertifiedEpisode itself, never projected into the runtime layer.
test("RE12: evidenceReferences remain real and present on the CertifiedEpisode (provenance/UI role) but never appear anywhere in the projected NarrativeDefinition (no runtime role)", () => {
  const episode = realCertifiedEpisode()
  assert.deepEqual(episode.content?.segments[0].evidenceReferences, [{ evidenceId: REAL_EVIDENCE_ID }])
  const result = projectCertifiedEpisode(episode)
  assert.equal(result.decision, "PROJECTED")
  if (result.decision !== "PROJECTED") throw new Error("unreachable")
  const serialized = JSON.stringify(result.definition)
  assert.ok(!serialized.includes("evidenceReferences"))
  assert.ok(!serialized.includes(REAL_EVIDENCE_ID))
})
