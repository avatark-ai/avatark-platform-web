// Pure classification of why /auth/callback failed, so /auth/sign-in can
// show an honest, specific message instead of one generic "something went
// wrong". Supabase's exchangeCodeForSession() only returns a free-text
// error message (not a stable error code), so this is a best-effort
// substring match, not a guaranteed-stable contract with Supabase.
export type CallbackFailureReason =
  | 'access_denied'
  | 'expired'
  | 'reused_or_invalid'
  | 'missing_code'
  | 'callback_failed'

export function classifyCallbackFailure(input: {
  providerError?: string | null
  exchangeError?: string | null
}): CallbackFailureReason {
  if (input.providerError) {
    return input.providerError === 'access_denied' ? 'access_denied' : 'callback_failed'
  }

  const message = input.exchangeError?.toLowerCase() ?? ''
  if (!message) return 'callback_failed'
  if (message.includes('expired')) return 'expired'
  if (message.includes('invalid') || message.includes('already') || message.includes('used') || message.includes('no valid flow state')) {
    return 'reused_or_invalid'
  }
  return 'callback_failed'
}

export const CALLBACK_ERROR_MESSAGES: Record<CallbackFailureReason, string> = {
  access_denied: 'Sign-in was cancelled.',
  expired: 'That sign-in link expired. Request a new one below.',
  reused_or_invalid: 'That sign-in link was already used or is no longer valid. Request a new one below.',
  missing_code: 'That sign-in link is incomplete. Request a new one below.',
  callback_failed: "Something went wrong signing you in. Try again.",
}

export function callbackErrorMessage(reason: string | null): string | null {
  if (!reason) return null
  if (reason in CALLBACK_ERROR_MESSAGES) return CALLBACK_ERROR_MESSAGES[reason as CallbackFailureReason]
  return CALLBACK_ERROR_MESSAGES.callback_failed
}
