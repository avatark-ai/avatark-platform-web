// STK-WO-009 Phase E (G10D-1): the deterministic compilation foundation.
// Deliberately does not call certifyInterpretationCandidate, does not
// construct a fake CertifiedInterpretation, and does not provide any
// Candidate -> certify -> compile convenience path -- it consumes only an
// already-produced CertifiedInterpretation the caller supplies. Who or
// what is authorized to produce that CertifiedInterpretation in a real
// governed review process remains an external, unresolved question (see
// validation.ts's header comment); this file never bypasses or resolves
// it.
import { createHash } from "node:crypto"
import { isCertifiedInterpretation } from "./validation.ts"
import type { EpisodeCompilationResult, EpisodeCompilerIdentity } from "./types.ts"

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

// Deterministic by construction: a stable hash of the upstream certified
// identity and this compiler's own identity -- never a wall-clock
// timestamp or random UUID, no network state, no filesystem-dependent
// semantics.
function deriveFoundationId(sourceCertifiedInterpretationId: string, compilerIdentity: EpisodeCompilerIdentity): string {
  const basis = JSON.stringify({ sourceCertifiedInterpretationId, compilerIdentity })
  return createHash("sha256").update(basis).digest("hex")
}

// Never throws -- an invalid/tampered CertifiedInterpretation or a
// malformed compiler identity produces a REJECTED result, never an
// exception. Read-only: reads its arguments, constructs new objects, never
// mutates either input.
export function compileEpisodeFoundation(certifiedInterpretation: unknown, compilerIdentity: unknown): EpisodeCompilationResult {
  if (!isEpisodeCompilerIdentity(compilerIdentity)) {
    return { decision: "REJECTED", reason: "INVALID_COMPILER_IDENTITY", detail: "compilerIdentity must be an object with non-empty name and version" }
  }
  if (!isCertifiedInterpretation(certifiedInterpretation)) {
    return {
      decision: "REJECTED",
      reason: "INVALID_CERTIFIED_INTERPRETATION",
      detail:
        "input is not a legitimate CertifiedInterpretation -- either it is structurally malformed, it is a raw NarrativeInterpretationCandidate (which this package never accepts), or its certifiedInterpretationId is not self-consistent with the known certification authority/policy",
    }
  }

  const foundationId = deriveFoundationId(certifiedInterpretation.certifiedInterpretationId, compilerIdentity)

  return {
    decision: "COMPILED",
    foundation: {
      kind: "EPISODE_COMPILATION_FOUNDATION",
      foundationId,
      sourceCertifiedInterpretationId: certifiedInterpretation.certifiedInterpretationId,
      sourceCandidateId: certifiedInterpretation.candidateId,
      sourceInterpretationInputIdentity: certifiedInterpretation.interpretationInputIdentity,
      compilerIdentity,
    },
  }
}
