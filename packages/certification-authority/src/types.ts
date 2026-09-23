// PLT-ADR-015 §5: the Certification Record envelope. One envelope with a
// typed subjectKind, shared by Interpretation and Episode certification
// (§4). The certified domain artifacts (CertifiedInterpretation,
// CertifiedEpisode) and their deterministic ids are NOT changed -- the
// record accompanies the artifact and binds it by subject digest.

export type CertificationSubjectKind = "INTERPRETATION" | "EPISODE"

export interface NamedVersionedIdentity {
  name: string
  version: string
}

export interface SubjectDigest {
  algorithm: "SHA-256"
  canonicalization: "AVATARK_CANONICAL_JSON_V1"
  /** lowercase hex SHA-256 over canonicalBytes(full certified artifact) */
  value: string
}

/** The authenticated human certifier (§2). Automated/model invokers do not exist in this type. */
export interface CertificationInvoker {
  kind: "HUMAN"
  userId: string
  authenticationMethod: "SUPABASE_SESSION"
}

/** Evidence of the administrator-issued certification-invocation grant the invoker acted under (§2). */
export interface CertificationInvocationGrantEvidence {
  grantId: string
  capability: string
  scopeType: "platform"
  scopeId: null
  grantedBy: string
  grantedAt: string
}

/** §4: an Episode record binds the exact upstream Interpretation Certification Record. */
export interface UpstreamCertificationBinding {
  certificationRecordId: string
  subjectKind: "INTERPRETATION"
  subjectId: string
  subjectDigest: SubjectDigest
}

export interface CertificationAuthorityIdentity {
  authorityId: string
  keyId: string
}

/** Provenance only (§2, §5) -- never publication scope. */
export interface CertificationSourceContext {
  projectId: string | null
  worldId: string | null
}

export interface CertificationRecord {
  recordFormatVersion: "1"
  certificationRecordId: string
  subjectKind: CertificationSubjectKind
  subjectId: string
  subjectDigest: SubjectDigest
  certificationPolicy: NamedVersionedIdentity
  /** The existing certificationAuthorityIdentity value (names the evaluator, not the issuer -- Definitions §4). */
  evaluatorIdentity: NamedVersionedIdentity
  certificationAuthority: CertificationAuthorityIdentity
  invoker: CertificationInvoker
  invocationGrant: CertificationInvocationGrantEvidence
  upstreamCertification: UpstreamCertificationBinding | null
  sourceProvenance: Record<string, string>
  sourceContext: CertificationSourceContext
  issuedAt: string
  /** First slice: only "issued" is ever produced or accepted (§9). */
  state: string
}

export interface CertificationAttestation {
  algorithm: "Ed25519"
  keyId: string
  /** base64url signature over certificationRecordSignedBytes(record) */
  signature: string
}

export interface AttestedCertificationRecord {
  record: CertificationRecord
  attestation: CertificationAttestation
}

/** A durable issuer-registry entry: the attested record plus the exact artifact it certifies. */
export interface CertificationRegistryEntry {
  attested: AttestedCertificationRecord
  artifact: unknown
}

// PLT-ADR-015 §13 governed failure categories (plus PLT-ADR-010's).
export type CertificationEvidenceFailure =
  | "INVALID_CONTRACT"
  | "UNSUPPORTED_VERSION"
  | "UNKNOWN_CERTIFICATION_REFERENCE"
  | "FORGED_OR_INVALID_ATTESTATION"
  | "UNRECOGNIZED_CERTIFICATION_AUTHORITY"
  | "UNSUPPORTED_CERTIFICATION_POLICY"
  | "SUBJECT_IDENTITY_MISMATCH"
  | "PROVENANCE_MISMATCH"
  | "CERTIFICATION_NOT_IN_PERMITTED_STATE"
