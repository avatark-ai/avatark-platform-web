import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CSP_REPORT_ONLY, NOINDEX_HOSTS, SECURITY_HEADERS } from './securityHeaders.ts'
import { denialResponse, excludedInScope } from './denial.ts'

// AVK-PROD-03A (C6): header set pins and denial-response shape.
test('header set: CSP report-only plus the five hardening headers, no HSTS override', () => {
  assert.deepEqual(SECURITY_HEADERS.map((h) => h.key), [
    'Content-Security-Policy-Report-Only', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'X-Frame-Options', 'Cross-Origin-Opener-Policy',
  ])
  assert.ok(!SECURITY_HEADERS.some((h) => /strict-transport-security|^content-security-policy$/i.test(h.key)))
  assert.match(CSP_REPORT_ONLY, /connect-src 'self'(;|$)/)
  assert.ok(!/supabase/i.test(CSP_REPORT_ONLY), 'no Supabase origin in the institutional scope')
  assert.match(CSP_REPORT_ONLY, /frame-ancestors 'none'/)
  assert.deepEqual([...NOINDEX_HOSTS], ['next.avatark.ai'])
})

test('denial responses are fixed, uncacheable, noindex and carry the security headers', async () => {
  const r404 = denialResponse(404)
  assert.equal(r404.status, 404)
  assert.equal(await r404.text(), 'Not Found')
  assert.equal(r404.headers.get('cache-control'), 'private, no-store')
  assert.equal(r404.headers.get('x-robots-tag'), 'noindex, nofollow')
  assert.equal(r404.headers.get('x-frame-options'), 'DENY')
  assert.equal(r404.headers.get('set-cookie'), null)
  const r405 = denialResponse(405)
  assert.equal(r405.status, 405)
  assert.equal(r405.headers.get('allow'), 'GET, HEAD')
  assert.equal(excludedInScope(false), null)
  assert.equal(excludedInScope(true)?.status, 404)
})
