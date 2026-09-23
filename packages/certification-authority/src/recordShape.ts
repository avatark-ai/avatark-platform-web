// Strict structural parse of an attested Certification Record. Unknown
// states are accepted STRUCTURALLY (as any non-empty string) so the state
// check can fail them explicitly as CERTIFICATION_NOT_IN_PERMITTED_STATE
// (§9) rather than as a shape error.
import type { AttestedCertificationRecord, CertificationEvidenceFailure, CertificationRecord } from "./types.ts"

export class CertificationRecordShapeError extends Error {
  readonly failure: CertificationEvidenceFailure
  constructor(failure: CertificationEvidenceFailure, message: string) {
    super(message)
    this.failure = failure
    this.name = "CertificationRecordShapeError"
  }
}

const HEX64 = /^[0-9a-f]{64}$/

function obj(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new CertificationRecordShapeError("INVALID_CONTRACT", `${path} must be an object`)
  }
  return value as Record<string, unknown>
}

function exactKeys(o: Record<string, unknown>, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(o)) {
    if (!allowed.includes(key)) throw new CertificationRecordShapeError("INVALID_CONTRACT", `${path} has unexpected field "${key}"`)
  }
}

const RECORD_KEYS = [
  "recordFormatVersion", "certificationRecordId", "subjectKind", "subjectId", "subjectDigest", "certificationPolicy",
  "evaluatorIdentity", "certificationAuthority", "invoker", "invocationGrant", "upstreamCertification",
  "sourceProvenance", "sourceContext", "issuedAt", "state",
] as const

function str(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) throw new CertificationRecordShapeError("INVALID_CONTRACT", `${path} must be a non-empty string`)
  return value
}

function nullableStr(value: unknown, path: string): string | null {
  if (value === null) return null
  return str(value, path)
}

function identity(value: unknown, path: string) {
  const o = obj(value, path)
  return { name: str(o.name, `${path}.name`), version: str(o.version, `${path}.version`) }
}

function digest(value: unknown, path: string) {
  const o = obj(value, path)
  if (o.algorithm !== "SHA-256") throw new CertificationRecordShapeError("INVALID_CONTRACT", `${path}.algorithm must be SHA-256`)
  if (o.canonicalization !== "AVATARK_CANONICAL_JSON_V1") throw new CertificationRecordShapeError("INVALID_CONTRACT", `${path}.canonicalization must be AVATARK_CANONICAL_JSON_V1`)
  const v = str(o.value, `${path}.value`)
  if (!HEX64.test(v)) throw new CertificationRecordShapeError("INVALID_CONTRACT", `${path}.value must be 64 lowercase hex`)
  return { algorithm: "SHA-256" as const, canonicalization: "AVATARK_CANONICAL_JSON_V1" as const, value: v }
}

export function parseCertificationRecord(raw: unknown): CertificationRecord {
  const r = obj(raw, "record")
  exactKeys(r, RECORD_KEYS, "record")
  if (r.recordFormatVersion !== "1") {
    throw new CertificationRecordShapeError("UNSUPPORTED_VERSION", `unsupported recordFormatVersion "${String(r.recordFormatVersion)}"`)
  }
  const subjectKind = r.subjectKind
  if (subjectKind !== "INTERPRETATION" && subjectKind !== "EPISODE") {
    throw new CertificationRecordShapeError("INVALID_CONTRACT", "record.subjectKind must be INTERPRETATION or EPISODE")
  }
  const authority = obj(r.certificationAuthority, "record.certificationAuthority")
  const invoker = obj(r.invoker, "record.invoker")
  if (invoker.kind !== "HUMAN") throw new CertificationRecordShapeError("INVALID_CONTRACT", "record.invoker.kind must be HUMAN")
  if (invoker.authenticationMethod !== "SUPABASE_SESSION") {
    throw new CertificationRecordShapeError("INVALID_CONTRACT", "record.invoker.authenticationMethod must be SUPABASE_SESSION")
  }
  const grant = obj(r.invocationGrant, "record.invocationGrant")
  if (grant.scopeType !== "platform" || grant.scopeId !== null) {
    throw new CertificationRecordShapeError("INVALID_CONTRACT", "record.invocationGrant must be platform-scoped")
  }
  let upstreamCertification: CertificationRecord["upstreamCertification"] = null
  if (r.upstreamCertification !== null) {
    const u = obj(r.upstreamCertification, "record.upstreamCertification")
    if (u.subjectKind !== "INTERPRETATION") throw new CertificationRecordShapeError("INVALID_CONTRACT", "upstreamCertification.subjectKind must be INTERPRETATION")
    upstreamCertification = {
      certificationRecordId: str(u.certificationRecordId, "upstreamCertification.certificationRecordId"),
      subjectKind: "INTERPRETATION",
      subjectId: str(u.subjectId, "upstreamCertification.subjectId"),
      subjectDigest: digest(u.subjectDigest, "upstreamCertification.subjectDigest"),
    }
  }
  const provenance = obj(r.sourceProvenance, "record.sourceProvenance")
  const sourceProvenance: Record<string, string> = {}
  for (const [key, value] of Object.entries(provenance)) sourceProvenance[key] = str(value, `record.sourceProvenance.${key}`)
  const context = obj(r.sourceContext, "record.sourceContext")
  const issuedAt = str(r.issuedAt, "record.issuedAt")
  if (Number.isNaN(Date.parse(issuedAt))) throw new CertificationRecordShapeError("INVALID_CONTRACT", "record.issuedAt must be an ISO timestamp")

  return {
    recordFormatVersion: "1",
    certificationRecordId: str(r.certificationRecordId, "record.certificationRecordId"),
    subjectKind,
    subjectId: str(r.subjectId, "record.subjectId"),
    subjectDigest: digest(r.subjectDigest, "record.subjectDigest"),
    certificationPolicy: identity(r.certificationPolicy, "record.certificationPolicy"),
    evaluatorIdentity: identity(r.evaluatorIdentity, "record.evaluatorIdentity"),
    certificationAuthority: { authorityId: str(authority.authorityId, "authority.authorityId"), keyId: str(authority.keyId, "authority.keyId") },
    invoker: { kind: "HUMAN", userId: str(invoker.userId, "invoker.userId"), authenticationMethod: "SUPABASE_SESSION" },
    invocationGrant: {
      grantId: str(grant.grantId, "invocationGrant.grantId"),
      capability: str(grant.capability, "invocationGrant.capability"),
      scopeType: "platform",
      scopeId: null,
      grantedBy: str(grant.grantedBy, "invocationGrant.grantedBy"),
      grantedAt: str(grant.grantedAt, "invocationGrant.grantedAt"),
    },
    upstreamCertification,
    sourceProvenance,
    sourceContext: { projectId: nullableStr(context.projectId, "sourceContext.projectId"), worldId: nullableStr(context.worldId, "sourceContext.worldId") },
    issuedAt,
    state: str(r.state, "record.state"),
  }
}

export function parseAttestedCertificationRecord(raw: unknown): AttestedCertificationRecord {
  const a = obj(raw, "certificationRecord")
  exactKeys(a, ["record", "attestation"], "certificationRecord")
  const record = parseCertificationRecord(a.record)
  const att = obj(a.attestation, "attestation")
  exactKeys(att, ["algorithm", "keyId", "signature"], "attestation")
  return {
    record,
    attestation: {
      algorithm: str(att.algorithm, "attestation.algorithm") as "Ed25519",
      keyId: str(att.keyId, "attestation.keyId"),
      signature: str(att.signature, "attestation.signature"),
    },
  }
}
