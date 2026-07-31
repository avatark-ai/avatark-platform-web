"use client"

export interface GoogleProviderButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
  /** Overrides the button label -- e.g. "Redirecting..." while the OAuth kick-off is in flight. Defaults to "Continue with Google". */
  label?: string
}

// Rendering is gated by the caller (ProviderButtons / shouldShowGoogleButton)
// on live capability detection -- this component itself has no opinion on
// whether Google is configured, and holds no credentials.
export function GoogleProviderButton({ onClick, disabled, className, label }: GoogleProviderButtonProps) {
  return (
    <button
      type="button"
      className={className}
      data-avatark-component="google-provider-button"
      onClick={onClick}
      disabled={disabled}
    >
      {label ?? "Continue with Google"}
    </button>
  )
}
