# Identity / Account / Platform Admin — Handoff & Current State

**As of:** 2026-07-20 (second session, "Platform Completion Phase"), branch
`identity-account-admin/checkpoint-1-20260720` (same branch continued, not
a new one), pushed to origin. Base branch: `platform/foundation-20260714`
(this repo has no `main` — that branch is the trunk). Not merged.

This session's mission: finish out Product Access, Organizations, Platform
Users, the Admin Dashboard, Auth/Email diagnostics, Account's consumption
of the real product registry, and a quality pass — see
`docs/PLATFORM_COMPLETION_CHECKPOINT.md` for the detailed per-phase record
of what changed and how it was verified. This document stays the
current-state summary; that one is this session's specific checkpoint
report.

Prior session's mission brief (identity, auth, account, product access,
organizations, roles, permissions, privacy, and platform admin — the
shared layer every AvatarK product integrates with once) is still the
umbrella this work sits under.

## How to tell what state this is in when you come back

```
git log --oneline platform/foundation-20260714..identity-account-admin/checkpoint-1-20260720
pnpm lint && npx tsc --noEmit && pnpm test && pnpm build
```

All four passed clean as of this session's final commit (74/74 tests, up
from 61). If they don't, something changed — trust the commands over this
document.

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
- **Platform Admin** (`/admin`): Dashboard (now includes organizations
  count, a live Supabase reachability check, and a recent-audit-events
  feed), Users (search + email lookup, read-only, writes a real audit
  event, now shows platform roles and splits recent-activity vs
  audit-history), Organizations (list gained search; a new `/admin/
  organizations/[id]` detail page adds members with role-change, real
  invitations with create/revoke, a permissions design-reference table,
  and org-scoped audit), Products (now shows version/enabled/live health/
  admins-with-access/subscription-model-note alongside URL and grants),
  Roles, Audit, Settings (Email/Auth diagnostics — both substantially
  expanded this round, see `docs/PLATFORM_COMPLETION_CHECKPOINT.md` —
  Environment health, Support). Authz via `lib/admin/authz.ts` checking a
  `platform_roles` row under normal RLS. Every view needing cross-user
  data degrades to an explicit "unavailable — SUPABASE_SERVICE_ROLE_KEY
  not configured" state instead of crashing or fabricating data — **true
  in every environment today**, since no service-role key exists in this
  repo's env anywhere yet. `/admin` now also has `loading.tsx`/`error.tsx`.
