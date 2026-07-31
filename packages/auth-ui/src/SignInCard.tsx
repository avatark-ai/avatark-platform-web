import type { ReactNode } from "react"
import { ProviderButtons } from "./ProviderButtons.tsx"
import { MagicLinkForm } from "./MagicLinkForm.tsx"
import { ReturnDestination } from "./ReturnDestination.tsx"
import { AuthFooter, type AuthFooterLinks } from "./AuthFooter.tsx"
import type { AuthProviderCapabilities } from "./types.ts"

export interface SignInCardProps {
  capabilities: AuthProviderCapabilities
  onGoogleSignIn: () => void
  googleRedirecting?: boolean
  onMagicLinkSubmit: (email: string) => void | Promise<void>
  magicLinkSubmitting?: boolean
  footerLinks: AuthFooterLinks
  /** Rendered between the divider and the magic-link form, e.g. an error state. */
  children?: ReactNode
  className?: string
}

// Composes the full canonical body below <AuthShell>: product return
// context, provider buttons (gated on live capability detection), magic
// link form, then the footer. This is the "one true shape" every product's
// sign-in page should render -- products may only vary AuthShell's
// surrounding chrome and the ProductIdentityConfig content, not this order.
export function SignInCard({
  capabilities,
  onGoogleSignIn,
  googleRedirecting,
  onMagicLinkSubmit,
  magicLinkSubmitting,
  footerLinks,
  children,
  className,
}: SignInCardProps) {
  return (
    <div className={className} data-avatark-component="sign-in-card">
      <ReturnDestination />
      <ProviderButtons capabilities={capabilities} onGoogleSignIn={onGoogleSignIn} googleRedirecting={googleRedirecting} />
      {children}
      <MagicLinkForm onSubmit={onMagicLinkSubmit} submitting={magicLinkSubmitting} />
      <AuthFooter links={footerLinks} />
    </div>
  )
}
