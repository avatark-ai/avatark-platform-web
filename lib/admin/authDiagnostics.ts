// Pure, unit-testable auth configuration diagnostics for the Platform
// Admin "Auth Diagnostics" surface. Never reads or reports secret values,
// only presence/absence and feature-flag state.
export type DiagnosticState = 'configured' | 'missing' | 'unknown'

export interface AuthDiagnostics {
  supabaseUrl: DiagnosticState
  supabaseAnonKey: DiagnosticState
  serviceRoleKey: DiagnosticState
  // Magic-link sign-in (supabase.auth.signInWithOtp) is unconditional code
  // in app/auth/sign-in/page.tsx -- not gated by any feature flag, so this
  // is a structural fact rather than something derived from env.
  magicLinkEnabled: true
  googleOAuthEnabled: boolean
  googleOAuthCredentialsConfigured: DiagnosticState
  // Supabase Auth's own SMTP relay settings live in the Supabase dashboard,
  // not this repo's env -- genuinely unknown from here.
  smtpConfigured: DiagnosticState
  // app/auth/callback/route.ts exists and handles both the magic-link code
  // exchange and OAuth provider-error redirects -- a structural fact, not
  // a live probe (there's no way to exercise it without a real code).
  callbackImplemented: true
  // The exact URL that must be present in Supabase Auth's redirect
  // allowlist for this environment. Null when it can't be computed.
  redirectUrl: string | null
  callbackAllowlistStatus: DiagnosticState
  sessionRefreshMechanism: string
  warnings: string[]
}

export function computeAuthDiagnostics(env: Record<string, string | undefined>): AuthDiagnostics {
  const supabaseUrl: DiagnosticState = env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing'
  const supabaseAnonKey: DiagnosticState = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing'
  const serviceRoleKey: DiagnosticState = env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing'
  const googleOAuthEnabled = env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true'

  const platformOrigin = env.NEXT_PUBLIC_PLATFORM_ORIGIN || (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : null)
  const redirectUrl = platformOrigin ? `${platformOrigin}/auth/callback` : null

  const warnings: string[] = []
  if (supabaseUrl === 'missing') warnings.push('NEXT_PUBLIC_SUPABASE_URL is not set.')
  if (supabaseAnonKey === 'missing') warnings.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.')
  if (serviceRoleKey === 'missing') {
    warnings.push('SUPABASE_SERVICE_ROLE_KEY is not set -- Platform Admin cross-user views will show "unavailable".')
  }
  if (googleOAuthEnabled) {
    warnings.push(
      'Google OAuth is enabled but its Supabase provider credentials cannot be verified from this environment -- confirm in the Supabase dashboard before relying on it.'
    )
  }
  if (!redirectUrl) {
    warnings.push(
      'NEXT_PUBLIC_PLATFORM_ORIGIN is not set -- cannot compute the exact callback URL to register in Supabase\'s redirect allowlist.'
    )
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    serviceRoleKey,
    magicLinkEnabled: true,
    googleOAuthEnabled,
    // Google's client ID/secret live in the Supabase Auth dashboard, not
    // this repo's env -- genuinely unknown from here, not guessed.
    googleOAuthCredentialsConfigured: 'unknown',
    smtpConfigured: 'unknown',
    callbackImplemented: true,
    redirectUrl,
    callbackAllowlistStatus: 'unknown',
    sessionRefreshMechanism: 'proxy.ts (this Next.js fork\'s middleware equivalent) -- supabase.auth.getUser() on every non-static request',
    warnings,
  }
}
