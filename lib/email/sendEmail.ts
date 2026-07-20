// Resend-backed email sending, feature-flagged and safe-by-default. This
// is for app-initiated emails only (e.g. a future organization invitation)
// -- magic-link/verification emails are Supabase Auth's own SMTP-relayed
// emails, sent by Supabase itself, not by this code path.
//
// EMAIL_SENDING_ENABLED defaults to unset/false: even with a real
// RESEND_API_KEY present, nothing is sent until this is explicitly turned
// on. That keeps "add a key to .env" from silently starting to send real
// email in an environment nobody meant to activate yet.
export interface SendEmailInput {
  to: string
  subject: string
  html: string
}

export type SendEmailResult =
  | { sent: true }
  | { sent: false; reason: 'disabled' | 'not_configured' | 'send_failed'; detail?: string }

export async function sendEmail(input: SendEmailInput, env: Record<string, string | undefined> = process.env): Promise<SendEmailResult> {
  if (env.EMAIL_SENDING_ENABLED !== 'true') {
    return { sent: false, reason: 'disabled' }
  }

  const apiKey = env.RESEND_API_KEY
  const fromName = env.EMAIL_FROM_NAME ?? 'AvatarK'
  const fromAddress = env.EMAIL_FROM_ADDRESS
  if (!apiKey || !fromAddress) {
    return { sent: false, reason: 'not_configured' }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromAddress}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => undefined)
    return { sent: false, reason: 'send_failed', detail }
  }

  return { sent: true }
}
