// STK-WO-009 Phase D (G10C-4): extracted from interpret.ts so certify.ts can
// recompute the same identities from the same algorithm rather than
// duplicating it -- there must be exactly one deterministic identity
// primitive in this package, never a divergent second one.
import { createHash } from "node:crypto"
import type { InterpreterIdentity, NarrativeInterpretationInput } from "./types.ts"

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
// STK-WO-009 Phase C: independent of interpreterIdentity -- it answers "is
// this the same authoritative/adapted evidence set?" on its own, so a
// future consumer can tell that question apart from "did the same
// interpreter version produce this?" (see deriveCandidateId below).
export function deriveInterpretationInputIdentity(input: NarrativeInterpretationInput): string {
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
export function deriveCandidateId(interpretationInputIdentity: string, identity: InterpreterIdentity): string {
  const basis = JSON.stringify({ interpretationInputIdentity, interpreter: identity })
  return createHash("sha256").update(basis).digest("hex")
}
