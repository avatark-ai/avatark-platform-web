# Platform product adoption matrix — cross-repo naming-collision inventory

## Why this document exists

`docs/PLATFORM_PACKAGE_DISTRIBUTION.md` establishes how a consumer repo
installs one of this repo's 14 `@avatark/*` tarballs. That document
promised "the full cross-repo naming-collision inventory" here. This is
that inventory: every place this session (and the platform-contracts docs
that preceded it) found two different things sharing one name across the
AvatarK ecosystem's repos, packages, types, fields, or product/franchise
identity — consolidated in one place so a future adopter checks here once
instead of re-discovering each collision independently across ~40
`docs/*.md` files.

This is an audit, not a fix. Every collision below was already flagged in
an existing doc; nothing here renames or merges anything. Where a fix was
judged out of scope, the original doc's reasoning is cited rather than
repeated.

## Confirmed naming collisions

| # | Colliding names | Where each lives | Why it collides | Disambiguation status |
|---|---|---|---|---|
| 1 | `@avatark/account` (vendored copy) vs. `@avatark/account-ui` (this repo's native package) vs. `prometheusk-web`'s own local `@avatark/account` (`prometheusk-web/packages/avatar-account`) | This repo's `node_modules`/vendored tarball; `packages/account-ui/`; `prometheusk-web` (separate repo, not in this workspace) | Three adjacently-named things: the canonical vendored package this repo consumes, this repo's own net-new headless-UI package, and PrometheusK's independently-versioned local package of a similar name. A reader skimming imports could plausibly conflate any two. | Flagged, not renamed — `docs/PLATFORM_PACKAGE_DISTRIBUTION.md`'s "Prohibited workspace-only assumptions" section states this explicitly. `@avatark/account-ui` has zero consumers today (`docs/ACCOUNT_COMPOSITION.md`), so there is no live ambiguity in running code, only in naming. |
| 2 | `InvitationStatus` | `packages/invitations/src/types.ts` (ArenaK-owned content invitations, real consumer: `lib/invitations/echoResolver.ts`) vs. `packages/organizations/src/invitations.ts` (org-membership invitations, real consumer: `/admin/organizations/[id]`) | Same type name, unrelated domain, different backing table (`invitations` vs. `organization_invitations`), independently authored. | Flagged, not fixed — `docs/ADAPTER_CONFORMANCE_CONTRACTS.md`'s Invitations row: renaming either was judged a wider blast radius than either pass's scope justified. |
| 3 | `LivingEchoAdapter` | `packages/living-echo/src/types.ts` (`getSummary()` — a data-fetch contract, zero implementations, explicit placeholder) vs. `lib/integrations/livingEchoAdapter.ts` (a real, working `IntegrationAdapter<PrometheusToLivingEchoHandoff>` handoff-boundary describer) | Same name, genuinely different operations ("fetch a summary" vs. "describe whether a handoff is crossable") that happen to share a domain word. | Flagged, not merged — `docs/ADAPTER_CONFORMANCE_CONTRACTS.md`'s Living Echo row: merging would conflate two real, distinct contracts. |
| 4 | `AdapterResult<T>` | Vendored `@avatark/account`'s per-concern adapters (`{data?, error?}`, no loading/unavailable distinction) vs. this session's new `lib/adapters/status.ts` (`{status:'unauthenticated'\|'unavailable'\|'not_supported'\|'error'\|'ready', ...}`) | Two genuinely different shapes now share the exact same exported type name `AdapterResult`, in two different modules both reachable from this repo. Nothing prevents a future import from picking the wrong one by autocomplete. | New, flagged here for the first time — `docs/ADAPTER_CONFORMANCE_CONTRACTS.md` documents the shape difference but does not name this as a same-name collision. Mitigated only by the two never being imported from the same file today (confirmed by grep); no type-level guard exists. Worth a Phase 3 rename (e.g. `AdapterQueryState<T>` for the new one) if a future consumer ever needs both in one module. |
| 5 | "Echo" (three-way) | This repo's editorial content product (`lib/content/echo.ts`, routes `/discover`, `/echo/[slug]`) vs. PrometheusK's "Living Echo" practice-trace concept (produced only there, never duplicated here) vs. this repo's own `/my/echo` honest local preview (reads `JourneyContext` only) | Three unrelated things share the English word "echo," one of them literally named "Echo" as a product. | Fixed via documentation discipline, not renaming — `docs/PLATFORM_CONTRACTS.md`'s Living Echo section is the canonical disambiguation; any future contract should treat "Living Echo" as exclusively the PrometheusK concept. |
| 6 | "PrometheusK" (Product) vs. "Prometheus" (Franchise) | `packages/product-registry` (Product, real code) vs. `FRANCHISE_PRODUCT_RELATIONSHIP_V1.md` (Franchise, content-strategy concept) | The single biggest cross-doc naming risk in the corpus per `docs/ARCHITECTURE_DECISION_LOG_V1.md` — engineers/users will plausibly assume ownership runs the other way. | Accepted, not eliminated — renaming PrometheusK was explicitly rejected (`ARCHITECTURE_DECISION_LOG_V1.md`, `FRANCHISE_PRODUCT_RELATIONSHIP_V1.md` §2.2). Mitigation is disambiguation discipline in docs/onboarding copy, not code. `AVATARK_ECOSYSTEM_ROADMAP_V1.md` names Year 1 as the first real-content stress test of this discipline. |
| 7 | `availability` (field name) | `lib/products/registry.ts`'s `PLATFORM_PRODUCTS.availability` (admin-facing: `'live' \| 'coming_soon'`, treats `beta` as `coming_soon`) vs. `lib/activities/registry.ts`'s `ActivityAvailability` (consumer-facing: `'available' \| 'beta' \| 'coming_soon'`, shows `beta` with a badge) | Same field name, same repo, different enum, different semantics for `beta`, authored independently for different audiences. | Flagged, not reconciled — `docs/PLATFORM_ENTRY_EXPERIENCE_HANDOFF.md`'s "Known gaps": editing one file without checking the other risks silent disagreement. Still open per that doc's "Next priorities" #3. |
| 8 | Auth env var naming | This repo's `NEXT_PUBLIC_SUPABASE_ANON_KEY` vs. PrometheusK's `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (same purpose, different name); distinct Supabase project refs (`hapoerzbcnagyfafqojg` vs. `bxerfgwrtwowzgahdgrj`) | Not a same-name collision but its inverse — a consumer porting env conventions from one product to the other by pattern-matching the name would silently target the wrong project or read an undefined var. Included here because it's the same failure mode (assuming shared naming implies shared identity) as the other rows. | Documented, not unified — `docs/AUTH_REFERENCE_IMPLEMENTATION.md`: PrometheusK's naming/architecture (Bearer-token, no cookies) is a deliberate product-level divergence, not ported. |
| 9 | Auth route/param naming | This repo's `/auth/sign-in?return=` vs. PrometheusK's `/login?next=` (same function: post-auth redirect target) | Same purpose, different route path and different query-param name, across the two repos most likely to be compared side by side. | Documented, not unified — same source as row 8 (`docs/AUTH_REFERENCE_IMPLEMENTATION.md`); each is correct for its own repo's convention. |

## Per-package adoption notes (the 14 distributed packages)

This repo has real, confirmed visibility into exactly one cross-repo
consumer relationship (GameK, per `docs/PLATFORM_INTEGRATION_MATRIX.md`)
and one vendored-in relationship (PrometheusK's `@avatark/account`, source
canonical there). For every other product in the registry (ArenaK,
StreamK, StudioK, CinemaK, Atlas, SetpointK), this repo has no visibility
into that repo's own package names or `node_modules` — any collision claim
beyond what's listed above would be a guess, not an audit finding, so none
is made.

| Package | Known collision risk in a confirmed consumer repo | Confidence |
|---|---|---|
| `@avatark/account-ui` | None confirmed. Zero consumers anywhere today (this repo included, beyond the account-page composition in `docs/ACCOUNT_COMPOSITION.md`). Do not confuse with vendored `@avatark/account` (row 1 above) if `gamek-web` or `prometheusk-web` ever adopts this package — the names are adjacent, the contents are unrelated. | Confirmed (no consumers) |
| `@avatark/organizations` | None confirmed. `gamek-web`/`prometheusk-web` package manifests are not visible from this repo. | Unconfirmed either way |
| `@avatark/invitations` | Row 2's `InvitationStatus` collision is internal to this repo (`packages/organizations/src/invitations.ts`), not cross-repo. If ArenaK (the real owner of the Invitations contract, per `docs/PLATFORM_CONTRACTS.md`) or GameK ever imports both this package and an org-invitations concept of their own, re-check row 2 first. | Confirmed (in-repo only) |
| `@avatark/living-echo` | Row 3's collision is internal to this repo. PrometheusK is the real producer of Living Echo data (`docs/PLATFORM_CONTRACTS.md`) but this repo has no visibility into whether `prometheusk-web` names its own equivalent type identically. | Unconfirmed cross-repo |
| `@avatark/recommendations`, `@avatark/timeline`, `@avatark/notifications` | None confirmed — all three are placeholders with zero implementations and zero consumers anywhere in the ecosystem (`docs/ADAPTER_CONFORMANCE_CONTRACTS.md`), so there is nothing yet to collide with. | Confirmed (no consumers to collide) |
| `@avatark/identity`, `@avatark/auth`, `@avatark/membership`, `@avatark/motion`, `@avatark/navigation`, `@avatark/product-registry`, `@avatark/journey` | None confirmed. `gamek-web` is a real, Phase-1-complete consumer of the *concepts* (Shared Auth/Identity/Account/Product Context, per `docs/PLATFORM_INTEGRATION_MATRIX.md`'s Game row) but consumes them via the vendored `@avatark/account` bundle, not via these 7 standalone packages directly — whether `gamek-web` has independently-named equivalents for any of these is not visible from this repo. | Unconfirmed |

## What this document does not do

- It does not rename or merge any of the 9 collisions above — every one
  was already judged, elsewhere, to have a blast radius wider than its
  originating pass's scope.
- It does not speculate about ArenaK/StreamK/StudioK/CinemaK/Atlas/
  SetpointK package contents — those repos are not in this workspace
  (ArenaK's real implementation lives in `dt4m-os`, confirmed absent as a
  sibling repo per `docs/PLATFORM_INTEGRATION_MATRIX.md`), so no adoption
  claim is made for them beyond "unconfirmed."
- It is a companion to `docs/PLATFORM_INTEGRATION_MATRIX.md` (which
  products/dimensions are integrated) and `docs/PLATFORM_PACKAGE_DISTRIBUTION.md`
  (how a package physically reaches a consumer repo) — not a replacement
  for either.

## Recommended next step (not undertaken here)

If a Phase 3 pass ever touches package naming, row 4 (`AdapterResult<T>`
now meaning two different things inside this single repo) is the highest-
value fix of the nine: it is the only collision that is both purely
internal (no cross-repo coordination required) and net-new (introduced by
this session's own work, not inherited). Renaming the new
`lib/adapters/status.ts` export to `AdapterQueryState<T>` would remove it
without touching the vendored package at all.
