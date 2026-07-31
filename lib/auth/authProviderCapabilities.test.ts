import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchAuthProviderCapabilities } from './authProviderCapabilities.ts'

function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>) {
  const original: Record<string, string | undefined> = {}
  for (const key of Object.keys(vars)) {
    original[key] = process.env[key]
    if (vars[key] === undefined) delete process.env[key]
    else process.env[key] = vars[key]
  }
  return fn().finally(() => {
    for (const key of Object.keys(original)) {
      if (original[key] === undefined) delete process.env[key]
      else process.env[key] = original[key]
    }
  })
}

function withFetch(impl: typeof fetch, fn: () => Promise<void>) {
  const original = globalThis.fetch
  globalThis.fetch = impl
  return fn().finally(() => {
    globalThis.fetch = original
  })
}

test('reports unavailable when env is missing, without calling fetch', () =>
  withEnv({ NEXT_PUBLIC_SUPABASE_URL: undefined, NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined }, async () => {
    const capabilities = await fetchAuthProviderCapabilities()
    assert.deepEqual(capabilities, { google: false, status: 'unavailable' })
  }))

test('reports disabled when Supabase answers with google: false', () =>
  withEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon' }, () =>
    withFetch(
      (async () => new Response(JSON.stringify({ external: { google: false } }), { status: 200 })) as typeof fetch,
      async () => {
        const capabilities = await fetchAuthProviderCapabilities()
        assert.deepEqual(capabilities, { google: false, status: 'disabled' })
      }
    )))

test('reports enabled when Supabase answers with google: true', () =>
  withEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon' }, () =>
    withFetch(
      (async () => new Response(JSON.stringify({ external: { google: true } }), { status: 200 })) as typeof fetch,
      async () => {
        const capabilities = await fetchAuthProviderCapabilities()
        assert.deepEqual(capabilities, { google: true, status: 'enabled' })
      }
    )))

test('reports unavailable, not disabled, when the request fails', () =>
  withEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon' }, () =>
    withFetch(
      (async () => {
        throw new Error('network error')
      }) as typeof fetch,
      async () => {
        const capabilities = await fetchAuthProviderCapabilities()
        assert.deepEqual(capabilities, { google: false, status: 'unavailable' })
      }
    )))

test('reports unavailable, not disabled, on a non-ok response', () =>
  withEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon' }, () =>
    withFetch(
      (async () => new Response('', { status: 500 })) as typeof fetch,
      async () => {
        const capabilities = await fetchAuthProviderCapabilities()
        assert.deepEqual(capabilities, { google: false, status: 'unavailable' })
      }
    )))
