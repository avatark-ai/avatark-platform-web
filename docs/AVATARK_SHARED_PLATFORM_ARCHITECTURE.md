# AvatarK Shared Platform Architecture

Status: architecture documentation only, produced from direct code inspection of
`avatark-platform-web` (this repo), `~/workspace/prometheusk-web`, and
`~/workspace/gamek-web`. No code was changed to produce this document. No
Supabase project was created, renamed, or reconfigured.

## 1. The canonical decision

**`avatark-platform-test` is the shared, non-production AvatarK identity and
platform-services Supabase project.** It is not a new project — it is the
Supabase project this repo (`avatark-platform-web`) already runs against
today (see `docs/AVATARK_SUPABASE_ENVIRONMENT_MATRIX.md` for the exact
project ref and the evidence tying that ref to this name).

- **PrometheusK** (`PrometheusK` prod, `prometheusk-test`) remains a
  separate, self-contained Supabase project for both its own identity
  session handling and all of its product data. It is not a consumer of
  `avatark-platform-test` today, by design — confirmed by direct code
  inspection, not assumed.
- **ArenaK** (`arenak-prod`, `arenak-test`) — no `arenak-web` repository
  exists anywhere in this workspace. Its Supabase projects exist in the
  organization but this document makes no claim about their current
  contents; the boundary below applies prospectively, the same as for
  every other not-yet-built product.
- **GameK** must not create or use a separate identity provider. It is
  being connected to `avatark-platform-test` (see
  `docs/GAMEK_SHARED_PLATFORM_SETUP.md`), not given its own Supabase
  project.

## 2. Two readiness levels — do not conflate them

This distinction matters because, as of this document, one level is real
and verified and the other is authored but unverified. See
`docs/SHARED_PLATFORM_MIGRATION_READINESS.md` for the full evidence.

### AUTHENTICATION READY
Supabase Auth connection, magic-link + Google OAuth sign-in, the
`/auth/callback` exchange, session refresh, sign-out, and a canonical
`auth.users` identity (id + email). Backed by migrations 001, 005, 006,
007, 009 (`profiles`/`account_preferences`/`privacy_settings` bootstrap +
RLS + grants) — **confirmed applied and verified** against
`avatark-platform-test`.

### PLATFORM AUTHORIZATION READY
Canonical `profiles` used consistently by every consumer, `platform_roles`,
`product_access`, `organizations`/`organization_members`,
`organization_invitations`, and admin authorization
(`lib/admin/authz.ts`). Backed by migrations 010–016 — **authored,
correctly listed in the migration runner, but never applied or verified
against any live database, including `avatark-platform-test` itself.**

A product can be AUTHENTICATION READY (a user can sign in and get a real
`auth.users` identity) while genuinely not being PLATFORM AUTHORIZATION
READY (entitlement/role/org data behind that identity is unverified or, in
GameK's specific case, partially unreachable due to the profile-adapter
defect in §4). Do not describe GameK as "ready" without naming which of
the two levels that claim refers to.

## 3. What belongs inside the shared platform project

Confirmed present in `avatark-platform-test` today (table name — migration
— readiness level):

| Concern | Table(s) | Migration | Readiness |
|---|---|---|---|
| Supabase Auth users/identities | `auth.users` (Supabase-managed) | n/a | AUTHENTICATION READY |
| Canonical profile | `profiles` | 002, extended 008 n/a (privacy, not profile) | AUTHENTICATION READY (table + RLS + bootstrap trigger verified); **not yet honored by every consumer — see §4** |
| Account preferences | `account_preferences` | 003 | AUTHENTICATION READY |
| Privacy settings + consent | `privacy_settings` (incl. `product_communications_enabled`/`personalization_enabled`/`analytics_enabled`) | 004, 008, 009 | AUTHENTICATION READY |
| Organizations + memberships | `organizations`, `organization_members` | 010 | PLATFORM AUTHORIZATION — authored, unverified |
| Roles / administrative grants | `platform_roles` | 011 | PLATFORM AUTHORIZATION — authored, unverified |
| Product access / entitlements | `product_access` | 012 | PLATFORM AUTHORIZATION — authored, unverified |
| Audit log | `platform_audit_events` | 013 | PLATFORM AUTHORIZATION — authored, unverified |
| Invitation/onboarding receipts (platform-wide) | `organization_invitations` | 016 | PLATFORM AUTHORIZATION — authored, unverified |
| Cross-product session metadata | `auth.users` sessions (Supabase-managed), `lib/identity/` contract | n/a | AUTHENTICATION READY same-repo; not yet cross-repo consumable (no published package) |

