// STK-WO-009 Phase E (G10D-1): the Episode Compiler authority foundation.
// PLT-ADR-009 decision 2/3/6 ratifies this package as the one new, canonical
// semantic authority for what a valid Episode is going forward -- but
// Phase E establishes only the FOUNDATION: package ownership, the
// CertifiedInterpretation-only input boundary, a deterministic compilation
// primitive, and provenance continuity. It does NOT define the real
// Episode Candidate contract (Phase F), does not introduce Scene/Beat/
// Encounter/NarrativeEntity semantic authority, does not execute Episodes
// (@avatark/narrative-runtime's job, untouched), and does not mutate World
// state.
//
// The one authorized upstream input is CertifiedInterpretation, imported
// as a type from @avatark/narrative-interpretation -- never hand-mirrored,
// never a shadow interface, never accepted as `any`.
import type { CertifiedInterpretation } from "@avatark/narrative-interpretation"
import type { ContentOriginIdentity, EpisodeContent, EpisodeContentProposal } from "@avatark/episode-semantic-generation"

export type { CertifiedInterpretation }
export type { ContentOriginIdentity, EpisodeContent, EpisodeContentProposal }

export interface EpisodeCompilerIdentity {
  readonly name: string
  readonly version: string
}

// Deliberately NOT named "Candidate" and carrying no Episode/Scene/Beat/
// Encounter content -- Phase F owns the real Episode Candidate contract.
// This is the minimum foundation-only result needed to prove: the compiler
// package exists, accepts only a governed CertifiedInterpretation, and
// produces a deterministic, provenance-preserving identity.
export interface EpisodeCompilationFoundation {
  readonly kind: "EPISODE_COMPILATION_FOUNDATION"
  // Deterministic: sha256(sourceCertifiedInterpretationId + compilerIdentity).
  // Never a wall-clock timestamp or random id.
  readonly foundationId: string
  // Provenance continuity -- the exact upstream identity chain, never
  // copied wholesale and never reconstructed from memory.
  readonly sourceCertifiedInterpretationId: string
  readonly sourceCandidateId: string
  readonly sourceInterpretationInputIdentity: string
  readonly compilerIdentity: EpisodeCompilerIdentity
}

export type EpisodeCompilationRefusalReason =
  | "INVALID_CERTIFIED_INTERPRETATION"
  | "INVALID_COMPILER_IDENTITY"

export type EpisodeCompilationResult =
  | { readonly decision: "COMPILED"; readonly foundation: EpisodeCompilationFoundation }
  | { readonly decision: "REJECTED"; readonly reason: EpisodeCompilationRefusalReason; readonly detail: string }

// --- STK-WO-009 Phase F (G10D-2): the real Episode Candidate contract. ---
//
// EpisodeCandidate is the governed semantic output STK-WO-009's own Phase F
// text requires ("a real Episode Candidate output... traceably produced
// only from a Certified Interpretation"). It is NOT EpisodeCompilationFoundation
// with a new name: it is derived independently from the same
// CertifiedInterpretation input (see compile.ts vs episodeCandidate.ts),
// under its own, separately-versioned candidate-contract identity, so its
// own identity never collides with Foundation's.
//
// Deliberately minimal: CertifiedInterpretation (Phase D) still carries no
// narrative claim, theme, ordering, or plot -- only structural/provenance
// content. A candidate derived from it can therefore only be
// structural/provenance content too. No scene, beat, encounter, character
// arc, dialogue, conflict, or dramatic ordering is invented to fill that
// gap -- see this gate's completion report section on semantic
// sufficiency.
// STK-WO-009 Stage 3 (G10D-5): EpisodeCandidate is extended ADDITIVELY with
// the PLT-ADR-009 amendment's semantic content contract. A content-free
// EpisodeCandidate (all four fields below absent) remains exactly as
// structurally valid as it was under Phase F -- compileEpisodeCandidate()
// is untouched, byte-for-byte, and every one of its existing tests still
// exercises it directly. The four fields below are populated only by the
// new, separate compileEpisodeCandidateWithProposal() sibling function
// (episodeCandidateContent.ts), never retrofitted onto the original path.
export interface EpisodeCandidate {
  readonly episodeCandidateId: string
  readonly status: "candidate"
  readonly certified: false
  readonly sourceCertifiedInterpretationId: string
  readonly sourceCandidateId: string
  readonly sourceInterpretationInputIdentity: string
  readonly compilerIdentity: EpisodeCompilerIdentity
  // Present only when compiled from a real EpisodeContentProposal
  // (@avatark/episode-semantic-generation). Copied verbatim from the
  // proposal, never reconstructed.
  readonly content?: EpisodeContent
  readonly contentIdentity?: string
  readonly contentOriginIdentity?: ContentOriginIdentity
  // The exact upstream EpisodeContentProposal's own identity -- distinct
  // from sourceCertifiedInterpretationId/sourceCandidateId, which name the
  // Interpretation-stage provenance this candidate already carried before
  // Stage 3.
  readonly sourceProposalId?: string
}

