import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveCapability,
  hasActiveAccess,
  PRODUCT_ACCESS_STATES,
  ENTITLEMENT_SOURCES,
  type ProductAccess,
} from './entitlement.ts'

function baseAccess(overrides: Partial<ProductAccess> = {}): ProductAccess {
  return {
    productId: 'gamek',
    deploymentStatus: 'beta',
    integrationStatus: 'live',
    accessState: 'active',
    membershipPlan: 'free',
    roles: ['player'],
    capabilities: ['play'],
    source: 'public',
    ...overrides,
  }
}

test('resolveCapability denies when access is undefined', () => {
  assert.equal(resolveCapability(undefined, 'play'), false)
})

test('resolveCapability denies when accessState is not active', () => {
  assert.equal(resolveCapability(baseAccess({ accessState: 'suspended' }), 'play'), false)
  assert.equal(resolveCapability(baseAccess({ accessState: 'requested' }), 'play'), false)
})

test('resolveCapability denies when capability is not listed', () => {
  assert.equal(resolveCapability(baseAccess(), 'moderate'), false)
})

test('resolveCapability allows when active and capability listed', () => {
  assert.equal(resolveCapability(baseAccess(), 'play'), true)
})

test('hasActiveAccess mirrors accessState === active, default-deny on undefined', () => {
  assert.equal(hasActiveAccess(undefined), false)
  assert.equal(hasActiveAccess(baseAccess({ accessState: 'expired' })), false)
  assert.equal(hasActiveAccess(baseAccess()), true)
})

test('ProductAccess composes with an organizationId without changing authorization rules', () => {
  const orgScoped = baseAccess({ source: 'organization', organizationId: 'org_123' })
  assert.equal(resolveCapability(orgScoped, 'play'), true)
  assert.equal(orgScoped.organizationId, 'org_123')
})

test('every access state and entitlement source round-trips through the enums', () => {
  for (const state of PRODUCT_ACCESS_STATES) {
    const access = baseAccess({ accessState: state })
    assert.equal(access.accessState, state)
  }
  for (const source of ENTITLEMENT_SOURCES) {
    const access = baseAccess({ source })
    assert.equal(access.source, source)
  }
})
