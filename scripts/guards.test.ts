import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

// AVK-UNIFICATION-02 / AVK-PROD-03A (C5, T7): exit-code matrix for the Vercel ignore step and the
// pre-install assertion. Fake values only; the assertion must never print a value.
const run = (script: string, env: Record<string, string>) => {
  const childEnv = { PATH: process.env.PATH ?? '/usr/bin:/bin', ...env } as unknown as NodeJS.ProcessEnv
  const r = spawnSync('sh', [script], { env: childEnv, encoding: 'utf8' })
  return { code: r.status, out: r.stdout + r.stderr }
}
const B = 'release/avatark-institutional-01'
const PB = 'platform/foundation-20260714'
const U03 = 'integration/avk-unification-03' // accepted baseline; no longer approved on this commit line
const U02 = 'integration/avk-unification-02'
const FLW02 = 'integration/avk-founder-living-worlds-02'
const E04 = 'feature/avk-ecosystem-04' // AVK-ECOSYSTEM-04-PREVIEW: second approved Preview branch
const ISOLATED = {
  VERCEL_ENV: 'preview',
  VERCEL_GIT_COMMIT_REF: B,
  NEXT_PUBLIC_SUPABASE_URL: 'https://preview-placeholder.invalid',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'preview-placeholder-not-a-key',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'preview-placeholder-not-a-key',
  NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED: 'false',
}
const PROD_ISOLATED = {
  VERCEL_ENV: 'production',
  VERCEL_GIT_COMMIT_REF: PB,
  NEXT_PUBLIC_SUPABASE_URL: 'https://production-placeholder.invalid',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'production-placeholder-not-a-key',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'production-placeholder-not-a-key',
  NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED: 'false',
}
const A = 'scripts/assert-preview-isolation.sh'
const SENTINELS = ['https://not-a-real-project.supabase.co', 'eyJSENTINEL', 'sb_publishable_SENTINEL', 'SENTINEL_SECRET']
const noValuesPrinted = (out: string) => SENTINELS.every((s) => !out.includes(s))

test('ignore step: production builds, approved release-candidate preview builds, everything else skips', () => {
  const s = 'scripts/vercel-ignore-build.sh'
  assert.equal(run(s, { VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: PB }).code, 1)
  assert.equal(run(s, { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: B }).code, 1)
  for (const ref of [U03, U02, FLW02, 'main', `${B}-copy`, 'release/avatark-institutional-02', 'Release/avatark-institutional-01', `${B} `, `refs/heads/${B}`, 'integration/avk-unification-03a', 'integration/avk-founder-science-02', PB, '']) {
    assert.equal(run(s, { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: ref }).code, 0, `preview ${ref}`)
  }
  assert.equal(run(s, { VERCEL_ENV: 'development', VERCEL_GIT_COMMIT_REF: B }).code, 0)
  assert.equal(run(s, {}).code, 0)
})

test('assert: isolated release-candidate preview passes; other refs fail closed', () => {
  assert.equal(run(A, ISOLATED).code, 0)
  assert.equal(run(A, { ...ISOLATED, NEXT_PUBLIC_INSTITUTIONAL_SIGNIN_ENABLED: 'false', NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED: 'false' }).code, 0)
  for (const ref of [U03, U02, FLW02, 'integration/avk-unification-03a', PB]) {
    assert.equal(run(A, { ...ISOLATED, VERCEL_GIT_COMMIT_REF: ref }).code, 1, ref)
  }
})

test('assert: production passes only with the exact Production placeholders on the Production branch', () => {
  const ok = run(A, PROD_ISOLATED)
  assert.equal(ok.code, 0)
  assert.match(ok.out, /AVK-PROD assert: production isolated, installing/)
  assert.equal(run(A, { ...PROD_ISOLATED, NEXT_PUBLIC_INSTITUTIONAL_SIGNIN_ENABLED: 'false', NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED: 'false' }).code, 0)
  // today's Production shape: shared real Supabase values, unknown mount value, receipt secret set
  const today = run(A, {
    VERCEL_ENV: 'production',
    VERCEL_GIT_COMMIT_REF: PB,
    NEXT_PUBLIC_SUPABASE_URL: SENTINELS[0],
    NEXT_PUBLIC_SUPABASE_ANON_KEY: SENTINELS[1],
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SENTINELS[2],
    NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED: 'true',
    ONBOARDING_RECEIPT_SECRET: SENTINELS[3],
  })
  assert.equal(today.code, 1)
  assert.equal((today.out.match(/=mismatch/g) ?? []).length, 4)
  assert.match(today.out, /ONBOARDING_RECEIPT_SECRET\(unset\)=set/)
  assert.ok(noValuesPrinted(today.out))
  // preview placeholders are not Production placeholders
  assert.equal(run(A, { ...ISOLATED, VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: PB }).code, 1)
})

