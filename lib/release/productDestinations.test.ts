import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PRODUCT_REGISTRY } from '@avatark/product-registry'
import { SCOPE_I_CLICKABLE_PRODUCT_URLS, X1_DESTINATION_AUDIT, scopeIProductHref } from './productDestinations.ts'
import { resolveEcosystemProduct } from '../content/ecosystemGroups.ts'
import { getPlatformNode } from '../products/platformGraph.ts'

// AVK-PROD-03B (X-1): the Scope I external product destination allowlist.
const EIGHT = ['prometheusk', 'gamek', 'arenak', 'streamk', 'cinemak', 'atlas', 'setpointk', 'studiok']
const CLICKABLE = ['prometheusk', 'streamk'] // AVK-ECOSYSTEM-04-PREVIEW E04-5: ArenaK withheld (legacy arenak.ai)

test('the audit covers exactly the eight AVK-PROD-02R X-1 destinations, at their registry URLs', () => {
  assert.deepEqual(X1_DESTINATION_AUDIT.map((d) => d.id).sort(), [...EIGHT].sort())
  for (const d of X1_DESTINATION_AUDIT) {
    assert.equal(PRODUCT_REGISTRY.find((p) => p.id === d.id)?.domain, d.url, d.id)
    assert.match(d.url, /^https:\/\/[a-z0-9.-]+$/, d.id)
  }
})

test('only VERIFIED_PUBLIC destinations are clickable; StudioK is never clickable', () => {
  assert.deepEqual([...SCOPE_I_CLICKABLE_PRODUCT_URLS.keys()].sort(), [...CLICKABLE].sort())
  for (const d of X1_DESTINATION_AUDIT) {
    assert.equal(SCOPE_I_CLICKABLE_PRODUCT_URLS.has(d.id), d.classification === 'VERIFIED_PUBLIC', d.id)
  }
  assert.equal(SCOPE_I_CLICKABLE_PRODUCT_URLS.has('studiok'), false)
  assert.equal(scopeIProductHref('studiok', 'https://studiok.dt4m.ai', 'institutional'), null)
})

test('scopeIProductHref: exact audited URL only in Scope I; pass-through outside it', () => {
  assert.equal(scopeIProductHref('prometheusk', 'https://prometheusk.avatark.io', 'institutional'), 'https://prometheusk.avatark.io')
  // an env override cannot move an approved product to another host or path
  for (const bad of ['https://evil.example', 'https://prometheusk.avatark.io/', 'http://prometheusk.avatark.io', 'https://prometheusk.avatark.io/x', null]) {
    assert.equal(scopeIProductHref('prometheusk', bad, 'institutional'), null, String(bad))
  }
  for (const id of ['gamek', 'cinemak', 'atlas', 'setpointk', 'studiok', 'unknown']) {
    assert.equal(scopeIProductHref(id, `https://${id}.ai`, 'institutional'), null, id)
  }
  assert.equal(scopeIProductHref('gamek', 'https://gamek.ai', 'platform'), 'https://gamek.ai')
  assert.equal(scopeIProductHref('studiok', null, 'platform'), null)
})

test('institutional resolvers (footer/overview and the ecosystem graph) apply the allowlist', () => {
  for (const id of EIGHT) {
    const expected = CLICKABLE.includes(id) ? SCOPE_I_CLICKABLE_PRODUCT_URLS.get(id) : null
    assert.equal(resolveEcosystemProduct(id).href, expected, `resolveEcosystemProduct ${id}`)
    const node = getPlatformNode(id)
    if (node) assert.equal(node.href, expected, `getPlatformNode ${id}`)
  }
  assert.equal(resolveEcosystemProduct('echo').href, null)
})

test('E04-5 ArenaK legacy destination is plain text in Scope I only; URL and Scope II unchanged', () => {
  const a = X1_DESTINATION_AUDIT.find((d) => d.id === 'arenak')!
  assert.equal(a.url, 'https://arenak.ai')
  assert.equal(a.classification, 'REQUIRES_OWNER_REVIEW')
  assert.equal(scopeIProductHref('arenak', 'https://arenak.ai', 'institutional'), null)
  // no silent substitute destination
  for (const alt of ['https://arenak-web-gold.vercel.app', 'https://next.arenak.ai', 'https://practice.arenak.ai', 'https://www.arenak.ai']) {
    assert.equal(scopeIProductHref('arenak', alt, 'institutional'), null, alt)
  }
  assert.equal(scopeIProductHref('arenak', 'https://arenak.ai', 'platform'), 'https://arenak.ai')
  assert.deepEqual([...SCOPE_I_CLICKABLE_PRODUCT_URLS.values()].sort(), ['https://prometheusk.avatark.io', 'https://streamk.ai'])
})
