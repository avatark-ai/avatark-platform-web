import { test } from 'node:test'
import assert from 'node:assert/strict'
import { capabilitiesForProductEntry, friendlyCapabilityLabel } from './labels.ts'
import type { CapabilityGrantRow } from './types.ts'

function grant(overrides: Partial<CapabilityGrantRow>): CapabilityGrantRow {
  return {
    id: 'grant-1',
    userId: 'user-1',
    capability: 'gamek.world.play',
    scopeType: 'product',
    scopeId: 'gamek',
    grantedAt: '2026-01-01T00:00:00.000Z',
    grantedBy: 'admin-1',
    expiresAt: null,
    revokedAt: null,
    ...overrides,
  }
}

test('friendlyCapabilityLabel returns a known friendly label', () => {
  assert.equal(friendlyCapabilityLabel('platform.capability.manage'), 'Manage capability grants')
})

test('friendlyCapabilityLabel falls back to the raw id for an unknown capability, never blank', () => {
  assert.equal(friendlyCapabilityLabel('gamek.world.play'), 'gamek.world.play')
})

test('capabilitiesForProductEntry includes a product-scoped grant for the matching product only', () => {
  const grants = [grant({ scopeType: 'product', scopeId: 'gamek', capability: 'gamek.world.play' })]
  assert.deepEqual(capabilitiesForProductEntry('gamek', grants), ['gamek.world.play'])
  assert.deepEqual(capabilitiesForProductEntry('setpointk', grants), [])
})

test('capabilitiesForProductEntry surfaces platform-scoped grants only under the avatark entry', () => {
  const grants = [grant({ scopeType: 'platform', scopeId: null, capability: 'platform.capability.manage' })]
  assert.deepEqual(capabilitiesForProductEntry('avatark', grants), ['platform.capability.manage'])
  assert.deepEqual(capabilitiesForProductEntry('gamek', grants), [])
  assert.deepEqual(capabilitiesForProductEntry('setpointk', grants), [])
})

test('capabilitiesForProductEntry never leaks an organization-scoped grant into any product entry', () => {
  const grants = [grant({ scopeType: 'organization', scopeId: 'org-1', capability: 'org.billing.manage' })]
  assert.deepEqual(capabilitiesForProductEntry('avatark', grants), [])
  assert.deepEqual(capabilitiesForProductEntry('gamek', grants), [])
})

test('capabilitiesForProductEntry returns an empty array, not undefined, when there are no grants', () => {
  assert.deepEqual(capabilitiesForProductEntry('avatark', []), [])
})
