# Wave 2 — Identity & Platform Integration Report

| Owner | Status | Version | Last Reviewed |
|---|---|---|---|
| AvatarK Ecosystem Program Office (EPO) | Final | 1.0 | 2026-07-21 |

Session 7, Wave 2. Repository: `avatark-platform-web`, branch
`feature/avatar-home-registry-navigation` (same branch Wave 1 landed on).
Scope per this session's brief: audit and strengthen cross-product
identity, treating Avatar Platform as the canonical identity layer. No
feature work, no database redesign, no migration, no deployment — this is
a verification pass over Authentication, Account, Membership, Preferences,
Profile, Privacy, Product Access, and Registry integration, producing
findings and recommended contracts only.

Everything below is evidence-based: every file/table/route cited was read
directly this session, not recalled from a prior handoff document. Where
this report's findings differ from `docs/IDENTITY_ACCOUNT_ADMIN_HANDOFF.md`
(written 2026-07-20, one day prior), that document's claim is named
explicitly and the discrepancy explained — that doc decays fast by its own
admission, and one real drift was found (§2.1).

---

## 1. Current Architecture

### 1.1 Authentication

Supabase Auth is the sole auth backend for this repo, magic-link primary,
Google OAuth implemented but flagged off by default
(`NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED`, no provider credentials configured
anywhere yet). Supporting code, all read this session and unchanged from
the prior handoff's description:

- `lib/auth/callbackError.ts` — classifies expired/reused/missing-code/
  provider-cancellation callback failures into distinct user-facing
  messages.
- `lib/auth/safeReturnPath.ts` — resolves a return path against a dummy
  origin before trusting it, closing a backslash-based open-redirect
  bypass a naive `//`/`://` string check would miss.
- `lib/auth/principal.ts`, `lib/auth/resolveClientPrincipal.ts` — the
  client-side principal shape (`AccountPrincipal`) consumed by
  `app/account/page.tsx`.
- `lib/supabase/proxy.ts`, re-exported (not duplicated) via
  `lib/identity/middleware.ts` as the documented session-refresh pattern.

### 1.2 Account, Profile, Preferences, Privacy

