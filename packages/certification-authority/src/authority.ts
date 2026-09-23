// PLT-ADR-015 §3: the Certification Authority -- the SOLE issuer of
// Certification Records. It wraps the existing, UNMODIFIED pure evaluators
// (certifyInterpretationCandidate, certifyEpisodeCandidate,
// certifyEpisodeCandidateWithProposal). Calling an evaluator directly
// yields only a non-authoritative evaluation result; authority exists only
// when this boundary issues a signed record and durably commits it.
//
// Fixed order (fail closed at every step, nothing authoritative on refusal):
//   1. authenticate invoker (human, authenticated session)
//   2. resolve + check the per-subject-kind certification-invocation grant
//   3. validate subject kind
//   4. validate the subject/candidate input contract
//   5. EPISODE: resolve + verify the upstream Interpretation Certification
//      Record from this Authority's own registry (never caller-supplied)
//   6. run the existing pure evaluator
//   7. refuse if the evaluator refuses
//   8. compute the canonical subject digest
//   9. construct the immutable Certification Record
//  10. sign it
//  11-12. durably persist and commit it
//  13. only then return ISSUED
// Every refusal is durably audited (§12) and holds no attestation.
import { randomUUID } from "node:crypto"
import { certifyInterpretationCandidate } from "@avatark/narrative-interpretation"
import { certifyEpisodeCandidate, certifyEpisodeCandidateWithProposal } from "@avatark/episode-compiler"
import { computeSubjectDigest, verifyRecordAttestation, type CertificationKeyTrust, type CertificationSigner } from "./attestation.ts"
import { verifyAttestedEvidence } from "./verify.ts"
import {
  CERTIFICATION_INVOCATION_CAPABILITIES,
  CERTIFICATION_RECORD_FORMAT_VERSION,
  isCertificationSubjectKind,
  policyForSubjectKind,
} from "./policies.ts"
import type {
  CertificationGrantSource,
  CertificationRefusalAudit,
  CertificationRefusalAuditEntry,
  CertificationRegistry,
  InvocationGrantRow,
  RefusalGrantResult,
} from "./ports.ts"
import type {
  AttestedCertificationRecord,
  CertificationInvocationGrantEvidence,
  CertificationRecord,
  CertificationSourceContext,
  CertificationSubjectKind,
  UpstreamCertificationBinding,
} from "./types.ts"

export interface AuthenticatedInvoker {
  kind: "HUMAN"
  userId: string
  authenticationMethod: "SUPABASE_SESSION"
}

export interface InvokeCertificationRequest {
  /** Established server-side from a verified session -- never from the request body. */
  authenticatedInvoker: AuthenticatedInvoker | null
  subjectKind: unknown
  /** INTERPRETATION: { candidate, sourceInput, sourceIdentity }. EPISODE: { episodeCandidate, compilerIdentity, sourceProposal?, upstreamCertificationRecordId }. */
  subjectArtifact: unknown
  /** Optional provenance only: { sourceProjectId?, sourceWorldId? }. */
  invocationContext?: unknown
}

export type CertificationRefusalCategory =
  | "UNAUTHENTICATED_INVOKER"
  | "GRANT_DENIED"
  | "SELF_ASSIGNED_GRANT"
  | "UNSUPPORTED_SUBJECT_KIND"
  | "INVALID_SUBJECT"
  | "INVALID_INVOCATION_CONTEXT"
  | "PROVENANCE_MISMATCH"
  | "EVALUATOR_REFUSED"
  | "ISSUANCE_NOT_DURABLE"
  | "INTERNAL_ERROR"

export type InvokeCertificationResult =
  | { outcome: "ISSUED"; attested: AttestedCertificationRecord; artifact: unknown }
  | {
      outcome: "REFUSED"
      attemptId: string
      category: CertificationRefusalCategory
      detail: string
      auditPersisted: boolean
    }

export interface CertificationAuthorityDeps {
  grants: CertificationGrantSource
  registry: CertificationRegistry
  refusalAudit: CertificationRefusalAudit
  signer: CertificationSigner
  /** Keys this Authority accepts for records in its own registry (its current key plus retired, uncompromised ones). */
  trust: CertificationKeyTrust
  now?: () => Date
  newRecordId?: () => string
  newAttemptId?: () => string
}

const MAX_REF_LENGTH = 200
const MAX_DETAIL_LENGTH = 500

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function boundedString(value: unknown, max = MAX_REF_LENGTH): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= max ? value : null
}

