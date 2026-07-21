# Wave 2A — Identity Contract Implementation

| Owner | Status | Version | Last Reviewed |
|---|---|---|---|
| AvatarK Ecosystem Program Office (EPO) | Final | 1.0 | 2026-07-21 |

Session 7A, Wave 2A. Repository: `avatark-platform-web`, branch
`feature/avatar-home-registry-navigation` (same branch Waves 1 and 2
landed on). Scope: implement **Recommendation #1 only** from
`docs/ecosystem/WAVE2_IDENTITY_REPORT.md` §3 — populate the cross-product
identity contract's `organizationIds`, `productAccess`, and `roles` fields
with real data, reusing the existing table/RLS pattern rather than
inventing a new one. No architecture redesign, no database merge, no auth
centralization, no new tables, no migrations, no RLS changes, no API
versioning, no cross-product trust bridge — all explicitly out of scope
per this session's own constraints, and none were touched.

---

## What was read first

`docs/ecosystem/WAVE2_IDENTITY_REPORT.md` and `docs/ecosystem/
SESSION7_CHECKPOINT.md` (both from the prior session), then the exact
files the report's §3.1 recommendation names: `lib/identity/types.ts`,
`lib/identity/supabaseIdentityProvider.ts`, `app/api/identity/me/
route.ts`, `app/api/identity/verify/route.ts`, `lib/account/adapters.ts`
(for the existing `platform_roles`/`product_access` query shapes), and
`lib/admin/authz.ts` (for the existing `platform_roles` RLS-scoped read
pattern), plus migration 014 (`organization_members_select_own`,
`platform_roles_select_own`, `product_access_select_own`) to confirm which
RLS policies already make these reads legal without a service-role client.

## What changed

1. **`lib/identity/claims.ts` (new)** — `loadIdentityExtras(supabase,
   userId)`, a single function reading `organization_members`,
   `product_access` (filtered to `status = 'active'`), and `platform_roles`
   for one user, using the exact own-row query shapes already in
   `lib/account/adapters.ts`'s `fetchAndCachePlatformRoles`/
   `getRelationships`. Takes the caller's own Supabase client as a
   parameter rather than constructing one itself, so it works unmodified
   against either a cookie-backed server client or a bearer-token-scoped
   client (see #3), and so it's directly unit-testable without a live
   database (see Verify, below). This is the one new piece of logic this
   session adds; both call sites below share it instead of each
   reimplementing the same three queries.
2. **`lib/identity/supabaseIdentityProvider.ts`** — `loadClaims()` now
   calls `loadIdentityExtras(supabase, user.id)` alongside its existing
   profile lookup (in parallel, via `Promise.all`) instead of hardcoding
   `organizationIds: [], productAccess: [], roles: []`. This is what backs
   both `/api/identity/me` and `useIdentity()` — no route-level change was
   needed there; they already call through to `loadClaims()`.
3. **`app/api/identity/verify/route.ts`** — after verifying the caller's
   bearer token (unchanged), a second Supabase client is created scoped to
   that same token via an `Authorization: Bearer <token>` header, so
   `organization_members`/`product_access`/`platform_roles`'s own-row RLS
   policies resolve `auth.uid()` to the verified user — the same policies
   `lib/account/adapters.ts` already relies on, reached through the anon
   key that route already had, not a service-role client. `loadIdentityExtras`
   is then called on that scoped client, replacing the same three
   hardcoded empty arrays.
4. **`lib/identity/types.ts`** — updated the header comment, which
   previously said `organizationIds`/`productAccess`/`roles` "resolve to
   `[]` until the organizations/roles/product-access tables exist." That
   was stale (the tables have existed since migrations 010–016) and is
   corrected to describe the real backing implementation.
5. **`lib/identity/claims.test.ts` (new)** + **`package.json`**'s `test`
   script updated to include it (this repo's test runner takes an explicit
   file list, not a glob).

No file under `lib/account/`, `lib/admin/`, or any migration was touched —
the shared queries were extracted into a new function that both identity
call sites use; the account/admin code that originated those query shapes
was left exactly as it was, per this session's "reuse, don't duplicate"
instruction applying to the new code being written, not a retroactive
refactor of working code outside this session's stated scope.

## Why the verify route needed a second client, not just a status check

`/api/identity/verify`'s existing client (constructed with only the anon
key, no session) can verify an arbitrary bearer token via
`supabase.auth.getUser(accessToken)`, but a Postgres query against that
same anon-key client has no `auth.uid()` context — RLS would silently
return zero rows regardless of a `.eq('user_id', ...)` filter, since
Postgres RLS evaluates `auth.uid()` from the request's own JWT, not from
an application-level filter value. Passing the verified token through as
an `Authorization` header on a second client makes subsequent `.from()`
reads carry that JWT, so `auth.uid()` resolves correctly and the existing
own-row policies (migration 014, unchanged) apply exactly as they do for
this repo's own signed-in users. No RLS policy was added or modified to
make this work — the policies already permit exactly this read for the
row's own owner.

