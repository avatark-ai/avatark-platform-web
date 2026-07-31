import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PRODUCT_REGISTRY } from './registry.ts'
import {
  ECOSYSTEM_CAPABILITIES,
  getCapabilityStatus,
  buildCapabilityMatrix,
  getProductsWithCapabilityStatus,
} from './capabilityMatrix.ts'

test('buildCapabilityMatrix covers every product x every capability exactly once', () => {
  const cells = buildCapabilityMatrix()
  assert.equal(cells.length, PRODUCT_REGISTRY.length * ECOSYSTEM_CAPABILITIES.length)
  const seen = new Set(cells.map((c) => `${c.productId}:${c.capability}`))
  assert.equal(seen.size, cells.length)
})

test('a derived capability (auth) reflects the registry flag it is derived from, never hand-authored', () => {
  assert.equal(getCapabilityStatus('avatark', 'auth').status, 'confirmed')
  assert.equal(getCapabilityStatus('gamek', 'auth').status, 'confirmed')
  assert.equal(getCapabilityStatus('prometheusk', 'auth').status, 'not_supported')
})

test('the "echo" capability means Living Echo, confirmed only for prometheusk', () => {
  assert.deepEqual(getProductsWithCapabilityStatus('echo', 'confirmed'), ['prometheusk'])
  assert.equal(getCapabilityStatus('avatark', 'echo').status, 'not_supported')
})

test('a hand-authored capability (admin) is confirmed only where explicitly cited', () => {
  assert.equal(getCapabilityStatus('avatark', 'admin').status, 'confirmed')
  assert.equal(getCapabilityStatus('gamek', 'admin').status, 'unconfirmed')
})

test('an uncited product/capability pair for a hand-authored capability is unconfirmed, never not_supported', () => {
  // "creator" has zero entries in HAND_AUTHORED -- every product must fall
  // back to "unconfirmed", not a fabricated "not_supported".
  for (const product of PRODUCT_REGISTRY) {
    assert.equal(getCapabilityStatus(product.id, 'creator').status, 'unconfirmed')
  }
})

test('an unknown product id resolves to unconfirmed for a derived capability, not a thrown error', () => {
  const cell = getCapabilityStatus('does-not-exist', 'auth')
  assert.equal(cell.status, 'unconfirmed')
})

test('getProductsWithCapabilityStatus(target) for journey names the modeled-but-unimplemented handoffs', () => {
  const targets = getProductsWithCapabilityStatus('journey', 'target').sort()
  assert.deepEqual(targets, ['arenak', 'prometheusk', 'streamk'])
})