- **Schema**: migrations 010–016 add `organizations`/`organization_members`,
  `platform_roles`, `product_access`, `platform_audit_events`, and (new
  this round) `organization_invitations` (service-role-only, same
  default-deny posture as the audit table — rows carry email addresses).
  RLS is read-only and owner/member-scoped for `authenticated`; almost all
  writes still go through the service-role admin client
  (`lib/supabase/admin.ts`) from Platform Admin server code. One narrow
  exception now exists on the read side: `lib/account/adapters.ts` reads
  `product_access`/`platform_roles` directly with the anon/authenticated
  client, relying on the existing `_select_own` RLS policies (no new
  policy needed). Admin *write* flows (create org, invite/revoke, change
  a member's role) are now real too — see Organizations above — still
  authz-gated and audit-logged, not the free-for-all "no unsafe direct
  auth mutation" language from last round meant to forbid. Also fixed a
  real bug: `supabase/scripts/run-platform-migrations.js`'s migration list
  had never been updated past `009_*`, so it could never have actually
  applied 010–015 even if pointed at a real database. Fixed, still
  unexercised — no `PLATFORM_DATABASE_URL` exists in any reachable
  environment.
- **Product registry** (`lib/products/registry.ts`): all 9 products now,
  including `avatark` itself (PrometheusK, GameK, ArenaK, StreamK,
  CinemaK, StudioK, Atlas, SetpointK, AvatarK). Adding `avatark` fixed a
  real latent bug — `app/account/page.tsx` already passed
  `currentProduct="avatark"` to the product switcher, but no matching
  registry entry existed for it to resolve against. Only PrometheusK,
  GameK, and AvatarK itself have real URLs (GameK's confirmed via the
  cross-repo audit of `gamek-web`'s `site.config.ts`, not guessed) — the
  rest are `null` until confirmed. `version` is `null` for every product
  (no product publishes a real version manifest this repo can read).
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

- **Resolved this round** (kept here, struck through in spirit, so the
  next session doesn't have to re-discover it): `lib/account/adapters.ts`'s
  `productAccess.list` (already real via the registry) and `membership`
  (`getRelationships`/`getRoles`, now real via `product_access`/
  `platform_roles`) are no longer static stubs. `getSummary`'s zeroed
  practices/echoes fields are intentionally not "fixed" — those are
  PrometheusK-specific concepts this platform genuinely has no data for.
- **Resolved this round**: admin write flows now exist for organizations
  (create org, invite/revoke a member, change a member's role) — all
  authz-gated, all audit-logged. Still no write UI for granting a
  *platform* role or a *product access* grant directly (only organization-
  scoped writes were built this round) — that's the next natural slice.
- No self-serve invitation-accept flow — an invitee still needs an admin
  to manually add them as a member once they have an account. The
  invitation row (email/role/status/expiry) is real and revocable, but
  nothing lets the invitee act on it themselves yet.
- Google OAuth is unverified end-to-end (no real provider credentials in
  this environment). Do not claim it works until tested against real
  Supabase Google provider config.
- `/api/identity/verify` only verifies tokens issued by this repo's own
  Supabase project. PrometheusK, GameK, and ArenaK each run separate
  Supabase projects (confirmed via cross-repo audit) — this does not make
  them interoperate. Centralizing identity, or adding a trust bridge, is an
  explicit later decision, not something this checkpoint solved.
- No environment has ever actually run `supabase/scripts/run-platform-
  migrations.js` — no `PLATFORM_DATABASE_URL` exists anywhere reachable
  from this repo. Migrations 001–016 are correct and now correctly listed
  in the runner, but genuinely unverified against a live database.

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

1. Direct platform-role and product-access write UI (grant/revoke a
   platform role, grant/revoke product access outside the org-invitation
   path) — organization-scoped writes exist now, these two don't yet.
2. Self-serve invitation acceptance: a real `/invite/[token]` (or similar)
   flow, plus wiring `lib/email/templates.ts`'s `invitationEmail` through
   once `EMAIL_SENDING_ENABLED` is on — deliberately not built this round
   to avoid emailing a link to a route that didn't exist.
3. Get a real `PLATFORM_DATABASE_URL` (or equivalent test project) so
   `run-platform-migrations.js` can actually be run at least once, and the
   whole admin data-reading surface can be exercised against real rows
   instead of only structurally verified.
4. Decide the `@avatark/account` package ownership question.
5. Flag the GameK JWT-verification gap to its owner.
6. Package `lib/identity/` for actual cross-repo consumption once a
   workspace-package structure exists.
7. Confirm real public URLs for ArenaK/StreamK/CinemaK/StudioK/Atlas/
   SetpointK so their registry entries stop being `null`.
8. Apply migration `020_capability_grants.sql` (corrected) to
   `avatark-platform-test` per `docs/AVATARK_PLATFORM_TEST_MIGRATION_020_RUNBOOK.md`,
   then run that runbook's §13 application-verification steps against a
   real signed-in session — see the 2026-08-02 addendum below.

## 2026-08-02 addendum — migrations 010–019 applied; capability grants (020) redesigned, not yet applied

Since the "As of" date above, and independent of this document's other
still-open gaps:

- **Migrations 010–019 are now confirmed applied to `avatark-platform-test`**
  (010–018 via a manual SQL runbook,
  `docs/AVATARK_PLATFORM_TEST_MIGRATION_010_018_RUNBOOK.md`; 019, avatar
  storage, applied in a separate later pass) — closing the specific
  "010–016 genuinely unverified against a live database" gap named earlier
  in this document for that range. Priority 3 above (`run-platform-
  migrations.js` itself has still never actually been executed against any
  real project) remains open and unrelated — these migrations were applied
  by hand-run SQL, not via the runner script.
- **`020_capability_grants.sql`, the next migration in sequence, was found
  to have a genuine schema defect before ever being applied anywhere**:
  its original composite primary key (`PRIMARY KEY (user_id, capability,
  scope_type, scope_id)`) made `scope_id` implicitly `NOT NULL`, but the
  file's own design required `scope_id = NULL` for platform-scoped grants
  — a platform-scoped row could never have been inserted. Corrected in
  place (surrogate `uuid` primary key + an explicit CHECK constraint doing
  the actual data-shape enforcement) — confirmed against
  `avatark-platform-test`'s own `schema_migrations` table that the
  original was never applied, so no ledger/data risk existed in correcting
  it directly. Full audit, corrected schema, and real verification against
  a disposable Postgres 16 instance (clean apply, idempotency, every
  constraint/uniqueness/RLS/grant scenario) live in
  `docs/AVATARK_PLATFORM_TEST_MIGRATION_020_RUNBOOK.md`. **020 has not been
  applied to `avatark-platform-test` or anywhere else** — this remains a
  manual SQL step, same as 010–018 were before their own runbook was
  executed.
- **A real capability resolver, admin grant/revoke API, and Access-tab/
  diagnostics wiring were built against the corrected schema**
  (`lib/capabilities/`, `app/api/admin/capabilities/**`), default-denying
  on every failure mode (no grant, revoked, expired, malformed scope,
  unknown capability, adapter error/missing table) and covered by 46 new
  unit/integration tests, all passing. This is genuinely wired into
  `packages/account/src/ui/AccessTab.tsx` (via
  `lib/products/accessModel.ts`) and `app/admin/page.tsx`'s diagnostics —
  but since `020` itself is not yet applied anywhere, none of this has
  been exercised against a real `capability_grants` row in any real
  environment. Today, every real caller sees the same honest empty state
  it saw before this work (no capabilities recorded yet) — this is by
  design, not a regression.
- **This does not change any `READY_FOR_PRODUCT_ADOPTION` verdict.**
  Capability grants are a narrow, forward-compatible layer — no existing
  RC1/RC1.1 mission requirement is gated on them, and neither release-gate
  document's blocker (real authenticated-browser-session verification) is
  affected by this work.
