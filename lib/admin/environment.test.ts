import { test } from 'node:test'
import assert from 'node:assert/strict'
import { currentEnvName, computeEnvironmentHealth } from './environment.ts'

test('currentEnvName identifies production via VERCEL_ENV', () => {
  assert.equal(currentEnvName({ VERCEL_ENV: 'production' }), 'production')
})

test('currentEnvName identifies preview via VERCEL_ENV', () => {
  assert.equal(currentEnvName({ VERCEL_ENV: 'preview' }), 'preview')
})

test('currentEnvName identifies test via NODE_ENV', () => {
  assert.equal(currentEnvName({ NODE_ENV: 'test' }), 'test')
})

test('currentEnvName falls back to local', () => {
  assert.equal(currentEnvName({}), 'local')
})

test('computeEnvironmentHealth marks the current environment healthy when Supabase vars are present', () => {
  const result = computeEnvironmentHealth({
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  })
  const current = result.find((r) => r.name === 'local')
  assert.equal(current?.state, 'healthy')
})

test('computeEnvironmentHealth marks the current environment misconfigured when Supabase vars are missing', () => {
  const result = computeEnvironmentHealth({})
  const current = result.find((r) => r.name === 'local')
  assert.equal(current?.state, 'misconfigured')
})

test('computeEnvironmentHealth reports every other environment as unknown', () => {
  const result = computeEnvironmentHealth({ VERCEL_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: 'x', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'y' })
  const others = result.filter((r) => r.name !== 'production')
  assert.equal(others.length, 3)
  for (const o of others) assert.equal(o.state, 'unknown')
})
