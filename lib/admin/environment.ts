// Pure, unit-testable environment classification -- reads only from a
// passed-in env-like object (never `process.env` directly) so this can be
// tested without mocking modules and reused identically in dashboard and
// settings pages.
export type EnvName = 'local' | 'test' | 'preview' | 'production'
export type HealthState = 'healthy' | 'misconfigured' | 'unknown'

export interface EnvironmentStatus {
  name: EnvName
  state: HealthState
  detail: string
}

// Vercel sets VERCEL_ENV to 'production' | 'preview' | 'development' on
// deployed builds; it's unset for local `next dev`/`next build`.
export function currentEnvName(env: Record<string, string | undefined>): EnvName {
  const vercelEnv = env.VERCEL_ENV
  if (vercelEnv === 'production') return 'production'
  if (vercelEnv === 'preview') return 'preview'
  if (env.NODE_ENV === 'test') return 'test'
  return 'local'
}

export function computeEnvironmentHealth(env: Record<string, string | undefined>): EnvironmentStatus[] {
  const current = currentEnvName(env)
  const supabaseConfigured = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  const currentStatus: EnvironmentStatus = {
    name: current,
    state: supabaseConfigured ? 'healthy' : 'misconfigured',
    detail: supabaseConfigured
      ? 'Supabase URL and anon key are present in this runtime.'
      : 'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing in this runtime.',
  }

  const others: EnvName[] = (['local', 'test', 'preview', 'production'] as EnvName[]).filter((n) => n !== current)

  return [
    currentStatus,
    ...others.map((name) => ({
      name,
      state: 'unknown' as HealthState,
      detail: 'Not verifiable from the currently running process -- requires checking that environment directly (e.g. via the Vercel API or its own deployment).',
    })),
  ]
}
