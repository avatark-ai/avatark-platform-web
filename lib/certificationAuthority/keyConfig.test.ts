import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { CERTIFICATION_KEY_ENV, loadCertificationKeyConfig } from './keyConfig.ts'

function ephemeralKey() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  return {
    privateB64: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
    publicB64: publicKey.export({ format: 'der', type: 'spki' }).toString('base64'),
  }
}

test('no key configured -> NOT_CONFIGURED (production custody is not provisioned; nothing can be issued)', () => {
  const result = loadCertificationKeyConfig({})
  assert.equal(result.status, 'NOT_CONFIGURED')
  if (result.status === 'NOT_CONFIGURED') assert.deepEqual(result.missing, [CERTIFICATION_KEY_ENV.keyId, CERTIFICATION_KEY_ENV.privateKey])
})

test('a valid ephemeral Ed25519 key -> CONFIGURED, with the current public key trusted', () => {
  const key = ephemeralKey()
  const result = loadCertificationKeyConfig({ [CERTIFICATION_KEY_ENV.keyId]: 'local-test-key', [CERTIFICATION_KEY_ENV.privateKey]: key.privateB64 })
  assert.equal(result.status, 'CONFIGURED')
  if (result.status !== 'CONFIGURED') return
  assert.equal(result.signer.keyId, 'local-test-key')
  assert.deepEqual(result.trust.trustedKeys.map((k) => k.keyId), ['local-test-key'])
  assert.equal(JSON.stringify(result).includes(key.privateB64), false, 'config never serializes the private key')
})

test('invalid key material is refused without echoing any key bytes', () => {
  const garbage = Buffer.from('not-a-key-but-secret-looking-material').toString('base64')
  const result = loadCertificationKeyConfig({ [CERTIFICATION_KEY_ENV.keyId]: 'k', [CERTIFICATION_KEY_ENV.privateKey]: garbage })
  assert.equal(result.status, 'INVALID')
  if (result.status === 'INVALID') assert.equal(result.detail.includes(garbage), false)
  const { privateKey: rsa } = generateKeyPairSync('rsa', { modulusLength: 1024 })
  const rsaB64 = rsa.export({ format: 'der', type: 'pkcs8' }).toString('base64')
  const rsaResult = loadCertificationKeyConfig({ [CERTIFICATION_KEY_ENV.keyId]: 'k', [CERTIFICATION_KEY_ENV.privateKey]: rsaB64 })
  assert.equal(rsaResult.status, 'INVALID', 'only Ed25519 is accepted')
})

test('the protocol-fixture TEST-ONLY key id is never accepted at runtime', () => {
  const key = ephemeralKey()
  const result = loadCertificationKeyConfig({ [CERTIFICATION_KEY_ENV.keyId]: 'protocol-fixture-TEST-ONLY-key-1', [CERTIFICATION_KEY_ENV.privateKey]: key.privateB64 })
  assert.equal(result.status, 'INVALID')
})

test('rotation: retired public keys are added to trust; a distrusted current key is refused', () => {
  const current = ephemeralKey()
  const retired = ephemeralKey()
  const rotated = loadCertificationKeyConfig({
    [CERTIFICATION_KEY_ENV.keyId]: 'key-2026-10',
    [CERTIFICATION_KEY_ENV.privateKey]: current.privateB64,
    [CERTIFICATION_KEY_ENV.trustedPublicKeys]: JSON.stringify([{ keyId: 'key-2026-09', publicKeySpkiDerBase64: retired.publicB64 }]),
    [CERTIFICATION_KEY_ENV.distrustedKeyIds]: 'key-2026-01',
  })
  assert.equal(rotated.status, 'CONFIGURED')
  if (rotated.status === 'CONFIGURED') {
    assert.deepEqual(rotated.trust.trustedKeys.map((k) => k.keyId), ['key-2026-10', 'key-2026-09'])
    assert.deepEqual(rotated.trust.distrustedKeyIds, ['key-2026-01'])
  }
  const distrustedCurrent = loadCertificationKeyConfig({
    [CERTIFICATION_KEY_ENV.keyId]: 'key-2026-10',
    [CERTIFICATION_KEY_ENV.privateKey]: current.privateB64,
    [CERTIFICATION_KEY_ENV.distrustedKeyIds]: 'key-2026-10',
  })
  assert.equal(distrustedCurrent.status, 'INVALID')
})

test('no certification key variable is NEXT_PUBLIC (never exposed to a client bundle)', () => {
  for (const name of Object.values(CERTIFICATION_KEY_ENV)) assert.equal(name.startsWith('NEXT_PUBLIC'), false)
})
