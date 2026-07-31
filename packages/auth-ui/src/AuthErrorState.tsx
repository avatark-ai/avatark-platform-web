import { callbackErrorMessage } from "@avatark/auth"
import type { CallbackFailureLike } from "./types.ts"

export interface AuthErrorStateProps {
  reason: CallbackFailureLike | string | null
  className?: string
}

// Renders only the consumer-safe, pre-classified message from
// @avatark/auth's CALLBACK_ERROR_MESSAGES map -- never the raw
// provider/Supabase error string, which may contain implementation detail.
export function AuthErrorState({ reason, className }: AuthErrorStateProps) {
  const message = callbackErrorMessage(reason)
  if (!message) return null
  return (
    <div className={className} data-avatark-component="auth-error" role="alert">
      <p data-avatark-part="message">{message}</p>
    </div>
  )
}
