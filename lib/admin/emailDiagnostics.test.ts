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

test('domain verification, SMTP, SPF/DKIM, and callback allowlist are always unknown from repo env alone', () => {
  const d = computeEmailDiagnostics({ RESEND_API_KEY: 'key', EMAIL_SENDING_ENABLED: 'true' })
  assert.equal(d.domainVerification, 'unknown')
  assert.equal(d.supabaseSmtp, 'unknown')
  assert.equal(d.spf, 'unknown')
  assert.equal(d.dkim, 'unknown')
  assert.equal(d.callbackAllowlist, 'unknown')
})

test('senderPreview and senderDomain are derived only when both name and address are set', () => {
  const d = computeEmailDiagnostics({ EMAIL_FROM_NAME: 'AvatarK', EMAIL_FROM_ADDRESS: 'hello@avatark.ai' })
  assert.equal(d.senderPreview, 'AvatarK <hello@avatark.ai>')
  assert.equal(d.senderDomain, 'avatark.ai')
})

test('senderPreview is null when either half is missing', () => {
  assert.equal(computeEmailDiagnostics({ EMAIL_FROM_ADDRESS: 'hello@avatark.ai' }).senderPreview, null)
})

test('testReadiness requires key, sender address, and the sending flag together', () => {
  assert.equal(computeEmailDiagnostics({}).testReadiness, false)
  assert.equal(
    computeEmailDiagnostics({ RESEND_API_KEY: 'key', EMAIL_FROM_ADDRESS: 'hello@avatark.ai' }).testReadiness,
    false
  )
  assert.equal(
    computeEmailDiagnostics({
      RESEND_API_KEY: 'key',
      EMAIL_FROM_ADDRESS: 'hello@avatark.ai',
      EMAIL_SENDING_ENABLED: 'true',
    }).testReadiness,
    true
  )
})

test('missing lists exactly the unset env vars', () => {
  assert.deepEqual(computeEmailDiagnostics({}).missing, ['RESEND_API_KEY', 'EMAIL_FROM_NAME', 'EMAIL_FROM_ADDRESS'])
  assert.deepEqual(computeEmailDiagnostics({ RESEND_API_KEY: 'key' }).missing, ['EMAIL_FROM_NAME', 'EMAIL_FROM_ADDRESS'])
})

test('templates lists the real, reviewable set of renderable templates', () => {
  const d = computeEmailDiagnostics({})
  assert.deepEqual([...d.templates], ['invitationEmail'])
})
