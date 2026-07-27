# Echo RC1 — Complete

Status snapshot of the Echo consumer shell, invitation contract, and
practice handoff as of this pass. AvatarK Platform hosts Echo; practice
runtime lives on PrometheusK; invitations are produced by ArenaK.

## Completed architecture

**Shell.** One persistent Echo shell (`components/echo/shell/`) wraps
every consumer route: `EchoHeader` (primary nav, six categories) +
`EchoContextNav` (contextual second bar, route/query-driven, no hash
anchors, no hover-only menus) + `EchoPageShell` (shared content width,
alignment, density tokens) + `EchoFooter` (compact, no duplicated nav).
`EchoShell` gates on pathname/host so institutional pages (`/`,
`/founder*`, `/foundation`, `/canon*`, `/ecosystem`, `/roadmap`) and
`/admin/*` render their own layouts untouched, in their own theme
(Paper/Ink for institutional; unaffected by Echo's midnight defaults).

**Document background.** `html`/`body` default to Echo's midnight
surface directly (not the generic light/dark-mode pair), closing a real
white-flash defect between route transitions and on hard-navigated
pages. Institutional pages override via their own `InstitutionalLayout`
wrapper; `/admin` re-protected with an explicit light background.

**Motion.** Restrained, reusable primitives only: `echo-card-interactive`
(lift + border glow, clickable cards), `echo-cta-primary` /
`echo-cta-secondary` (button lift + shadow), `link-underline-draw`
(animated underline), `echo-pulse-once` (single-shot, never looping).
All animate only transform/box-shadow/opacity/color — never layout — and
inherit the global `prefers-reduced-motion` collapse. `PageEnter` gives
Echo page content the same subtle entry-settle institutional pages use;
header/context-nav/footer stay static across navigation.

## Implemented routes

| Area | Routes |
|---|---|
| Begin | `/start`, `/start/choose`, `/what-is-an-echo`, `/enter`, `/enter/[token]`, `/watch-first`, `/echo/create` |
| Discover | `/discover` (`?view=echoes\|practices\|collections\|topics`), `/echo/[slug]` |
| Practice | `/today`, `/practice/[id]`, `/witness/[slug]`, `/guide/[slug]` |
| Community | `/community`, `/community/challenges`, `/community/groups`, `/community/events`, `/community/cohorts`, `/community/recognition` — six distinct routes, each with its own title/purpose/empty-state/CTA |
| Stories | `/stories` (`?view=watch\|episodes\|live\|films`) |
| My Journey | `/my/journey`, `/my/echo` (`?tab=`), `/my/echo/living-preview`, `/my/journal`, `/account` |
| Auth | `/auth/sign-in`, `/auth/callback`, `/continue` |
| Legacy (untouched, coexisting) | `/journey`, `/journey/today`, `/journey/history`, `/journey/settings` |

Every context-nav destination resolves to a real route or an explicit
`?view=`/`?tab=` query state — no `#hash` anchors as a routing
mechanism, no two labels pointing at one indistinguishable page.

## Shared packages

- **`@avatark/product-registry`** — canonical typed catalog of every
  AvatarK product (status, domain, capabilities). Pre-existing; ArenaK's
  own entry there records `repository: null` (its real implementation
  lives outside this workspace, in a separate `dt4m-os` monorepo).
- **`@avatark/invitations`** *(new this pass)* — zero-dependency,
  product-agnostic invitation contract: `Invitation`, `InvitationType`,
  `InvitationDestination` (discriminated union: echo / practice /
  echo_practice / cohort / event / story / episode), `InvitationStatus`,
  `InvitationMetadata`, `InvitationAcceptance`, `InvitationResolver`
  interface, pure `classifyInvitationStatus`/`isInvitationUsable`. Not
  coupled to Echo — any product (ArenaK, StreamK, GameK, CinemaK) can
  implement `InvitationResolver` against it.

## Invitation flow

ArenaK **produces** invitations; Echo **consumes** them; Echo never
creates one. Since ArenaK's real service isn't reachable from this
workspace, Echo runs a local reference `InvitationResolver`
(`lib/invitations/echoResolver.ts` + `tokenFormat.ts`) that decodes a
`type:id` token scheme against real local content — honest, not a
fabricated ArenaK integration. Swapping in a real ArenaK-backed resolver
later requires changing only that one file; every consumer (pages,
preview, accept gate) depends solely on the shared contract.

Flow: **URL → resolve → status check (pending/expired/exhausted/
revoked/invalid, each an honest state) → preview → authenticate if
needed (existing Sign In, return-URL preserved) → accept (idempotent,
recorded once) → destination**. Cohort/event/story/episode destinations
honestly report "not available yet" rather than being faked or
requiring a redesign later.

`/api/onboarding/begin` re-validates any carried invitation before
authorizing a PrometheusK handoff, and — closing a real gap found during
verification — confirms the invitation actually **names** the practice
being launched (`invitationMatchesWitness`), not just that it's still
valid. An invitation for one practice can never authorize a handoff to
a different one.

## Auth flow

Reuses the existing local auth surface unchanged in behavior
(Supabase magic link; Google OAuth wired but feature-flagged off until
a provider is configured) — presentation-only restyle to Echo's
midnight theme on `/auth/sign-in`, zero logic changes. One shared
`safeReturnPath` allowlist guards every `?return=`/`?returnTo=` value
app-wide (same-origin relative paths only). Sign-in preserves the
originating Echo route; invitation tokens survive sign-in via the same
`return=` mechanism (`/enter/[token]` round-trips through `/auth/sign-in`
and back). Signed-in state hides Sign In/Join Free everywhere.

## Practice handoff

`lib/onboarding/practiceHandoff.ts` is the single, explicit,
slug-keyed registry mapping an Echo practice to a real PrometheusK
`{journeyId, practiceId}` — never derived from a title, never a default
fallback. Echo's one seed practice ("The Two-Minute Check-In") is
deliberately mapped to `null`: audited directly against
`prometheusk-web`'s real practice catalog and confirmed no practice
there matches it. Every entry point (Discover, Witness, Guide,
invitation preview) gates its CTA on `isPracticeHandoffAvailable()` and
shows an honest unavailable state instead of substituting a different
practice. Verified directly against `prometheusk-web`: it reads only
`source`/`state`/`returnTo` from the handoff URL; receipt issuance is
gated server-side by the same single practice ID Echo's registry
already treats as the only historically-confirmed target; the
`returnTo` origin allowlist there already matches Echo's real deployed
domain.

Completion lineage (Invitation → Echo → Practice → Completion →
Journey) is preserved end-to-end: `JourneyContext` carries
`invitationId`/`invitationAcceptedAt` alongside `witness`/`intention`/
`practiceCompletedAt` through every state-merge, so a verified
PrometheusK completion receipt still knows which invitation (if any)
led to it. Recording is idempotent — re-accepting the same invitation
never creates a duplicate event.

## Remaining work for RC2

- **Real ArenaK integration.** Replace the local resolver with a real
  HTTP/data-layer call once ArenaK's invitation service is reachable;
  no consumer-page changes required, but `InvitationMetadata`/
  `InvitationDestination` will likely need real-world fields (organizer
  identity, QR asset URL, human-readable cohort/event names) beyond
  today's minimal contract.
- **A second real practice mapping.** Needed before the handoff
  registry, receipt eligibility, and invitation-preview "available"
  path have any live practice to exercise end-to-end — everything is
  wired and tested, but currently dormant for real usage.
- **Cohort / Event / Story / Episode content models.** Destination
  types exist in the contract and route generically; no backing content
  or dedicated Echo pages exist yet (Community's cohort/event pages and
  Stories' per-episode route are still honest empty states).
- **Legacy `/journey/*` consolidation.** Left running, undisturbed,
  pending a decision to retire in favor of `/today` + `/my/journey`.
- **Google OAuth.** Enable once a real provider is configured in
  Supabase; UI and callback path are already wired.
