import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeAuthDiagnostics } from './authDiagnostics.ts'

test('reports missing when no auth env vars are set', () => {
  const d = computeAuthDiagnostics({})
  assert.equal(d.supabaseUrl, 'missing')
  assert.equal(d.supabaseAnonKey, 'missing')
  assert.equal(d.serviceRoleKey, 'missing')
  assert.equal(d.googleOAuthEnabled, false)
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
