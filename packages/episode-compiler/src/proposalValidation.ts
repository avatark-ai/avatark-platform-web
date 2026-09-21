// STK-WO-009 Stage 3 (G10D-5): validates that an unknown value is a
// legitimate EpisodeContentProposal before this package will fold it into
// an EpisodeCandidate -- mirrors validation.ts's own isCertifiedInterpretation
// pattern exactly: structural shape plus self-consistency, reusing
// @avatark/episode-semantic-generation's own exported deterministic
// identity primitives (deriveContentIdentity, deriveProposalId,
// deriveSegmentId) rather than duplicating or hand-mirroring a second
// canonicalization algorithm. Not cryptographic proof that a human
// actually authored this content -- only that the presented proposal is
// internally self-consistent with the one real, known derivation.
import { deriveContentIdentity, deriveProposalId, deriveSegmentId } from "@avatark/episode-semantic-generation"
import type { EpisodeContentProposal } from "./types.ts"
import { isNonEmptyString } from "./validation.ts"

function isNamedIdentity(value: unknown): value is { kind: string; name: string; version: string } {
  if (value === null || typeof value !== "object") {
    return false
  }
  const record = value as Record<string, unknown>
  return typeof record.kind === "string" && isNonEmptyString(record.name) && isNonEmptyString(record.version)
}

function hasEpisodeContentProposalShape(value: unknown): value is EpisodeContentProposal {
  if (value === null || typeof value !== "object") {
    return false
  }
  const record = value as Record<string, unknown>
  if (record.kind !== "EPISODE_CONTENT_PROPOSAL" || record.status !== "proposal") {
    return false
  }
  if (!isNonEmptyString(record.proposalId) || !isNonEmptyString(record.sourceCertifiedInterpretationId) || !isNonEmptyString(record.contentIdentity)) {
    return false
  }
  if (!isNamedIdentity(record.contentOriginIdentity) || !isNamedIdentity(record.generationExecutionIdentity)) {
    return false
  }
  const content = record.content as Record<string, unknown> | undefined
  if (content === null || typeof content !== "object") {
    return false
  }
  if (!isNonEmptyString(content.title) || !isNonEmptyString(content.premise) || !Array.isArray(content.segments) || content.segments.length === 0) {
    return false
  }
  for (const segment of content.segments) {
    if (segment === null || typeof segment !== "object") {
      return false
    }
    const s = segment as Record<string, unknown>
    if (!isNonEmptyString(s.segmentId) || !isNonEmptyString(s.label) || !isNonEmptyString(s.statement) || !Array.isArray(s.evidenceReferences)) {
      return false
    }
  }
  return true
}

export function isEpisodeContentProposal(value: unknown): value is EpisodeContentProposal {
  if (!hasEpisodeContentProposalShape(value)) {
    return false
  }
  // Recompute each segment's own segmentId from its position + content --
  // proves no segment was hand-tampered independent of the top-level
  // contentIdentity check below.
  for (let index = 0; index < value.content.segments.length; index += 1) {
    const segment = value.content.segments[index]
    const evidenceIds = segment.evidenceReferences.map((r) => r.evidenceId)
    const recomputedSegmentId = deriveSegmentId(index, { label: segment.label, statement: segment.statement }, evidenceIds)
    if (recomputedSegmentId !== segment.segmentId) {
      return false
    }
  }
  const recomputedContentIdentity = deriveContentIdentity(value.content.title, value.content.premise, value.content.segments)
  if (recomputedContentIdentity !== value.contentIdentity) {
    return false
  }
  const recomputedProposalId = deriveProposalId(value.sourceCertifiedInterpretationId, value.contentOriginIdentity, value.contentIdentity)
  return recomputedProposalId === value.proposalId
}
