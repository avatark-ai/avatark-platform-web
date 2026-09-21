import { createHash } from "node:crypto"
import { buildProvenance } from "./provenance.ts"
import { validateInterpretationInput, validateInterpreterIdentity } from "./validation.ts"
import type { InterpreterIdentity, NarrativeInterpretationCandidate, NarrativeInterpretationInput } from "./types.ts"

// Deterministic by construction: a stable hash of the validated input and
// interpreter identity, never a wall-clock timestamp or a random UUID. The
// same input plus the same interpreter version always yields the same
// candidateId.
function deriveCandidateId(input: NarrativeInterpretationInput, identity: InterpreterIdentity): string {
  const basis = JSON.stringify({
    schemaVersion: input.schemaVersion,
    evidenceIds: input.evidence.map((item) => item.evidenceId),
    interpreter: identity,
  })
  return createHash("sha256").update(basis).digest("hex")
}

export function interpretNarrativeEvidence(
  rawInput: unknown,
  rawIdentity: InterpreterIdentity,
): NarrativeInterpretationCandidate {
  const identity = validateInterpreterIdentity(rawIdentity)
  const input = validateInterpretationInput(rawInput)

  const evidenceIds = input.evidence.map((item) => item.evidenceId)

  return {
    candidateId: deriveCandidateId(input, identity),
    status: "candidate",
    certified: false,
    derivedFromEvidenceIds: evidenceIds,
    provenance: buildProvenance(identity, input.schemaVersion, evidenceIds),
  }
}
