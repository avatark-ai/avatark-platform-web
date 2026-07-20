# Platform Completion Phase — Checkpoint Report

**Date:** 2026-07-20. **Branch:** `identity-account-admin/checkpoint-1-20260720` (continued from
`aab95f8`/`ef7bc17`, not a new branch). **Base:** `platform/foundation-20260714`.

Continuation of yesterday's Identity/Account/Platform Admin work
(`docs/IDENTITY_ACCOUNT_ADMIN_HANDOFF.md`). Verified before starting: `git status` clean except an
expected untracked `.claude/worktrees/` directory, HEAD at `ef7bc17`, `pnpm lint`, `npx tsc --noEmit`,
`pnpm test`, and `pnpm build` all passed clean on the existing state — nothing from yesterday was
rebuilt.

## What changed this session, by mission phase

**P1 — Product Access registry.** `lib/products/registry.ts` gained a `version` field (always `null`
today — no product publishes a real version manifest this repo can read; each product's own
`package.json` version is Next.js scaffold boilerplate, not a release marker, so surfacing it would
mislead more than an honest `null`) and a shared `SUBSCRIPTION_MODEL_NOTE` (no billing/subscription
system exists anywhere in this ecosystem yet — a uniform fact, not a per-product one). Also added an
`avatark` entry to `PLATFORM_PRODUCTS` itself — this was a real, pre-existing bug: `app/account/page.tsx`
already passes `currentProduct="avatark"` into `@avatark/account`'s product switcher, but no registry
entry with that id existed, so "you're here" could never render for the current app. Fixed, not just
extended. New `lib/products/health.ts` (live GET reachability check, 3s timeout) and
`lib/products/access.ts` (pure aggregation of `product_access`/`platform_roles` rows) back a rebuilt
`/admin/products` table showing product, URL, version, enabled, health, roles (admins-with-access
count), subscription, account link, admin link, and grant counts.

