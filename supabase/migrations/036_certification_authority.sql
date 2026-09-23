-- AvatarK Platform -- Narrative Certification Authority (PLT-ADR-015)
--
-- The durable, append-only issuer registry of attested Certification
-- Records, and the durable audit of refused certification invocations.
-- Written only by the server-side Certification Authority
-- (packages/certification-authority via lib/certificationAuthority) using
-- the service-role client; never exposed to anon/authenticated.
--
-- Immutability is enforced in the DATABASE, not only by the absence of RLS
-- write policies: service_role bypasses RLS, so BEFORE UPDATE/DELETE and
-- BEFORE TRUNCATE triggers reject every mutation of an issued record or a
-- refusal audit row. Correction happens only by appending (PLT-ADR-015 §6,
-- §9) -- never by overwriting.
--
-- canonical_record / canonical_artifact hold the exact AVATARK_CANONICAL_JSON_V1
-- text that was signed / digested, so the evidence survives byte-for-byte.
-- CHECK constraints bind every indexed column to that canonical evidence,
-- including recomputing the subject digest in SQL, so a row can never claim
-- a subject, key, policy or state its signed payload does not.

create or replace function certification_evidence_forbid_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'certification evidence is immutable: % on % is not permitted', tg_op, tg_table_name
    using errcode = '55000';
end;
$$;

