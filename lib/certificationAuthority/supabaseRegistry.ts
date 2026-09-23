// Server-only. Durable issuer registry + refusal audit for the
// Certification Authority, over migration 036's immutable tables, via the
// service-role Supabase client (lib/supabase/admin.ts). Never import from a
// 'use client' file.
//
// appendIssued/appendRefusal are plain INSERTs (never upsert): a PostgREST
// insert returns only after the row is committed, so the Authority cannot
// report ISSUED before durability. A duplicate record id is a primary-key
// violation (an error), never an overwrite.
import type { SupabaseClient } from '@supabase/supabase-js'
import { canonicalSerialize } from '@avatark/certification-authority'
import type {
  CertificationRefusalAudit,
  CertificationRefusalAuditEntry,
  CertificationRegistry,
  CertificationRegistryEntry,
  CertificationSubjectKind,
} from '@avatark/certification-authority'

export const CERTIFICATION_RECORDS_TABLE = 'certification_records'
export const CERTIFICATION_REFUSALS_TABLE = 'certification_invocation_refusals'

const RECORD_COLUMNS = 'certification_record_id, canonical_record, canonical_artifact, signature_algorithm, key_id, signature'

interface RecordRow {
  certification_record_id: string
  canonical_record: string
  canonical_artifact: string
  signature_algorithm: string
  key_id: string
  signature: string
}

function toEntry(row: RecordRow): CertificationRegistryEntry {
  return {
    attested: {
      record: JSON.parse(row.canonical_record),
      attestation: { algorithm: row.signature_algorithm as 'Ed25519', keyId: row.key_id, signature: row.signature },
    },
    artifact: JSON.parse(row.canonical_artifact),
  }
}

export function createSupabaseCertificationRegistry(admin: SupabaseClient): CertificationRegistry {
  return {
    async appendIssued(entry) {
      const { record, attestation } = entry.attested
      const { error } = await admin.from(CERTIFICATION_RECORDS_TABLE).insert({
        certification_record_id: record.certificationRecordId,
        record_format_version: record.recordFormatVersion,
        subject_kind: record.subjectKind,
        subject_id: record.subjectId,
        subject_digest: record.subjectDigest.value,
        policy_name: record.certificationPolicy.name,
        policy_version: record.certificationPolicy.version,
        evaluator_name: record.evaluatorIdentity.name,
        evaluator_version: record.evaluatorIdentity.version,
        authority_id: record.certificationAuthority.authorityId,
        key_id: record.certificationAuthority.keyId,
        invoker_user_id: record.invoker.userId,
        invocation_grant_id: record.invocationGrant.grantId,
        upstream_certification_record_id: record.upstreamCertification?.certificationRecordId ?? null,
        state: record.state,
        issued_at: record.issuedAt,
        canonical_record: canonicalSerialize(record),
        canonical_artifact: canonicalSerialize(entry.artifact),
        signature_algorithm: attestation.algorithm,
        signature: attestation.signature,
      })
      if (error) throw new Error(`certification registry insert failed: ${error.code ?? ''} ${error.message}`)
    },

    async getByRecordId(certificationRecordId) {
      const { data, error } = await admin
        .from(CERTIFICATION_RECORDS_TABLE)
        .select(RECORD_COLUMNS)
        .eq('certification_record_id', certificationRecordId)
        .maybeSingle()
      if (error) throw new Error(`certification registry read failed: ${error.message}`)
      return data ? toEntry(data as RecordRow) : null
    },

    async listBySubject(subjectKind: CertificationSubjectKind, subjectId: string) {
      const { data, error } = await admin
        .from(CERTIFICATION_RECORDS_TABLE)
        .select(RECORD_COLUMNS)
        .eq('subject_kind', subjectKind)
        .eq('subject_id', subjectId)
        .order('issued_at', { ascending: true })
      if (error) throw new Error(`certification registry read failed: ${error.message}`)
      return ((data ?? []) as RecordRow[]).map(toEntry)
    },
  }
}

export function createSupabaseCertificationRefusalAudit(admin: SupabaseClient): CertificationRefusalAudit {
  return {
    async appendRefusal(entry: CertificationRefusalAuditEntry) {
      const { error } = await admin.from(CERTIFICATION_REFUSALS_TABLE).insert({
        attempt_id: entry.attemptId,
        invoker_user_id: entry.invokerUserId,
        requested_subject_kind: entry.requestedSubjectKind,
        requested_subject_ref: entry.requestedSubjectRef,
        grant_result: entry.grantResult,
        grant_id: entry.grantId,
        refusal_category: entry.refusalCategory,
        refusal_detail: entry.refusalDetail,
        policy_name: entry.policyName,
        policy_version: entry.policyVersion,
        evaluator_name: entry.evaluatorName,
        evaluator_version: entry.evaluatorVersion,
        occurred_at: entry.occurredAt,
      })
      if (error) throw new Error(`certification refusal audit insert failed: ${error.message}`)
    },
  }
}
