import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

// AVK-UNIFICATION-02: exit-code matrix for the Vercel ignore step and the pre-install assertion.
const run = (script: string, env: Record<string, string>) => {
  const childEnv = { PATH: process.env.PATH ?? '/usr/bin:/bin', ...env } as unknown as NodeJS.ProcessEnv
  const r = spawnSync('sh', [script], { env: childEnv, encoding: 'utf8' })
  return { code: r.status, out: r.stdout + r.stderr }
}
const B = 'integration/avk-founder-living-worlds-02'
const U02 = 'integration/avk-unification-02' // AVK-FLW-02A: no longer approved on this commit line
const ISOLATED = {
  VERCEL_ENV: 'preview',
  VERCEL_GIT_COMMIT_REF: B,
  NEXT_PUBLIC_SUPABASE_URL: 'https://preview-placeholder.invalid',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'preview-placeholder-not-a-key',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'preview-placeholder-not-a-key',
  NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED: 'false',
}

test('ignore step: production builds, approved preview builds, everything else skips', () => {
  const s = 'scripts/vercel-ignore-build.sh'
  assert.equal(run(s, { VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'x' }).code, 1)
  assert.equal(run(s, { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: B }).code, 1)
  assert.equal(run(s, { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'main' }).code, 0)
  assert.equal(run(s, { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: `${B}-copy` }).code, 0)
  assert.equal(run(s, { VERCEL_ENV: 'development', VERCEL_GIT_COMMIT_REF: B }).code, 0)
  assert.equal(run(s, {}).code, 0)
  assert.equal(run(s, { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: U02 }).code, 0)
  assert.equal(run(s, { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'integration/avk-founder-living-worlds-02a' }).code, 0)
})

test('assert: isolated approved preview passes; production is a no-op', () => {
  assert.equal(run('scripts/assert-preview-isolation.sh', ISOLATED).code, 0)
  assert.equal(run('scripts/assert-preview-isolation.sh', { VERCEL_ENV: 'production' }).code, 0)
  assert.equal(run('scripts/assert-preview-isolation.sh', { ...ISOLATED, NEXT_PUBLIC_INSTITUTIONAL_SIGNIN_ENABLED: 'false' }).code, 0)
  // the old U-02 ref with otherwise-perfect placeholders still fails closed on this commit line
  assert.equal(run('scripts/assert-preview-isolation.sh', { ...ISOLATED, VERCEL_GIT_COMMIT_REF: U02 }).code, 1)
})

test('assert: every isolation failure exits 1 before install, and never prints values', () => {
  const s = 'scripts/assert-preview-isolation.sh'
  const secret = 'https://not-a-real-project.supabase.co'
  const cases: Record<string, string>[] = [
    { ...ISOLATED, VERCEL_GIT_COMMIT_REF: 'main' },
    { ...ISOLATED, NEXT_PUBLIC_SUPABASE_URL: secret },
    { ...ISOLATED, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJreal' },
    { ...ISOLATED, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_real' },
    { ...ISOLATED, NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED: 'true' },
    { ...ISOLATED, SUPABASE_SERVICE_ROLE_KEY: 'x' },
    { ...ISOLATED, SUPABASE_SERVICE_ROLE_KEY: '' },
    { ...ISOLATED, ONBOARDING_RECEIPT_SECRET: 'x' },
    { ...ISOLATED, NEXT_PUBLIC_INSTITUTIONAL_SIGNIN_ENABLED: 'true' },
    Object.fromEntries(Object.entries(ISOLATED).filter(([k]) => k !== 'NEXT_PUBLIC_SUPABASE_URL')),
  ]
  for (const env of cases) {
    const r = run(s, env)
    assert.equal(r.code, 1, JSON.stringify(Object.keys(env)))
    assert.ok(!r.out.includes(secret) && !r.out.includes('eyJreal') && !r.out.includes('sb_publishable_real'))
  }
})
