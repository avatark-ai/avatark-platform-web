import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PRODUCT_REGISTRY } from './registry.ts'
import {
  PRODUCT_IDENTITY_CONFIGS,
  getProductIdentityConfig,
  isAllowedLocalRoute,
  validateProductIdentityConfig,
  deploymentStatusOf,
  integrationStatusOf,
} from './identityConfig.ts'

const MANDATORY_PRODUCT_IDS = [
  'avatark',
  'prometheusk',
  'gamek',
  'arenak',
  'streamk',
  'cinemak',
  'studiok',
  'atlas',
  'setpointk',
]

test('all 9 mandatory products have a valid identity config', () => {
  for (const id of MANDATORY_PRODUCT_IDS) {
    const config = getProductIdentityConfig(id)
    assert.ok(config, `${id} should have an identity config`)
    const result = validateProductIdentityConfig(config!)
    assert.deepEqual(result.errors, [], `${id} identity config should have no validation errors`)
    assert.equal(result.valid, true)
  }
})

test('every real registry product has exactly one identity config', () => {
  assert.equal(Object.keys(PRODUCT_IDENTITY_CONFIGS).length, PRODUCT_REGISTRY.length)
  for (const product of PRODUCT_REGISTRY) {
    assert.ok(PRODUCT_IDENTITY_CONFIGS[product.id], `${product.id} missing from PRODUCT_IDENTITY_CONFIGS`)
  }
})

test('signInContext matches the mission-specified exact copy per product', () => {
  const expected: Record<string, string> = {
    prometheusk: 'You will return to PrometheusK, where your practices and Living Echo live.',
    gamek: 'You will return to GameK when sign-in is complete.',
    arenak: 'You will return to ArenaK to continue your invitation, event, or challenge.',
    streamk: 'You will return to StreamK to continue watching.',
    cinemak: 'You will return to CinemaK to continue your cinematic experience.',
    studiok: 'You will return to StudioK to continue creating.',
    atlas: 'You will return to Atlas to continue your project or research.',
    setpointk: 'You will return to SetpointK to continue with your authorized physiological data experience.',
  }
  for (const [id, sentence] of Object.entries(expected)) {
    assert.equal(getProductIdentityConfig(id)?.signInContext, sentence, `${id} signInContext mismatch`)
  }
})

test('CinemaK and SetpointK are DNS-live (deploymentStatus) but not platform-integrated (integrationStatus)', () => {
  const cinemak = getProductIdentityConfig('cinemak')!
  const setpointk = getProductIdentityConfig('setpointk')!
  assert.equal(cinemak.deploymentStatus, 'live')
  assert.equal(cinemak.integrationStatus, 'pending_shared_identity')
  assert.notEqual(cinemak.accessState, 'available')
  assert.equal(setpointk.deploymentStatus, 'live')
  assert.equal(setpointk.integrationStatus, 'pending_shared_identity')
  assert.equal(setpointk.accessState, 'entitlement_and_consent_required')
})

test('deploymentStatusOf/integrationStatusOf are derived, not hand-set, and never silently mark an unconfirmed product live', () => {
  assert.equal(deploymentStatusOf({ domain: null }), 'not_deployed')
  assert.equal(deploymentStatusOf({ domain: 'https://example.com' }), 'live')
  assert.equal(integrationStatusOf({ integrationStatus: undefined }), 'pending_shared_identity')
  assert.equal(integrationStatusOf({ integrationStatus: 'vision' }), 'pending_shared_identity')
  assert.equal(integrationStatusOf({ integrationStatus: 'live' }), 'live')
})

test('isAllowedLocalRoute rejects arbitrary/external/encoded return targets', () => {
  const config = getProductIdentityConfig('avatark')!
  assert.equal(isAllowedLocalRoute(config, '/account'), true)
  assert.equal(isAllowedLocalRoute(config, '/account/security'), true)
  assert.equal(isAllowedLocalRoute(config, 'https://evil.example.com/account'), false)
  assert.equal(isAllowedLocalRoute(config, '//evil.example.com'), false)
  assert.equal(isAllowedLocalRoute(config, '/\\evil.example.com'), false)
  assert.equal(isAllowedLocalRoute(config, '/../../etc/passwd'), false)
  assert.equal(isAllowedLocalRoute(config, '/not-a-registered-prefix'), false)
  assert.equal(isAllowedLocalRoute(config, 'javascript:alert(1)'), false)
})

test('accountExtensionRegistrations reference ids only, matching each product\'s mission-defined extension domains', () => {
  const setpointk = getProductIdentityConfig('setpointk')!
  assert.ok(setpointk.accountExtensionRegistrations.includes('consent-and-data-sharing'))
  const cinemak = getProductIdentityConfig('cinemak')!
  assert.ok(cinemak.accountExtensionRegistrations.includes('festival-industry-access'))
})