create table if not exists certification_records (
  certification_record_id text primary key,
  record_format_version text not null,
  subject_kind text not null,
  subject_id text not null,
  subject_digest text not null,
  policy_name text not null,
  policy_version text not null,
  evaluator_name text not null,
  evaluator_version text not null,
  authority_id text not null,
  key_id text not null,
  invoker_user_id uuid not null,
  invocation_grant_id uuid not null,
  upstream_certification_record_id text references certification_records (certification_record_id),
  state text not null,
  issued_at timestamptz not null,
  canonical_record text not null,
  canonical_artifact text not null,
  signature_algorithm text not null,
  signature text not null,
  registered_at timestamptz not null default now(),

  constraint certification_records_id_shape_check
    check (certification_record_id ~ '^certrec_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  constraint certification_records_format_check check (record_format_version = '1'),
  constraint certification_records_subject_kind_check check (subject_kind in ('INTERPRETATION', 'EPISODE')),
  constraint certification_records_subject_id_check check (length(subject_id) > 0),
  constraint certification_records_digest_shape_check check (subject_digest ~ '^[0-9a-f]{64}$'),
  -- first slice: only 'issued' may ever be registered (PLT-ADR-015 §9)
  constraint certification_records_state_check check (state = 'issued'),
  constraint certification_records_signature_algorithm_check check (signature_algorithm = 'Ed25519'),
  constraint certification_records_signature_shape_check check (signature ~ '^[A-Za-z0-9_-]{86}$'),
  -- §4 causal chain: an EPISODE record always binds an upstream record; an INTERPRETATION never does
  constraint certification_records_upstream_check
    check ((subject_kind = 'EPISODE') = (upstream_certification_record_id is not null)),
  -- the digest column is the SHA-256 of the exact canonical artifact bytes
  constraint certification_records_digest_binding_check
    check (subject_digest = encode(sha256(convert_to(canonical_artifact, 'UTF8')), 'hex')),
  -- every indexed column equals the signed canonical record's own value
  constraint certification_records_record_binding_check
    check (
      (canonical_record::jsonb ->> 'certificationRecordId') = certification_record_id
      and (canonical_record::jsonb ->> 'recordFormatVersion') = record_format_version
      and (canonical_record::jsonb ->> 'subjectKind') = subject_kind
      and (canonical_record::jsonb ->> 'subjectId') = subject_id
      and (canonical_record::jsonb -> 'subjectDigest' ->> 'value') = subject_digest
      and (canonical_record::jsonb -> 'certificationPolicy' ->> 'name') = policy_name
      and (canonical_record::jsonb -> 'certificationPolicy' ->> 'version') = policy_version
      and (canonical_record::jsonb -> 'evaluatorIdentity' ->> 'name') = evaluator_name
      and (canonical_record::jsonb -> 'evaluatorIdentity' ->> 'version') = evaluator_version
      and (canonical_record::jsonb -> 'certificationAuthority' ->> 'authorityId') = authority_id
      and (canonical_record::jsonb -> 'certificationAuthority' ->> 'keyId') = key_id
      and (canonical_record::jsonb -> 'invoker' ->> 'userId') = invoker_user_id::text
      and (canonical_record::jsonb -> 'invocationGrant' ->> 'grantId') = invocation_grant_id::text
      and (canonical_record::jsonb ->> 'state') = state
      and (canonical_record::jsonb ->> 'issuedAt')::timestamptz = issued_at
      and coalesce(canonical_record::jsonb -> 'upstreamCertification' ->> 'certificationRecordId', '') = coalesce(upstream_certification_record_id, '')
    )
);

-- resolvable by subject (multiple records per subject are expected: append-only)
create index if not exists certification_records_subject_idx
  on certification_records (subject_kind, subject_id);
-- key-level distrust / rotation audits ("every record signed under key X")
create index if not exists certification_records_key_idx
  on certification_records (authority_id, key_id);
create index if not exists certification_records_policy_idx
  on certification_records (policy_name, policy_version);
create index if not exists certification_records_upstream_idx
  on certification_records (upstream_certification_record_id)
  where upstream_certification_record_id is not null;
create index if not exists certification_records_invoker_idx
  on certification_records (invoker_user_id);

drop trigger if exists certification_records_immutable on certification_records;
create trigger certification_records_immutable
  before update or delete on certification_records
  for each row execute function certification_evidence_forbid_mutation();

drop trigger if exists certification_records_no_truncate on certification_records;
create trigger certification_records_no_truncate
  before truncate on certification_records
  for each statement execute function certification_evidence_forbid_mutation();

-- PLT-ADR-015 §12: refused invocations. Deliberately a separate table with
-- no certification_record_id, no digest binding and no signature column:
-- a refusal audit row can never be resolved as certification evidence.
create table if not exists certification_invocation_refusals (
  attempt_id uuid primary key,
  invoker_user_id uuid,
  requested_subject_kind text,
  requested_subject_ref text,
  grant_result text not null,
  grant_id uuid,
  refusal_category text not null,
  refusal_detail text not null,
  policy_name text,
  policy_version text,
  evaluator_name text,
  evaluator_version text,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),

  constraint certification_refusals_grant_result_check check (grant_result in ('GRANTED', 'DENIED', 'NOT_EVALUATED')),
  constraint certification_refusals_kind_length_check check (requested_subject_kind is null or length(requested_subject_kind) <= 32),
  constraint certification_refusals_ref_length_check check (requested_subject_ref is null or length(requested_subject_ref) <= 200),
  constraint certification_refusals_category_check check (refusal_category ~ '^[A-Z_]{1,64}$'),
  constraint certification_refusals_detail_length_check check (length(refusal_detail) <= 500)
);

create index if not exists certification_refusals_invoker_idx
  on certification_invocation_refusals (invoker_user_id, occurred_at);

drop trigger if exists certification_refusals_immutable on certification_invocation_refusals;
create trigger certification_refusals_immutable
  before update or delete on certification_invocation_refusals
  for each row execute function certification_evidence_forbid_mutation();

drop trigger if exists certification_refusals_no_truncate on certification_invocation_refusals;
create trigger certification_refusals_no_truncate
  before truncate on certification_invocation_refusals
  for each statement execute function certification_evidence_forbid_mutation();

-- RLS on, zero policies: anon/authenticated can neither read nor write.
alter table certification_records enable row level security;
alter table certification_invocation_refusals enable row level security;

-- Supabase's default privileges grant ALL on new public tables to anon,
-- authenticated and service_role; revoke everything first, then grant the
-- Authority only append + read. UPDATE/DELETE/TRUNCATE are therefore
-- refused by privilege AND by the triggers above (which also stop the
-- table owner / a superuser session).
revoke all on certification_records from anon, authenticated, service_role;
revoke all on certification_invocation_refusals from anon, authenticated, service_role;
grant select, insert on certification_records to service_role;
grant select, insert on certification_invocation_refusals to service_role;
