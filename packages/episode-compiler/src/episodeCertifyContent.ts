// STK-WO-009 Stage 3 (G10D-5): the certification transition for a
// content-bearing EpisodeCandidate -- EpisodeCandidate (with content) ->
// Certification -> CertifiedEpisode (with content). Deliberately a SIBLING
// of episodeCertify.ts's certifyEpisodeCandidate(), never a modification
// of it: the content-free certification path remains byte-for-byte
// unchanged. Exactly like every certifier in this arc, this independently
// recomputes a fresh candidate (via compileEpisodeCandidateWithProposal,
// never a divergent second algorithm) and compares by value -- it does not
// merely trust the presented candidate's own claimed content fields.
import { createHash } from "node:crypto"
import { compileEpisodeCandidateWithProposal } from "./episodeCandidateContent.ts"
import { EPISODE_CERTIFICATION_AUTHORITY_IDENTITY, EPISODE_CERTIFICATION_POLICY_IDENTITY } from "./episodeCertify.ts"
import type { EpisodeCertificationRefusalReason, EpisodeCertificationResult } from "./types.ts"

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

// Reuses the exact same certification authority/policy identity as the
// content-free path -- certification means the same thing (structural,
// provenance, identity soundness) whether or not content is present; it is
// not a different certifying authority.
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

// sourceCertifiedInterpretation/compilerIdentity/sourceProposal are the
// exact raw inputs episodeCandidate claims to have been derived from.
export function certifyEpisodeCandidateWithProposal(
  episodeCandidate: unknown,
  sourceCertifiedInterpretation: unknown,
  compilerIdentity: unknown,
  sourceProposal: unknown,
): EpisodeCertificationResult {
  if (episodeCandidate === null || typeof episodeCandidate !== "object") {
    return refuse("INVALID_CANDIDATE", "episodeCandidate must be an object")
  }
  const c = episodeCandidate as Record<string, unknown>
  if (c.status !== "candidate") {
    return refuse("INVALID_CANDIDATE", `episodeCandidate.status must be "candidate", got ${JSON.stringify(c.status)}`)
  }
  if (c.certified !== false) {
    return refuse("ALREADY_CERTIFIED", "episodeCandidate.certified must be exactly false")
  }
  if (!isNonEmptyString(c.episodeCandidateId)) {
    return refuse("INVALID_CANDIDATE", "episodeCandidate.episodeCandidateId is required and must be a non-empty string")
  }
  if (c.content === undefined) {
    return refuse("INVALID_PROPOSAL", "episodeCandidate carries no content -- use certifyEpisodeCandidate (content-free path) for a content-free candidate")
  }

  const recomputed = compileEpisodeCandidateWithProposal(sourceCertifiedInterpretation, compilerIdentity, sourceProposal)
  if (recomputed.decision !== "COMPILED") {
    return refuse(
      "INVALID_SOURCE_CERTIFIED_INTERPRETATION",
      "the supplied source CertifiedInterpretation/compilerIdentity/proposal do not themselves compile to a legitimate content-bearing EpisodeCandidate -- certification has nothing legitimate to recompute against",
    )
  }

  if (recomputed.episodeCandidate.episodeCandidateId !== c.episodeCandidateId) {
    return refuse(
      "INVALID_CANDIDATE_IDENTITY",
      "recomputing episodeCandidateId from the supplied source inputs does not match the presented candidate's own episodeCandidateId",
    )
  }

  const provenanceMatches =
    recomputed.episodeCandidate.sourceCertifiedInterpretationId === c.sourceCertifiedInterpretationId &&
    recomputed.episodeCandidate.sourceCandidateId === c.sourceCandidateId &&
    recomputed.episodeCandidate.sourceInterpretationInputIdentity === c.sourceInterpretationInputIdentity &&
    JSON.stringify(recomputed.episodeCandidate.compilerIdentity) === JSON.stringify(c.compilerIdentity)
  if (!provenanceMatches) {
    return refuse("INVALID_PROVENANCE", "the presented candidate's provenance fields do not match what a fresh derivation of the supplied source produces")
  }

  const contentMatches =
    JSON.stringify(recomputed.episodeCandidate.content) === JSON.stringify(c.content) &&
    recomputed.episodeCandidate.contentIdentity === c.contentIdentity &&
    JSON.stringify(recomputed.episodeCandidate.contentOriginIdentity) === JSON.stringify(c.contentOriginIdentity) &&
    recomputed.episodeCandidate.sourceProposalId === c.sourceProposalId
  if (!contentMatches) {
    return refuse("CONTENT_MISMATCH", "the presented candidate's content does not match what a fresh recomputation from the supplied source proposal produces -- content was tampered or diverged after derivation")
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
      content: recomputed.episodeCandidate.content,
      contentIdentity: recomputed.episodeCandidate.contentIdentity,
      contentOriginIdentity: recomputed.episodeCandidate.contentOriginIdentity,
      sourceProposalId: recomputed.episodeCandidate.sourceProposalId,
    },
  }
}
