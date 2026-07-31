# AvatarK Supabase Environment Matrix

Status: environment/contract documentation only, produced from direct
inspection of `.env*` files, `lib/supabase/*`, migration files, and git
history in `avatark-platform-web`, `prometheusk-web`, and `gamek-web`. No
environment variable was changed, no Supabase project was created or
reconfigured.

## 1. Known Supabase organization projects

Per the mission brief, the organization contains: `avatark-platform-test`,
`PrometheusK`, `prometheusk-test`, `arenak-prod`, `arenak-test`. This
document does not add or remove projects from that list.

## 2. Project-ref evidence chain

| Project (org name) | Project ref | Evidence |
|---|---|---|
| `avatark-platform-test` | `hapoerzbcnagyfafqojg` | (a) `avatark-platform-web/.env.local`'s `NEXT_PUBLIC_SUPABASE_URL` resolves to this ref today. (b) `docs/ONBOARDING_ROUTE_CONTRACT.md:59` names this ref explicitly as "platform-web's own Supabase project," distinct from a legacy project. (c) Commit `f28d8a3` ("Migrations 001-007: Applied, Replayed, and Verified against avatark-platform-test") and commit `c3a6dfb` both state migrations were run and verified against a database named `avatark-platform-test` in the same session that was actively connected to this ref. (d) `supabase/scripts/run-platform-migrations.js:14-21` hardcodes a `FORBIDDEN_PROJECT_REFS` safety list containing every *other* known project ref (see below) with the explicit stated intent of refusing to run "against any known non-platform-test project" — this ref is the one deliberately left out of that list. |
| PrometheusK production | `bxerfgwrtwowzgahdgrj` | `prometheusk-web/lib/testing/db-safety.ts:11,16` hardcodes this exact ref as `KNOWN_PRODUCTION_PROJECT_REF`, used as a test-safety guard. Also listed in `run-platform-migrations.js:18` as forbidden, labeled "PrometheusK production." Also the value of `prometheusk-web/.env.local`'s `NEXT_PUBLIC_SUPABASE_URL`. |
| `prometheusk-test` | `ibgalrzhwnitbgrqoesu` | `prometheusk-web/.env.test.example` documents this ref's project explicitly as "your dedicated `prometheusk-test` Supabase project." Also listed in `run-platform-migrations.js:19` as forbidden, labeled "prometheusk-test." |
| legacy AvatarK production (pre-`avatark-platform-web`) | `qvwgrupvaetzcxlizccu` | `docs/ONBOARDING_ROUTE_CONTRACT.md:59` and `run-platform-migrations.js:20` ("legacy avatark-web production"). Not one of the five org projects named in the current mission brief — kept here only because it appears in the same evidence and must not be confused with `avatark-platform-test`. |
| `arenak-prod` / `arenak-test` | not determined | No `arenak-web` repository exists in this workspace, and neither ref appears in any file inspected across the three repos in scope. Cannot be verified from code; would require direct Supabase dashboard access. |

**Caveat**: no Supabase dashboard/API access was available in this
environment (no Supabase MCP/CLI tool present). The `avatark-platform-test`
identification above is inferred with high confidence from independent,
converging in-repo evidence (commit messages plus the migration runner's
own safety-list design), not confirmed by directly querying the Supabase
organization's project list. Recommend a one-time confirmation against the
dashboard by whoever holds org access, but this does not block the work
in `docs/GAMEK_SHARED_PLATFORM_SETUP.md`.

## 3. Per-repo environment variable contracts (as found)

### avatark-platform-web (this repo)

| Variable | Where read | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/client.ts:7`, `server.ts:12`, `proxy.ts:12`, `lib/supabase/admin.ts:18`, `app/api/identity/verify/route.ts:25` | Currently set to the `hapoerzbcnagyfafqojg` project in `.env.local`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same files, `:8`/`:13`/`:13`/`:26` | Public, RLS-scoped. |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts:14,19` | Server-only. Not currently set in any environment reachable from this repo; every admin surface that needs it degrades to an explicit "unavailable" state rather than failing unsafely. |
| `NEXT_PUBLIC_PLATFORM_ORIGIN` | `lib/identity/supabaseIdentityProvider.ts:14` | Same-origin (empty) until a hostname split happens. |
| `PLATFORM_DATABASE_URL` | `supabase/scripts/run-platform-migrations.js:24` | Not set in any environment reachable from this repo — see `docs/SHARED_PLATFORM_MIGRATION_READINESS.md`. |
| `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED` | `lib/admin/authDiagnostics.ts:35` only | Dead as a gate: `app/auth/sign-in/page.tsx` no longer reads this flag — it calls `lib/auth/authProviderCapabilities.ts`, which asks Supabase's own `/auth/v1/settings` at runtime. Confirmed against the live `avatark-platform-test` project (`hapoerzbcnagyfafqojg`): Google provider is **not enabled**, so the button is correctly hidden. See `docs/GOOGLE_OAUTH_DEPLOYMENT_CHECKLIST.md`. |
| `ONBOARDING_RECEIPT_SECRET` | RC5 handoff (see `docs/RC5_HANDOFF_CONTRACT.md`) | Unrelated to the shared-identity work in this document; listed for completeness. |

