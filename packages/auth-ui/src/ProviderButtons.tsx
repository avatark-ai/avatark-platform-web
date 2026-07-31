import type { ReactNode } from "react"
import { GoogleProviderButton } from "./GoogleProviderButton.tsx"
import { ProviderDivider } from "./ProviderDivider.tsx"
import { shouldShowGoogleButton, type AuthProviderCapabilities } from "./types.ts"

export interface ProviderButtonsProps {
  capabilities: AuthProviderCapabilities
  onGoogleSignIn: () => void
  /** True while the OAuth kick-off itself is in flight (not general form state) -- swaps the button to its "Redirecting..." label and disables it. */
  googleRedirecting?: boolean
  /** Slot for future configured providers (Apple, Microsoft, ...). */
  additionalProviders?: ReactNode
  className?: string
}

// Renders zero providers, not an error, when nothing is confirmed live --
// AuthUnavailableState (a sibling state, not this component) is what
// callers show when the whole auth surface itself can't be used at all.
export function ProviderButtons({ capabilities, onGoogleSignIn, googleRedirecting, additionalProviders, className }: ProviderButtonsProps) {
  const showGoogle = shouldShowGoogleButton(capabilities)
  if (!showGoogle && !additionalProviders) return null

  return (
    <div className={className} data-avatark-component="provider-buttons">
      {showGoogle && (
        <GoogleProviderButton
          onClick={onGoogleSignIn}
          disabled={googleRedirecting}
          label={googleRedirecting ? "Redirecting..." : undefined}
        />
      )}
      {additionalProviders}
      <ProviderDivider />
    </div>
  )
}