function requestedSubjectRef(kind: unknown, subject: unknown): string | null {
  if (!isObject(subject)) return null
  const candidate = kind === "EPISODE" ? subject.episodeCandidate : subject.candidate
  if (!isObject(candidate)) return null
  return boundedString(kind === "EPISODE" ? candidate.episodeCandidateId : candidate.candidateId)
}

function parseContext(raw: unknown): CertificationSourceContext | null {
  if (raw === undefined || raw === null) return { projectId: null, worldId: null }
  if (!isObject(raw)) return null
  for (const key of Object.keys(raw)) if (key !== "sourceProjectId" && key !== "sourceWorldId") return null
  const projectId = raw.sourceProjectId === undefined ? null : boundedString(raw.sourceProjectId)
  const worldId = raw.sourceWorldId === undefined ? null : boundedString(raw.sourceWorldId)
  if (raw.sourceProjectId !== undefined && projectId === null) return null
  if (raw.sourceWorldId !== undefined && worldId === null) return null
  return { projectId, worldId }
}

function interpretationProvenance(artifact: Record<string, unknown>): Record<string, string> {
  return {
    candidateId: String(artifact.candidateId),
    interpretationInputIdentity: String(artifact.interpretationInputIdentity),
  }
}

function episodeProvenance(artifact: Record<string, unknown>): Record<string, string> {
  const provenance: Record<string, string> = {
    episodeCandidateId: String(artifact.episodeCandidateId),
    sourceCertifiedInterpretationId: String(artifact.sourceCertifiedInterpretationId),
    sourceCandidateId: String(artifact.sourceCandidateId),
    sourceInterpretationInputIdentity: String(artifact.sourceInterpretationInputIdentity),
  }
  if (typeof artifact.sourceProposalId === "string") provenance.sourceProposalId = artifact.sourceProposalId
  return provenance
}

