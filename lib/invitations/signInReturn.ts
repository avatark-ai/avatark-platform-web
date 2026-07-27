// Deliberately its own file with zero further imports: this needs to be
// safely importable from a CLIENT component (InvitationAcceptGate).
// lib/invitations/destination.ts pulls in lib/content/echo.ts, which
// reads content off disk via node:fs -- fine for the server-rendered
// /enter/[token] page, but importing it from client code would drag a
// Node-only module into the browser bundle.

/**
 * Where signing in returns to after "Sign in to save this to your
 * Journey" on the invitation preview -- Phase 9's "never lose invitation
 * context." Always a same-app relative path (never absolute), so it's
 * safe to hand straight to `?return=` without a second safety check --
 * safeReturnPath still applies its own allowlist on the receiving end
 * (see /auth/sign-in), this just guarantees the shape it expects.
 */
export function invitationSignInReturnPath(token: string): string {
  return `/enter/${encodeURIComponent(token)}`;
}
