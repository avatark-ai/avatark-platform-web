import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSystemInformationSnapshot } from './systemInformation.ts'
import type { SystemHealthSnapshot } from './systemHealth.ts'

const HEALTHY: SystemHealthSnapshot = {
  identity: 'operational', account: 'operational', storage: 'operational', capabilities: 'operational',
  invitations: 'operational', organizations: 'operational', audit: 'operational', checkedAt: '2026-01-01T00:00:00.000Z',
}

function baseInput(overrides: Partial<Parameters<typeof buildSystemInformationSnapshot>[0]> = {}) {
  return {
    tier: 'safe' as const,
    env: { VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_SHA: 'abcdef1234567890', NEXT_PUBLIC_RELEASE_VERSION: '1.2.3', NEXT_PUBLIC_BUILD_TIME: '2026-01-01T00:00:00.000Z' },
    productId: 'avatark-platform',
    productName: 'AvatarK Platform',
    userTier: 'Free',
    authProviders: ['google'],
    currentOrganizationId: 'org-1',
    currentOrganizationName: 'Test Org',
    accountPackageVersion: '0.2.0',
    authUiPackageVersion: '0.1.0',
    health: HEALTHY,
    packageVersions: { '@avatark/account': '0.2.0' },
    registryProductCount: 9,
    statusUrl: '/status',
    supportUrl: 'mailto:support@avatark.ai',
    adminUrl: '/admin',
    ...overrides,
  }
}

test('safe tier never populates admin-only fields', () => {
  const snapshot = buildSystemInformationSnapshot(baseInput({ tier: 'safe' }))
  assert.equal(snapshot.visibilityTier, 'safe')
  assert.equal(snapshot.vercelEnvironment, null)
  assert.equal(snapshot.commitShaShort, null)
  assert.equal(snapshot.migrationLevel, null)
  assert.equal(snapshot.services, null)
  assert.equal(snapshot.callbackOrigin, null)
  assert.equal(snapshot.currentSiteOrigin, null)
  assert.equal(snapshot.packageVersions, null)
  assert.equal(snapshot.registryRevision, null)
  assert.equal(snapshot.lastHealthCheckAt, null)
  assert.equal(snapshot.adminUrl, null)
  // But current organization id is also admin-gated, per contract --
  // safe tier gets the name only.
  assert.equal(snapshot.currentOrganizationId, null)
  assert.equal(snapshot.currentOrganizationName, 'Test Org')
})

test('safe tier still populates every safe field', () => {
  const snapshot = buildSystemInformationSnapshot(baseInput({ tier: 'safe' }))
  assert.equal(snapshot.userTier, 'Free')
  assert.equal(snapshot.appVersion, '1.2.3')
  assert.equal(snapshot.environment, 'production')
  assert.deepEqual(snapshot.authProviders, ['google'])
  assert.equal(snapshot.storageAvailability, 'operational')
  assert.equal(snapshot.capabilityServiceAvailability, 'operational')
  assert.equal(snapshot.invitationServiceAvailability, 'operational')
  assert.equal(snapshot.statusUrl, '/status')
  assert.equal(snapshot.supportUrl, 'mailto:support@avatark.ai')
})

test('admin tier populates every admin-only field', () => {
  const snapshot = buildSystemInformationSnapshot(baseInput({ tier: 'admin' }))
  assert.equal(snapshot.visibilityTier, 'admin')
  assert.equal(snapshot.vercelEnvironment, 'production')
  assert.equal(snapshot.commitShaShort, 'abcdef1')
  assert.equal(snapshot.migrationLevel, 22)
  assert.ok(snapshot.services)
  assert.equal(snapshot.services?.identity, 'operational')
  assert.deepEqual(snapshot.packageVersions, { '@avatark/account': '0.2.0' })
  assert.equal(snapshot.adminUrl, '/admin')
  assert.equal(snapshot.currentOrganizationId, 'org-1')
  assert.equal(snapshot.lastHealthCheckAt, '2026-01-01T00:00:00.000Z')
})

test('missing environment metadata renders as null (Unknown), never fabricated', () => {
  const snapshot = buildSystemInformationSnapshot(baseInput({ tier: 'safe', env: {} }))
  assert.equal(snapshot.appVersion, null)
  assert.equal(snapshot.buildDate, null)
  assert.equal(snapshot.deploymentIdShort, null)
})

test('a degraded service pulls the platform status summary away from "all operational"', () => {
  const degradedHealth: SystemHealthSnapshot = { ...HEALTHY, capabilities: 'unavailable' }
  const snapshot = buildSystemInformationSnapshot(baseInput({ tier: 'safe', health: degradedHealth }))
  assert.notEqual(snapshot.platformStatusSummary, 'All platform services operational.')
  assert.equal(snapshot.capabilityServiceAvailability, 'unavailable')
})

test('an unknown service never gets reported as operational in the summary', () => {
  const unknownHealth: SystemHealthSnapshot = { ...HEALTHY, storage: 'unknown' }
  const snapshot = buildSystemInformationSnapshot(baseInput({ tier: 'safe', health: unknownHealth }))
  assert.equal(snapshot.storageAvailability, 'unknown')
  assert.notEqual(snapshot.platformStatusSummary, 'All platform services operational.')
})

test('environment name is derived from VERCEL_ENV, correctly labels local when unset', () => {
  const snapshot = buildSystemInformationSnapshot(baseInput({ tier: 'safe', env: {} }))
  assert.equal(snapshot.environment, 'local')
})
