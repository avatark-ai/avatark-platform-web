import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveDiagnosticsTier, tierIncludes, isSecretShaped, buildSafeDiagnosticsCopy } from './diagnosticsTiers.ts'

test('resolveDiagnosticsTier defaults to consumer when there is no admin context', () => {
  assert.equal(resolveDiagnosticsTier(null), 'consumer')
})

test('resolveDiagnosticsTier grants platform_operations to the admin role', () => {
  assert.equal(resolveDiagnosticsTier({ userId: 'u1', email: 'a@b.com', role: 'admin' }), 'platform_operations')
})

test('resolveDiagnosticsTier grants developer to the developer role', () => {
  assert.equal(resolveDiagnosticsTier({ userId: 'u1', email: 'a@b.com', role: 'developer' }), 'developer')
})

test('resolveDiagnosticsTier defaults unknown roles to consumer (default deny)', () => {
  assert.equal(resolveDiagnosticsTier({ userId: 'u1', email: 'a@b.com', role: 'guest' }), 'consumer')
})

test('tierIncludes respects tier ordering', () => {
  assert.equal(tierIncludes('platform_operations', 'developer'), true)
  assert.equal(tierIncludes('developer', 'platform_operations'), false)
  assert.equal(tierIncludes('consumer', 'consumer'), true)
})

test('isSecretShaped flags known secret-shaped key names', () => {
  assert.equal(isSecretShaped('accessToken', 'anything'), true)
  assert.equal(isSecretShaped('refreshToken', 'anything'), true)
  assert.equal(isSecretShaped('serviceRoleKey', 'anything'), true)
  assert.equal(isSecretShaped('cookie', 'anything'), true)
  assert.equal(isSecretShaped('releaseVersion', '0.1.0'), false)
})

test('isSecretShaped flags JWT-shaped and postgres-URL-shaped values regardless of key name', () => {
  assert.equal(isSecretShaped('note', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'), true)
  assert.equal(isSecretShaped('note', 'postgresql://user:pass@host:5432/db'), true)
  assert.equal(isSecretShaped('note', 'ordinary text'), false)
})

test('buildSafeDiagnosticsCopy strips every secret-shaped field from a realistic mixed fixture', () => {
  const fixture = {
    product: 'avatark',
    environment: 'preview',
    releaseVersion: '0.1.0',
    commitSha: 'abc1234',
    accessToken: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
    refreshToken: 'super-secret-refresh',
    serviceRoleKey: 'sk_live_should_never_appear',
    rawCookie: 'sb-access-token=abc; sb-refresh-token=def',
    databaseUrl: 'postgresql://user:pass@db.internal:5432/prod',
    databaseLabel: 'avatark-prod',
  }
  const copy = buildSafeDiagnosticsCopy(fixture)
  assert.doesNotMatch(copy, /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/)
  assert.doesNotMatch(copy, /super-secret-refresh/)
  assert.doesNotMatch(copy, /sk_live_should_never_appear/)
  assert.doesNotMatch(copy, /sb-access-token/)
  assert.doesNotMatch(copy, /postgresql:\/\//)
  assert.match(copy, /avatark-prod/)
  assert.match(copy, /0\.1\.0/)
})