**P2 — Organizations UI.** New `organization_invitations` table (migration `016`, service-role-only
RLS, matching `platform_audit_events`' default-deny posture — rows carry email addresses). New
`/admin/organizations/[id]` detail page: members (with a role-change control), invitations (create +
revoke, real rows, no self-serve accept flow yet — deliberately not wired to a nonexistent accept
route or to email sending), a permissions reference table (explicitly labeled as a design reference,
not an enforcement guarantee — no code branches on org role beyond display), and org-scoped audit
events. List page gained search-by-name and a create-organization form. Three new admin API routes
(`POST /api/admin/organizations`, `POST`/`PATCH .../invitations`, `PATCH .../members/[userId]`), all
authz-gated via `getAdminContext()`, all writing real `platform_audit_events` rows. Also fixed a real,
separate bug found along the way: `supabase/scripts/run-platform-migrations.js`'s `MIGRATION_ORDER`
had never been updated past `009_*` even though migrations `010`–`015` (organizations/roles/product
access/audit + their RLS/grants) were added in the prior session — meaning that runner could never
actually have applied them. Extended through `016`. Still not run anywhere: no `PLATFORM_DATABASE_URL`
is configured in any environment reachable from this repo.

**P3 — Platform Users.** `/api/admin/users/lookup` now supports `?q=` substring search (returns a
bounded candidate list) alongside the existing exact `?email=` lookup, plus a new `?id=` mode using
`getUserById` for detail fetch. Detail response now includes `platformRoles` (was missing entirely)
and splits the old single merged `auditTrail` into `recentActivity` (actor = this user) and
`auditHistory` (target = this user). Page rewritten as search-first: type → candidate list → click →
full detail. Still read-only, per the mission's explicit rule for this section.

**P4 — Admin Dashboard.** Added Organizations count, a dedicated Supabase reachability stat (live
`select head` query against `organizations`, distinct from the existing env-var-presence Auth stat),
and a Recent audit events feed (last 10, linking to the full `/admin/audit` page).

**P5 — Authentication diagnostics.** `computeAuthDiagnostics` gained `magicLinkEnabled` (structural
fact — `signInWithOtp` is unconditional in `app/auth/sign-in/page.tsx`, not flag-gated),
`smtpConfigured`, `callbackImplemented` (structural — the callback route handles both code exchange
and provider-error redirects), a computed `redirectUrl` (from `NEXT_PUBLIC_PLATFORM_ORIGIN` or
`VERCEL_URL`), `callbackAllowlistStatus`, and a `warnings` array of concrete missing-configuration
messages. Settings page renders all of it, still no secret values ever shown.

**P6 — Email diagnostics.** `computeEmailDiagnostics` gained `testReadiness` (true only when key +
sender + the sending flag are *all* present — distinct from "configured"), `senderPreview`/
`senderDomain` (derived from the existing env vars, not new state), `spf`/`dkim` (split out from the
previous single `domainVerification`, both honestly `unknown`), a `templates` inventory (currently
just `invitationEmail` — an explicit, reviewable list, not derived by reflection), and a `missing`
array. Settings page shows a readiness banner, the full diagnostic table, the template list, and a
missing-configuration panel.

**P7 — Account integration.** `lib/account/adapters.ts`'s `membership.getRelationships` now reads
real `product_access` rows via the signed-in user's own RLS-permitted query (no service-role client
needed — migration `014`'s `product_access_select_own` policy already allows this) instead of
returning `[]`. `membership.getRoles` now reads real `platform_roles` data too, via a small
module-level cache warmed as a side effect of the (already-awaited) `getRelationships` call — required
because the package's own `MembershipAdapter.getRoles` type is synchronous, so there's no way to await
a fresh query inside it directly. `getSummary`'s zeroed practices/echoes fields are left as-is: those
are legitimately N/A for this platform (PrometheusK-specific concepts), not a stub.

**P8 — Quality pass.** Added `<th scope="col">` consistently across every admin table (several were
missing it pre-existing). Added `app/admin/loading.tsx` (skeleton, relevant now that `/admin/products`
does live per-product HTTP health checks) and `app/admin/error.tsx` (error boundary, using `reset` —
confirmed still supported in this Next.js 16.2.10 doc set alongside the newer `unstable_retry`). Fixed
one real ESLint violation (`react/no-unescaped-entities`) introduced by this session's own new code.

## Verification

- `pnpm lint`, `npx tsc --noEmit`, `pnpm test` (74/74 passing, up from 61 at session start — 13 new
  test cases across `lib/products/health.ts`, `lib/products/access.ts`, `lib/organizations/invitations.ts`,
  and expanded `authDiagnostics`/`emailDiagnostics` coverage), and `pnpm build` all pass clean.
- Ran `next dev` locally and curled every `/admin/*` route and the new `/api/admin/organizations` POST
  route unauthenticated: all admin pages correctly 307-redirect to `/auth/sign-in?return=...`
  (`AdminLayout`'s auth check still works), and the API route correctly returns `403 Forbidden`. No
  server-side crashes.
- Rendered every new client component (`CreateOrganizationForm`, `InviteMemberForm`,
  `RevokeInvitationButton`, `ChangeMemberRoleSelect`) and the new pure lib functions
  (`ORG_ROLE_CAPABILITY_REFERENCE`, `classifyInvitationStatus`, the extended `PLATFORM_PRODUCTS`) via a
  temporary, unauthenticated preview route (`app/admintmp`, same pattern as prior sessions'
  `app/journeypreviewtmp`/`app/rc4previewtmp` — deleted before commit, never pushed) to confirm they
  compile and render real markup, since no real signed-in admin session exists in this environment.
- **Not verified, same honest gap as yesterday:** the actual data-bearing paths (organizations list
  with real rows, product health against real product URLs from a real deployment, product_access
  reads under a genuine signed-in session) — this environment has no `SUPABASE_SERVICE_ROLE_KEY`, no
  `PLATFORM_DATABASE_URL`, and no way to create a real signed-in test user. Every admin view that needs
  cross-user data still correctly degrades to `AdminUnavailable` rather than crashing or fabricating
  data — confirmed structurally, not by exercising a live query.

## Known gaps carried forward

- No self-serve invitation-accept flow (organizations can create/revoke invitations; nothing lets an
  invitee actually join without an admin manually adding them via the role-change surface once they
  have an account).
- `run-platform-migrations.js` still cannot be executed anywhere — no `PLATFORM_DATABASE_URL` in any
  reachable environment. Migrations `001`–`016` are correct on disk and now correctly listed, but
  unverified against a live database.
- Google OAuth, Supabase SMTP, Resend domain verification, and the callback URL allowlist remain
  genuinely unknown/unconfigured from this repo alone (same gaps as yesterday — nothing here changed
  that).
- `@avatark/account` package ownership question (canonical source lives in `prometheusk-web`) — still
  undecided, not this session's call to make.

## Rules followed

No production credentials touched (none exist in this environment). No deployment attempted. No
production database mutations (no database of any kind was reachable or mutated — everything above
that reads/writes Supabase tables was verified structurally and via lint/typecheck/build/unit tests
only). No fabricated data — every gap above is reported as unknown/unavailable rather than guessed.
Push only, no PR opened (see final handoff doc for the exact push state).