export type EpisodeCandidateRefusalReason =
  | "INVALID_CERTIFIED_INTERPRETATION"
  | "INVALID_COMPILER_IDENTITY"
  | "INVALID_PROPOSAL"
  | "PROPOSAL_SOURCE_MISMATCH"

export type EpisodeCandidateResult =
  | { readonly decision: "COMPILED"; readonly episodeCandidate: EpisodeCandidate }
  | { readonly decision: "REJECTED"; readonly reason: EpisodeCandidateRefusalReason; readonly detail: string }

// --- STK-WO-009 Phase F: the second governed certification transition, ---
// --- EpisodeCandidate -> Certification -> CertifiedEpisode, mirroring ---
// --- Phase D's own pattern exactly, per the Work Order's own explicit ---
// --- Phase F exit criterion.                                          ---
// Extended additively, exactly like EpisodeCandidate above -- a
// content-free CertifiedEpisode (Phase F's own shape) remains fully valid;
// certifyEpisodeCandidate() is untouched. Content fields are populated only
// by the new certifyEpisodeCandidateWithProposal() sibling function.
export interface CertifiedEpisode {
  readonly certifiedEpisodeId: string
  readonly episodeCandidateId: string
  readonly sourceCertifiedInterpretationId: string
  readonly sourceCandidateId: string
  readonly sourceInterpretationInputIdentity: string
  readonly compilerIdentity: EpisodeCompilerIdentity
  readonly certificationAuthorityIdentity: EpisodeCompilerIdentity
  readonly certificationPolicyIdentity: EpisodeCompilerIdentity
  readonly content?: EpisodeContent
  readonly contentIdentity?: string
  readonly contentOriginIdentity?: ContentOriginIdentity
  readonly sourceProposalId?: string
}

export type EpisodeCertificationRefusalReason =
  | "INVALID_CANDIDATE"
  | "ALREADY_CERTIFIED"
  | "INVALID_SOURCE_CERTIFIED_INTERPRETATION"
  | "INVALID_CANDIDATE_IDENTITY"
  | "INVALID_PROVENANCE"
  | "INVALID_PROPOSAL"
  | "CONTENT_MISMATCH"

export type EpisodeCertificationResult =
  | { readonly decision: "CERTIFIED"; readonly certifiedEpisode: CertifiedEpisode }
  | { readonly decision: "REFUSED"; readonly reason: EpisodeCertificationRefusalReason; readonly detail: string }

// STK-WO-009 Stage 3 (G10D-5): a truthful predicate, never a stored field
// -- a consumer (a future Phase G, not this package) asks this question on
// demand rather than trusting a cached value that could drift from the
// CertifiedEpisode's own actual content. A content-free CertifiedEpisode
// (Phase F's own shape) is always NOT_RUNTIME_PROJECTABLE; Phase G must
// fail closed on it, never fabricate content to fill the gap.
export type RuntimeProjectability = "RUNTIME_PROJECTABLE" | "NOT_RUNTIME_PROJECTABLE"
