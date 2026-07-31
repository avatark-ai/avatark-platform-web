import { test } from 'node:test'
import assert from 'node:assert/strict'
import { APPEARANCE_MODE_REGISTRY, PRODUCT_ACCENTS } from './registry.ts'

test('system and dark are complete; light and high-contrast are not', () => {
  const byMode = Object.fromEntries(APPEARANCE_MODE_REGISTRY.map((m) => [m.mode, m.state]))
  assert.equal(byMode.system, 'complete')
  assert.equal(byMode.dark, 'complete')
  assert.notEqual(byMode.light, 'complete')
  assert.notEqual(byMode['high-contrast'], 'complete')
})

test('all 9 ecosystem products have a distinct accent token', () => {
  const ids = PRODUCT_ACCENTS.map((a) => a.productId).sort()
  assert.deepEqual(ids, ['arenak', 'atlas', 'avatark', 'cinemak', 'gamek', 'prometheusk', 'setpointk', 'streamk', 'studiok'])
  const accentNames = new Set(PRODUCT_ACCENTS.map((a) => a.accentName))
  assert.equal(accentNames.size, PRODUCT_ACCENTS.length, 'accent names must be unique per product')
})
