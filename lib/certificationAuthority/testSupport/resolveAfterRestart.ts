// Integration-test support: runs in a SEPARATE node process (a genuine
// process restart relative to the issuing process). Reconstructs the
// registry from configuration alone and resolves the given record ids,
// verifying them with PUBLIC key material only. Prints one JSON line.
import { createPublicKey } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { createKeyTrust, verifyAttestedEvidence, CERTIFICATION_AUTHORITY_ID } from '@avatark/certification-authority'
import { createSupabaseCertificationRegistry } from '../supabaseRegistry.ts'

const [interpretationRecordId, episodeRecordId] = process.argv.slice(2)
const admin = createClient(process.env.CERTIFICATION_IT_SUPABASE_URL!, process.env.CERTIFICATION_IT_SERVICE_ROLE_JWT!, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const registry = createSupabaseCertificationRegistry(admin)
const publicKey = createPublicKey({ key: Buffer.from(process.env.CERTIFICATION_IT_PUBLIC_KEY_SPKI!, 'base64'), format: 'der', type: 'spki' })
const trust = createKeyTrust([{ keyId: process.env.CERTIFICATION_IT_KEY_ID!, authorityId: CERTIFICATION_AUTHORITY_ID, algorithm: 'Ed25519', publicKey }])

const interpretation = await registry.getByRecordId(interpretationRecordId)
const episode = await registry.getByRecordId(episodeRecordId)
const bySubject = episode ? await registry.listBySubject('EPISODE', episode.attested.record.subjectId) : []
console.log(JSON.stringify({
  pid: process.pid,
  interpretationVerified: interpretation ? verifyAttestedEvidence(interpretation.attested, interpretation.artifact, 'INTERPRETATION', trust).ok : false,
  episodeVerified: episode ? verifyAttestedEvidence(episode.attested, episode.artifact, 'EPISODE', trust).ok : false,
  episodeUpstream: episode?.attested.record.upstreamCertification?.certificationRecordId ?? null,
  bySubjectCount: bySubject.length,
}))
