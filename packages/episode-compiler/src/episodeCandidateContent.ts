// STK-WO-009 Stage 3 (G10D-5): folds a governed EpisodeContentProposal
// (@avatark/episode-semantic-generation) into a real, content-bearing
// EpisodeCandidate. Deliberately a SIBLING of episodeCandidate.ts's
// compileEpisodeCandidate(), never a modification of it -- the content-free
// path remains byte-for-byte unchanged (see types.ts's own comment on
// EpisodeCandidate). episode-compiler remains the one authority deciding
// whether and how a proposal is folded into a candidate; the proposal
// itself has no such authority (it cannot construct an EpisodeCandidate).
import { createHash } from "node:crypto"
import { EPISODE_CANDIDATE_CONTRACT_IDENTITY } from "./episodeCandidate.ts"
import { isEpisodeContentProposal } from "./proposalValidation.ts"
import { isCertifiedInterpretation } from "./validation.ts"
import type { EpisodeCandidateResult, EpisodeCompilerIdentity } from "./types.ts"

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function isEpisodeCompilerIdentity(value: unknown): value is EpisodeCompilerIdentity {
  if (value === null || typeof value !== "object") {
    return false
  }
  const record = value as Record<string, unknown>
  return isNonEmptyString(record.name) && isNonEmptyString(record.version)
}

// Deterministic: folds the proposal's own contentIdentity/proposalId into
// the basis alongside everything deriveEpisodeCandidateId (the
// content-free sibling, episodeCandidate.ts) already hashes -- so a
// content-bearing candidate's identity space is naturally disjoint from
// the content-free one, without either derivation needing to know about
// the other's existence.
function deriveEpisodeCandidateIdWithContent(
  sourceCertifiedInterpretationId: string,
  compilerIdentity: EpisodeCompilerIdentity,
  contentIdentity: string,
  proposalId: string,
): string {
  const basis = JSON.stringify({
    sourceCertifiedInterpretationId,
    compilerIdentity,
    candidateContractIdentity: EPISODE_CANDIDATE_CONTRACT_IDENTITY,
    contentIdentity,
    proposalId,
  })
  return createHash("sha256").update(basis).digest("hex")
}

// Never throws -- invalid/tampered/mismatched input produces a REJECTED
// result. Read-only: reads its arguments, constructs new objects, never
// mutates any of them.
export function compileEpisodeCandidateWithProposal(certifiedInterpretation: unknown, compilerIdentity: unknown, proposal: unknown): EpisodeCandidateResult {
  if (!isEpisodeCompilerIdentity(compilerIdentity)) {
    return { decision: "REJECTED", reason: "INVALID_COMPILER_IDENTITY", detail: "compilerIdentity must be an object with non-empty name and version" }
  }
  if (!isCertifiedInterpretation(certifiedInterpretation)) {
    return {
      decision: "REJECTED",
      reason: "INVALID_CERTIFIED_INTERPRETATION",
      detail: "input is not a legitimate CertifiedInterpretation -- structurally malformed, an uncertified candidate, or not self-consistent with the known certification authority/policy",
    }
  }
  if (!isEpisodeContentProposal(proposal)) {
    return {
      decision: "REJECTED",
      reason: "INVALID_PROPOSAL",
      detail: "input is not a legitimate EpisodeContentProposal -- structurally malformed, or its own contentIdentity/proposalId/segmentIds are not self-consistent with a fresh recomputation",
    }
  }
  if (proposal.sourceCertifiedInterpretationId !== certifiedInterpretation.certifiedInterpretationId) {
    return {
      decision: "REJECTED",
      reason: "PROPOSAL_SOURCE_MISMATCH",
      detail: "the supplied proposal's own sourceCertifiedInterpretationId does not match the supplied certifiedInterpretation -- a proposal may only be compiled against the exact CertifiedInterpretation it was proposed from",
    }
  }

  return {
    decision: "COMPILED",
    episodeCandidate: {
      episodeCandidateId: deriveEpisodeCandidateIdWithContent(certifiedInterpretation.certifiedInterpretationId, compilerIdentity, proposal.contentIdentity, proposal.proposalId),
      status: "candidate",
      certified: false,
      sourceCertifiedInterpretationId: certifiedInterpretation.certifiedInterpretationId,
      sourceCandidateId: certifiedInterpretation.candidateId,
      sourceInterpretationInputIdentity: certifiedInterpretation.interpretationInputIdentity,
      compilerIdentity,
      content: proposal.content,
      contentIdentity: proposal.contentIdentity,
      contentOriginIdentity: proposal.contentOriginIdentity,
      sourceProposalId: proposal.proposalId,
    },
  }
}
