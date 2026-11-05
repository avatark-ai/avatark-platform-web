import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CANON_PLATE_SLUGS, INSTITUTIONAL_URLS, RELEASE_SCOPE, decideRequest, isInstitutionalScope } from './scope.ts'
import { EXCLUDED_ROUTE_LIST } from './routeInventory.ts'
import { CANON_PLATES } from '../content/canonPlates.ts'

// AVK-PROD-03A (C7): T1 / T1b / T1c allowlist decision matrix.
const ALLOW = { kind: 'ALLOW' }
const NF = { kind: 'DENY', status: 404 }
const NA = { kind: 'DENY', status: 405 }
const concrete = (pattern: string) => pattern.replace(/\[[^\]]+\]/g, 'sample-1')

test('scope is the institutional code constant', () => {
  assert.equal(RELEASE_SCOPE, 'institutional')
  assert.equal(isInstitutionalScope(), true)
})

test('frozen inventory: exactly 25 institutional URLs and the exact 12 Canon plate slugs', () => {
  assert.equal(INSTITUTIONAL_URLS.length, 25)
  assert.equal(new Set(INSTITUTIONAL_URLS).size, 25)
  assert.deepEqual([...CANON_PLATE_SLUGS], ['orientation', 'symmetry', 'repetition', 'verticality', 'threshold', 'precision', 'circumambulation', 'material-logic', 'fractals', 'time', 'erosion', 'synthesis'])
  assert.deepEqual([...CANON_PLATE_SLUGS].sort(), CANON_PLATES.map((p) => p.slug).sort(), 'pinned slugs match lib/content/canonPlates.ts')
})

test('T1: all 25 URLs and framework resources are allowed for GET and HEAD', () => {
  for (const p of [...INSTITUTIONAL_URLS, '/robots.txt', '/favicon.ico', '/_next/static/chunks/app.js', '/_next/static/media/font.woff2']) {
    for (const m of ['GET', 'HEAD', 'get']) assert.deepEqual(decideRequest(m, p), ALLOW, `${m} ${p}`)
  }
})

test('T1b: all 59 excluded route patterns are denied with 404 for every method', () => {
  assert.equal(EXCLUDED_ROUTE_LIST.length, 59)
  for (const r of EXCLUDED_ROUTE_LIST) {
    for (const m of ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE']) assert.deepEqual(decideRequest(m, concrete(r)), NF, `${m} ${r}`)
  }
})

test('T1b: unknown paths, unknown plate slugs and normalisation tricks are denied with 404', () => {
  const unknown = [
    '/x', '/roadmap', '/api', '/api/', '/_next/image', '/_next/data/x.json', '/_not-found', '/_global-error',
    '/canon/sacred-geometry/unknown', '/canon/sacred-geometry/Orientation', '/canon/sacred-geometry/orientation/',
    '/canon/sacred-geometry/orientation.png', '/ecosystem/', '/ECOSYSTEM', '/Founder', '/founder/../admin',
    '/%61dmin', '/ecosyste%6D', '//admin', '/admin.png', '/admin/', '/auth', '/auth/', '/file.svg', '/next.svg',
    '/sitemap.xml', '/.well-known/x', '/_next/static/../../admin', '/index', '/page', '',
  ]
  for (const p of unknown) assert.deepEqual(decideRequest('GET', p), NF, JSON.stringify(p))
})

test('T1c: unsupported methods on allowed paths are 405, including Server Action POSTs', () => {
  for (const p of ['/', '/ecosystem', '/canon/sacred-geometry/time', '/robots.txt']) {
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'TRACE', 'CONNECT']) assert.deepEqual(decideRequest(m, p), NA, `${m} ${p}`)
  }
})

test('a non-institutional scope is the only way the allowlist stands down', () => {
  assert.deepEqual(decideRequest('POST', '/admin', 'platform'), ALLOW)
  assert.equal(isInstitutionalScope('platform'), false)
})
