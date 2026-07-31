import type { ProductIdentityConfig } from "@avatark/product-registry"

export type { ProductIdentityConfig }

// Mirrors lib/auth/authProviderCapabilities.ts's shape without depending on
// it -- packages must not import from an app's lib/ tree. Hosts are
// responsible for actually probing their auth provider (Supabase or
// otherwise) and passing the result in; this package never performs the
// probe itself and never assumes a single provider or project ref.
export type AuthProviderCheckStatus = "enabled" | "disabled" | "unavailable"

export interface AuthProviderCapabilities {
  google: boolean
  status: AuthProviderCheckStatus
}

// A Google sign-in affordance should render only when the host has
// confirmed, live, that the provider is enabled -- never from a
// build-time flag, and never when the check itself was inconclusive.
export function shouldShowGoogleButton(capabilities: AuthProviderCapabilities): boolean {
  return capabilities.status === "enabled" && capabilities.google
}

export type CallbackFailureLike =
  | "access_denied"
  | "expired"
  | "reused_or_invalid"
  | "missing_code"
  | "callback_failed"