test('assert: every single isolation deviation exits 1 before install, in both environments, and never prints values', () => {
  for (const base of [ISOLATED, PROD_ISOLATED]) {
    const cases: Record<string, string>[] = [
      { ...base, VERCEL_GIT_COMMIT_REF: 'main' },
      { ...base, VERCEL_GIT_COMMIT_REF: base === ISOLATED ? PB : B },
      { ...base, NEXT_PUBLIC_SUPABASE_URL: SENTINELS[0] },
      { ...base, NEXT_PUBLIC_SUPABASE_ANON_KEY: SENTINELS[1] },
      { ...base, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SENTINELS[2] },
      { ...base, NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED: 'true' },
      { ...base, SUPABASE_SERVICE_ROLE_KEY: SENTINELS[3] },
      { ...base, SUPABASE_SERVICE_ROLE_KEY: '' },
      { ...base, ONBOARDING_RECEIPT_SECRET: SENTINELS[3] },
      { ...base, NEXT_PUBLIC_INSTITUTIONAL_SIGNIN_ENABLED: 'true' },
      { ...base, NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED: 'true' },
      { ...base, NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED: 'TRUE' },
      ...['VERCEL_GIT_COMMIT_REF', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED'].map(
        (missing) => Object.fromEntries(Object.entries(base).filter(([k]) => k !== missing)),
      ),
    ]
    for (const env of cases) {
      const r = run(A, env)
      assert.equal(r.code, 1, `${base.VERCEL_ENV} ${JSON.stringify(Object.keys(env))}`)
      assert.ok(noValuesPrinted(r.out))
    }
  }
})

test('assert: any VERCEL_ENV other than preview/production fails closed', () => {
  for (const env of ['development', '', 'Production', 'preview ']) {
    assert.equal(run(A, { ...PROD_ISOLATED, VERCEL_ENV: env }).code, 1, `VERCEL_ENV=${JSON.stringify(env)}`)
  }
  assert.equal(run(A, {}).code, 1)
})

test('E04 guards: feature/avk-ecosystem-04 previews like the release branch (same placeholders), nowhere else', () => {
  const s = 'scripts/vercel-ignore-build.sh'
  assert.equal(run(s, { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: E04 }).code, 1)
  for (const ref of [`${E04}-copy`, 'feature/avk-ecosystem-05', 'Feature/avk-ecosystem-04', `${E04} `, `refs/heads/${E04}`, 'feature/avk-ecosystem', 'feature/avk-ecosystem-04/x']) {
    assert.equal(run(s, { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: ref }).code, 0, `preview ${ref}`)
    assert.equal(run(A, { ...ISOLATED, VERCEL_GIT_COMMIT_REF: ref }).code, 1, `assert ${ref}`)
  }
  assert.equal(run(s, { VERCEL_ENV: 'development', VERCEL_GIT_COMMIT_REF: E04 }).code, 0)
  const ok = run(A, { ...ISOLATED, VERCEL_GIT_COMMIT_REF: E04 })
  assert.equal(ok.code, 0)
  assert.match(ok.out, /AVK-U02 assert: VERCEL_GIT_COMMIT_REF=ok/)
  // every isolation deviation still fails closed on the E04 branch
  const deviations: Record<string, string>[] = [{ NEXT_PUBLIC_SUPABASE_URL: SENTINELS[0] }, { NEXT_PUBLIC_SUPABASE_ANON_KEY: SENTINELS[1] }, { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SENTINELS[2] },
    { NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED: 'true' }, { SUPABASE_SERVICE_ROLE_KEY: SENTINELS[3] }, { ONBOARDING_RECEIPT_SECRET: SENTINELS[3] },
    { NEXT_PUBLIC_INSTITUTIONAL_SIGNIN_ENABLED: 'true' }, { NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED: 'true' }]
  for (const bad of deviations) {
    const r = run(A, { ...ISOLATED, VERCEL_GIT_COMMIT_REF: E04, ...bad })
    assert.equal(r.code, 1, JSON.stringify(Object.keys(bad)))
    assert.ok(noValuesPrinted(r.out))
  }
  // the E04 branch can never satisfy the Production assertion
  assert.equal(run(A, { ...PROD_ISOLATED, VERCEL_GIT_COMMIT_REF: E04 }).code, 1)
})