`/account` (behind `NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED`) mounts
`@avatark/account`, a vendored dependency
(`"@avatark/account": "file:avatark-account-0.1.1.tgz"` in `package.json`,
resolved via pnpm's local store — confirmed by reading `node_modules/
@avatark/account`'s symlink target this session). Its canonical source
lives in `prometheusk-web/packages/avatar-account`, not here — a real
ownership mismatch already flagged in the prior handoff, re-confirmed, not
resolved (§4). This app wraps it with two tabs the package doesn't natively
have (Overview, Support — `app/account/page.tsx`), rather than forking the
package locally.

Every adapter in `lib/account/adapters.ts` is backed by real Postgres data,
reached through same-origin API routes (`/api/account/profile`,
`/api/account/preferences`, `/api/account/privacy`) rather than direct
client-side table access for writes:

| Concept | Table (migration) | Notes |
|---|---|---|
| Profile | `profiles` (002) | `display_name` also feeds `IdentityClaims.displayName` (§1.4) |
| Preferences | `account_preferences` (003) | theme/language/notifications/default_product — platform-only, no product-specific state, by design |
| Privacy | `privacy_settings` (004) + consent columns (008, 009) | `profile_visibility`, `discoverable_by_email`, plus `analyticsEnabled`/`personalizationEnabled`/`productCommunicationsEnabled`, opt-in by default |

Privacy deliberately does **not** mirror `@avatark/account`'s own
`PrivacySettings` contract, which hardcodes `defaultEchoVisibility`/
`defaultJourneyVisibility` — PrometheusK-specific concepts leaking into a
package meant to host any product (migration 004's own header comment,
confirmed still accurate by reading the file this session). The Platform
adapter defines what a genuine platform-level privacy concept is instead of
fabricating Echo/Journey fields it has no data for.

### 1.3 Membership & Product Access

Real tables, not stubs: `product_access` (012) and `platform_roles` (011).
`lib/account/adapters.ts`'s `membership.getRelationships`/`getRoles` and
`productAccess.list` read these directly via the anon/authenticated client,
relying on migration 014's own-row RLS policies (`product_access_select_own`,
`platform_roles_select_own`) — no service-role client needed for a user to
see their own membership. `membership.getSummary` hardcodes `planName:
'Free'` — genuinely accurate today (no billing/subscription system exists
anywhere in the ecosystem, per `NO_BILLING_SYSTEM_NOTE` in the registry
package), not a placeholder.

Cross-user aggregation (the Admin Products page's grant counts) goes
through the service-role client (`lib/products/access.ts`'s
`summarizeProductAccess`, called from `app/admin/products/page.tsx`),
correctly degrading to `null`/"unavailable" when
`SUPABASE_SERVICE_ROLE_KEY` isn't configured (true in every environment
today, confirmed by re-reading `lib/supabase/admin.ts`'s
`isAdminClientConfigured`).

Platform Admin authorization itself (`lib/admin/authz.ts`) also needs no
service-role client — a user can always read their own `platform_roles`
row under normal RLS, so the yes/no "is this user an admin" check is a
plain authenticated query.

### 1.4 Cross-product identity contract

`lib/identity/` is the provider-neutral boundary meant to be the reference
implementation other products integrate against:

- `types.ts` — `IdentityClaims` (`subjectId`, `email`, `displayName`,
  `organizationIds`, `productAccess`, `roles`) and the `IdentityProvider`
  interface (`getUser`, `verifySession`, `refreshSession`, `signOut`,
  `accountUrl`, `signOutUrl`).
- `supabaseIdentityProvider.ts` — the concrete Supabase-backed
  implementation, server-only.
- `/api/identity/me` — same-origin, session-cookie-based read for this
  repo's own client code (`useIdentity.ts` hook).
- `/api/identity/verify` — token-based verification, meant for another
  product holding an access token issued by *this* Supabase project.

This contract only verifies tokens from this repo's own Supabase project.
PrometheusK, GameK, and ArenaK each run separate Supabase projects (per
architecture decision #5, confirmed unchanged) and issue their own tokens
— this endpoint cannot verify those today, and centralizing auth or adding
a trust bridge is explicitly out of this session's scope (architecture
decisions #4/#5 forbid database/auth-backend redesign).

### 1.5 Registry integration

`packages/product-registry` is genuinely canonical, confirmed by reading
every consumer this session, not just the two Wave 1 already checked:

- `lib/products/registry.ts` (the identity/account/admin layer's product
  list) derives from `PRODUCT_REGISTRY` and layers on exactly two
  app-local facts that aren't portable ecosystem data — per-deployment
  domain env-var overrides, and this app's own admin-surface URL. It does
  **not** hold a second hardcoded product list; a stale in-repo comment
  ("this file used to hold the hardcoded product list directly") confirms
  it was migrated to derive from the package, not left duplicated.
- `lib/activities/registry.ts` (Explore/Practice/Together/Watch/Create)
  imports `resolveProductUrl` from the same file, not a third copy.
- `lib/account/adapters.ts`'s `productAccess.list` and `app/admin/
  products/page.tsx` both import `PLATFORM_PRODUCTS` from `lib/products/
  registry.ts` — one derivation chain, package → app wrapper → every
  consumer.

All nine products (`avatark`, `prometheusk`, `gamek`, `arenak`, `streamk`,
`cinemak`, `studiok`, `atlas`, `setpointk`) exist as one canonical list —
this resolves what looked, before this session's verification, like it
could be two divergent registries (the identity handoff's "9 products" vs.
Wave 1's "6 products" table). It isn't: Wave 1's table only listed the six
products relevant to its Registry/Navigation scope; the underlying data
source is single and consistent.

---

## 2. Missing Integration

### 2.1 The identity contract does not read the tables it claims don't exist — real, current drift

**This is the highest-value finding in this report.** `supabaseIdentityProvider.ts`'s
`loadClaims()` and `/api/identity/verify`'s response both hardcode:

```ts
organizationIds: [],
productAccess: [],
roles: [],
```

with a comment in `loadClaims()` stating: *"Honestly empty: no
organizations/roles/product_access tables exist yet."* That comment was
true when `lib/identity/` was written (2026-07-20, early in that session)
but is false now — migrations 010–016, landed later the same day, created
exactly those tables (`organizations`, `organization_members`,
`platform_roles`, `product_access`), and `lib/account/adapters.ts` /
`lib/admin/authz.ts` already query them directly and successfully for the
Account UI and Admin authorization. The one contract actually meant for
**other products** to consume (`/api/identity/me`, `/api/identity/verify`,
`useIdentity()`) is the one place in this repo still reporting an
honest-looking but factually wrong empty membership/role picture. Every
other consumer of this exact data (Account, Admin) was updated; the
identity contract layer was not. This isn't a design gap — it's an update
that didn't propagate to every reader of the same underlying facts.

Confirmed by reading every call site this session: no code path populates
`IdentityClaims.organizationIds`/`productAccess`/`roles` from real data
anywhere in the repo.

### 2.2 No cross-repo consumability

`lib/identity/` is server-only code inside a single Next.js app, not a
published package — a product outside this repo cannot literally import
it (documented honestly in the file's own header comment, confirmed
unchanged). Combined with §2.4 below (per-product Supabase projects), the
"canonical identity layer" claim holds only for this repo's own UI today;
no other product actually calls `/api/identity/verify` yet, and none
could authenticate against it even if they tried, per §1.4.

### 2.3 No self-serve membership path

`organization_invitations` (016) is service-role-only by design (rows
carry email addresses, same default-deny posture as the audit log) — an
admin can create/revoke an invitation, but nothing lets the invitee accept
it themselves. Confirmed this session: no `/invite/[token]`-shaped route
exists anywhere under `app/`. An invitee still needs an admin to manually
add them as an `organization_members` row once they have an account.

### 2.4 No direct write UI for platform roles or product-access grants

Confirmed by grepping this session: no code anywhere calls an insert
against `platform_roles` or `product_access` from a UI-driven flow outside
the organization-invitation path. Granting a platform role (e.g. making
someone an admin) or granting product access directly (outside an
organization) has no UI today — only the underlying tables and RLS exist.

### 2.5 `@avatark/account` package contract leaks product-specific concepts

Confirmed by re-reading `lib/account/adapters.ts`'s own comments against
the package's type contract: `MembershipAdapter.getSummary` and
`PrivacySettings` both carry PrometheusK-specific fields (Echo/Journey
visibility, practices/borrowed/echoes counts) that a platform-level host
has no data for. The Platform adapter handles this honestly (zeroed counts
that are genuinely zero, omitted fields rather than fabricated ones) but
the shape mismatch is a package-level design issue, unresolved upstream,
and every future platform-level (non-PrometheusK) consumer of
`@avatark/account` will hit the same mismatch.

### 2.6 Registry capability flags aren't wired into identity/access logic anywhere

`AvatarKProduct` (the canonical registry type) carries `requiresAuth`,
`supportsOrganizations`, and eleven other capability flags — real,
canonical data. Confirmed by grepping this session: nothing in
`lib/identity/`, `lib/account/`, or `lib/admin/` reads any of them. Product
access grants aren't gated by `requiresAuth`; no membership check is
cross-referenced against `supportsOrganizations`. Not a bug today (no
product currently needs the gate), but it means the registry's own
capability contract and the identity/access code are two systems that
happen not to have collided yet, not two systems that integrate.

### 2.7 Carried forward, unchanged since the prior handoff (re-verified, not re-discovered)

- GameK's `lib/prometheusk/auth.ts` (a separate repo) decodes a bearer JWT
  and checks only `exp`, never the signature — forgeable `sub`/email. Out
  of this repo's authority to fix; directly relevant here because a forged
  GameK-side claim would misrepresent identity to anything that trusted
  it, which is precisely the cross-product-identity boundary this report
  audits.
- No environment has a `SUPABASE_SERVICE_ROLE_KEY` or `PLATFORM_DATABASE_URL`
  configured — every cross-user admin read/write path remains structurally
  correct but operationally unverified against a live database.

---

## 3. Recommended Contracts

1. **Populate the real claims in `loadClaims()` and `/api/identity/verify`.**
   This closes §2.1 without any schema or architecture change — the three
   queries needed (`organization_members` by `user_id`, `product_access`
   where `status = 'active'`, `platform_roles` by `user_id`) are the exact
   queries `lib/account/adapters.ts` and `lib/admin/authz.ts` already run
   successfully in this same repo. This is the single most valuable fix
   available to "strengthen cross-product identity" and is deliberately
   **not implemented in this session** (feature work is out of Wave 2's
   scope) — flagged here as the top candidate for the next implementation
   wave.
2. **Version the `/api/identity/verify` response shape** (e.g. `{ version:
   1, ...claims }`) before any second product actually starts consuming
   it. Today there are zero external callers, which is exactly the window
   in which adding a version field is free and later impossible to
   backfill silently.
3. **Write down, not just code, what "product access" means across
   repos** — the `status` vocabulary (`active` exists; `revoked`/
   `pending` are referenced informally in comments but never enumerated
   anywhere), and that this repo is the sole authority for granting it.
   Without this, a future product integration will invent its own status
   enum rather than match this one.
4. **A short, standalone identity contract spec** (e.g.
   `docs/ecosystem/IDENTITY_CONTRACT_V1.md`) describing the `/api/identity/
   verify` request/response shape and its Supabase-project-scoped
   limitation (§1.4/§2.2), written so it could be handed to another
   product's team without giving them this repo's source. Today the only
   documentation of this contract is inline comments in `lib/identity/
   types.ts` — accurate, but not discoverable by someone outside this
   repo.

None of the above were implemented this session — recommendations only,
per this Wave's explicit no-feature-work constraint.

---

## 4. Deferred Items

- **Implementing recommendation §3.1** (populating real claims) — the
  clearest, lowest-risk next step; deliberately left to a properly scoped
  implementation session rather than done inline here.
- **Centralizing Supabase auth / a cross-repo trust bridge** for `/api/
  identity/verify` — blocked on architecture decisions #4/#5 (per-product
  Supabase stays; no database merge), which this session does not
  revisit.
- **`@avatark/account` package ownership migration** (§1.2, §2.5) — a
  cross-repo decision, not fixable from this repo alone.
- **Self-serve invitation acceptance** and **direct platform-role/
  product-access grant UI** (§2.3, §2.4) — real feature work, out of
  Wave 2's scope by the session's own constraints.
- **GameK JWT signature-verification gap** (§2.7) — belongs to `gamek-web`'s
  owner, flagged again here (third time across sessions) since it remains
  unfixed and bears directly on cross-product identity integrity.
- **Wiring registry capability flags into identity/access logic** (§2.6)
  — no product currently forces the issue; revisit once one does.
- Confirming real public domains for StudioK/Atlas/CinemaK/SetpointK
  (carried from Wave 1, orthogonal to identity but still open in the same
  registry this report also audited).

---

## Quality gates run this session

- `npx tsc --noEmit` — clean, exit 0.
- `npx eslint .` — clean, exit 0.
- `npm test` — 100/100 passing, no test added, modified, or skipped this
  session (this was a read-only audit).
- `npm run build` — succeeded, 33 routes, same count as Wave 1's baseline,
  no unexpected route change.

No file under `lib/`, `app/`, or `packages/` was modified this session.
This report and `SESSION7_CHECKPOINT.md` are the only new files.
