import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveCapabilityFromGrants } from './resolver.ts'
import type { CapabilityGrantRow } from './types.ts'

const NOW = new Date('2026-08-02T12:00:00.000Z')

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

test('active platform grant is granted', () => {
  const grants = [grant({ capability: 'platform.admin.manage', scopeType: 'platform', scopeId: null })]
  const result = resolveCapabilityFromGrants(grants, {
    capability: 'platform.admin.manage',
    scope: { type: 'platform' },
    now: NOW,
  })
  assert.equal(result.granted, true)
})

test('active product grant is granted for the matching product', () => {
  const grants = [grant({ capability: 'gamek.world.play', scopeType: 'product', scopeId: 'gamek' })]
  const result = resolveCapabilityFromGrants(grants, {
    capability: 'gamek.world.play',
    scope: { type: 'product', productId: 'gamek' },
    now: NOW,
  })
  assert.equal(result.granted, true)
})

test('active organization grant is granted for the matching organization', () => {
  const grants = [grant({ capability: 'org.billing.manage', scopeType: 'organization', scopeId: 'org-1' })]
  const result = resolveCapabilityFromGrants(grants, {
    capability: 'org.billing.manage',
    scope: { type: 'organization', organizationId: 'org-1' },
    now: NOW,
  })
  assert.equal(result.granted, true)
})

test('a product grant does not authorize a different product', () => {
  const grants = [grant({ capability: 'gamek.world.play', scopeType: 'product', scopeId: 'gamek' })]
  const result = resolveCapabilityFromGrants(grants, {
    capability: 'gamek.world.play',
    scope: { type: 'product', productId: 'setpointk' },
    now: NOW,
  })
  assert.deepEqual(result, { granted: false, reason: 'no_grant' })
})

test('an organization grant does not authorize a different organization', () => {
  const grants = [grant({ capability: 'org.billing.manage', scopeType: 'organization', scopeId: 'org-1' })]
  const result = resolveCapabilityFromGrants(grants, {
    capability: 'org.billing.manage',
    scope: { type: 'organization', organizationId: 'org-2' },
    now: NOW,
  })
  assert.deepEqual(result, { granted: false, reason: 'no_grant' })
})

test('missing grant is denied with no_grant', () => {
  const result = resolveCapabilityFromGrants([], {
    capability: 'gamek.world.play',
    scope: { type: 'product', productId: 'gamek' },
    now: NOW,
  })
  assert.deepEqual(result, { granted: false, reason: 'no_grant' })
})

test('revoked grant is denied with revoked, even though it once matched', () => {
  const grants = [grant({ revokedAt: '2026-06-01T00:00:00.000Z' })]
  const result = resolveCapabilityFromGrants(grants, {
    capability: 'gamek.world.play',
    scope: { type: 'product', productId: 'gamek' },
    now: NOW,
  })
  assert.deepEqual(result, { granted: false, reason: 'revoked' })
})

test('expired grant is denied with expired', () => {
  const grants = [grant({ expiresAt: '2026-01-01T00:00:00.000Z' })]
  const result = resolveCapabilityFromGrants(grants, {
    capability: 'gamek.world.play',
    scope: { type: 'product', productId: 'gamek' },
    now: NOW,
  })
  assert.deepEqual(result, { granted: false, reason: 'expired' })
})

test('a grant expiring exactly now is treated as expired, not active', () => {
  const grants = [grant({ expiresAt: NOW.toISOString() })]
  const result = resolveCapabilityFromGrants(grants, {
    capability: 'gamek.world.play',
    scope: { type: 'product', productId: 'gamek' },
    now: NOW,
  })
  assert.deepEqual(result, { granted: false, reason: 'expired' })
})

test('a grant with a future expiry is active', () => {
  const grants = [grant({ expiresAt: '2026-12-31T00:00:00.000Z' })]
  const result = resolveCapabilityFromGrants(grants, {
    capability: 'gamek.world.play',
    scope: { type: 'product', productId: 'gamek' },
    now: NOW,
  })
  assert.equal(result.granted, true)
})

test('malformed product scope (empty productId) is denied, never matched against rows', () => {
  const grants = [grant({ capability: 'gamek.world.play', scopeType: 'product', scopeId: 'gamek' })]
  const result = resolveCapabilityFromGrants(grants, {
    capability: 'gamek.world.play',
    scope: { type: 'product', productId: '' },
    now: NOW,
  })
  assert.deepEqual(result, { granted: false, reason: 'malformed_scope' })
})

test('malformed organization scope (empty organizationId) is denied', () => {
  const result = resolveCapabilityFromGrants([], {
    capability: 'org.billing.manage',
    scope: { type: 'organization', organizationId: '' },
    now: NOW,
  })
  assert.deepEqual(result, { granted: false, reason: 'malformed_scope' })
})

test('empty capability string is denied with unknown_capability', () => {
  const result = resolveCapabilityFromGrants([], {
    capability: '',
    scope: { type: 'platform' },
    now: NOW,
  })
  assert.deepEqual(result, { granted: false, reason: 'unknown_capability' })
})

test('a revoked-and-expired grant is reported as revoked (more specific/actionable reason)', () => {
  const grants = [grant({ revokedAt: '2026-02-01T00:00:00.000Z', expiresAt: '2026-01-01T00:00:00.000Z' })]
  const result = resolveCapabilityFromGrants(grants, {
    capability: 'gamek.world.play',
    scope: { type: 'product', productId: 'gamek' },
    now: NOW,
  })
  assert.deepEqual(result, { granted: false, reason: 'revoked' })
})

test('an active grant is preferred over a revoked one for the same capability+scope (post re-grant)', () => {
  const grants = [
    grant({ id: 'old', revokedAt: '2026-02-01T00:00:00.000Z' }),
    grant({ id: 'new', revokedAt: null }),
  ]
  const result = resolveCapabilityFromGrants(grants, {
    capability: 'gamek.world.play',
    scope: { type: 'product', productId: 'gamek' },
    now: NOW,
  })
  assert.equal(result.granted, true)
  if (result.granted) assert.equal(result.grant.id, 'new')
})
