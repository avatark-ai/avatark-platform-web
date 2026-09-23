// PLT-ADR-015 §6 durability proof against REAL PostgreSQL (+ PostgREST, the
// interface supabase-js speaks). Skipped unless an ephemeral test database
// is configured -- never a hosted/production project:
//   CERTIFICATION_IT_DATABASE_URL       postgres:// superuser URL of the ephemeral DB
//   CERTIFICATION_IT_SUPABASE_URL       gateway exposing /rest/v1 (PostgREST)
//   CERTIFICATION_IT_SERVICE_ROLE_JWT   test-only service_role JWT
//   CERTIFICATION_IT_ANON_JWT           test-only anon JWT
// with migrations 013, 020 and 036 applied.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { generateKeyPairSync, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { exportAttestedCertifiedEpisodeContract, verifyAttestedEvidence } from '@avatark/certification-authority'
import { handleCertificationInvocation } from './service.ts'
import { loadCertificationKeyConfig, CERTIFICATION_KEY_ENV } from './keyConfig.ts'
import { createSupabaseCertificationRegistry } from './supabaseRegistry.ts'
import { createCapabilityGrant, revokeCapabilityGrant } from '../capabilities/adminGrants.ts'
import { COMPILER_IDENTITY, episodeCandidateFor, interpretationSubject } from '../../packages/certification-authority/test/realSubjects.ts'

const env = process.env
const configured = Boolean(env.CERTIFICATION_IT_DATABASE_URL && env.CERTIFICATION_IT_SUPABASE_URL && env.CERTIFICATION_IT_SERVICE_ROLE_JWT && env.CERTIFICATION_IT_ANON_JWT)
const skip = configured ? false : 'ephemeral certification test database not configured'

const ADMIN = randomUUID()
const CERTIFIER = randomUUID()
const OUTSIDER = randomUUID()
const ROGUE = randomUUID()
const KEY_ID = `it-ephemeral-${Date.now()}`
const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const keyEnv = {
  [CERTIFICATION_KEY_ENV.keyId]: KEY_ID,
  [CERTIFICATION_KEY_ENV.privateKey]: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
}

let db: pg.Client
let admin: SupabaseClient
let interpretationRecordId = ''
let episodeRecordId = ''
let certifiedInterpretation: unknown

function serviceClient() {
  return createClient(env.CERTIFICATION_IT_SUPABASE_URL!, env.CERTIFICATION_IT_SERVICE_ROLE_JWT!, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function count(table: string, where = 'true', params: unknown[] = []): Promise<number> {
  const { rows } = await db.query(`select count(*)::int as n from ${table} where ${where}`, params)
  return rows[0].n
}

async function invoke(userId: string | null, body: unknown) {
  return handleCertificationInvocation(userId, body, { admin, env: keyEnv })
}

before(async () => {
  if (!configured) return
  db = new pg.Client({ connectionString: env.CERTIFICATION_IT_DATABASE_URL })
  await db.connect()
  for (const id of [ADMIN, CERTIFIER, OUTSIDER, ROGUE]) await db.query('insert into auth.users (id) values ($1)', [id])
  admin = serviceClient()
  // Real administrator issuance path (lib/capabilities/adminGrants.ts).
  for (const capability of ['certification.invoke.interpretation', 'certification.invoke.episode']) {
    const granted = await createCapabilityGrant(admin, ADMIN, { userId: CERTIFIER, capability, scopeType: 'platform' })
    assert.equal(granted.status, 'ready', JSON.stringify(granted))
  }
  // A grant that bypassed the admin path and names its holder as issuer.
  await db.query(`insert into capability_grants (user_id, capability, scope_type, granted_by) values ($1, 'certification.invoke.interpretation', 'platform', $1)`, [ROGUE])
})

after(async () => {
  if (db) await db.end()
})

test('IT1 (C): an ungranted human is refused, the refusal is durably audited, and no record is written', { skip }, async () => {
  const before = await count('certification_records')
  const response = await invoke(OUTSIDER, { subjectKind: 'INTERPRETATION', subjectArtifact: interpretationSubject() })
  assert.equal(response.status, 403)
  assert.equal(response.body.category, 'GRANT_DENIED')
  assert.equal(response.body.auditPersisted, true)
  assert.equal(await count('certification_records'), before)
  const { rows } = await db.query('select * from certification_invocation_refusals where attempt_id = $1', [response.body.attemptId])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].invoker_user_id, OUTSIDER)
  assert.equal(rows[0].grant_result, 'DENIED')
  assert.equal(rows[0].refusal_category, 'GRANT_DENIED')
})

test('IT2: an unauthenticated invocation is refused and audited with no invoker', { skip }, async () => {
  const response = await invoke(null, { subjectKind: 'INTERPRETATION', subjectArtifact: interpretationSubject() })
  assert.equal(response.status, 401)
  const { rows } = await db.query('select invoker_user_id, grant_result from certification_invocation_refusals where attempt_id = $1', [response.body.attemptId])
  assert.deepEqual(rows[0], { invoker_user_id: null, grant_result: 'NOT_EVALUATED' })
})

