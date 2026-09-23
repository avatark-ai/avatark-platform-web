// The Certification Authority's injected dependencies. Every port is backed
// in the host (lib/certificationAuthority) by durable, server-side
// infrastructure; in-memory implementations exist only as test doubles.
import type { CertificationRegistryEntry, CertificationSubjectKind } from "./types.ts"

/** An administrator-issued grant row as the grant source reports it. */
export interface InvocationGrantRow {
  id: string
  capability: string
  scopeType: string
  scopeId: string | null
  grantedAt: string
  grantedBy: string | null
}

export type InvocationGrantResolution =
  | { granted: true; grant: InvocationGrantRow }
  | { granted: false; reason: string }

export interface CertificationGrantSource {
  /** Server-side resolution of one capability for one authenticated user. Never throws. */
  resolveInvocationGrant(userId: string, capability: string): Promise<InvocationGrantResolution>
}

/** Durable, append-only issuer registry (§5, §6). */
export interface CertificationRegistry {
  /** Resolves only after the entry is durably committed. Throws on any failure. Never overwrites. */
  appendIssued(entry: CertificationRegistryEntry): Promise<void>
  getByRecordId(certificationRecordId: string): Promise<CertificationRegistryEntry | null>
  listBySubject(subjectKind: CertificationSubjectKind, subjectId: string): Promise<CertificationRegistryEntry[]>
}

export type RefusalGrantResult = "GRANTED" | "DENIED" | "NOT_EVALUATED"

/** §12: durable audit of a refused invocation. Holds no attestation and never resolves as certification evidence. */
export interface CertificationRefusalAuditEntry {
  attemptId: string
  invokerUserId: string | null
  requestedSubjectKind: string | null
  requestedSubjectRef: string | null
  grantResult: RefusalGrantResult
  grantId: string | null
  refusalCategory: string
  refusalDetail: string
  policyName: string | null
  policyVersion: string | null
  evaluatorName: string | null
  evaluatorVersion: string | null
  occurredAt: string
}

export interface CertificationRefusalAudit {
  /** Resolves only after the entry is durably committed. Throws on failure. */
  appendRefusal(entry: CertificationRefusalAuditEntry): Promise<void>
}
