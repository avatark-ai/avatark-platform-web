import { createHash } from "node:crypto"
import { buildProvenance } from "./provenance.ts"
import { validateInterpretationInput, validateInterpreterIdentity } from "./validation.ts"
import type { InterpreterIdentity, NarrativeInterpretationCandidate, NarrativeInterpretationInput } from "./types.ts"

// Deterministic by construction: a stable hash of the validated input,
// never a wall-clock timestamp or a random UUID.
//
// STK-WO-009 Phase B: hashes each evidence item's full content (not merely
// its evidenceId), because a real Lane-1 evidenceId is not proven
// content-addressed/immutable -- the same expectationId could in principle
// carry different artifactReference.digest values across two real facts.
// Hashing the full item means the identity changes whenever any
// interpretation-relevant content (including a real evidence item's carried
// canonical digest) changes, without this package inventing a second
// canonicalization algorithm of its own -- it simply hashes what validation
// already produced.
//
// STK-WO-009 Phase C (G10C-3): split out of the old deriveCandidateId as its
// own identity, deliberately independent of interpreterIdentity -- it
// answers "is this the same authoritative/adapted evidence set?" on its
// own, so a future consumer can tell that question apart from "did the
// same interpreter version produce this?" (see deriveCandidateId below).
function deriveInterpretationInputIdentity(input: NarrativeInterpretationInput): string {
  const basis = JSON.stringify({
    schemaVersion: input.schemaVersion,
    evidence: input.evidence,
  })
  return createHash("sha256").update(basis).digest("hex")
}

// The candidate's own identity: a function of the input identity plus the
// interpreter that produced it. Two different interpreter versions run
// against the identical input identity yield two different candidateIds,
// even though the underlying evidence set is provably the same one
// (provenance.interpretationInputIdentity would match).
function deriveCandidateId(interpretationInputIdentity: string, identity: InterpreterIdentity): string {
  const basis = JSON.stringify({ interpretationInputIdentity, interpreter: identity })
  return createHash("sha256").update(basis).digest("hex")
}

export function interpretNarrativeEvidence(
  rawInput: unknown,
  rawIdentity: InterpreterIdentity,
): NarrativeInterpretationCandidate {
  const identity = validateInterpreterIdentity(rawIdentity)
  const input = validateInterpretationInput(rawInput)

  const evidenceIds = input.evidence.map((item) => item.evidenceId)
  const interpretationInputIdentity = deriveInterpretationInputIdentity(input)

  return {
    candidateId: deriveCandidateId(interpretationInputIdentity, identity),
    status: "candidate",
    certified: false,
    derivedFromEvidenceIds: evidenceIds,
    provenance: buildProvenance(identity, input.schemaVersion, interpretationInputIdentity, input.evidence),
  }
}
