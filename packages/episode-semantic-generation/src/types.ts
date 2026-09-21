// PLT-ADR-009 Amendment (G10D-5 Stage 1), Stage 2 implementation: the
// Episode Semantic Generation boundary. Sits between
// @avatark/narrative-interpretation's CertifiedInterpretation output and
// @avatark/episode-compiler's existing compile/certify boundary. Its ONLY
// authorized job is: given a governed CertifiedInterpretation and a
// governed content-source input, produce a non-authoritative
// EpisodeContentProposal. It never becomes an EpisodeCandidate, a
// CertifiedEpisode, or a NarrativeDefinition -- those remain
// episode-compiler's and narrative-runtime's own, unchanged authorities.
import type { CertifiedInterpretation } from "@avatark/narrative-interpretation"

export type { CertifiedInterpretation }

// Three content-origin kinds are ratified at the type level (ADR Amendment
// A3) so a future rule-engine or model origin needs no boundary rework to
// add. Only "human" is operationally authorized by this package -- see
// propose.ts. "rule_engine" and "model" exist here as type-level surface
// only; no code path in this package can execute either.
export type ContentOriginKind = "human" | "rule_engine" | "model"

export interface ContentOriginIdentity {
  readonly kind: ContentOriginKind
  readonly name: string
  readonly version: string
}

// Provenance-only (ADR Amendment A8): distinct from ContentOriginIdentity
// so a future model origin's inherently non-deterministic execution record
// never participates in deterministic content/candidate identity
// derivation. For today's human-only origin this is a fixed, deterministic
// constant (see HUMAN_GENERATION_EXECUTION_IDENTITY in propose.ts) --
// never fabricated non-determinism.
export interface GenerationExecutionIdentity {
  readonly kind: ContentOriginKind
  readonly name: string
  readonly version: string
}

// A reference into the upstream CertifiedInterpretation's own
// evidenceProvenance list, by id only. Never a fabricated World reference
// -- validated against the real, supplied CertifiedInterpretation at
// proposal-construction time (see validation.ts / propose.ts).
export interface EvidenceReference {
  readonly evidenceId: string
}

// Caller-supplied shape for one segment. segmentId is NOT accepted from the
// caller -- it is derived deterministically from position + content (see
// identity.ts), so it cannot drift from the content it names.
export interface EpisodeSegmentInput {
  readonly label: string
  readonly statement: string
  readonly evidenceReferences?: readonly string[]
}

// The governed, semantic Episode unit (ADR Amendment A6). Deliberately NOT
// named or shaped as Scene/Beat -- those remain
// @avatark/narrative-runtime's own, unchanged runtime execution
// representations (PLT-ADR-009 decision 6). A future Phase G owns
// projecting EpisodeSegment into Scene/Beat; this package does not perform
// or presume that projection.
export interface EpisodeSegment {
  // Deterministic: derived from this segment's own position + label +
  // statement + evidence references (see identity.ts) -- never a random
  // id, never caller-supplied.
  readonly segmentId: string
  readonly label: string
  readonly statement: string
  readonly evidenceReferences: readonly EvidenceReference[]
}

// Caller-supplied shape for the proposal's semantic content.
export interface EpisodeContentInput {
  readonly title: string
  readonly premise: string
  readonly segments: readonly EpisodeSegmentInput[]
}

export interface EpisodeContent {
  readonly title: string
  readonly premise: string
  readonly segments: readonly EpisodeSegment[]
}

// The one, non-authoritative output this package may ever produce (ADR
// Amendment A1/A7). Explicitly a PROPOSAL: episode-compiler (a separate
// package, a separate governed authority) decides whether and how a
// proposal is folded into an EpisodeCandidate -- this package cannot
// construct one itself, and does not depend on episode-compiler.
export interface EpisodeContentProposal {
  readonly kind: "EPISODE_CONTENT_PROPOSAL"
  readonly status: "proposal"
  // Deterministic: sha256(sourceCertifiedInterpretationId +
  // contentOriginIdentity + contentIdentity). Never a wall-clock timestamp
  // or random id.
  readonly proposalId: string
  readonly sourceCertifiedInterpretationId: string
  readonly contentOriginIdentity: ContentOriginIdentity
  readonly generationExecutionIdentity: GenerationExecutionIdentity
  // Deterministic hash of the canonicalized content bytes only (ADR
  // Amendment A8) -- excludes contentOriginIdentity/generationExecutionIdentity
  // so "same content, different origin" and "same origin, different
  // content" stay independently distinguishable, mirroring
  // narrative-interpretation's own interpretationInputIdentity/candidateId
  // split.
  readonly contentIdentity: string
  readonly content: EpisodeContent
  // A revision (ADR Amendment A9) carries the proposalId it supersedes.
  // Absent for an original proposal.
  readonly supersedesProposalId?: string
}

export type ProposalRefusalReason =
  | "INVALID_CERTIFIED_INTERPRETATION"
  | "INVALID_CONTENT_ORIGIN_IDENTITY"
  | "UNSUPPORTED_CONTENT_ORIGIN_KIND"
  | "MISSING_TITLE"
  | "MISSING_PREMISE"
  | "MISSING_SEGMENTS"
  | "INVALID_SEGMENT"
  | "UNKNOWN_EVIDENCE_REFERENCE"
  | "INVALID_SUPERSEDES_PROPOSAL_ID"

export type EpisodeContentProposalResult =
  | { readonly decision: "PROPOSED"; readonly proposal: EpisodeContentProposal }
  | { readonly decision: "REJECTED"; readonly reason: ProposalRefusalReason; readonly detail: string }
