# GameK Shared Platform Setup

Status: setup contract documentation only. Produced from direct inspection
of `gamek-web`'s existing code and its own
`docs/GAMEK_AUTH_DEPLOYMENT_CHECKLIST.md`/`docs/GAMEK_AUTH_ACCOUNT_INTEGRATION.md`,
plus this repo's own auth implementation. **No file in `gamek-web` was
modified to produce this document.** This document does not authorize any
production promotion, and does not claim GameK's shared authentication is
production-ready — see §Phase E.

GameK must not create or use a separate identity provider. Every step
below connects GameK to the existing `avatark-platform-test` project —
none creates a new Supabase project.

## Phase A — connect GameK Preview to shared authentication

Scope: AUTHENTICATION READY only (see
`docs/AVATARK_SHARED_PLATFORM_ARCHITECTURE.md` §2). This phase requires
zero code changes in `gamek-web` — its Supabase client/server/proxy
wiring, sign-in UI, and `/auth/callback` route are already structurally
complete and identical in shape to this repo's own. What's missing is
configuration only.

**1. Supabase project to use**: `avatark-platform-test`
(ref `hapoerzbcnagyfafqojg`) — the same project this repo already runs
against. Do not create a new project.

**2. Browser-safe variables** (Vercel → Preview environment):
- `NEXT_PUBLIC_SUPABASE_URL=https://hapoerzbcnagyfafqojg.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<avatark-platform-test's anon/public key,
  from Supabase dashboard → Project Settings → API>`
- `NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED=true` (once ready to test `/account`;
  safe to leave `false` initially — sign-in still works with `/account`
  showing a not-connected card)
- `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=false` initially — flip to `true` only
  after the Google provider step below is done and verified with magic
  link first

**3. Server-side variables**: none required for this phase.
`SUPABASE_SERVICE_ROLE_KEY` is never referenced anywhere in `gamek-web`'s
code (confirmed by grep) — it is not needed to connect sign-in.

**4. Redirect URL pattern**: `<gamek-preview-origin>/auth/callback`. The
exact Preview origin depends on `gamek-web`'s actual linked Vercel project
name/team slug, which is **not derivable from the repo alone** — its own
checklist confirms no `.vercel/project.json` exists and `vercel.json`'s
`"name"` field (`"flowk"`) doesn't match either `gamek-web` or `gamek`.
Confirm the real linked Vercel project name before building the
wildcard below.

**5. Exact callback route**: `app/auth/callback/route.ts` (already
present, structurally identical to this repo's own — `GET`, exchanges
`code` via `supabase.auth.exchangeCodeForSession`, honors `return` via
`safeReturnPath`, falls back to `/auth/sign-in?error=not_configured` while
Supabase is unset).

**6. Required Supabase dashboard steps** (one-time, done once for
`avatark-platform-test`, benefits every current and future consumer of
the shared project):
- **Auth → URL Configuration → Site URL**: no change required to add
  GameK — Site URL is a single default value already pointed at this
  repo's own origin; GameK does not need to become the Site URL.
- **Auth → URL Configuration → Redirect URLs**: add, in addition to
  whatever entries already exist for `avatark-platform-web`:
  - `http://localhost:3000/auth/callback` (GameK local dev)
  - `https://<confirmed-gamek-vercel-project>-*.vercel.app/auth/callback`
    (Preview wildcard, once the real project name is confirmed per §4)
  - the real GameK production callback URL, once the domain ambiguity in
    the architecture doc is resolved (not required for Preview)
