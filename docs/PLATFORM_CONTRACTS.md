# AvatarK Platform Contracts

**Date:** 2026-07-31. **Branch:** `feature/avatar-platform-rc3`.

This is the canonical source for what AvatarK owns as the platform layer of the ecosystem, and what
every other product (PrometheusK, ArenaK, GameK, StreamK, StudioK, CinemaK, Atlas, SetpointK) may
assume about it. It supersedes scattered contract language spread across `docs/AVATARK_SHARED_
PLATFORM_ARCHITECTURE.md`, `docs/IDENTITY_ACCOUNT_ADMIN_HANDOFF.md`, `docs/PRODUCT_REGISTRY.md`,
`docs/INVITATION_MIGRATION.md`, and others — those docs still hold useful detail and history and are
linked from each section below, but this file is where a new reader (or a new repo) should start.

Every section below states, honestly: **Owner**, **Consumers**, **Current status** (real / partial /
document-only), **Contract shape**, and **Known gaps**. Nothing here is fabricated or aspirationally
described as working — a status of "document-only" or "not implemented" is as much a deliverable of
this doc as a status of "real," matching this repo's existing discipline (see
`docs/PLATFORM_COMPLETION_CHECKPOINT.md`).

AvatarK does **not** own: Practices (PrometheusK), Communities (ArenaK), Media (StreamK/CinemaK),
Content Creation (StudioK), Games (GameK). Nothing in this doc changes that, and nothing here touches
Arena, GameK, StudioK, or PrometheusK code — see "No UI redesign" at the end.

---

## Identity

**Owner:** AvatarK. **Consumers:** every product.

**Current status:** real, but same-repo only — not yet packaged for cross-repo consumption.

