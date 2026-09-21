import { createHash } from "node:crypto"
import { buildProvenance } from "./provenance.ts"
import { validateInterpretationInput, validateInterpreterIdentity } from "./validation.ts"
import type { InterpreterIdentity, NarrativeInterpretationCandidate, NarrativeInterpretationInput } from "./types.ts"

// Deterministic by construction: a stable hash of the validated input and
// interpreter identity, never a wall-clock timestamp or a random UUID. The
// same input plus the same interpreter version always yields the same
// candidateId.
//
// STK-WO-009 Phase B: hashes each evidence item's full content (not merely
// its evidenceId), because a real Lane-1 evidenceId is not proven
// content-addressed/immutable -- the same expectationId could in principle
// carry different artifactReference.digest values across two real facts.
// Hashing the full item means the candidateId changes whenever any
// interpretation-relevant content (including a real evidence item's carried
// canonical digest) changes, without this package inventing a second
// canonicalization algorithm of its own -- it simply hashes what validation
// already produced.
function deriveCandidateId(input: NarrativeInterpretationInput, identity: InterpreterIdentity): string {
  const basis = JSON.stringify({
    schemaVersion: input.schemaVersion,
    evidence: input.evidence,
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
    provenance: buildProvenance(identity, input.schemaVersion, input.evidence),
  }
}
