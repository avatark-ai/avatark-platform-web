// STK-WO-009 Phase F (G10D-2): the real Episode Candidate derivation.
// Deliberately independent of compile.ts's EpisodeCompilationFoundation --
// both derive directly from the same CertifiedInterpretation input; neither
// is the other's input. Kept separate because Foundation is Phase E's own,
// already-tested deliverable and this gate has no governance authorization
// to modify or remove it; EpisodeCandidate is the real, Phase-F-governed
// contract STK-WO-009 itself requires.
//
// Never calls certifyInterpretationCandidate, never fabricates a
// CertifiedInterpretation -- identical discipline to compile.ts.
import { createHash } from "node:crypto"
import { isCertifiedInterpretation } from "./validation.ts"
import type { EpisodeCandidateResult, EpisodeCompilerIdentity } from "./types.ts"

// A separate, independently-versioned identity for the CANDIDATE CONTRACT
// SHAPE itself -- distinct from compilerIdentity (which names the
// implementation) -- mirroring narrative-interpretation's own precedent of
// separating CERTIFICATION_AUTHORITY_IDENTITY from CERTIFICATION_POLICY_IDENTITY.
// Lets a future contract revision be distinguished from a compiler
// implementation revision.
export const EPISODE_CANDIDATE_CONTRACT_IDENTITY: EpisodeCompilerIdentity = {
  name: "episode-candidate-contract",
  version: "1",
}

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

// Deterministic: a stable hash of the upstream certified identity, this
// compiler's own identity, and the candidate contract identity -- never a
// wall-clock timestamp, random UUID, network, or filesystem state. Changes
// whenever the certified input, the compiler version, or the contract
// version changes; deliberately never collides with deriveFoundationId's
// own basis (compile.ts), since the contract identity is folded in here
// and not there.
function deriveEpisodeCandidateId(sourceCertifiedInterpretationId: string, compilerIdentity: EpisodeCompilerIdentity): string {
  const basis = JSON.stringify({
    sourceCertifiedInterpretationId,
    compilerIdentity,
    candidateContractIdentity: EPISODE_CANDIDATE_CONTRACT_IDENTITY,
  })
  return createHash("sha256").update(basis).digest("hex")
}

// Never throws -- invalid input produces a REJECTED result. Read-only:
// reads its arguments, constructs new objects, never mutates either input.
export function compileEpisodeCandidate(certifiedInterpretation: unknown, compilerIdentity: unknown): EpisodeCandidateResult {
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

  return {
    decision: "COMPILED",
    episodeCandidate: {
      episodeCandidateId: deriveEpisodeCandidateId(certifiedInterpretation.certifiedInterpretationId, compilerIdentity),
      status: "candidate",
      certified: false,
      sourceCertifiedInterpretationId: certifiedInterpretation.certifiedInterpretationId,
      sourceCandidateId: certifiedInterpretation.candidateId,
      sourceInterpretationInputIdentity: certifiedInterpretation.interpretationInputIdentity,
      compilerIdentity,
    },
  }
}
