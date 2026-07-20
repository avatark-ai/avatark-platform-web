// Pure, unit-testable email/SMTP configuration diagnostics. Reports
// completeness of *this repo's* env vars only -- Supabase's SMTP settings,
// Resend's domain verification, and the auth callback allowlist are all
// configured out-of-band (Supabase/Resend dashboards), so those are
// truthfully reported as 'unknown' rather than guessed at or silently
// assumed correct.
export type DiagnosticState = 'configured' | 'missing' | 'unknown'

// Real inventory of what lib/email/templates.ts can actually render today
// -- kept here (not derived by reflection) so it stays an explicit,
// reviewable list rather than something that silently drifts from the
// diagnostics page without anyone noticing a new template was added.
export const EMAIL_TEMPLATES = ['invitationEmail'] as const

export interface EmailDiagnostics {
  resendApiKey: DiagnosticState
  senderName: DiagnosticState
  senderAddress: DiagnosticState
  senderPreview: string | null
  senderDomain: string | null
  emailSendingEnabled: boolean
  supabaseSmtp: DiagnosticState
  domainVerification: DiagnosticState
  spf: DiagnosticState
  dkim: DiagnosticState
  callbackAllowlist: DiagnosticState
  templates: readonly string[]
  // True only when this repo could actually place a send call right now
  // (key + sender configured + the feature flag on) -- distinct from
  // "configured", since a key can be present while sending stays off.
  testReadiness: boolean
  missing: string[]
}

export function computeEmailDiagnostics(env: Record<string, string | undefined>): EmailDiagnostics {
  const resendApiKey: DiagnosticState = env.RESEND_API_KEY ? 'configured' : 'missing'
  const senderName: DiagnosticState = env.EMAIL_FROM_NAME ? 'configured' : 'missing'
  const senderAddress: DiagnosticState = env.EMAIL_FROM_ADDRESS ? 'configured' : 'missing'
  const emailSendingEnabled = env.EMAIL_SENDING_ENABLED === 'true'

  const senderPreview =
    env.EMAIL_FROM_NAME && env.EMAIL_FROM_ADDRESS ? `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>` : null
  const senderDomain = env.EMAIL_FROM_ADDRESS?.split('@')[1] ?? null

  const missing: string[] = []
  if (resendApiKey === 'missing') missing.push('RESEND_API_KEY')
  if (senderName === 'missing') missing.push('EMAIL_FROM_NAME')
  if (senderAddress === 'missing') missing.push('EMAIL_FROM_ADDRESS')

  return {
    resendApiKey,
    senderName,
    senderAddress,
    senderPreview,
    senderDomain,
    // Feature-flagged: sending stays off even if a key is present, until
    // this is explicitly turned on. Never inferred from key presence
    // alone -- that would make "add a key" implicitly "start sending".
    emailSendingEnabled,
    // These are genuinely outside what this repo can check from its own
    // environment -- reported as 'unknown', not fabricated.
    supabaseSmtp: 'unknown',
    domainVerification: 'unknown',
    spf: 'unknown',
    dkim: 'unknown',
    callbackAllowlist: 'unknown',
    templates: EMAIL_TEMPLATES,
    testReadiness: resendApiKey === 'configured' && senderAddress === 'configured' && emailSendingEnabled,
    missing,
  }
}
