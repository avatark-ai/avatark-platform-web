# Security & Connected Methods (Mission Part 11)

Status: **contract + canonical UI exist** (`packages/account/src/ui/SignInMethodsTab.tsx`, tab key `signin`, label "Security" — see `docs/CANONICAL_ACCOUNT_SHELL.md`). Not yet wired into `app/account/page.tsx` (Part 16).

## What the canonical Security section covers

- Primary email, with verification/session context shown inline.
- Email change flow (`AuthAdapter.changeEmail`), with the host's own confirmation semantics (Supabase may require confirming from the old address, the new one, or both — the UI doesn't assume which).
- Connected Google identity (`AuthAdapter.getIdentities`, `linkGoogleIdentity`) — shown as connected/not-connected, never with setup instructions.
- Sign out (header action, not a rail section — matches the mission's implied hierarchy).
- Enterprise SSO — a support-request affordance only (`mailto:` link via `AccountSupportConfig`), not a self-serve configuration UI.

## What was fixed during this phase

The forked source's `SignInMethodsTab` rendered a permanent "Apple — Setup required" block with an expandable checklist: *Apple Developer account, Team ID, Services ID, Key ID, Private key, Supabase callback URL configured in Apple, Apple return URL configured in Supabase*. This is exactly what the mission prohibits: *"Do not show 'setup required' or provider deployment instructions to consumers. Hide unconfigured providers."* No Apple OAuth exists anywhere in this ecosystem today (confirmed: no adapter, no capability signal, no live implementation) — the block has been removed entirely rather than reworded, since there is nothing to configure toward yet. When Apple sign-in becomes real, it should appear the same way Google does: gated on a live capability check, never a static "coming soon" placeholder.

## Not yet built (real gaps, tracked here rather than silently dropped)

- **Active sessions / current session / revoke session / sign out all devices** — no `AuthAdapter` method or UI exists for listing or revoking individual sessions today. `AuthAdapter.signOut()` only signs out the current session.
- **Recent security-sensitive activity** — no adapter surfaces a security event log to the account UI. `lib/admin/audit.ts`'s `platform_audit_events` table is admin-facing only, not yet exposed to the signed-in user themselves.
- **Account recovery contract** — no dedicated recovery flow beyond magic-link re-authentication exists.
- **Provider-linking contract** — `linkGoogleIdentity()` exists for Google specifically; there is no generic multi-provider linking contract yet (only relevant once a second provider is real).

These are genuine product gaps, not something this UI-contract phase fabricates. A future phase implementing them should extend `AuthAdapter` with new optional methods (`listSessions`, `revokeSession`, `signOutAllDevices`, `getRecentSecurityActivity`) rather than growing `SignInMethodsTab` ad hoc.

## Non-negotiables (already enforced)

- Security notifications are not user-disableable — see `docs/NOTIFICATION_PREFERENCES.md`'s `security_account` category (`mandatory: true`).
- No access tokens, refresh tokens, raw cookies, JWT contents, service-role keys, client secrets, or database URLs are ever rendered by this package — enforced by `packages/account/src/importBoundary.test.ts`'s secret-pattern regression test, and separately by `lib/admin/diagnosticsTiers.ts`'s `isSecretShaped` guard for the diagnostics surface (`docs/SAFE_DIAGNOSTICS.md`).
