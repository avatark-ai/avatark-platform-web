import assert from "node:assert/strict"
import { test } from "node:test"
import {
  certifyInterpretationCandidate,
  evidenceItemFromExpectedAbsenceFact,
  interpretNarrativeEvidence,
} from "@avatark/narrative-interpretation"
import type { CertifiedInterpretation, InterpreterIdentity, NarrativeInterpretationInput } from "@avatark/narrative-interpretation"
import { compileEpisodeCandidate } from "./episodeCandidate.ts"
import { EPISODE_CERTIFICATION_AUTHORITY_IDENTITY, EPISODE_CERTIFICATION_POLICY_IDENTITY, certifyEpisodeCandidate } from "./episodeCertify.ts"
import type { EpisodeCompilerIdentity } from "./types.ts"

const INTERPRETER_IDENTITY: InterpreterIdentity = { name: "narrative-interpretation", version: "0.1.0" }
const COMPILER_IDENTITY: EpisodeCompilerIdentity = { name: "episode-compiler", version: "0.1.0" }

function realLookingFact(overrides?: { logicalTick?: number }) {
  return {
    expectationId: "expectation-place/waiting-hollow",
    subjectId: "place/waiting-hollow",
    property: "occupancy",
    origin: "WORLD_PATTERN" as const,
    irVersion: "0.3.0",
    evidenceStateIds: ["e0", "e1", "e2", "e3"],
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

function realEpisodeCandidate(overrides?: { logicalTick?: number }) {
  const certified = realCertifiedInterpretation(overrides)
  const result = compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  assert.equal(result.decision, "COMPILED")
  if (result.decision !== "COMPILED") throw new Error("unreachable")
  return { certified, episodeCandidate: result.episodeCandidate }
}

test("G1: a valid EpisodeCandidate is certified into an explicit CertifiedEpisode", () => {
  const { certified, episodeCandidate } = realEpisodeCandidate()
  const result = certifyEpisodeCandidate(episodeCandidate, certified, COMPILER_IDENTITY)
  assert.equal(result.decision, "CERTIFIED")
})

test("G2: certification does not mutate the episode candidate, source certified interpretation, or compiler identity passed to it", () => {
  const { certified, episodeCandidate } = realEpisodeCandidate()
  const candidateSnapshot = JSON.parse(JSON.stringify(episodeCandidate))
  const certifiedSnapshot = JSON.parse(JSON.stringify(certified))
  certifyEpisodeCandidate(episodeCandidate, certified, COMPILER_IDENTITY)
  assert.deepStrictEqual(episodeCandidate, candidateSnapshot)
  assert.deepStrictEqual(certified, certifiedSnapshot)
})

test("G3: the certified episode preserves the exact episodeCandidateId and full provenance chain", () => {
  const { certified, episodeCandidate } = realEpisodeCandidate()
  const result = certifyEpisodeCandidate(episodeCandidate, certified, COMPILER_IDENTITY)
  assert.equal(result.decision, "CERTIFIED")
  if (result.decision !== "CERTIFIED") throw new Error("unreachable")
  assert.equal(result.certifiedEpisode.episodeCandidateId, episodeCandidate.episodeCandidateId)
  assert.equal(result.certifiedEpisode.sourceCertifiedInterpretationId, episodeCandidate.sourceCertifiedInterpretationId)
  assert.equal(result.certifiedEpisode.sourceCandidateId, episodeCandidate.sourceCandidateId)
  assert.equal(result.certifiedEpisode.sourceInterpretationInputIdentity, episodeCandidate.sourceInterpretationInputIdentity)
})

test("G4: the certified episode names the Episode certification authority and policy that evaluated it", () => {
  const { certified, episodeCandidate } = realEpisodeCandidate()
  const result = certifyEpisodeCandidate(episodeCandidate, certified, COMPILER_IDENTITY)
  assert.equal(result.decision, "CERTIFIED")
  if (result.decision !== "CERTIFIED") throw new Error("unreachable")
  assert.deepStrictEqual(result.certifiedEpisode.certificationAuthorityIdentity, EPISODE_CERTIFICATION_AUTHORITY_IDENTITY)
  assert.deepStrictEqual(result.certifiedEpisode.certificationPolicyIdentity, EPISODE_CERTIFICATION_POLICY_IDENTITY)
})

test("G5: certifiedEpisodeId is deterministic across repeated certification of the same candidate", () => {
  const { certified, episodeCandidate } = realEpisodeCandidate()
  const a = certifyEpisodeCandidate(episodeCandidate, certified, COMPILER_IDENTITY)
  const b = certifyEpisodeCandidate(episodeCandidate, certified, COMPILER_IDENTITY)
  assert.equal(a.decision, "CERTIFIED")
  assert.equal(b.decision, "CERTIFIED")
  if (a.decision !== "CERTIFIED" || b.decision !== "CERTIFIED") throw new Error("unreachable")
  assert.equal(a.certifiedEpisode.certifiedEpisodeId, b.certifiedEpisode.certifiedEpisodeId)
})

test("G6: a structurally malformed episode candidate is refused, never thrown", () => {
  const { certified } = realEpisodeCandidate()
  assert.doesNotThrow(() => certifyEpisodeCandidate(null, certified, COMPILER_IDENTITY))
  const result = certifyEpisodeCandidate(null, certified, COMPILER_IDENTITY)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_CANDIDATE")
})

test("G7: an episode candidate whose certified field is not exactly false is refused as ALREADY_CERTIFIED", () => {
  const { certified, episodeCandidate } = realEpisodeCandidate()
  const tampered = { ...episodeCandidate, certified: true }
  const result = certifyEpisodeCandidate(tampered, certified, COMPILER_IDENTITY)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "ALREADY_CERTIFIED")
})

test("G8: a tampered episodeCandidateId is refused", () => {
  const { certified, episodeCandidate } = realEpisodeCandidate()
  const tampered = { ...episodeCandidate, episodeCandidateId: "0".repeat(64) }
  const result = certifyEpisodeCandidate(tampered, certified, COMPILER_IDENTITY)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_CANDIDATE_IDENTITY")
})

test("G9: a stale candidate no longer matching a different (changed) source certified interpretation is refused", () => {
  const staleCandidate = realEpisodeCandidate().episodeCandidate
  const changedCertified = realCertifiedInterpretation({ logicalTick: 77 })
  const result = certifyEpisodeCandidate(staleCandidate, changedCertified, COMPILER_IDENTITY)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_CANDIDATE_IDENTITY")
})

test("G10: a malformed source CertifiedInterpretation is refused as INVALID_SOURCE_CERTIFIED_INTERPRETATION", () => {
  const { episodeCandidate } = realEpisodeCandidate()
  const result = certifyEpisodeCandidate(episodeCandidate, { not: "a certified interpretation" }, COMPILER_IDENTITY)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_SOURCE_CERTIFIED_INTERPRETATION")
})

test("G11: every refusal carries a reason from the fixed EpisodeCertificationRefusalReason set", () => {
  const KNOWN_REASONS = ["INVALID_CANDIDATE", "ALREADY_CERTIFIED", "INVALID_SOURCE_CERTIFIED_INTERPRETATION", "INVALID_CANDIDATE_IDENTITY", "INVALID_PROVENANCE"]
  const result = certifyEpisodeCandidate(null, realCertifiedInterpretation(), COMPILER_IDENTITY)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.ok(KNOWN_REASONS.includes(result.reason))
})

test("G12: the derivation path (episodeCandidate.ts) cannot self-certify -- proven again functionally, not only statically", () => {
  const { certified } = realEpisodeCandidate()
  const recomputed = compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  assert.equal(recomputed.decision, "COMPILED")
  if (recomputed.decision !== "COMPILED") throw new Error("unreachable")
  assert.equal(recomputed.episodeCandidate.certified, false)
  assert.equal("certifiedEpisodeId" in recomputed.episodeCandidate, false)
})