test('IT3: a self-assigned grant (bypassing the admin path) is refused', { skip }, async () => {
  const response = await invoke(ROGUE, { subjectKind: 'INTERPRETATION', subjectArtifact: interpretationSubject() })
  assert.equal(response.status, 403)
  assert.equal(response.body.category, 'SELF_ASSIGNED_GRANT')
})

test('IT4 (D): an interpretation-only-granted request for EPISODE is refused', { skip }, async () => {
  const response = await invoke(ROGUE, { subjectKind: 'EPISODE', subjectArtifact: {} })
  assert.equal(response.status, 403)
  assert.equal(response.body.category, 'GRANT_DENIED')
})

test('IT5 (E): an authorized Interpretation invocation commits a signed record to real Postgres', { skip }, async () => {
  const response = await invoke(CERTIFIER, { subjectKind: 'INTERPRETATION', subjectArtifact: interpretationSubject(), invocationContext: { sourceWorldId: 'living-vrindavan' } })
  assert.equal(response.status, 201, JSON.stringify(response.body))
  const attested = response.body.certificationRecord as { record: { certificationRecordId: string; subjectDigest: { value: string } } }
  interpretationRecordId = attested.record.certificationRecordId
  certifiedInterpretation = response.body.certifiedArtifact
  const { rows } = await db.query('select subject_kind, subject_digest, invoker_user_id, key_id, state, signature_algorithm from certification_records where certification_record_id = $1', [interpretationRecordId])
  assert.deepEqual(rows[0], { subject_kind: 'INTERPRETATION', subject_digest: attested.record.subjectDigest.value, invoker_user_id: CERTIFIER, key_id: KEY_ID, state: 'issued', signature_algorithm: 'Ed25519' })
})

test('IT6 (F): an authorized Episode invocation bound to the durable upstream record commits', { skip }, async () => {
  const response = await invoke(CERTIFIER, {
    subjectKind: 'EPISODE',
    subjectArtifact: { episodeCandidate: episodeCandidateFor(certifiedInterpretation as never), compilerIdentity: COMPILER_IDENTITY, upstreamCertificationRecordId: interpretationRecordId },
  })
  assert.equal(response.status, 201, JSON.stringify(response.body))
  episodeRecordId = (response.body.certificationRecord as { record: { certificationRecordId: string } }).record.certificationRecordId
  const { rows } = await db.query('select upstream_certification_record_id from certification_records where certification_record_id = $1', [episodeRecordId])
  assert.equal(rows[0].upstream_certification_record_id, interpretationRecordId)
})

test('IT7 (G/H/I): Episode issuance with a missing, unknown or refusal-audit upstream id is refused', { skip }, async () => {
  const episodeCandidate = episodeCandidateFor(certifiedInterpretation as never)
  const { rows } = await db.query('select attempt_id from certification_invocation_refusals limit 1')
  for (const upstreamCertificationRecordId of [undefined, `certrec_${randomUUID()}`, rows[0].attempt_id]) {
    const subjectArtifact: Record<string, unknown> = { episodeCandidate, compilerIdentity: COMPILER_IDENTITY }
    if (upstreamCertificationRecordId) subjectArtifact.upstreamCertificationRecordId = upstreamCertificationRecordId
    const response = await invoke(CERTIFIER, { subjectKind: 'EPISODE', subjectArtifact })
    assert.equal(response.body.category, 'PROVENANCE_MISMATCH')
  }
})

test('IT8 (R, issuer): after a process restart, a fresh process resolves both records by id and subject with public keys only', { skip }, async () => {
  const { rows } = await db.query('select subject_id from certification_records where certification_record_id = $1', [episodeRecordId])
  const expectedBySubject = await count('certification_records', 'subject_kind = $1 and subject_id = $2', ['EPISODE', rows[0].subject_id])
  admin = undefined as never // discard this process's client/registry instance
  try {
    const probe = fileURLToPath(new URL('./testSupport/resolveAfterRestart.ts', import.meta.url))
    const out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', probe, interpretationRecordId, episodeRecordId], {
      env: { ...env, CERTIFICATION_IT_PUBLIC_KEY_SPKI: publicKey.export({ format: 'der', type: 'spki' }).toString('base64'), CERTIFICATION_IT_KEY_ID: KEY_ID },
      encoding: 'utf8',
    })
    const result = JSON.parse(out.trim().split('\n').at(-1)!)
    assert.notEqual(result.pid, process.pid)
    assert.deepEqual({ ...result, pid: 0 }, { pid: 0, interpretationVerified: true, episodeVerified: true, episodeUpstream: interpretationRecordId, bySubjectCount: expectedBySubject })
  } finally {
    admin = serviceClient()
  }
})