**Contract shape** — `lib/identity/types.ts`:
```ts
export interface IdentityClaims {
  subjectId: string
  email: string
  displayName: string
  organizationIds: string[]
  productAccess: string[]
  roles: string[]
}

export interface IdentityProvider {
  getUser(): Promise<IdentityClaims | null>
  verifySession(): Promise<IdentityClaims | null>
  refreshSession(): Promise<IdentityClaims | null>
  signOut(): Promise<void>
  accountUrl(returnTo?: string): string
  signOutUrl(): string
}
```
`organizationIds` / `productAccess` / `roles` are non-optional: `[]` means "genuinely none," not
"unknown." Backed by real tables (`organization_members`, `product_access`, `platform_roles`) via
`lib/identity/claims.ts`'s `loadIdentityExtras`, one implementation (`supabaseIdentityProvider.ts`),
consumed through `/api/identity/me` (same-origin) and `/api/identity/verify` (cross-product token
verification — **only for tokens issued by this repo's own Supabase project**).

`signIn()` is deliberately not part of the interface — magic link and Google are browser-redirect
flows with one caller today (`app/auth/sign-in/page.tsx`); the abstraction isn't justified with a
single caller.

**Known gaps:**
- No version field on `IdentityClaims`, no schema-version header on `/api/identity/*`. Not a
  published package — a real cross-repo consumer would need to vendor or re-declare this type today.
- `/api/identity/verify` verifies this repo's own Supabase project's tokens only. PrometheusK, GameK,
  and ArenaK each run separate Supabase projects — this contract does not make them interoperate. A
  trust bridge or centralized identity is an explicit, not-yet-made decision (see
  `docs/IDENTITY_ACCOUNT_ADMIN_HANDOFF.md`).

---

## Authentication

**Owner:** AvatarK. **Shared package:** `@avatark/auth` — **this package does not exist today.** No
`@avatark/auth` entry exists in `package.json`, `pnpm-workspace.yaml`, or `packages/`. Treat the name
below as the *target* contract, not a fact about current code. The real implementation lives, un-
packaged, in `lib/auth/` and `app/auth/*`.

**Supported providers — current reality:**
| Provider | Status |
|---|---|
| Magic Link | Real, unconditional (`supabase.auth.signInWithOtp`, `app/auth/sign-in/page.tsx`) |
| Google | Code exists (`supabase.auth.signInWithOAuth`) and the button's visibility is now driven live from Supabase (`lib/auth/authProviderCapabilities.ts` calls `/auth/v1/settings`), not the `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED` flag. **No Google provider is configured in the `avatark-platform-test` Supabase project**, confirmed directly against its settings endpoint — that is why the button is absent, not a code defect. See `docs/GOOGLE_OAUTH_DEPLOYMENT_CHECKLIST.md` for the manual steps to turn it on. |
| Apple | Not started |
| Enterprise SSO | Not started |

**Contract shape (real, `lib/auth/`):**
- `safeReturnPath.ts` — open-redirect guard for every `?return=` parameter in the ecosystem (resolves
  against a dummy origin, rejects cross-origin and `://`/`//`-style bypasses).
- `callbackError.ts` — `classifyCallbackFailure()`, classifies `/auth/callback` failures into
  `access_denied | expired | reused_or_invalid | missing_code | callback_failed`.
- `principal.ts` / `resolveClientPrincipal.ts` — server/client resolution of `AccountPrincipal`
  (defined in `@avatark/account`, not duplicated locally).
- `actions.ts` — the one server action, `signOut()`.

**Readiness tier** (`docs/AVATARK_SHARED_PLATFORM_ARCHITECTURE.md` §2): "AUTHENTICATION READY" is a
verified tier — Supabase Auth connection, magic-link + Google sign-in, `/auth/callback` exchange,
session refresh, sign-out, and a canonical `auth.users` identity, backed by migrations 001, 005, 006,
007, 009, confirmed applied against `avatark-platform-test`.

**Known gaps:** no `@avatark/auth` package to publish; Apple and Enterprise SSO are unbuilt; Google is
code-complete but unconfigured/unverified.

---

## Account

**Owner:** AvatarK (by consumption; canonical source is elsewhere — see below). **Shared package:**
`@avatark/account`. **No product forks** — this repo consumes the one package, it does not maintain
its own copy of Account UI/logic.

**Current status:** real and live (`/account`, behind `NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED`), but with
an unresolved ownership problem: **the package's canonical source lives in `prometheusk-web/packages/
avatar-account`, not in this repo.** It reaches this repo (and `gamek-web`) as a manually-copied
`avatark-account-0.1.1.tgz` tarball — no publishing pipeline, no drift protection.

**Contract shape** (`node_modules/@avatark/account/dist/index.d.ts`):
- Components: `AvatarKAccount`, `AccountTabs`.
- `ACCOUNT_TAB_KEYS`: `profile | signin | products | membership | preferences | privacy | activity |
  echoes | data` (9 tabs — this repo mounts 7, omitting `activity`/`echoes` since it has no Living
  Echo/reflection data to honestly back either).
- `AccountAdapters` interface: `support`, `auth`, `profile`, `productAccess`, `membership`,
  `preferences`, `export` required; `links`, `privacy`, `activity`, `echoes`, `gettingStarted`
  optional. This repo's concrete implementation is `lib/account/adapters.ts`'s
  `avatarKPlatformAdapters`.
- `AccountPrincipal` = `{status:'loading'} | {status:'signed_out'} | {status:'signed_in', id,
  displayName, email}`.

**Known gaps:**
- **Package ownership is unresolved** — a deliberate open decision, not an oversight
  (`docs/IDENTITY_ACCOUNT_ADMIN_HANDOFF.md`, `docs/AVATARK_SHARED_PLATFORM_ARCHITECTURE.md` §7).
- **Confirmed cross-repo defect**, not fixed here: `docs/SHARED_PROFILE_SOURCE_OF_TRUTH.md` documents
  that this repo's profile adapter reads/writes canonical `public.profiles`, while `gamek-web`'s copy
  of the same package instead reads/writes `auth.users.user_metadata` — two different stores behind
  one shared-package promise. The fix belongs in `gamek-web`, out of scope for this repo.
- `membership.getSummary()` is hardcoded `{planName:'Free', ...}` — genuinely the only plan that
  exists anywhere in the ecosystem (no billing system at all — see Entitlements below), not a
  placeholder.

---

## Product Registry

**Owner:** AvatarK. **Package:** `packages/product-registry` (real, workspace package, framework-
agnostic — no Next.js/env assumptions inside it).

**Contract shape** — `AvatarKProduct` (`packages/product-registry/src/types.ts`), current real fields:
`id, slug, displayName, tagline, description, status (alpha|beta|live|internal), domain, icon,
accentColor, logo, category, owner, repository, visibility (public|internal), requiresAuth`, 13
`supportsX` capability flags (`CAPABILITY_KEYS`), `navigationLinks/footerLinks/helpLinks,
supportEmail, documentation`, plus journey-graph fields `journeyRole, journeyOrder,
integrationStatus, nextProductIds, experiences`.

**Gap vs. the mission's target contract:** the mission names `Product, Status, Route, Icon, Theme,
Visibility, Capabilities, Required entitlement` as what the registry contains. Mapping onto what
actually exists: `Product→id/slug/displayName`, `Status→status`, `Icon→icon`, `Theme→accentColor`,
`Visibility→visibility`, `Capabilities→the 13 supportsX flags` are all real today. **`Route` and
`Required entitlement` have no field in `AvatarKProduct` today** — `domain` is the closest existing
analog to a route (a full origin, not an in-app path), and there is no per-product entitlement
requirement anywhere (see Entitlements below — there's nothing to require yet). These are named here
as target contract fields to add when a real requirement exists, not invented speculatively.

**Current registry (9 entries)** — see `docs/PLATFORM_INTEGRATION_MATRIX.md` for the full per-product
breakdown of status/capabilities/owner used across this doc set.

**Known gaps:** `owner` is `null` for every product (no ownership data exists anywhere); `logo` is
`null` for every product (no real asset exists); validation (`validation.ts`) isn't wired into CI.
See `docs/PRODUCT_REGISTRY.md` for full narrative history.

---

## Entitlements

**Owner:** AvatarK. **Read by:** GameK, ArenaK, StreamK, StudioK, Atlas, SetpointK (target — see gap
below for who actually reads anything today).

**Current status:** there is no tiered/paid entitlement system anywhere in the ecosystem.
`supportsBilling` is `false` for every product in the registry, and `NO_BILLING_SYSTEM_NOTE` /
`SUBSCRIPTION_MODEL_NOTE` state this is a confirmed ecosystem-wide fact, not a placeholder.

**Contract shape as it exists today:** a flat grant, not a tier. `product_access` (migration 012:
`user_id, product_id, status default 'active', granted_at, granted_by`) plus `platform_roles`
(migration 011, global — not per-product — roles, real consumer today is only `'admin'`). Read by
`lib/products/access.ts` (`summarizeProductAccess`, Admin Products page only) and
`lib/account/adapters.ts`'s `productAccess.list()`, which computes a client-facing `entitlement`
field: `'active' | 'available' | 'coming_soon'`, derived purely from `product.status === 'live'` and
whether the product is the current one — no plan/tier/feature-gate logic anywhere.

**Known gaps:** "Read by Game/Arena/Stream/Studio/Atlas/Setpoint" per the mission is aspirational —
today only this repo's own Admin and Account surfaces read `product_access`; no other repo in this
workspace has been confirmed to read AvatarK's entitlement data at all. Nothing in this repo gates a
feature on `supportsX` capability flags today either (confirmed: no reader of `supportsRecommendations`
or `supportsNotifications` exists anywhere).

---

## Organization Context

**Owner:** AvatarK. **Support (target):** Personal, Enterprise, Institution, Conference, University,
Family, future multi-tenant. **Document contract only — no backend implementation required or
attempted here**, per the mission and consistent with current reality.

**Current status:** a real, minimal schema exists — `organizations {id, name, created_at,
updated_at}`, `organization_members {org_id, user_id, role default 'member'}` (migration 010),
`organization_invitations {id, org_id, email, role, token, invited_by, expires_at default +14d,
accepted_at, revoked_at}` (migration 016, service-role only, no `authenticated` RLS policy since rows
carry email addresses).

**There is no `type`/`kind` concept on `organizations` today** — Personal, Enterprise, Institution,
Conference, University, and Family are pure target-contract vocabulary from the mission; no column,
enum, or TypeScript type for any of them exists anywhere in this codebase. This section documents the
target shape (a future `organizations.type` or similar) without adding it, per the mission's explicit
instruction not to implement backend here.

**Roles** (`lib/organizations/permissions.ts`, `ORG_ROLE_CAPABILITY_REFERENCE`): `owner`, `admin`,
`member`, each with a capability list — explicitly labeled a **design reference**, not enforced
anywhere in code today (no code branches on `organization_members.role` beyond display).

**⚠️ Disambiguation — two unrelated "invitation" systems share this ecosystem, do not conflate them:**
1. **Organization-membership invitations** (`lib/organizations/invitations.ts`,
   `organization_invitations` table above) — platform-admin-only, email-based, invites a person to
   join an `organizations` row. `classifyInvitationStatus(invitation, now)` → `pending | accepted |
   revoked | expired`.
2. **ArenaK-produced content invitations** (`@avatark/invitations`, see the Invitations section below)
   — token-based, invites a person to an Echo/practice/cohort/event/story/episode. Owned by ArenaK,
   consumed by every other product.

These are structurally similar (both have tokens/expiry/accept-or-not) but serve entirely different
purposes and have no shared code path.

**Known gaps:** migrations 010–016 are "authored, correctly listed, but never run against any live
database" (`docs/SHARED_PLATFORM_MIGRATION_READINESS.md` §2) — this whole area, including product
access and role checks that lean on it, must not be described as complete or working until re-
verified against a live database. No self-serve invitation-accept flow exists — an invitee still
needs an admin to manually add them as a member.

---

## Notification Center

**Owner:** AvatarK. **Events originate from:** PrometheusK, ArenaK, StudioK, StreamK, GameK. **Do not
build the notification engine — contract only,** per the mission.

**Current status: nothing exists.** This is the first canonical statement of this contract anywhere
in this repo's docs — none of `PLATFORM_COMPLETION_CHECKPOINT.md`, `SHARED_PROFILE_SOURCE_OF_TRUTH.
md`, `AVATARK_SHARED_PLATFORM_ARCHITECTURE.md`, or `IDENTITY_ACCOUNT_ADMIN_HANDOFF.md` names a
Notification Center as even a known gap.

What exists adjacent to it, so it isn't confused for a start on this contract:
- `notificationsEnabled` — one boolean user preference (`app/api/account/preferences/route.ts`,
  migration 003), a toggle with no delivery mechanism wired to it at all.
- `supportsNotifications` — a capability flag on every `AvatarKProduct`, hardcoded `false`
  everywhere, read by nothing.
- `lib/email/sendEmail.ts` + `templates.ts` — real transactional email (Resend), one template
  (`invitationEmail`, for org invitations), feature-flagged off by `EMAIL_SENDING_ENABLED`. This is
  point-to-point transactional email, not a notification center (no inbox, no event bus, no per-event
  routing to it).

**Target contract (document-only, not implemented):** an event ingestion boundary AvatarK owns, into
which PrometheusK/ArenaK/StudioK/StreamK/GameK each publish typed events (e.g. "practice completed,"
"invitation received," "content published"); AvatarK owns delivery (in-app, email) and the user's
`notificationsEnabled` preference as the one gate all delivery respects. No schema, table, or code for
this exists yet.

---

## Recommendations

**Produced by:** PrometheusK (target). **Consumed by (target):** GameK, ArenaK, AvatarK, StreamK,
StudioK, Atlas.

**Current status: no cross-product recommendation engine exists in this repo or is reachable from
it.** Three unrelated things share the word "recommendation" in this codebase — do not conflate them:
1. `recommendation` — a `JourneyStepId` node name between `living_echo` and `arena` in the 9-step
   state machine (see Navigation below). A graph node name only, no producing logic behind it.
2. `Recommendation` (`lib/integrations/summary.ts`) — a **developer-facing** "what's blocked / who
   owns it / what's the next action" object for the Integration Dashboard
   (`components/integration/RecommendationCard.tsx`). Pure local orchestration-health tooling, not a
   cross-product data feed.
3. `supportsRecommendations` — a registry capability flag, `true` only for `prometheusk`, read by no
   code anywhere.

**Known gaps:** the entire "Prometheus produces, AvatarK/GameK/ArenaK/StreamK/StudioK/Atlas consume"
model is target contract only. `arenaAdapter.ts` carries the honest placeholder string "No
recommendation prepared for this journey yet" as part of the frozen Living-Echo→Arena handoff
contract — the clearest single marker that this is unbuilt, not broken.

---

## Living Echo

**Produced only by PrometheusK. Never duplicated.** Every product links to or embeds it, never re-
implements it.

**Current status: this is factually true of this codebase as implemented.** Every doc that mentions
Living Echo (`docs/ENTRY_ENGINE_ARCHITECTURE.md`, `docs/SYSTEM_SEQUENCE.md`, `docs/STATE_MACHINE.md`)
attributes it to PrometheusK's own recorded trace of practice, and this repo holds no Living Echo data
model, no persistence of a practice trace, and no code that re-derives one.

**⚠️ Disambiguation — naming collision, not a duplication:** this repo has its own, separately-named
**"Echo" content product** (`lib/content/echo.ts`, `content/echo/{echoes,practices,stories,
collections}/*.md`, routes `/discover`, `/echo/[slug]`, `/guide/[slug]`, `/witness/[slug]`) that is
editorial/practice content (guides, practices, stories, collections) — today one real Echo
(`the-returner`), one Practice (`the-promise-to-myself`). This is **not** Living Echo. Separately,
`/my/echo` and `/my/echo/living-preview` are this repo's own thin, honest UI over the visitor's local
`JourneyContext` (invitation acceptance + practice-completion timestamps) — explicitly designed to
render "one honest, non-fabricated observation" or an honest "not enough history yet" state, never a
score or diagnosis, and explicitly **not** a copy of PrometheusK's real Living Echo (which lives at
PrometheusK's own `/my/echo?tab=` route, out of scope here). Three names — "Echo" (this repo's content
product), "Living Echo" (PrometheusK's practice trace), "`/my/echo`" (this repo's honest local
preview) — refer to three different things. Any consumer reading this contract should treat "Living
Echo" as exclusively the PrometheusK concept.

---

## Invitations

**Owned by ArenaK. Consumed by:** AvatarK, GameK, PrometheusK, StreamK, StudioK.

**Contract shape** — `@avatark/invitations` (`packages/invitations/src/types.ts`, real, framework-
agnostic workspace package):
```ts
type InvitationType = "echo" | "practice" | "echo_practice" | "cohort" | "event" | "story" | "episode"
type InvitationStatus = "pending" | "accepted" | "expired" | "exhausted" | "revoked" | "invalid"
interface InvitationMetadata { issuedBy: string; createdAt: string; expiresAt: string | null; maxUses: number | null; useCount: number; cohortId?: string; eventId?: string }
interface Invitation { token: string; type: InvitationType; destination: InvitationDestination; status: InvitationStatus; metadata: InvitationMetadata }
interface InvitationResolver { resolve(token: string): Promise<Invitation | null> }
```
`classifyInvitationStatus` never trusts a resolver's `status` blindly for expiry/exhaustion — it
independently re-derives those from `metadata.expiresAt`/`maxUses`/`useCount` every time.

**Token flow, as actually implemented end to end today:**
```
URL (/enter/[token])
  → decode token (lib/invitations/tokenFormat.ts's local scheme: echo:<slug>,
    practice:<slug>, echo_practice:<echoSlug>:<practiceSlug>, cohort:<id>[:practiceSlug],
    event:<id>, story:<slug>, episode:<slug>)
  → resolve via echoInvitationResolver (a LOCAL reference resolver —
    packages/invitations/src/localResolver.ts, explicitly "NOT a stand-in for
    a real ArenaK API"; any well-formed token decodes to status: "pending")
  → classify status (pending/expired/exhausted/revoked/invalid — each an honest state)
  → preview destination (previewInvitationDestination — cohort/event/story/episode
    honestly report available: false; only echo/practice/echo_practice resolve to
    a real route)
  → authenticate if needed (Sign In, ?return= round-trips back to the same
    /enter/[token] URL so acceptance resumes exactly where it left off)
  → accept (idempotent, recorded once — signed-in: recordInvitationAcceptance;
    signed-out: "Continue as guest" writes a GuestJourneyContext instead)
  → destination
```

**Real ArenaK issuance is not reachable from this repo.** ArenaK's actual invitation service
(creation, real tokens, QR codes, usage limits, analytics) lives in a separate repository this
workspace does not have access to — confirmed by `PRODUCT_REGISTRY`'s `arenak.repository: null`. This
repo's `/enter/[token]` therefore does not validate a token against any database by design; any
syntactically well-formed string is accepted and carried forward purely for attribution.

**⚠️ Disambiguation:** see Organization Context above — do not confuse this with organization-
membership invitations (`lib/organizations/invitations.ts`), a wholly separate, platform-admin-only
system.

**Known gaps:** cohort/event/story/episode invitation types are real in the contract but every one
renders an honest "not available yet" — no real content or backing exists behind them today. Full
detail: `docs/INVITATION_MIGRATION.md`, `docs/ENTRY_ENGINE_ARCHITECTURE.md`.

---

## Phase 2 — Shared Navigation Contract

**Anonymous → Avatar → Product → back to Avatar → next product. One identity. One account. Multiple
experiences.**

This is real and implemented, not aspirational, via three pieces working together:

1. **Anonymous → Avatar**: a visitor arrives via any entry door (see `docs/CONSUMER_JOURNEY.md`),
   accumulates state in `GuestJourneyContext` (`lib/journey/guestContext.ts`, localStorage-only,
   explicitly "not the authoritative claim," honestly the breadcrumb that survives navigation before
   sign-in) and merges into the real, signed-in `JourneyContext` the moment they authenticate
   (`lib/journey/session.tsx`, at mount time).
2. **Avatar → Product**: `lib/journey/deepLinks.ts` builds every step's route (`enterInvitationLink`,
   `watchFirstLink`, `practiceIntroLink`, `practiceDetailLink`, `journeyLink`), each honestly marked
   `available: boolean` — a link is never presented as real if no route resolves it yet.
3. **Product → back to Avatar → next product**: `lib/journey/continuity.ts`'s `getContinuityAction()`
   is the single "what should this visitor do next" decision — checked in priority order: a
   completed/in-progress practice on PrometheusK → "Return to your practice" (external link back to
   PrometheusK via `buildContinueUrl()`); no intention set yet → "Begin with an Echo" (`/start`);
   intention set → "Continue to the practice." This function is explicitly documented as **not** a
   Recommendation surface — it reads only this user's own three journey fields, computes nothing
   cross-product.

The full step graph this rides on (`invitation_received → invitation_accepted → {watch_first |
practice_intro} → practice_intro → practice_runtime → reflection → living_echo → recommendation →
arena`) is the same 9-step state machine documented in `docs/CONSUMER_JOURNEY.md` and
`lib/journey/stateMachine.ts` — reused verbatim here rather than re-derived, since "back to Avatar /
next product" is literally this graph's edges, traversed by real code (`transition()`, a pure
reducer with explicit legal-edge checking, no implicit skips).

**Known gap:** `lib/journey/handoffContracts.ts`'s `EchoToStreamKHandoff` and
`LivingEchoToArenaHandoff` are typed contracts with no real implementation behind them — "Avatar →
StreamK" and "Living Echo → Arena" are modeled edges in the graph, not yet real cross-product
handoffs. See `docs/PLATFORM_INTEGRATION_MATRIX.md` for the full real/aspirational breakdown per
product.

---

## No UI redesign

Nothing in writing this document changed any page, any product's UI, or Arena/Game/Studio/Prometheus
code. The one code change made alongside this doc set is a superseded-header note added to
`docs/ONBOARDING_ROUTE_CONTRACT.md`, whose 2026-07-15 snapshot is now contradicted by current reality
(`/start` and `/enter/[token]` are both real today) — a genuine documentation inconsistency discovered
while writing this contract, not a design change.