export function createCertificationAuthority(deps: CertificationAuthorityDeps) {
  const now = deps.now ?? (() => new Date())
  const newRecordId = deps.newRecordId ?? (() => `certrec_${randomUUID()}`)
  const newAttemptId = deps.newAttemptId ?? (() => randomUUID())

  async function refuse(
    request: InvokeCertificationRequest,
    category: CertificationRefusalCategory,
    detail: string,
    grantResult: RefusalGrantResult,
    grantId: string | null,
    policyReached: boolean,
  ): Promise<InvokeCertificationResult> {
    const attemptId = newAttemptId()
    const kind = isCertificationSubjectKind(request.subjectKind) ? request.subjectKind : null
    const policy = policyReached && kind ? policyForSubjectKind(kind) : null
    const entry: CertificationRefusalAuditEntry = {
      attemptId,
      invokerUserId: request.authenticatedInvoker?.userId ?? null,
      requestedSubjectKind: kind ?? boundedString(request.subjectKind, 32),
      requestedSubjectRef: requestedSubjectRef(request.subjectKind, request.subjectArtifact),
      grantResult,
      grantId,
      refusalCategory: category,
      refusalDetail: detail.slice(0, MAX_DETAIL_LENGTH),
      policyName: policy?.policy.name ?? null,
      policyVersion: policy?.policy.version ?? null,
      evaluatorName: policy?.evaluator.name ?? null,
      evaluatorVersion: policy?.evaluator.version ?? null,
      occurredAt: now().toISOString(),
    }
    let auditPersisted = true
    try {
      await deps.refusalAudit.appendRefusal(entry)
    } catch {
      auditPersisted = false
    }
    return { outcome: "REFUSED", attemptId, category, detail: entry.refusalDetail, auditPersisted }
  }

  async function invokeCertification(request: InvokeCertificationRequest): Promise<InvokeCertificationResult> {
    // 1. authenticate
    const invoker = request.authenticatedInvoker
    if (!invoker || invoker.kind !== "HUMAN" || invoker.authenticationMethod !== "SUPABASE_SESSION" || !boundedString(invoker.userId)) {
      return refuse(request, "UNAUTHENTICATED_INVOKER", "certification requires an authenticated human invoker", "NOT_EVALUATED", null, false)
    }

    // 3 (kind must be known to name the capability to check in step 2)
    if (!isCertificationSubjectKind(request.subjectKind)) {
      return refuse(request, "UNSUPPORTED_SUBJECT_KIND", "subjectKind must be INTERPRETATION or EPISODE", "NOT_EVALUATED", null, false)
    }
    const subjectKind: CertificationSubjectKind = request.subjectKind

    // 2. grant, checked server-side before anything is evaluated
    const capability = CERTIFICATION_INVOCATION_CAPABILITIES[subjectKind]
    const resolution = await deps.grants.resolveInvocationGrant(invoker.userId, capability)
    if (!resolution.granted) {
      return refuse(request, "GRANT_DENIED", `no active "${capability}" grant (${resolution.reason})`, "DENIED", null, false)
    }
    const grant: InvocationGrantRow = resolution.grant
    if (grant.capability !== capability || grant.scopeType !== "platform" || grant.scopeId !== null) {
      return refuse(request, "GRANT_DENIED", `grant ${grant.id} does not authorize "${capability}"`, "DENIED", grant.id, false)
    }
    if (!grant.grantedBy) {
      return refuse(request, "GRANT_DENIED", `grant ${grant.id} has no issuing administrator`, "DENIED", grant.id, false)
    }
    if (grant.grantedBy === invoker.userId) {
      return refuse(request, "SELF_ASSIGNED_GRANT", `grant ${grant.id} was self-assigned`, "DENIED", grant.id, false)
    }
    const grantEvidence: CertificationInvocationGrantEvidence = {
      grantId: grant.id,
      capability,
      scopeType: "platform",
      scopeId: null,
      grantedBy: grant.grantedBy,
      grantedAt: grant.grantedAt,
    }

    const sourceContext = parseContext(request.invocationContext)
    if (!sourceContext) {
      return refuse(request, "INVALID_INVOCATION_CONTEXT", "invocationContext accepts only bounded sourceProjectId/sourceWorldId strings", "GRANTED", grant.id, false)
    }

    // 4. subject input contract
    const subject = request.subjectArtifact
    if (!isObject(subject)) {
      return refuse(request, "INVALID_SUBJECT", "subjectArtifact must be an object", "GRANTED", grant.id, true)
    }
    const allowedKeys = subjectKind === "INTERPRETATION"
      ? ["candidate", "sourceInput", "sourceIdentity"]
      : ["episodeCandidate", "compilerIdentity", "sourceProposal", "upstreamCertificationRecordId"]
    const extra = Object.keys(subject).filter((k) => !allowedKeys.includes(k))
    if (extra.length > 0) {
      return refuse(request, "INVALID_SUBJECT", `subjectArtifact has unexpected field(s): ${extra.join(", ")}`, "GRANTED", grant.id, true)
    }

    const policy = policyForSubjectKind(subjectKind)
    let artifact: Record<string, unknown>
    let subjectId: string
    let sourceProvenance: Record<string, string>
    let upstreamCertification: UpstreamCertificationBinding | null = null

    if (subjectKind === "INTERPRETATION") {
      if (!isObject(subject.candidate) || subject.sourceInput === undefined || subject.sourceIdentity === undefined) {
        return refuse(request, "INVALID_SUBJECT", "INTERPRETATION requires candidate, sourceInput and sourceIdentity", "GRANTED", grant.id, true)
      }
      // 6-7. existing evaluator, unmodified
      const evaluation = certifyInterpretationCandidate(subject.candidate, subject.sourceInput, subject.sourceIdentity)
      if (evaluation.decision !== "CERTIFIED") {
        return refuse(request, "EVALUATOR_REFUSED", `${evaluation.reason}: ${evaluation.detail}`, "GRANTED", grant.id, true)
      }
      artifact = evaluation.certifiedInterpretation as unknown as Record<string, unknown>
      subjectId = evaluation.certifiedInterpretation.certifiedInterpretationId
      sourceProvenance = interpretationProvenance(artifact)
    } else {
      if (!isObject(subject.episodeCandidate) || subject.compilerIdentity === undefined) {
        return refuse(request, "INVALID_SUBJECT", "EPISODE requires episodeCandidate and compilerIdentity", "GRANTED", grant.id, true)
      }
      // 5. upstream Interpretation Certification Record -- loaded from this
      // Authority's own registry and re-verified. A caller-supplied
      // interpretation id or artifact is never accepted as the root.
      const upstreamId = boundedString(subject.upstreamCertificationRecordId)
      if (!upstreamId) {
        return refuse(request, "PROVENANCE_MISMATCH", "EPISODE requires upstreamCertificationRecordId", "GRANTED", grant.id, true)
      }
      let upstream
      try {
        upstream = await deps.registry.getByRecordId(upstreamId)
      } catch {
        return refuse(request, "PROVENANCE_MISMATCH", "upstream Interpretation record could not be loaded", "GRANTED", grant.id, true)
      }
      if (!upstream) {
        return refuse(request, "PROVENANCE_MISMATCH", `UNKNOWN_CERTIFICATION_REFERENCE: no upstream record ${upstreamId}`, "GRANTED", grant.id, true)
      }
      const upstreamCheck = verifyAttestedEvidence(upstream.attested, upstream.artifact, "INTERPRETATION", deps.trust)
      if (!upstreamCheck.ok) {
        return refuse(request, "PROVENANCE_MISMATCH", `${upstreamCheck.failure}: ${upstreamCheck.detail}`, "GRANTED", grant.id, true)
      }
      const upstreamRecord = upstreamCheck.attested.record
      if (upstreamRecord.certificationRecordId !== upstreamId) {
        return refuse(request, "PROVENANCE_MISMATCH", "registry returned a different upstream record", "GRANTED", grant.id, true)
      }
      if (subject.episodeCandidate.sourceCertifiedInterpretationId !== upstreamRecord.subjectId) {
        return refuse(request, "PROVENANCE_MISMATCH", "episode candidate does not derive from the upstream record's Interpretation", "GRANTED", grant.id, true)
      }

      // 6-7. existing evaluator, unmodified, against the REGISTERED upstream artifact
      const evaluation = subject.sourceProposal === undefined
        ? certifyEpisodeCandidate(subject.episodeCandidate, upstream.artifact, subject.compilerIdentity)
        : certifyEpisodeCandidateWithProposal(subject.episodeCandidate, upstream.artifact, subject.compilerIdentity, subject.sourceProposal)
      if (evaluation.decision !== "CERTIFIED") {
        return refuse(request, "EVALUATOR_REFUSED", `${evaluation.reason}: ${evaluation.detail}`, "GRANTED", grant.id, true)
      }
      if (evaluation.certifiedEpisode.sourceCertifiedInterpretationId !== upstreamRecord.subjectId) {
        return refuse(request, "PROVENANCE_MISMATCH", "certified episode does not bind the upstream Interpretation", "GRANTED", grant.id, true)
      }
      artifact = evaluation.certifiedEpisode as unknown as Record<string, unknown>
      subjectId = evaluation.certifiedEpisode.certifiedEpisodeId
      sourceProvenance = episodeProvenance(artifact)
      upstreamCertification = {
        certificationRecordId: upstreamRecord.certificationRecordId,
        subjectKind: "INTERPRETATION",
        subjectId: upstreamRecord.subjectId,
        subjectDigest: upstreamRecord.subjectDigest,
      }
    }

    // 8-10. digest, record, signature
    let attested: AttestedCertificationRecord
    try {
      const record: CertificationRecord = {
        recordFormatVersion: CERTIFICATION_RECORD_FORMAT_VERSION,
        certificationRecordId: newRecordId(),
        subjectKind,
        subjectId,
        subjectDigest: computeSubjectDigest(artifact),
        certificationPolicy: { ...policy.policy },
        evaluatorIdentity: { ...policy.evaluator },
        certificationAuthority: { authorityId: deps.signer.authorityId, keyId: deps.signer.keyId },
        invoker: { kind: "HUMAN", userId: invoker.userId, authenticationMethod: "SUPABASE_SESSION" },
        invocationGrant: grantEvidence,
        upstreamCertification,
        sourceProvenance,
        sourceContext,
        issuedAt: now().toISOString(),
        state: "issued",
      }
      attested = { record, attestation: deps.signer.sign(record) }
      const selfCheck = verifyRecordAttestation(attested, {
        trustedKeys: [{ keyId: deps.signer.keyId, authorityId: deps.signer.authorityId, algorithm: "Ed25519", publicKey: deps.signer.publicKey }],
        distrustedKeyIds: [],
      })
      if (!selfCheck.ok) throw new Error(selfCheck.detail)
    } catch (error) {
      return refuse(request, "INTERNAL_ERROR", `record construction failed: ${(error as Error).message}`, "GRANTED", grant.id, true)
    }

    // 11-12. durable commit; no success before it resolves
    try {
      await deps.registry.appendIssued({ attested, artifact })
    } catch (error) {
      return refuse(request, "ISSUANCE_NOT_DURABLE", `registry commit failed: ${(error as Error).message}`, "GRANTED", grant.id, true)
    }

    // 13.
    return { outcome: "ISSUED", attested, artifact }
  }

  return { invokeCertification }
}

export type CertificationAuthority = ReturnType<typeof createCertificationAuthority>
