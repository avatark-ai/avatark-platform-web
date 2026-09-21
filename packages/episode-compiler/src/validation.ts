// STK-WO-009 Phase E (G10D-1): validates that an unknown value is a
// legitimate CertifiedInterpretation before this package will compile
// anything from it -- a raw NarrativeInterpretationCandidate, or any
// structurally-similar uncertified object, must be rejected.
//
// Honest limit of what this proves (see PLT-ADR-009 decision 5 / STK-WO-009
// Phase D's own "Human / Founders decision points" -- who may invoke
// certification remains an unresolved production-governance question this
// package does not touch): this is STRUCTURAL and SELF-CONSISTENCY
// validation, not cryptographic proof of provenance. It does not, and
// cannot, re-run certification (that would require the original raw World
// evidence and interpreter identity, which this package never receives and
// never should -- see section 6/19 of this gate). It proves two things:
// (1) the object has every field a real CertifiedInterpretation must have,
// with the right shapes; (2) certifiedInterpretationId is exactly the hash
// @avatark/narrative-interpretation's own exported deriveCertifiedInterpretationId()
// would produce for this object's own candidateId, under the one real,
// known certification authority/policy identity -- reusing that function
// (a narrow factoring), never a duplicated or hand-mirrored certification
// algorithm.
import { CERTIFICATION_AUTHORITY_IDENTITY, CERTIFICATION_POLICY_IDENTITY, deriveCertifiedInterpretationId } from "@avatark/narrative-interpretation"
import type { CertifiedInterpretation } from "./types.ts"

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function isNamedVersionedIdentity(value: unknown): value is { name: string; version: string } {
  if (value === null || typeof value !== "object") {
    return false
  }
  const record = value as Record<string, unknown>
  return isNonEmptyString(record.name) && isNonEmptyString(record.version)
}

function identitiesEqual(a: { name: string; version: string }, b: { name: string; version: string }): boolean {
  return a.name === b.name && a.version === b.version
}

// Structural shape only -- never re-validates the evidence policy inside
// evidenceProvenance (that is certification's own, already-applied job).
function hasCertifiedInterpretationShape(value: unknown): value is CertifiedInterpretation {
  if (value === null || typeof value !== "object") {
    return false
  }
  const record = value as Record<string, unknown>
  if (!isNonEmptyString(record.certifiedInterpretationId) || !isNonEmptyString(record.candidateId) || !isNonEmptyString(record.interpretationInputIdentity)) {
    return false
  }
  if (!isNamedVersionedIdentity(record.interpreterIdentity)) {
    return false
  }
  if (!Array.isArray(record.evidenceProvenance)) {
    return false
  }
  if (!isNamedVersionedIdentity(record.certificationAuthorityIdentity) || !isNamedVersionedIdentity(record.certificationPolicyIdentity)) {
    return false
  }
  // A raw NarrativeInterpretationCandidate carries status/certified/
  // derivedFromEvidenceIds/provenance instead of the fields checked above
  // -- it structurally fails this check already, but this explicit check
  // makes the rejection reason unambiguous rather than incidental.
  if ("status" in record || "certified" in record) {
    return false
  }
  return true
}

export function isCertifiedInterpretation(value: unknown): value is CertifiedInterpretation {
  if (!hasCertifiedInterpretationShape(value)) {
    return false
  }
  // Reject anything not claiming the one real, known certification
  // authority/policy -- a structurally-similar object certified (or
  // claiming to be) by a different authority/policy is not this
  // package's governed input.
  if (!identitiesEqual(value.certificationAuthorityIdentity, CERTIFICATION_AUTHORITY_IDENTITY)) {
    return false
  }
  if (!identitiesEqual(value.certificationPolicyIdentity, CERTIFICATION_POLICY_IDENTITY)) {
    return false
  }
  // Self-consistency: certifiedInterpretationId must be exactly what the
  // real certifier's own exported hash function would produce for this
  // candidateId, under the known authority/policy identity.
  return value.certifiedInterpretationId === deriveCertifiedInterpretationId(value.candidateId)
}
