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

export type { CertifiedInterpretation }

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
