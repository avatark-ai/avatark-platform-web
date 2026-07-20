import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeEmailDiagnostics } from './emailDiagnostics.ts'

test('reports missing when no email env vars are set', () => {
  const d = computeEmailDiagnostics({})
  assert.equal(d.resendApiKey, 'missing')
  assert.equal(d.senderName, 'missing')
  assert.equal(d.senderAddress, 'missing')
  assert.equal(d.emailSendingEnabled, false)
})

test('reports configured when present', () => {
  const d = computeEmailDiagnostics({
    RESEND_API_KEY: 'key',
    EMAIL_FROM_NAME: 'AvatarK',
    EMAIL_FROM_ADDRESS: 'hello@avatark.ai',
  })
  assert.equal(d.resendApiKey, 'configured')
  assert.equal(d.senderName, 'configured')
  assert.equal(d.senderAddress, 'configured')
})

test('emailSendingEnabled requires the explicit flag, not just a key', () => {
  const d = computeEmailDiagnostics({ RESEND_API_KEY: 'key' })
  assert.equal(d.emailSendingEnabled, false)
})

test('emailSendingEnabled is true only when the flag is exactly "true"', () => {
  assert.equal(computeEmailDiagnostics({ EMAIL_SENDING_ENABLED: 'true' }).emailSendingEnabled, true)
  assert.equal(computeEmailDiagnostics({ EMAIL_SENDING_ENABLED: 'yes' }).emailSendingEnabled, false)
})

test('domain verification, SMTP, and callback allowlist are always unknown from repo env alone', () => {
  const d = computeEmailDiagnostics({ RESEND_API_KEY: 'key', EMAIL_SENDING_ENABLED: 'true' })
  assert.equal(d.domainVerification, 'unknown')
  assert.equal(d.supabaseSmtp, 'unknown')
  assert.equal(d.callbackAllowlist, 'unknown')
})
