// Pure, unit-testable auth configuration diagnostics for the Platform
// Admin "Auth Diagnostics" surface. Never reads or reports secret values,
// only presence/absence and feature-flag state.
export type DiagnosticState = 'configured' | 'missing' | 'unknown'

export interface AuthDiagnostics {
  supabaseUrl: DiagnosticState
  supabaseAnonKey: DiagnosticState
  serviceRoleKey: DiagnosticState
  googleOAuthEnabled: boolean
  googleOAuthCredentialsConfigured: DiagnosticState
  sessionRefreshMechanism: string
}

export function computeAuthDiagnostics(env: Record<string, string | undefined>): AuthDiagnostics {
  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing',
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing',
    googleOAuthEnabled: env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true',
    // Google's client ID/secret live in the Supabase Auth dashboard, not
    // this repo's env -- genuinely unknown from here, not guessed.
    googleOAuthCredentialsConfigured: 'unknown',
    sessionRefreshMechanism: 'proxy.ts (this Next.js fork\'s middleware equivalent) -- supabase.auth.getUser() on every non-static request',
  }
}
