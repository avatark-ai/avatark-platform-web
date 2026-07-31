import { AUTH_UNAVAILABLE_MESSAGE } from "./copy.ts"

// Deliberately accepts no "reason"/"detail" prop. That is the regression
// guarantee: there is no code path by which a caller could thread a
// technical misconfiguration string into this component's output, because
// it has nowhere to put one. See noSecrets.test.ts.
export function AuthUnavailableState({ className }: { className?: string }) {
  return (
    <div className={className} data-avatark-component="auth-unavailable" role="alert">
      <p data-avatark-part="message">{AUTH_UNAVAILABLE_MESSAGE}</p>
    </div>
  )
}
