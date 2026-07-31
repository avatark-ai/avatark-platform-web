import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PRODUCT_REGISTRY } from './registry.ts'
import { validateProduct, validateRegistry } from './validation.ts'
import type { AvatarKProduct } from './types.ts'

test('every real registry entry validates clean', () => {
  for (const product of PRODUCT_REGISTRY) {
    assert.deepEqual(validateProduct(product), [], `${product.id} should have no validation errors`)
  }
})

test('the real registry has no duplicate ids or slugs', () => {
  const result = validateRegistry(PRODUCT_REGISTRY)
  assert.equal(result.valid, true)
  assert.deepEqual(result.duplicateIds, [])
  assert.deepEqual(result.duplicateSlugs, [])
})

function baseProduct(overrides: Partial<AvatarKProduct> = {}): AvatarKProduct {
  return {
    id: 'testk',
    slug: 'testk',
    displayName: 'TestK',
    tagline: null,
    description: 'A test product',
    status: 'alpha',
    domain: null,
    previewDomain: null,
    icon: 'flask',
    accentColor: '#000000',
    logo: null,
    category: 'platform',
    owner: null,
    repository: null,
    visibility: 'internal',
    requiresAuth: true,
    supportsAuth: false,
    supportsAccount: false,
    supportsInvitations: false,
    supportsLivingEcho: false,
    supportsNavigation: false,
    supportsOrganizations: false,
    supportsMarketplace: false,
    supportsBilling: false,
    supportsNotifications: false,
    supportsRecommendations: false,
    supportsEcho: false,
    supportsPractices: false,
    supportsEvents: false,
    supportsChallenges: false,
    supportsLeagues: false,
    supportsStreaming: false,
    supportsContent: false,
    supportsDigitalTwin: false,
    navigationLinks: [],
    footerLinks: [],
    helpLinks: [],
    supportEmail: null,
    documentation: null,
    ...overrides,
  }
}

test('rejects a slug with uppercase or spaces', () => {
  const errors = validateProduct(baseProduct({ slug: 'Test K' }))
  assert.ok(errors.some((e) => e.includes('slug')))
})

test('rejects an empty displayName', () => {
  const errors = validateProduct(baseProduct({ displayName: '' }))
  assert.ok(errors.some((e) => e.includes('displayName')))
})

test('rejects a malformed supportEmail', () => {
  const errors = validateProduct(baseProduct({ supportEmail: 'not-an-email' }))
  assert.ok(errors.some((e) => e.includes('supportEmail')))
})

test('accepts a null supportEmail', () => {
  const errors = validateProduct(baseProduct({ supportEmail: null }))
  assert.deepEqual(errors, [])
})

test('rejects a nav link with an empty href', () => {
  const errors = validateProduct(baseProduct({ navigationLinks: [{ label: 'Home', href: '' }] }))
  assert.ok(errors.some((e) => e.includes('navigationLinks[0].href')))
})

test('validateRegistry flags duplicate ids across two otherwise-valid products', () => {
  const result = validateRegistry([baseProduct(), baseProduct()])
  assert.equal(result.valid, false)
  assert.deepEqual(result.duplicateIds, ['testk'])
  assert.deepEqual(result.duplicateSlugs, ['testk'])
})
