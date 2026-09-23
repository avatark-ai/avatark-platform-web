// Issuer-side structural + full verification of attested Certification
// Records. The Authority uses this to validate an upstream Interpretation
// record loaded from its own registry before it will issue an Episode record
// (§4) -- never trusting a caller-supplied id or the registry row blindly.
import { computeSubjectDigest, verifyRecordAttestation, type CertificationKeyTrust } from "./attestation.ts"
import { CertificationRecordShapeError, parseAttestedCertificationRecord } from "./recordShape.ts"
import { CERTIFICATION_AUTHORITY_ID, PERMITTED_CERTIFICATION_STATES, findRecognizedPolicy } from "./policies.ts"
import type { AttestedCertificationRecord, CertificationEvidenceFailure, CertificationSubjectKind } from "./types.ts"

export type EvidenceVerification =
  | { ok: true; attested: AttestedCertificationRecord }
  | { ok: false; failure: CertificationEvidenceFailure; detail: string }

function fail(failure: CertificationEvidenceFailure, detail: string): EvidenceVerification {
  return { ok: false, failure, detail }
}

function subjectIdOf(kind: CertificationSubjectKind, artifact: unknown): string | undefined {
  if (artifact === null || typeof artifact !== "object") return undefined
  const value = kind === "INTERPRETATION"
    ? (artifact as { certifiedInterpretationId?: unknown }).certifiedInterpretationId
    : (artifact as { certifiedEpisodeId?: unknown }).certifiedEpisodeId
  return typeof value === "string" && value.length > 0 ? value : undefined
}

/** Verifies an attested record against the exact artifact it claims to certify. */
export function verifyAttestedEvidence(
  rawAttested: unknown,
  artifact: unknown,
  expectedKind: CertificationSubjectKind,
  trust: CertificationKeyTrust,
): EvidenceVerification {
  let attested: AttestedCertificationRecord
  try {
    attested = parseAttestedCertificationRecord(rawAttested)
  } catch (error) {
    if (error instanceof CertificationRecordShapeError) return fail(error.failure, error.message)
    return fail("INVALID_CONTRACT", "certification record could not be parsed")
  }

  const signature = verifyRecordAttestation(attested, trust)
  if (!signature.ok) return fail(signature.failure, signature.detail)

  const { record } = attested
  let digest: string
  try {
    digest = computeSubjectDigest(artifact).value
  } catch {
    return fail("SUBJECT_IDENTITY_MISMATCH", "artifact is not canonical JSON")
  }
  if (digest !== record.subjectDigest.value) return fail("SUBJECT_IDENTITY_MISMATCH", "subject digest does not match the artifact")
  if (record.subjectKind !== expectedKind) return fail("SUBJECT_IDENTITY_MISMATCH", `expected ${expectedKind} record, got ${record.subjectKind}`)
  if (subjectIdOf(expectedKind, artifact) !== record.subjectId) return fail("SUBJECT_IDENTITY_MISMATCH", "subject id does not match the artifact")
  if (record.certificationAuthority.authorityId !== CERTIFICATION_AUTHORITY_ID) {
    return fail("UNRECOGNIZED_CERTIFICATION_AUTHORITY", `authority "${record.certificationAuthority.authorityId}" is not recognized`)
  }
  if (!findRecognizedPolicy(record.subjectKind, record.certificationPolicy, record.evaluatorIdentity)) {
    return fail("UNSUPPORTED_CERTIFICATION_POLICY", "policy/evaluator identity is not recognized for this subject kind")
  }
  if (!PERMITTED_CERTIFICATION_STATES.includes(record.state)) {
    return fail("CERTIFICATION_NOT_IN_PERMITTED_STATE", `state "${record.state}" is not permitted`)
  }
  if (expectedKind === "INTERPRETATION" && record.upstreamCertification !== null) {
    return fail("PROVENANCE_MISMATCH", "an Interpretation record must not carry an upstream binding")
  }
  if (expectedKind === "EPISODE" && record.upstreamCertification === null) {
    return fail("PROVENANCE_MISMATCH", "an Episode record must bind its upstream Interpretation record")
  }
  return { ok: true, attested }
}
