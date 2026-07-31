import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computePlatformStatus, worstPlatformStatus } from './platformStatus.ts'
import type { PlatformStatusInputs } from './platformStatus.ts'

const baseInputs: PlatformStatusInputs = {
  environment: { name: 'local', state: 'healthy', detail: 'ok' },
  auth: {
    supabaseUrl: 'configured',
    supabaseAnonKey: 'configured',
    serviceRoleKey: 'configured',
    magicLinkEnabled: true,
    googleOAuthEnabled: false,
    googleOAuthCredentialsConfigured: 'unknown',
    smtpConfigured: 'unknown',
    callbackImplemented: true,
    redirectUrl: 'https://example.com/auth/callback',
    callbackAllowlistStatus: 'unknown',
    sessionRefreshMechanism: 'proxy.ts',
    warnings: [],
  },
  email: {
    resendApiKey: 'configured',
    senderName: 'configured',
    senderAddress: 'configured',
    senderPreview: null,
    senderDomain: null,
    emailSendingEnabled: true,
    supabaseSmtp: 'unknown',
    domainVerification: 'unknown',
    spf: 'unknown',
    dkim: 'unknown',
    callbackAllowlist: 'unknown',
    templates: ['invitationEmail'],
    testReadiness: true,
    missing: [],
  },
  accountMountEnabled: true,
  productRegistryProductCount: 9,
  invitationsConfigured: true,
}

test('computePlatformStatus reports identity operational when environment is healthy', () => {
  const entries = computePlatformStatus(baseInputs)
  const identity = entries.find((e) => e.item === 'identity')
  assert.equal(identity?.status, 'operational')
  assert.equal(identity?.basis, 'static_configuration_check')
})

test('computePlatformStatus reports google_oauth not_configured when the flag is off', () => {
  const entries = computePlatformStatus(baseInputs)
  const google = entries.find((e) => e.item === 'google_oauth')
  assert.equal(google?.status, 'not_configured')
})

test('computePlatformStatus reports google_oauth unknown when enabled but credentials unverifiable', () => {
  const entries = computePlatformStatus({
    ...baseInputs,
    auth: { ...baseInputs.auth, googleOAuthEnabled: true, googleOAuthCredentialsConfigured: 'unknown' },
  })
  const google = entries.find((e) => e.item === 'google_oauth')
  assert.equal(google?.status, 'unknown')
})

test('computePlatformStatus reports account not_configured when the mount flag is off', () => {
  const entries = computePlatformStatus({ ...baseInputs, accountMountEnabled: false })
  const account = entries.find((e) => e.item === 'account')
  assert.equal(account?.status, 'not_configured')
})

test('computePlatformStatus reports magic_link unavailable when Supabase vars are missing', () => {
  const entries = computePlatformStatus({
    ...baseInputs,
    auth: { ...baseInputs.auth, supabaseUrl: 'missing' },
  })
  const magicLink = entries.find((e) => e.item === 'magic_link')
  assert.equal(magicLink?.status, 'unavailable')
})

test('computePlatformStatus marks notifications not_configured (no delivery engine exists yet)', () => {
  const entries = computePlatformStatus(baseInputs)
  const notifications = entries.find((e) => e.item === 'notifications')
  assert.equal(notifications?.status, 'not_configured')
})

test('every entry declares its basis as a static configuration check, never a live check', () => {
  const entries = computePlatformStatus(baseInputs)
  for (const entry of entries) assert.equal(entry.basis, 'static_configuration_check')
})

test('worstPlatformStatus rolls up to the most severe status present', () => {
  const entries = computePlatformStatus({ ...baseInputs, accountMountEnabled: false, environment: { name: 'local', state: 'misconfigured', detail: 'x' } })
  assert.equal(worstPlatformStatus(entries), 'unavailable')
})

test('worstPlatformStatus returns operational when every entry is operational or not_configured/unknown at worst', () => {
  const entries = computePlatformStatus(baseInputs)
  const worst = worstPlatformStatus(entries)
  assert.ok(['operational', 'not_configured', 'unknown'].includes(worst))
})

test('worstPlatformStatus defaults to unknown for an empty list', () => {
  assert.equal(worstPlatformStatus([]), 'unknown')
})
