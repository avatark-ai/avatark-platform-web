// Server-only. Signing-key custody for the Certification Authority
// (PLT-ADR-015 §5). The private key is read from server environment only
// -- never a NEXT_PUBLIC_* variable, never a repository file -- and is
// handed straight into createEd25519Signer's closure. No function here
// returns, logs or embeds the key or any part of it in an error message.
//
//   CERTIFICATION_AUTHORITY_SIGNING_KEY_ID          current key id (e.g. "cert-authority-2026-09")
//   CERTIFICATION_AUTHORITY_SIGNING_PRIVATE_KEY     base64 PKCS#8 DER Ed25519 private key
//   CERTIFICATION_AUTHORITY_TRUSTED_PUBLIC_KEYS     optional JSON [{ keyId, publicKeySpkiDerBase64 }]
//                                                   for retired-but-uncompromised keys (rotation)
//   CERTIFICATION_AUTHORITY_DISTRUSTED_KEY_IDS      optional comma-separated compromised key ids
//
// PRODUCTION KEY CUSTODY IS NOT PROVISIONED: no environment anywhere sets
// these today, so the Authority reports NOT_CONFIGURED and issues nothing.
import { createPrivateKey, createPublicKey } from 'node:crypto'
import {
  CERTIFICATION_AUTHORITY_ID,
  createEd25519Signer,
  createKeyTrust,
  type CertificationKeyTrust,
  type CertificationSigner,
  type TrustedCertificationKey,
} from '@avatark/certification-authority'

export const CERTIFICATION_KEY_ENV = {
  keyId: 'CERTIFICATION_AUTHORITY_SIGNING_KEY_ID',
  privateKey: 'CERTIFICATION_AUTHORITY_SIGNING_PRIVATE_KEY',
  trustedPublicKeys: 'CERTIFICATION_AUTHORITY_TRUSTED_PUBLIC_KEYS',
  distrustedKeyIds: 'CERTIFICATION_AUTHORITY_DISTRUSTED_KEY_IDS',
} as const

const KEY_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/

export type CertificationKeyConfig =
  | { status: 'CONFIGURED'; signer: CertificationSigner; trust: CertificationKeyTrust }
  | { status: 'NOT_CONFIGURED'; missing: string[] }
  | { status: 'INVALID'; detail: string }

type Env = Record<string, string | undefined>

export function loadCertificationKeyConfig(env: Env = process.env): CertificationKeyConfig {
  const keyId = env[CERTIFICATION_KEY_ENV.keyId]?.trim()
  const rawPrivateKey = env[CERTIFICATION_KEY_ENV.privateKey]?.trim()
  const missing = [
    ...(keyId ? [] : [CERTIFICATION_KEY_ENV.keyId]),
    ...(rawPrivateKey ? [] : [CERTIFICATION_KEY_ENV.privateKey]),
  ]
  if (missing.length > 0) return { status: 'NOT_CONFIGURED', missing }
  if (!KEY_ID_PATTERN.test(keyId!)) return { status: 'INVALID', detail: `${CERTIFICATION_KEY_ENV.keyId} has an invalid format` }
  if (/TEST-ONLY/i.test(keyId!)) return { status: 'INVALID', detail: 'test-only key ids are never accepted at runtime' }

  let signer: CertificationSigner
  try {
    const privateKey = createPrivateKey({ key: Buffer.from(rawPrivateKey!, 'base64'), format: 'der', type: 'pkcs8' })
    signer = createEd25519Signer({ authorityId: CERTIFICATION_AUTHORITY_ID, keyId: keyId!, privateKey })
  } catch {
    // Deliberately no detail: the error could echo key bytes.
    return { status: 'INVALID', detail: `${CERTIFICATION_KEY_ENV.privateKey} is not a base64 PKCS#8 DER Ed25519 private key` }
  }

  const distrusted = (env[CERTIFICATION_KEY_ENV.distrustedKeyIds] ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (distrusted.includes(keyId!)) return { status: 'INVALID', detail: 'the current signing key id is listed as distrusted' }

  const trusted: TrustedCertificationKey[] = [{ keyId: signer.keyId, authorityId: CERTIFICATION_AUTHORITY_ID, algorithm: 'Ed25519', publicKey: signer.publicKey }]
  const rawTrusted = env[CERTIFICATION_KEY_ENV.trustedPublicKeys]?.trim()
  if (rawTrusted) {
    let parsed: unknown
    try {
      parsed = JSON.parse(rawTrusted)
    } catch {
      return { status: 'INVALID', detail: `${CERTIFICATION_KEY_ENV.trustedPublicKeys} is not JSON` }
    }
    if (!Array.isArray(parsed)) return { status: 'INVALID', detail: `${CERTIFICATION_KEY_ENV.trustedPublicKeys} must be a JSON array` }
    for (const entry of parsed) {
      const e = entry as { keyId?: unknown; publicKeySpkiDerBase64?: unknown }
      if (typeof e.keyId !== 'string' || !KEY_ID_PATTERN.test(e.keyId) || typeof e.publicKeySpkiDerBase64 !== 'string') {
        return { status: 'INVALID', detail: `${CERTIFICATION_KEY_ENV.trustedPublicKeys} entries need keyId and publicKeySpkiDerBase64` }
      }
      if (e.keyId === keyId) continue
      try {
        const publicKey = createPublicKey({ key: Buffer.from(e.publicKeySpkiDerBase64, 'base64'), format: 'der', type: 'spki' })
        if (publicKey.asymmetricKeyType !== 'ed25519') throw new Error('not ed25519')
        trusted.push({ keyId: e.keyId, authorityId: CERTIFICATION_AUTHORITY_ID, algorithm: 'Ed25519', publicKey })
      } catch {
        return { status: 'INVALID', detail: `trusted public key "${e.keyId}" is not an Ed25519 SPKI key` }
      }
    }
  }
  return { status: 'CONFIGURED', signer, trust: createKeyTrust(trusted, distrusted) }
}
