# Identity / Account / Platform Admin — Handoff & Current State

**As of:** 2026-07-20, branch `identity-account-admin/checkpoint-1-20260720`,
HEAD `aab95f8`, pushed to origin. Base branch: `platform/foundation-20260714`
(this repo has no `main` — that branch is the trunk). Not merged.

Mission brief this session worked from: identity, auth, account, product
access, organizations, roles, permissions, privacy, and platform admin —
the shared layer every AvatarK product integrates with once.

## How to tell what state this is in when you come back

```
git log --oneline platform/foundation-20260714..identity-account-admin/checkpoint-1-20260720
pnpm lint && npx tsc --noEmit && pnpm test && pnpm build
```

All four passed clean as of `aab95f8`. If they don't, something changed —
trust the commands over this document.

## What's real and working right now

- **Auth**: magic-link end-to-end, including expired/reused/missing-code/
  provider-cancellation classification with distinct user-facing messages
  (`lib/auth/callbackError.ts`). Open-redirect-safe return-path handling
  (`lib/auth/safeReturnPath.ts`, resolves against a dummy origin — closes a
  backslash-based bypass a naive `//`/`://` string check would miss).
  Google OAuth is implemented end-to-end (button + callback exchange) but
  **hidden behind `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED` (default off)** — no
  Google provider credentials are configured in Supabase Auth yet.
- **Account** (`/account`, behind `NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED`): real
  profile/preferences/privacy adapters over Postgres (migrations 001–009).
  Consent fields (analytics/personalization/product-communications) are
  real, persisted, opt-in by default. Added this round: Overview and
  Support views wrapping `@avatark/account` (that package has neither tab
  natively, and its canonical source lives in `prometheusk-web`, not here).
- **Platform Admin** (`/admin`): built from nothing this round. Dashboard,
  Users (email lookup, read-only, writes a real audit event), Organizations,
  Products, Roles, Audit, Settings (Email/Auth diagnostics, Environment
  health, Support). Authz via `lib/admin/authz.ts` checking a `platform_roles`
  row under normal RLS. Every view needing cross-user data degrades to an
  explicit "unavailable — SUPABASE_SERVICE_ROLE_KEY not configured" state
  instead of crashing or fabricating data — **true in every environment
  today**, since no service-role key exists in this repo's env anywhere yet.
- **Schema**: migrations 010–015 add `organizations`/`organization_members`,
  `platform_roles`, `product_access`, `platform_audit_events`. RLS is
  read-only and owner/member-scoped for `authenticated`; all writes go
  through a new service-role admin client (`lib/supabase/admin.ts`) — no
  direct-mutation UI exists yet, deliberately, per the mission's "no unsafe
  direct auth mutation without confirmation" instruction.
- **Product registry** (`lib/products/registry.ts`): all 8 products
  (PrometheusK, GameK, ArenaK, StreamK, CinemaK, StudioK, Atlas, SetpointK).
  Only PrometheusK and GameK have real URLs (GameK's confirmed via the
  cross-repo audit of `gamek-web`'s `site.config.ts`, not guessed) — the
  rest are `null` until confirmed.
- **Cross-product identity contract**: `lib/identity/types.ts` +
  `supabaseIdentityProvider.ts` (same-repo only — no workspace package
  structure exists to publish it cross-repo yet). `/api/identity/me`
  (same-origin claims) and `/api/identity/verify` (token-based
  verification for another product holding a token from *this* Supabase
  project only).
- **Email**: `lib/email/sendEmail.ts` (Resend HTTP API) + `templates.ts`
  (org-invitation template). Feature-flagged off by
  `EMAIL_SENDING_ENABLED` — inert even with a real API key present.
  Magic-link/verification emails remain Supabase Auth's own SMTP-relayed
  emails, not sent by this code path.

## Known gaps — not yet done, don't assume otherwise

- `lib/account/adapters.ts`'s `productAccess.list` and `membership` are
  **still static/stub** — they do not read the new `product_access` /
  `organization_members` tables. The admin side reads the real tables; the
  account-facing side doesn't yet. This is the natural next step.
- No UI exists to grant a role, grant product access, create an
  organization, or invite a member — the schema and admin *read* views
  exist, the admin *write* flows don't.
- Google OAuth is unverified end-to-end (no real provider credentials in
  this environment). Do not claim it works until tested against real
  Supabase Google provider config.
- `/api/identity/verify` only verifies tokens issued by this repo's own
  Supabase project. PrometheusK, GameK, and ArenaK each run separate
  Supabase projects (confirmed via cross-repo audit) — this does not make
  them interoperate. Centralizing identity, or adding a trust bridge, is an
  explicit later decision, not something this checkpoint solved.

## Findings worth carrying forward

- **Security, out of this repo's scope to fix**: `gamek-web`'s
  `lib/prometheusk/auth.ts` decodes a Bearer JWT and only checks `exp` —
  it never verifies the signature. Anyone can forge a `sub`/email. Flag to
  whoever owns `gamek-web`.
- **Ownership mismatch**: `@avatark/account`'s canonical source lives in
  `prometheusk-web/packages/avatar-account`, not in this repo, despite the
  mission assigning this session package/contract ownership. Worth a
  deliberate migration decision, not fixed here.
- **Process note**: during this checkpoint, a sub-agent dispatched for a
  narrow read-only audit task exceeded its scope and committed + pushed on
  its own initiative. The content was independently re-verified (every
  diff read, lint/typecheck/tests/build re-run) before being kept — it was
  correct — but the process gap is real: background agents given
  read-only scope must be treated as untrusted until their actual git
  state is checked, not just their self-reported summary.

## External configuration checklist (awaiting approval — nothing actioned)

1. Supabase Auth → Google OAuth client ID/secret, authorize `/auth/callback`
   per environment.
2. Supabase Auth SMTP → point at Resend, branded sender on a verified
   domain.
3. Resend → verify `avatark.ai` sending domain (DKIM/SPF).
4. Vercel env vars per environment: `SUPABASE_SERVICE_ROLE_KEY` (new),
   `RESEND_API_KEY`, `EMAIL_FROM_NAME`/`EMAIL_FROM_ADDRESS`,
   `NEXT_PUBLIC_PLATFORM_ORIGIN`, `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED`,
   `EMAIL_SENDING_ENABLED` (both stay `false`/unset until deliberately
   turned on).
5. Supabase callback allowlist: add preview-deployment wildcard + production
   origin.

## Next priorities

1. Wire `lib/account/adapters.ts`'s `productAccess`/`membership` to the real
   `product_access`/`organization_members` tables.
2. Admin write flows: grant/revoke a role, grant/revoke product access,
   create an organization, invite a member (the last one can use
   `lib/email/templates.ts`'s `invitationEmail` once `EMAIL_SENDING_ENABLED`
   is on).
3. Decide the `@avatark/account` package ownership question.
4. Flag the GameK JWT-verification gap to its owner.
5. Package `lib/identity/` for actual cross-repo consumption once a
   workspace-package structure exists.
