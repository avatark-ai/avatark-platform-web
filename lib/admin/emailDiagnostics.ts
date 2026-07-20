// Pure, unit-testable email/SMTP configuration diagnostics. Reports
// completeness of *this repo's* env vars only -- Supabase's SMTP settings,
// Resend's domain verification, and the auth callback allowlist are all
// configured out-of-band (Supabase/Resend dashboards), so those are
// truthfully reported as 'unknown' rather than guessed at or silently
// assumed correct.
export type DiagnosticState = 'configured' | 'missing' | 'unknown'

export interface EmailDiagnostics {
  resendApiKey: DiagnosticState
  senderName: DiagnosticState
  senderAddress: DiagnosticState
  emailSendingEnabled: boolean
  supabaseSmtp: DiagnosticState
  domainVerification: DiagnosticState
  callbackAllowlist: DiagnosticState
}

export function computeEmailDiagnostics(env: Record<string, string | undefined>): EmailDiagnostics {
  return {
    resendApiKey: env.RESEND_API_KEY ? 'configured' : 'missing',
    senderName: env.EMAIL_FROM_NAME ? 'configured' : 'missing',
    senderAddress: env.EMAIL_FROM_ADDRESS ? 'configured' : 'missing',
    // Feature-flagged: sending stays off even if a key is present, until
    // this is explicitly turned on. Never inferred from key presence
    // alone -- that would make "add a key" implicitly "start sending".
    emailSendingEnabled: env.EMAIL_SENDING_ENABLED === 'true',
    // These three are genuinely outside what this repo can check from its
    // own environment -- reported as 'unknown', not fabricated.
    supabaseSmtp: 'unknown',
    domainVerification: 'unknown',
    callbackAllowlist: 'unknown',
  }
}
