# Platform Admin Authorization

**Scope:** how `/admin` decides who gets in today, why a fresh authenticated
account is correctly locked out, and how the first platform administrator
gets bootstrapped without hand-running SQL. This is an audit + a narrow
fix, not a redesign — the authorization model itself (`platform_roles`,
migration 011) is unchanged.

## 1. What `/admin` actually checks

`app/admin/layout.tsx` wraps every page under `app/admin/**`. For a signed-in
user it calls `getAdminContext()` (`lib/admin/authz.ts`); if that returns
`null` it renders an honest 403 ("You don't have access to Platform Admin"),
not a redirect loop.

`getAdminContext()` does exactly one thing:

```ts
const { data } = await supabase
  .from('platform_roles')
  .select('role')
  .eq('user_id', user.id)
  .eq('role', 'admin')
  .maybeSingle()
```

**Answer to Q1: yes, exclusively.** No other table, claim, or capability
grants into `/admin`. In particular `capability_grants` (migration 020) is
never consulted — confirmed by reading every caller of `getAdminContext()`
(`app/admin/layout.tsx`, every route under `app/api/admin/**`) and by
`capability_grants`' own schema, which has no relationship to
`platform_roles`.

**Answer to Q2:** `platform_roles` only (migration 011:
`(user_id, role)` primary key, `role` a free-text column with `'admin'` as
its only real consumer today). This uses the normal RLS-governed client, not
the service-role client — migration 014's `platform_roles_select_own` policy
already lets a user read their own row, so no elevated client is needed just
to answer "is this caller an admin."

**Answer to Q3: yes, and that's the actual root cause of the lockout.**
Migrations 010–020 create and populate schema; none of them insert a
`platform_roles` row for anyone. There is no seed data, no
`ADMIN_EMAIL`-style env var read anywhere in this repo (confirmed by grep),
and no INSERT policy on `platform_roles` for `authenticated` (migration
014's comment is explicit: all writes to this table go through the
service-role admin client from server code — there was, until this change,
no server code path that wrote to it at all). A freshly authenticated
account — including the operator's own — has no row and is correctly denied.
This is the authorization boundary working as designed, not a bug in it;
the missing piece is a way to create the *first* row without a human running
SQL by hand.

## 2. Bootstrap path (new)

**Answer to Q4.** Added `POST /api/admin/bootstrap`
(`app/api/admin/bootstrap/route.ts`, logic in `lib/admin/bootstrap.ts`) and a
plain sign-in-only page at `/admin-bootstrap` to call it from a browser.

Deliberately **not** gated by `getAdminContext()` — the entire point is
granting the first admin, who by definition has no row yet — and
deliberately **not** a general-purpose escape hatch. Two independent checks
stand in for authorization instead:

1. **Operator-set allowlist, not client input.** The caller's authenticated
   email must exactly match `PLATFORM_ADMIN_BOOTSTRAP_EMAIL`, a server-only
   env var. A user cannot self-nominate by any request parameter — the only
   way this check passes is if an operator with environment-variable access
   configured that exact address in advance.
2. **Self-disabling.** Before granting, the route counts existing
   `platform_roles` rows with `role = 'admin'`. If any exist, it refuses
   (`already_bootstrapped`) regardless of the env var. Once one admin is
   granted anywhere, this path is permanently inert in that environment —
   it does not need to be manually removed, though removing the env var
   after first use is still good practice (see checklist below).

The insert itself goes through `lib/supabase/admin.ts`'s existing
service-role client (the only writer to `platform_roles`, per migration
014/015 — no new grant or policy was added), and records a
`platform_admin.bootstrap_grant` audit event via the existing
`recordAuditEvent()` helper, same as every other admin mutation in this
repo.

`lib/admin/bootstrap.ts` is unit-tested in isolation
(`lib/admin/bootstrap.test.ts`, 7 cases: unconfigured, wrong account,
case-insensitive match, audit-on-success, self-disable once an admin exists,
duplicate-click race treated as success, and a real insert failure
surfaced as an error) using the same fake-service-role-client style as
`lib/capabilities/adminGrants.test.ts`.

**What this does *not* do**, on purpose:

- Does not touch `capability_grants` in any way — platform admin and
  capability grants remain structurally separate concepts (mission
  constraint), confirmed by `lib/admin/bootstrap.ts` never importing or
  referencing that table.
- Does not weaken `getAdminContext()`, `/admin/layout.tsx`, or any RLS
  policy — all are byte-for-byte unchanged.
- Does not let any authenticated user grant themselves admin — only the one
  address named by the env var, only while zero admins exist.

## 3. Granting future platform admins

Two paths exist after the first admin is bootstrapped:

- **Via this bootstrap route**, only ever for the very first admin in a
  given Supabase project (it refuses once one exists).
- **Via a platform admin using the service-role client directly** (e.g. a
  short one-off script, or a future `/admin/roles` "grant admin" action if
  one gets built) — inserting `{ user_id, role: 'admin', granted_by }` into
  `platform_roles`. `app/admin/roles/page.tsx` currently only *displays*
  roles; it does not yet have a grant action. Building one is future work,
  not part of this pass, and should itself require the caller to already be
  an admin (i.e. gate it behind `getAdminContext()`, the same as every other
  admin mutation) so that only existing admins can create new ones.

## 4. Operational checklist

To bring up Platform Admin access in an environment that has none yet:

1. Confirm `SUPABASE_SERVICE_ROLE_KEY` is set for that environment (Vercel
   project settings for Preview/Production; `.env.local` for local dev).
   Every admin write path, including bootstrap, degrades to an honest 503
   without it — this is pre-existing behavior, not new.
2. Set `PLATFORM_ADMIN_BOOTSTRAP_EMAIL` to the intended first admin's exact
   sign-in email for that environment.
3. Sign in as that account, visit `/admin-bootstrap`, click "Claim Platform
   Admin."
4. Visit `/admin` to confirm access.
5. Optionally unset `PLATFORM_ADMIN_BOOTSTRAP_EMAIL` afterward — the route
   is already self-disabling, but removing the var closes the
   `not_configured` vs. `wrong_account` distinction as a (very minor)
   information leak about which email was intended.

## 5. Remaining gap

There is still no in-product UI for an existing admin to grant `admin` to a
*second* account — see §3. Until that exists, adding further admins in an
environment that already has one requires a service-role script or direct
database action outside this app, run by someone who already holds
service-role credentials (not by this bootstrap route, which refuses once
any admin exists).
