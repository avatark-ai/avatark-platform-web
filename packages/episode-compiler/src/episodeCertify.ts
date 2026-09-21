// STK-WO-009 Phase F (G10D-2): the second governed certification transition
// -- EpisodeCandidate -> Certification -> CertifiedEpisode -- mirroring
// Phase D's own certifyInterpretationCandidate pattern exactly, per this
// Work Order's own explicit Phase F exit criterion ("a second governed
// certification transition... is defined and testable").
//
// DELIBERATELY SEPARATE from episodeCandidate.ts: nothing in
// episodeCandidate.ts or compile.ts imports this file, and this file is
// never invoked by compileEpisodeCandidate() -- the same
// derive(...) != certify(...) invariant Phase D established, applied one
// stage downstream.
//
// Exactly like Phase D's own certification, this is exclusively
// structural, provenance, and identity validation -- never narrative
// quality. It does not decide who is authorized to invoke it in a real
// governed review process: STK-WO-009's own "Human / Founders decision
// points" names "Episode certification policy (Phase F) — same question,
// one stage downstream [of Phase D's Interpretation certification
// policy]" as equally unresolved. This function answers only the
// narrower, evidence-answerable question of whether a presented
// EpisodeCandidate's structure/identity/provenance is sound enough for
// such a process to legitimately certify it.
import { createHash } from "node:crypto"
import { compileEpisodeCandidate } from "./episodeCandidate.ts"
import type { EpisodeCertificationRefusalReason, EpisodeCertificationResult, EpisodeCompilerIdentity } from "./types.ts"

export const EPISODE_CERTIFICATION_AUTHORITY_IDENTITY: EpisodeCompilerIdentity = {
  name: "episode-compiler-certification",
  version: "0.1.0",
}

export const EPISODE_CERTIFICATION_POLICY_IDENTITY: EpisodeCompilerIdentity = {
  name: "episode-structural-provenance-identity-policy",
  version: "1",
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

// Deterministic: stable semantic identity only (episodeCandidateId + the
// certifying authority + the policy applied) -- never a wall-clock
// timestamp or random id.
function deriveCertifiedEpisodeId(episodeCandidateId: string): string {
  const basis = JSON.stringify({
    episodeCandidateId,
    certificationAuthorityIdentity: EPISODE_CERTIFICATION_AUTHORITY_IDENTITY,
    certificationPolicyIdentity: EPISODE_CERTIFICATION_POLICY_IDENTITY,
  })
  return createHash("sha256").update(basis).digest("hex")
}

function refuse(reason: EpisodeCertificationRefusalReason, detail: string): EpisodeCertificationResult {
  return { decision: "REFUSED", reason, detail }
}

// certifyEpisodeCandidate never throws -- even fully malformed input
// produces a REFUSED result. sourceCertifiedInterpretation/compilerIdentity
// are the exact raw inputs `episodeCandidate` claims to have been derived
// from; certification does not trust the presented candidate's own claimed
// fields -- it independently recomputes a fresh one via
// compileEpisodeCandidate() (the same derivation function, never a
// divergent second algorithm) and compares by value.
export function certifyEpisodeCandidate(episodeCandidate: unknown, sourceCertifiedInterpretation: unknown, compilerIdentity: unknown): EpisodeCertificationResult {
  if (episodeCandidate === null || typeof episodeCandidate !== "object") {
    return refuse("INVALID_CANDIDATE", "episodeCandidate must be an object")
  }
  const c = episodeCandidate as Record<string, unknown>
  if (c.status !== "candidate") {
    return refuse("INVALID_CANDIDATE", `episodeCandidate.status must be "candidate", got ${JSON.stringify(c.status)}`)
  }
  if (c.certified !== false) {
    return refuse("ALREADY_CERTIFIED", "episodeCandidate.certified must be exactly false -- a candidate that does not carry this literal cannot be certified by this function")
  }
  if (!isNonEmptyString(c.episodeCandidateId)) {
    return refuse("INVALID_CANDIDATE", "episodeCandidate.episodeCandidateId is required and must be a non-empty string")
  }

  const recomputed = compileEpisodeCandidate(sourceCertifiedInterpretation, compilerIdentity)
  if (recomputed.decision !== "COMPILED") {
    return refuse(
      "INVALID_SOURCE_CERTIFIED_INTERPRETATION",
      "the supplied sourceCertifiedInterpretation/compilerIdentity do not themselves compile to a legitimate EpisodeCandidate -- certification has nothing legitimate to recompute against",
    )
  }

  if (recomputed.episodeCandidate.episodeCandidateId !== c.episodeCandidateId) {
    return refuse(
      "INVALID_CANDIDATE_IDENTITY",
      "recomputing episodeCandidateId from the supplied source certified interpretation and compiler identity does not match the presented candidate's own episodeCandidateId -- the source or the identity field was changed after derivation",
    )
  }

  const provenanceMatches =
    recomputed.episodeCandidate.sourceCertifiedInterpretationId === c.sourceCertifiedInterpretationId &&
    recomputed.episodeCandidate.sourceCandidateId === c.sourceCandidateId &&
    recomputed.episodeCandidate.sourceInterpretationInputIdentity === c.sourceInterpretationInputIdentity &&
    JSON.stringify(recomputed.episodeCandidate.compilerIdentity) === JSON.stringify(c.compilerIdentity)
  if (!provenanceMatches) {
    return refuse(
      "INVALID_PROVENANCE",
      "the presented candidate's provenance fields do not match what a fresh derivation of the supplied source produces",
    )
  }

  return {
    decision: "CERTIFIED",
    certifiedEpisode: {
      certifiedEpisodeId: deriveCertifiedEpisodeId(recomputed.episodeCandidate.episodeCandidateId),
      episodeCandidateId: recomputed.episodeCandidate.episodeCandidateId,
      sourceCertifiedInterpretationId: recomputed.episodeCandidate.sourceCertifiedInterpretationId,
      sourceCandidateId: recomputed.episodeCandidate.sourceCandidateId,
      sourceInterpretationInputIdentity: recomputed.episodeCandidate.sourceInterpretationInputIdentity,
      compilerIdentity: recomputed.episodeCandidate.compilerIdentity,
      certificationAuthorityIdentity: EPISODE_CERTIFICATION_AUTHORITY_IDENTITY,
      certificationPolicyIdentity: EPISODE_CERTIFICATION_POLICY_IDENTITY,
    },
  }
}
