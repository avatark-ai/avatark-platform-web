import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PRODUCT_REGISTRY } from './registry.ts'
import {
  getProductById,
  getProductBySlug,
  isValidProductId,
  filterProducts,
  getProductsByCategory,
  getProductsByStatus,
  getProductsByVisibility,
  getProductsWithCapability,
  sortProducts,
} from './helpers.ts'

test('getProductById finds a known product and returns null for an unknown one', () => {
  assert.equal(getProductById('prometheusk')?.displayName, 'PrometheusK')
  assert.equal(getProductById('does-not-exist'), null)
})

test('getProductBySlug mirrors getProductById for this registry (slugs equal ids today)', () => {
  assert.equal(getProductBySlug('gamek')?.id, 'gamek')
})

test('isValidProductId', () => {
  assert.equal(isValidProductId('avatark'), true)
  assert.equal(isValidProductId('nope'), false)
})

test('filterProducts applies an arbitrary predicate', () => {
  const live = filterProducts((p) => p.status === 'live')
  assert.equal(live.length, 2)
  assert.ok(live.every((p) => p.status === 'live'))
})

test('getProductsByCategory', () => {
  const platform = getProductsByCategory('platform')
  assert.deepEqual(platform.map((p) => p.id), ['avatark'])
})

test('getProductsByStatus', () => {
  const internal = getProductsByStatus('internal')
  assert.deepEqual(internal.map((p) => p.id), ['setpointk'])
})

test('getProductsByVisibility', () => {
  // arenak/streamk moved to 'public' in Wave 1 registry integration
  // (2026-07-21) once their domains were confirmed live -- see
  // docs/ecosystem/WAVE1_REGISTRY_INTEGRATION_REPORT.md.
  const publicProducts = getProductsByVisibility('public')
  assert.deepEqual(publicProducts.map((p) => p.id).sort(), ['arenak', 'avatark', 'gamek', 'prometheusk', 'streamk'])
})

test('getProductsWithCapability finds every product supporting Echo', () => {
  const echoProducts = getProductsWithCapability('supportsEcho')
  assert.deepEqual(echoProducts.map((p) => p.id), ['prometheusk'])
})

test('sortProducts sorts by displayName ascending by default', () => {
  const sorted = sortProducts()
  const names = sorted.map((p) => p.displayName)
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)))
})

test('sortProducts by status ranks live before beta before alpha before internal', () => {
  const sorted = sortProducts(PRODUCT_REGISTRY, 'status')
  const statuses = sorted.map((p) => p.status)
  const firstInternalIndex = statuses.indexOf('internal')
  const firstLiveIndex = statuses.indexOf('live')
  assert.ok(firstLiveIndex < firstInternalIndex)
})

test('sortProducts direction=desc reverses the order', () => {
  const asc = sortProducts(PRODUCT_REGISTRY, 'displayName', 'asc')
  const desc = sortProducts(PRODUCT_REGISTRY, 'displayName', 'desc')
  assert.deepEqual(desc, [...asc].reverse())
})

test('every product id in the real registry is unique', () => {
  const ids = PRODUCT_REGISTRY.map((p) => p.id)
  assert.equal(new Set(ids).size, ids.length)
})