test('IT9: issued records and refusal audits are immutable -- UPDATE/DELETE/TRUNCATE fail for the superuser and for service_role', { skip }, async () => {
  for (const sql of [
    `update certification_records set state = 'withdrawn' where certification_record_id = '${interpretationRecordId}'`,
    `delete from certification_records where certification_record_id = '${interpretationRecordId}'`,
    'truncate certification_records cascade',
    `update certification_invocation_refusals set refusal_category = 'X'`,
    'delete from certification_invocation_refusals',
    'truncate certification_invocation_refusals',
  ]) {
    await assert.rejects(db.query(sql), (e: { code?: string }) => e.code === '55000', sql)
  }
  const patch = await admin.from('certification_records').update({ state: 'withdrawn' }).eq('certification_record_id', interpretationRecordId)
  assert.ok(patch.error, 'service_role has no UPDATE privilege')
  const del = await admin.from('certification_records').delete().eq('certification_record_id', interpretationRecordId)
  assert.ok(del.error, 'service_role has no DELETE privilege')
  assert.equal(await count('certification_records', 'certification_record_id = $1 and state = $2', [interpretationRecordId, 'issued']), 1)
})

test('IT10: database constraints bind every column to the signed canonical evidence', { skip }, async () => {
  const { rows } = await db.query('select * from certification_records where certification_record_id = $1', [interpretationRecordId])
  const base = rows[0]
  const attempt = async (overrides: Record<string, unknown>) => {
    const row = { ...base, ...overrides, certification_record_id: overrides.certification_record_id ?? `certrec_${randomUUID()}` }
    delete row.registered_at
    const cols = Object.keys(row)
    return db.query(`insert into certification_records (${cols.join(',')}) values (${cols.map((_, i) => `$${i + 1}`).join(',')})`, cols.map((c) => row[c]))
  }
  // copying a record under a new id breaks the record binding (the signed id differs)
  await assert.rejects(attempt({}), /certification_records_record_binding_check/)
  // an artifact that does not hash to the digest
  await assert.rejects(attempt({ canonical_artifact: base.canonical_artifact.replace('"candidateId":"', '"candidateId":"0') }), /digest_binding_check|record_binding_check/)
  await assert.rejects(attempt({ state: 'withdrawn' }), /state_check|record_binding_check/)
  await assert.rejects(attempt({ subject_kind: 'EPISODE' }), /upstream_check|record_binding_check/)
  await assert.rejects(attempt({ certification_record_id: interpretationRecordId }), /duplicate key|pkey/)
})

test('IT11: anon/authenticated API roles can neither read nor write certification evidence', { skip }, async () => {
  const anon = createClient(env.CERTIFICATION_IT_SUPABASE_URL!, env.CERTIFICATION_IT_ANON_JWT!, { auth: { persistSession: false, autoRefreshToken: false } })
  const read = await anon.from('certification_records').select('certification_record_id')
  assert.ok(read.error, 'anon read refused')
  const write = await anon.from('certification_invocation_refusals').insert({ attempt_id: randomUUID(), grant_result: 'DENIED', refusal_category: 'X', refusal_detail: 'x', occurred_at: new Date().toISOString() })
  assert.ok(write.error, 'anon write refused')
})

test('IT12: a refusal audit entry never resolves as certification evidence', { skip }, async () => {
  const { rows } = await db.query('select attempt_id from certification_invocation_refusals')
  const registry = createSupabaseCertificationRegistry(admin)
  for (const row of rows) assert.equal(await registry.getByRecordId(row.attempt_id), null)
})

test('IT13: the attested v2 contract is exported from the durable registry and verifies', { skip }, async () => {
  const keys = loadCertificationKeyConfig(keyEnv)
  assert.equal(keys.status, 'CONFIGURED')
  if (keys.status !== 'CONFIGURED') return
  const exported = await exportAttestedCertifiedEpisodeContract(createSupabaseCertificationRegistry(serviceClient()), keys.trust, episodeRecordId)
  assert.equal(exported.decision, 'EXPORTED')
  if (exported.decision !== 'EXPORTED') return
  assert.equal(verifyAttestedEvidence(exported.document.certificationRecord, exported.document.certifiedEpisode, 'EPISODE', keys.trust).ok, true)
})

test('IT14: a revoked grant stops authorizing new certifications', { skip }, async () => {
  const { rows } = await db.query(`select id from capability_grants where user_id = $1 and capability = 'certification.invoke.interpretation' and revoked_at is null`, [CERTIFIER])
  const revoked = await revokeCapabilityGrant(admin, ADMIN, rows[0].id)
  assert.equal(revoked.status, 'ready')
  const response = await invoke(CERTIFIER, { subjectKind: 'INTERPRETATION', subjectArtifact: interpretationSubject() })
  assert.equal(response.status, 403)
  assert.equal(response.body.category, 'GRANT_DENIED')
  assert.equal(await count('certification_records', 'certification_record_id = $1', [interpretationRecordId]), 1, 'existing records are unaffected')
})
