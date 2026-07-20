// The provider-neutral boundary products integrate against, instead of
// importing Supabase directly. Kept intentionally small: only the claims
// this repo can honestly back today are included. `organizationIds`,
// `productAccess`, and `roles` are real (typed, non-optional) fields so
// callers don't need an `if (feature-exists)` check, but they resolve to
// `[]` until the organizations/roles/product-access tables exist -- an
// honest empty state, not a fabricated placeholder.
//
// `signIn()` is deliberately NOT part of this interface yet: magic-link
// and Google sign-in are both browser-redirect flows initiated directly
// from `app/auth/sign-in/page.tsx` via the Supabase browser client, and
// forcing that into a server-side provider object today would mean
// designing an abstraction with exactly one caller. Add it once a second
// concrete caller (a real cross-repo consumer of this contract) exists.
export interface IdentityClaims {
  subjectId: string
  email: string
  displayName: string
  organizationIds: string[]
  productAccess: string[]
  roles: string[]
}

export interface IdentityProvider {
  /** Server-side verified read of the current session's user, if any. */
  getUser(): Promise<IdentityClaims | null>
  /**
   * Re-verifies the session against the auth server (never trusts a
   * locally-cached/client-supplied claim). For this Supabase-backed
   * implementation this is equivalent to getUser() -- both call
   * supabase.auth.getUser(), which always round-trips to Supabase.
   */
  verifySession(): Promise<IdentityClaims | null>
  /** Forces a session refresh (rotates the access token off the refresh token). */
  refreshSession(): Promise<IdentityClaims | null>
  signOut(): Promise<void>
  /** Trusted, environment-aware URL to the account surface. */
  accountUrl(returnTo?: string): string
  /** Trusted, environment-aware URL to sign out and land somewhere safe. */
  signOutUrl(): string
}