Callback route: `app/auth/callback/route.ts` (`GET`, exchanges `code` via
`supabase.auth.exchangeCodeForSession`, honors a `return` param through
`safeReturnPath`).

### gamek-web

| Variable | Where read | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/client.ts`, `server.ts`, `proxy.ts`, `app/admin/page.tsx`, `app/admin/integration-health/page.tsx` | **Blank** in this repo's `.env.example`; **absent entirely** from `.env.local`. Zero own Supabase project — every code path assumes it will be pointed at the same project `avatark-platform-web` uses. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same files | Same status — blank/absent. |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Never referenced anywhere in this repo (confirmed by grep) — GameK's code has no service-role code path at all. |
| `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED` | `components/gamek/SignInForm.tsx` | Same flag name/semantics as `avatark-platform-web`. |
| `NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED` | `components/gamek/AccountClient.tsx` | Same flag name/semantics as `avatark-platform-web`. |
| `PREVIEW_MASTER_PASSWORD`, `PREVIEW_ACCESS_CODES`, `PREVIEW_SESSION_SECRET`, `PREVIEW_SESSION_TTL` | `middleware.ts`, `lib/session.ts` | Unrelated "Layer 1" private-preview gate — independent of AvatarK identity, must not be relaxed as part of any shared-auth work. |
| `NEXT_PUBLIC_SITE_URL` | `.env.local`, `vercel.json` | Currently `https://gamek.ai/flowk` — see the domain-ambiguity note in the architecture doc. |

Callback route: `app/auth/callback/route.ts` — structurally identical
pattern to `avatark-platform-web`'s (same code shape, same query params),
currently a no-op because the two Supabase vars above are unset.

### prometheusk-web

| Variable | Where read | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/auth.ts:21`, `lib/supabase/client.ts:12` | Set to `bxerfgwrtwowzgahdgrj` (PrometheusK's own production-labeled project) in `.env.local`. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same files | **Different variable name** from the other two repos' `NEXT_PUBLIC_SUPABASE_ANON_KEY` — this repo uses Supabase's newer "publishable key" naming throughout. Not a blocker today since PrometheusK is not a consumer of the shared project, but a real naming inconsistency if consolidation is ever considered. |
| `TEST_SUPABASE_URL` / `TEST_SUPABASE_PUBLISHABLE_KEY` / `TEST_DATABASE_URL` | `lib/testing/db-safety.ts:23-24`, integration tests | Point at `prometheusk-test` (`ibgalrzhwnitbgrqoesu`). |
| `TEST_SUPABASE_SERVICE_ROLE_KEY` | integration tests only | Test-only service-role usage, scoped to `prometheusk-test`. |
| `ONBOARDING_RECEIPT_SECRET`, `NEXT_PUBLIC_GAMEK_ALLOWED_RETURN_ORIGINS`, `GAMEK_COMPLETION_API_SECRET` | RC5/GameK handoff contracts | Signed receipts and shared secrets, not identity/session credentials — see architecture doc §5. |

No `/auth/callback` route and no `middleware.ts` exist in this repo — both
magic-link and Google OAuth rely on the Supabase JS SDK's client-side
session detection on `/login` (`app/login/page.tsx:25,42`), not a
server-side exchange. This is a different, self-contained pattern from
the other two repos' shared `/auth/callback` design, consistent with
PrometheusK never being a consumer of the shared project.

## 4. Naming

**Decision for this task: retain `avatark-platform-test` as the canonical
technical name in all documentation.** No rename is performed or
recommended as an action item here.

Reasoning:
- The existing code, migration system (`supabase/migrations/`,
  `supabase/scripts/run-platform-migrations.js`), and every doc/commit
  message touching this project already call it "AvatarK Platform" or
  `avatark-platform-test` consistently — changing the name now would
  contradict the repo's own settled convention for no functional benefit.
- The schema already contains organizations, roles, product access, audit,
  and invitations — more than identity alone — so a name that implied
  "identity only" would be inaccurate. `avatark-platform-test` (vs. a
  bare `avatark-test`) correctly signals "platform," matching actual
  scope.
- Renaming is a Supabase dashboard display-name action, not something
  required to connect GameK to the project. Bundling a rename with the
  profile-source-of-truth correction and the migration-verification work
  (both real, higher-priority gaps) would only add risk for no gain.

Optional, non-binding future alias for human-facing documentation only:
**"AvatarK Shared Platform — Test"**. This is a documentation label
suggestion, not a Supabase project rename, and is not applied anywhere in
this task.

A future production project, if and when created, should follow the same
convention: `avatark-platform-prod`. This document does not create that
project.

## 5. Migration ledger status

See `docs/SHARED_PLATFORM_MIGRATION_READINESS.md` for the full, evidenced
breakdown of which migrations are applied/verified vs. authored-only.