- **Auth → Providers → Email**: already on (required for
  `avatark-platform-web`'s own magic-link flow) — no change needed.

**7. Google OAuth callback, if enabled**: Google Cloud Console →
Credentials → Authorized redirect URIs must point at
**Supabase**, not at GameK:
`https://hapoerzbcnagyfafqojg.supabase.co/auth/v1/callback`. This is a
single URI shared automatically by every product using this Supabase
project — no GameK-specific Google Cloud configuration is needed beyond
this one shared entry (already required if/when `avatark-platform-web`
itself enables Google OAuth). GameK's own `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED`
flag only controls button visibility client-side.

**End state of Phase A**: a GameK Preview visitor can sign in via magic
link (and Google, once enabled), land on `/auth/callback`, get a real
`auth.users` session in `avatark-platform-test`, and remain signed in
across refreshes. This is real AUTHENTICATION READY — it does not, by
itself, mean product access, entitlements, or admin roles work correctly.

## Phase B — correct GameK's canonical profile adapter

**Not performed in this task.** Full defect description and required
correction: `docs/SHARED_PROFILE_SOURCE_OF_TRUTH.md`. Summary: GameK's
`lib/account/adapters.ts` profile block must be changed to read/write
`public.profiles` (already exists, already RLS-protected, already
bootstrapped per-user) instead of `auth.users.user_metadata`. This is a
`gamek-web` code change and must happen in that repo, not here.

This phase should be completed before GameK's `/account` surface
(`NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED=true`) is promoted to production, since
promoting it while the defect is live would let real users experience the
inconsistency described in the profile-source-of-truth document.

## Phase C — apply and verify required shared-platform migrations

**Not performed in this task.** Full detail:
`docs/SHARED_PLATFORM_MIGRATION_READINESS.md`. Summary: migrations
010–016 (`organizations`, `platform_roles`, `product_access`,
`platform_audit_events`, admin RLS/grants, `organization_invitations`)
must actually be run against `avatark-platform-test` and independently
verified (schema inspection + a real two-user RLS isolation test), the
same way migrations 001–009 already were. This is a database-operations
step against the shared project, out of scope for a documentation-only
task, and requires a `PLATFORM_DATABASE_URL` that does not currently exist
in any reachable environment.

## Phase D — verify product access and admin authorization

Depends on Phase C being complete. Once migrations 010–016 are verified:

- Confirm a `product_access` row can be created for a test GameK user
  (`product_id = 'gamek'`, `status = 'active'`) and that
  `lib/identity/claims.ts`'s `loadIdentityExtras()` correctly surfaces it
  through `productAccess` in the identity contract.
- Confirm `platform_roles` correctly gates `lib/admin/authz.ts`'s
  `getAdminContext()` for a test admin user, and that a non-admin GameK
  user is correctly denied.
- Confirm `organization_members`/`organizations` behave correctly if
  GameK ever needs organization-scoped access (not required for basic
  GameK Preview sign-in; only relevant if GameK adopts organization
  concepts later).
- This verification must include GameK-originated users specifically
  (i.e., a user who signed up through GameK's own `/auth/sign-in`, not
  only through `avatark-platform-web`'s), since Phase B's defect means a
  GameK-originated user's `profiles` row is bootstrapped correctly by the
  `auth.users` trigger, but their profile *edits* — until Phase B is
  fixed — would not correctly reach it.

Do not describe GameK as PLATFORM AUTHORIZATION READY until this phase
has real, verified results, not just a passing schema migration.

## Phase E — production planning

Explicitly not started, decided, or authorized by this document:

- **Domain**: GameK's real production domain
  (`gamek.ai/flowk` vs. `gamek.avatark.ai` vs. `app.avatark.ai/gamek`) is
  unresolved — must be settled before a production Supabase redirect URL
  can be added.
- **Vercel Production env vars**: same variable names as Phase A, but
  Production-scoped, and only after Preview has a real passing
  verification run (Phase A + D both done, Phase B fixed).
- **Google OAuth in Production**: only after verified in Preview first.
- **No merge, no promotion**: this document does not authorize merging
  any `gamek-web` branch, promoting any Vercel environment, or flipping
  any Production feature flag. Those remain separate, explicit decisions
  for whoever owns `gamek-web`'s deployment.

**GameK's shared authentication must not be described as production-ready
at this time.** Phase A can proceed today; Phases B, C, and D are real,
named, unresolved prerequisites, not formalities.
