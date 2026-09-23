export { CANONICAL_JSON_SCHEME, CanonicalizationError, canonicalBytes, canonicalSerialize } from "./canonicalJson.ts"

export type {
  AttestedCertificationRecord,
  CertificationAttestation,
  CertificationAuthorityIdentity,
  CertificationEvidenceFailure,
  CertificationInvocationGrantEvidence,
  CertificationInvoker,
  CertificationRecord,
  CertificationRegistryEntry,
  CertificationSourceContext,
  CertificationSubjectKind,
  NamedVersionedIdentity,
  SubjectDigest,
  UpstreamCertificationBinding,
} from "./types.ts"

export {
  CERTIFICATION_AUTHORITY_ID,
  CERTIFICATION_INVOCATION_CAPABILITIES,
  CERTIFICATION_RECORD_FORMAT_VERSION,
  PERMITTED_CERTIFICATION_STATES,
  RECOGNIZED_CERTIFICATION_POLICIES,
  findRecognizedPolicy,
  isCertificationSubjectKind,
  policyForSubjectKind,
} from "./policies.ts"
export type { RecognizedCertificationPolicy } from "./policies.ts"

export {
  CERTIFICATION_RECORD_SIGNATURE_DOMAIN,
  CERTIFICATION_SIGNATURE_ALGORITHM,
  certificationRecordSignedBytes,
  computeSubjectDigest,
  createEd25519Signer,
  createKeyTrust,
  verifyRecordAttestation,
} from "./attestation.ts"
export type { AttestationVerification, CertificationKeyTrust, CertificationSigner, TrustedCertificationKey } from "./attestation.ts"

export { CertificationRecordShapeError, parseAttestedCertificationRecord, parseCertificationRecord } from "./recordShape.ts"
export { verifyAttestedEvidence } from "./verify.ts"
export type { EvidenceVerification } from "./verify.ts"

export type {
  CertificationGrantSource,
  CertificationRefusalAudit,
  CertificationRefusalAuditEntry,
  CertificationRegistry,
  InvocationGrantResolution,
  InvocationGrantRow,
  RefusalGrantResult,
} from "./ports.ts"

export { createCertificationAuthority } from "./authority.ts"
export type {
  AuthenticatedInvoker,
  CertificationAuthority,
  CertificationAuthorityDeps,
  CertificationRefusalCategory,
  InvokeCertificationRequest,
  InvokeCertificationResult,
} from "./authority.ts"

export { ATTESTED_CERTIFIED_EPISODE_CONTRACT_VERSION, exportAttestedCertifiedEpisodeContract } from "./contract.ts"
export type { AttestedCertifiedEpisodeContractDocument, AttestedContractExportResult } from "./contract.ts"