## Verify

- `npx tsc --noEmit` — clean, exit 0.
- `npx eslint .` — clean, exit 0.
- `npm test` — **102/102 passing** (100 before this session, +2 new).
- `npm run build` — succeeded, 33 routes, unchanged from Wave 1/2's
  baseline.

**Confirming populated claims for a user with memberships and roles**: no
environment reachable from this session has ever run the platform
migrations against a live Postgres instance (a long-standing, repeatedly
documented limitation — see `docs/IDENTITY_ACCOUNT_ADMIN_HANDOFF.md`), and
no authenticated browser session exists in this headless environment
either, so a live end-to-end request against a running server was not
possible here. `loadIdentityExtras` was deliberately written to take its
Supabase client as a parameter specifically so this could be verified
another, still-honest way: `lib/identity/claims.test.ts` runs the real
function against fixture rows shaped exactly like `organization_members`/
`product_access`/`platform_roles`, and asserts:

- a user with one organization row, one *active* product-access row, one
  *revoked* product-access row, and one platform role gets back
  `organizationIds: ['org-1']`, `productAccess: ['prometheusk']` (the
  revoked row correctly excluded by the `status = 'active'` filter, not by
  post-filtering in JS), and `roles: ['admin']` — genuinely populated, not
  empty;
- a user with no rows anywhere gets back `{ organizationIds: [],
  productAccess: [], roles: [] }` — still an honest empty state, now for
  the right reason (no rows) rather than the old reason (the code never
  looked).

This is real execution of the real, unmodified function that both
`/api/identity/me` and `/api/identity/verify` call — not a mock of the
outcome — and it is what this session used in place of a live database
check that wasn't reachable.

## What was explicitly not done

- No new table, column, or migration.
- No RLS policy added, removed, or modified — migration 014's existing
  own-row policies are what make both call sites' reads legal.
- No centralization of auth, no cross-repo trust bridge: `/api/identity/
  verify` still only verifies tokens issued by this repo's own Supabase
  project, exactly as before (Wave 2 report §1.4/§2.2, unchanged and
  out of this session's scope by explicit instruction).
- No API versioning added to `/api/identity/verify`'s response shape
  (Wave 2 report's recommendation #2) — deferred, not this session's task.
- `lib/account/adapters.ts` and `lib/admin/authz.ts` were read for their
  query shapes but not modified — they already worked correctly before
  this session and still do; nothing about their behavior changed.
- Live/production verification against a real signed-in user with real
  memberships remains undone, for the same structural reason it's been
  undone across every prior session in this repo: no environment here has
  a migrated, reachable database or a real browser session.

## What remains open

Everything the Wave 2 report deferred except recommendation #1 (now
implemented): recommendation #2 (versioning `/api/identity/verify`'s
response shape), #3 (a written status vocabulary for product access), #4
(a standalone identity contract spec doc for a cross-repo audience), plus
every item in that report's own §4 (Deferred Items) — self-serve
invitation acceptance, direct platform-role/product-access grant UI,
`@avatark/account` package ownership, the GameK JWT-verification gap,
wiring registry capability flags into identity/access logic, and
confirming real domains for StudioK/Atlas/CinemaK/SetpointK. None of these
were in this session's scope.
