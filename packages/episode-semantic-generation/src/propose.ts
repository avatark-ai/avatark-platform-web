// PLT-ADR-009 Amendment (G10D-5 Stage 1), Stage 2: the one function this
// package exposes for turning a governed content-source input into an
// EpisodeContentProposal. Never throws -- invalid/tampered/unauthorized
// input produces a REJECTED result. Read-only: reads its arguments,
// constructs new objects, never mutates either input, never reaches World
// state, never calls narrative-runtime, episode-compiler, CinemaK,
// StreamK, or any LLM/model API.
import { buildSegment, deriveContentIdentity, deriveProposalId } from "./identity.ts"
import { isCertifiedInterpretation, isContentOriginIdentity, isNonEmptyString, knownEvidenceIds } from "./validation.ts"
import type { CertifiedInterpretation, ContentOriginIdentity, EpisodeContentInput, EpisodeContentProposalResult, EpisodeSegment, GenerationExecutionIdentity } from "./types.ts"

// Only "human" is operationally authorized (ADR Amendment A3). "rule_engine"
// and "model" are real, ratified TYPES (see types.ts) with zero
// operational code path -- see propose.ts's own REJECTED branch below and
// authorityBoundary.test.ts's static proof that no such path exists.
const AUTHORIZED_CONTENT_ORIGIN_KIND = "human"

// Deterministic, fixed constant naming this package's own human-entry
// boundary. Distinct from a caller's own contentOriginIdentity (which
// names WHO originated the content, e.g. a specific Writer-side actor
// identity a future integration gate supplies) -- this names WHAT
// mechanism executed the proposal construction itself. For a human origin
// there is no non-deterministic "execution" to record, so this stays a
// fixed constant; a future model origin's generationExecutionIdentity
// would carry real, non-deterministic execution provenance instead (ADR
// Amendment A8) -- not implemented here.
const HUMAN_GENERATION_EXECUTION_IDENTITY: GenerationExecutionIdentity = {
  kind: "human",
  name: "episode-semantic-generation-human-boundary",
  version: "0.1.0",
}

function isEpisodeContentInput(value: unknown): value is EpisodeContentInput {
  if (value === null || typeof value !== "object") {
    return false
  }
  const record = value as Record<string, unknown>
  return isNonEmptyString(record.title) && isNonEmptyString(record.premise) && Array.isArray(record.segments)
}

export function proposeEpisodeContent(
  certifiedInterpretation: unknown,
  content: unknown,
  contentOriginIdentity: unknown,
  supersedesProposalId?: unknown,
): EpisodeContentProposalResult {
  if (!isCertifiedInterpretation(certifiedInterpretation)) {
    return {
      decision: "REJECTED",
      reason: "INVALID_CERTIFIED_INTERPRETATION",
      detail:
        "input is not a legitimate CertifiedInterpretation -- either it is structurally malformed, an uncertified NarrativeInterpretationCandidate, or its certifiedInterpretationId is not self-consistent with the known certification authority/policy",
    }
  }

  if (!isContentOriginIdentity(contentOriginIdentity)) {
    return {
      decision: "REJECTED",
      reason: "INVALID_CONTENT_ORIGIN_IDENTITY",
      detail: "contentOriginIdentity must be an object with a recognized kind (human | rule_engine | model) and non-empty name and version",
    }
  }
  if ((contentOriginIdentity as ContentOriginIdentity).kind !== AUTHORIZED_CONTENT_ORIGIN_KIND) {
    return {
      decision: "REJECTED",
      reason: "UNSUPPORTED_CONTENT_ORIGIN_KIND",
      detail: `contentOriginIdentity.kind "${(contentOriginIdentity as ContentOriginIdentity).kind}" is a ratified future type, but no operational code path exists for it -- only "human" is authorized to execute in this implementation gate (ADR Amendment A3)`,
    }
  }

  if (!isEpisodeContentInput(content)) {
    if (content === null || typeof content !== "object" || !isNonEmptyString((content as Record<string, unknown>).title)) {
      return { decision: "REJECTED", reason: "MISSING_TITLE", detail: "content.title is required and must be a non-empty string" }
    }
    if (!isNonEmptyString((content as Record<string, unknown>).premise)) {
      return { decision: "REJECTED", reason: "MISSING_PREMISE", detail: "content.premise is required and must be a non-empty string" }
    }
    return { decision: "REJECTED", reason: "MISSING_SEGMENTS", detail: "content.segments is required and must be an array" }
  }

  if (content.segments.length === 0) {
    return { decision: "REJECTED", reason: "MISSING_SEGMENTS", detail: "content.segments must contain at least one EpisodeSegment when content is present" }
  }

  const knownIds = knownEvidenceIds(certifiedInterpretation as CertifiedInterpretation)
  const segments: EpisodeSegment[] = []
  for (let index = 0; index < content.segments.length; index += 1) {
    const segmentInput = content.segments[index]
    if (segmentInput === null || typeof segmentInput !== "object") {
      return { decision: "REJECTED", reason: "INVALID_SEGMENT", detail: `segment at index ${index} must be an object` }
    }
    const record = segmentInput as unknown as Record<string, unknown>
    if (!isNonEmptyString(record.label)) {
      return { decision: "REJECTED", reason: "INVALID_SEGMENT", detail: `segment at index ${index} requires a non-empty label` }
    }
    if (!isNonEmptyString(record.statement)) {
      return { decision: "REJECTED", reason: "INVALID_SEGMENT", detail: `segment at index ${index} requires a non-empty semantic statement` }
    }
    const evidenceReferences = record.evidenceReferences
    if (evidenceReferences !== undefined) {
      if (!Array.isArray(evidenceReferences) || !evidenceReferences.every((id) => typeof id === "string")) {
        return { decision: "REJECTED", reason: "INVALID_SEGMENT", detail: `segment at index ${index} evidenceReferences must be an array of strings when present` }
      }
      for (const evidenceId of evidenceReferences) {
        if (!knownIds.has(evidenceId)) {
          return {
            decision: "REJECTED",
            reason: "UNKNOWN_EVIDENCE_REFERENCE",
            detail: `segment at index ${index} references evidenceId "${evidenceId}", which is not present in the supplied CertifiedInterpretation's own evidenceProvenance -- a segment may never invent a World reference`,
          }
        }
      }
    }
    segments.push(buildSegment(index, segmentInput as { label: string; statement: string; evidenceReferences?: readonly string[] }))
  }

  if (supersedesProposalId !== undefined && !isNonEmptyString(supersedesProposalId)) {
    return { decision: "REJECTED", reason: "INVALID_SUPERSEDES_PROPOSAL_ID", detail: "supersedesProposalId, when supplied, must be a non-empty string" }
  }

  const contentIdentity = deriveContentIdentity(content.title, content.premise, segments)
  const originIdentity = contentOriginIdentity as ContentOriginIdentity
  const proposalId = deriveProposalId(certifiedInterpretation.certifiedInterpretationId, originIdentity, contentIdentity)

  return {
    decision: "PROPOSED",
    proposal: {
      kind: "EPISODE_CONTENT_PROPOSAL",
      status: "proposal",
      proposalId,
      sourceCertifiedInterpretationId: certifiedInterpretation.certifiedInterpretationId,
      contentOriginIdentity: originIdentity,
      generationExecutionIdentity: HUMAN_GENERATION_EXECUTION_IDENTITY,
      contentIdentity,
      content: { title: content.title, premise: content.premise, segments },
      ...(supersedesProposalId !== undefined ? { supersedesProposalId: supersedesProposalId as string } : {}),
    },
  }
}
