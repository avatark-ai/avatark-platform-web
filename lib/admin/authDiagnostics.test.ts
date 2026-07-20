import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeAuthDiagnostics } from './authDiagnostics.ts'

test('reports missing when no auth env vars are set', () => {
  const d = computeAuthDiagnostics({})
  assert.equal(d.supabaseUrl, 'missing')
  assert.equal(d.supabaseAnonKey, 'missing')
  assert.equal(d.serviceRoleKey, 'missing')
  assert.equal(d.googleOAuthEnabled, false)
  assert.equal(d.magicLinkEnabled, true)
  assert.equal(d.redirectUrl, null)
  assert.ok(d.warnings.length > 0)
})

test('computes a redirect URL from NEXT_PUBLIC_PLATFORM_ORIGIN', () => {
  const d = computeAuthDiagnostics({ NEXT_PUBLIC_PLATFORM_ORIGIN: 'https://avatark.ai' })
  assert.equal(d.redirectUrl, 'https://avatark.ai/auth/callback')
})

test('falls back to VERCEL_URL when platform origin is unset', () => {
  const d = computeAuthDiagnostics({ VERCEL_URL: 'preview-123.vercel.app' })
  assert.equal(d.redirectUrl, 'https://preview-123.vercel.app/auth/callback')
})

test('warns when Google OAuth is enabled', () => {
  const d = computeAuthDiagnostics({ NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED: 'true' })
  assert.ok(d.warnings.some((w) => w.includes('Google OAuth')))
})

test('no warnings when everything required is configured', () => {
  const d = computeAuthDiagnostics({
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
    NEXT_PUBLIC_PLATFORM_ORIGIN: 'https://avatark.ai',
  })
  assert.deepEqual(d.warnings, [])
})

test('reports configured when present', () => {
  const d = computeAuthDiagnostics({
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
  })
  assert.equal(d.supabaseUrl, 'configured')
  assert.equal(d.supabaseAnonKey, 'configured')
  assert.equal(d.serviceRoleKey, 'configured')
})

test('googleOAuthEnabled is true only when the flag is exactly "true"', () => {
  assert.equal(computeAuthDiagnostics({ NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED: 'true' }).googleOAuthEnabled, true)
  assert.equal(computeAuthDiagnostics({ NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED: '1' }).googleOAuthEnabled, false)
})

test('Google OAuth provider credential state is always unknown from repo env alone', () => {
  const d = computeAuthDiagnostics({ NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED: 'true' })
  assert.equal(d.googleOAuthCredentialsConfigured, 'unknown')
})