Not yet present anywhere, and out of scope to invent speculatively:
subscription/customer references (no billing system exists —
`NO_BILLING_SYSTEM_NOTE` in `@avatark/product-registry` is an honest
statement of this, not a gap to silently fill).

## 4. The one confirmed correctness defect in this boundary

Full detail: `docs/SHARED_PROFILE_SOURCE_OF_TRUTH.md`.

Summary: `avatark-platform-web`'s account surfaces (`app/api/account/profile/route.ts:9,27`)
read and write the canonical `public.profiles` row. `gamek-web`'s account
adapter (`lib/account/adapters.ts`, profile block) reads and writes
`auth.users.user_metadata` instead, by explicit design choice recorded in
its own comment ("No profiles table exists for GameK"). Under one shared
Supabase project these are two unsynchronized stores for the same
person's profile. **Not fixed in this repository** — the fix belongs to
`gamek-web`.

## 5. What must remain outside the shared platform project

Confirmed, by direct inspection, to live only in each product's own
domain today:

- **PrometheusK**: `practices`, `saved_practices`, `practice_lineage`,
  `practice_sessions`, `practice_reflections`, `authored_echoes` and its
  child tables, `contributions`/`contribution_versions`/
  `contribution_lineages`, `pass_forwards`, `arena_challenges`,
  `spark_cards`/`daily_transmissions`, `mirror_entries`, `navigator_contexts`,
  and every other table under `prometheusk-web/migrations/` — all confirmed
  to live in PrometheusK's own separate Supabase project, not
  `avatark-platform-test`.
- **GameK**: gameplay/world progress currently lives in `localStorage`
  only (`lib/gamek/profile.ts`, per the cross-repo audit) — GameK has no
  Supabase-backed product data of its own today. If/when it gets one, it
  must not be added to `avatark-platform-test`.
- **ArenaK / StreamK / CinemaK / StudioK / Atlas**: no code exists in this
  workspace for any of these products; the boundary is stated
  prospectively per the mission brief and should be enforced the same way
  once each product exists.

Cross-product handoff mechanisms that intentionally carry **no** identity
or session trust, confirmed by code, and correctly kept outside this
boundary: the RC5 onboarding completion receipt
(`docs/RC5_HANDOFF_CONTRACT.md`, HMAC-signed, 10-minute-lived, explicitly
"NOT a Supabase access token... or any form of session/identity
credential"), and the GameK↔PrometheusK return-origin allowlists (plain
open-redirect protection, not a trust mechanism).

## 6. Naming

Retained as-is for this task: **`avatark-platform-test`** remains the
documented canonical technical name. See
`docs/AVATARK_SUPABASE_ENVIRONMENT_MATRIX.md` §"Naming" for the full
evidence and reasoning, and for the optional display alias
("AvatarK Shared Platform — Test"). No Supabase project is renamed by this
document.

## 7. Unresolved architectural decisions (not decided by this document)

- GameK's profile-adapter defect (§4) — needs a `gamek-web` fix, not
  decided or scheduled here.
- Migrations 010–016 need to be applied and verified against
  `avatark-platform-test` before any platform-authorization claim about
  GameK (or any other consumer) is true — see
  `docs/SHARED_PLATFORM_MIGRATION_READINESS.md`.
- `@avatark/account`'s canonical source still lives in
  `prometheusk-web/packages/avatar-account`, vendored into both
  `avatark-platform-web` and `gamek-web` via a manually-copied `.tgz` —
  no publishing pipeline exists. Both currently vendor the same version
  (0.1.1), but nothing prevents drift.
- GameK's real production domain is a three-way unresolved ambiguity
  (`gamek.ai/flowk` vs. `gamek.avatark.ai` vs. `app.avatark.ai/gamek`) —
  irrelevant to Preview (which can use a Vercel preview wildcard) but
  blocks writing a definitive production Supabase redirect-URL entry.
- Env var naming differs between products: `avatark-platform-web` and
  `gamek-web` use `NEXT_PUBLIC_SUPABASE_ANON_KEY`; `prometheusk-web` uses
  the newer `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` naming. Not a blocker
  today (PrometheusK isn't a consumer of the shared project), but worth
  resolving before any future consolidation.
- Dashboard-level confirmation that Supabase project ref
  `hapoerzbcnagyfafqojg` is literally named `avatark-platform-test` was
  not independently performed (no Supabase dashboard/API access exists in
  this environment) — the identification rests on strong in-repo evidence
  only. See the environment matrix for the exact evidence chain.
