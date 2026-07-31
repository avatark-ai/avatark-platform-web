# AvatarK Platform Integration Matrix

**Date:** 2026-07-31. **Branch:** `feature/avatar-platform-rc3`. Companion to
`docs/PLATFORM_CONTRACTS.md` and `docs/CONSUMER_JOURNEY.md` — this is the master integration
checklist, derived from `packages/product-registry/src/registry.ts` (the one real, typed source for
status/capability/repository facts) plus the qualitative findings written up in `PLATFORM_CONTRACTS.
md`. Every cell is either a confirmed fact with a code/doc citation, or explicitly marked as target/
unconfirmed — no cell claims an integration that isn't backed by something real.

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | Real, confirmed today (file/doc reference exists) |
| 🎯 | Target contract only — documented, not implemented/not confirmed |
| ❌ | Confirmed not implemented / not present |
| — | Not applicable, or genuinely no data exists (e.g. `owner` is `null` for every product in the registry) |

## Matrix

| Product | Auth | Account | Identity | Products | Membership | Organizations | Entitlements | Notifications | Recommendations | Living Echo | Invitations | Media | Creator | Owner | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Avatar** (avatark) | ✅ native | ✅ consumes (canonical source elsewhere) | ✅ native | ✅ registered | ✅ owns model | 🎯 schema only, unverified | ✅ owns store | 🎯 contract only | 🎯 consumer target | — (consumer/link only; own separate "Echo" content product) | ✅ consumer (real, local resolver) | — | — | — | live |
| **Prometheus** (prometheusk) | — separate Supabase project | — unconfirmed | — separate project, no cross-verify | ✅ registered | — | ❌ | 🎯 no confirmed reader | ❌ | ✅ producer (flag set, engine unconfirmed) | ✅ **producer** (real) | 🎯 consumer (target) | — | — | — | live / integration **live** |
| **Arena** (arenak) | — unconfirmed | — unconfirmed | — unconfirmed | ✅ registered | — | ❌ | — unconfirmed | ❌ | 🎯 consumer target, unimplemented | 🎯 consumer target, unimplemented | ✅ **producer** (contract real, API unreachable) | — | — | — | alpha / integration **coming-online** |
| **Game** (gamek) | ✅ consumer (Phase 1 complete) | ✅ consumer (Phase 1 complete, has store-drift bug — see notes) | ✅ consumer (Phase 1 complete) | ✅ registered | ✅ consumer (Phase 1 complete) | ❌ | 🎯 no confirmed direct reader | ❌ | ❌ (flag not set) | 🎯 target, unconfirmed | ✅ consumer (Arena Invitation handoff, Phase 1 complete) | — | — | — | beta / integration **live** |
| **Studio** (studiok) | ❌ unconfirmed | ❌ unconfirmed | ❌ unconfirmed | ✅ registered | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🎯 consumer target | — | 🎯 target (creation category) | — | alpha / no integrationStatus |
| **Stream** (streamk) | ❌ unconfirmed | ❌ unconfirmed | ❌ unconfirmed | ✅ registered | ❌ | ❌ | ❌ | ❌ | ❌ | 🎯 consumer target, unimplemented handoff | 🎯 consumer target | ✅ registered capability | — | — | alpha / integration **in-development** |
| **Cinema** (cinemak) | ❌ unconfirmed | ❌ unconfirmed | ❌ unconfirmed | ✅ registered | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ no adapter exists | ❌ not listed as consumer | ✅ registered capability | — | — | alpha / integration **vision** |
| **Atlas** | ❌ unconfirmed | ❌ unconfirmed | ❌ unconfirmed | ✅ registered | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ not listed as consumer | — | 🎯 target (exploration/content) | — | alpha / integration **preview** |
| **Setpoint** (setpointk) | ❌ own Cognito, disconnected | ❌ unconfirmed | ❌ unconfirmed | ✅ registered | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | — | — | internal, no integrationStatus |

`Owner` is `—` for every row: `AvatarKProduct.owner` is `null` for all 9 registry entries today — "no
ownership data exists anywhere in this ecosystem" (`packages/product-registry/src/types.ts`'s own
comment), not an omission in this matrix.

## Row notes

**Avatar** — the platform itself, included in its own registry so "every product registers through
the Platform registry" is literally true. Owns Identity/Auth/Account-consumption/Product Registry/
Entitlements-storage/Notifications-contract. `supportsOrganizations: true` is the only `true` capability
flag on this row — real schema, unverified migrations (see Organizations section of
`PLATFORM_CONTRACTS.md`). Repository: `avatark-platform-web` (this repo).

**Prometheus** (`prometheusk-web`, `https://prometheusk.avatark.io`) — runs its own Supabase project;
this repo's `/api/identity/verify` cannot verify its tokens. Real, confirmed integration is narrower
and one-directional: this repo hands off to PrometheusK's practice runtime
(`lib/onboarding/practiceHandoff.ts`) and later verifies one signed completion receipt back
(`lib/onboarding/receipt.ts`) — that's the entire confirmed surface. Living Echo is genuinely produced
here. `supportsRecommendations: true` in the registry, but no code anywhere reads that flag or
implements a recommendation feed. `journeyRole: growth-engine`, order 1, `nextProductIds: [arenak]`.

**Arena** (`arenak`) — `repository: null` because the real implementation lives inside a separate
`dt4m-os` repo's `apps/avatark-consumer`, not as a sibling repo in this workspace — confirmed absent,
not guessed. Owns the entire Invitations contract as producer, but this repo can only run a local
reference resolver against it (no real ArenaK API reachable). No Living-Echo→Arena or
Recommendation→Arena implementation exists anywhere — `arenaAdapter.ts` carries the honest
placeholder "No recommendation prepared for this journey yet." `integrationStatus: coming-online`,
`journeyRole: convergence`, `nextProductIds: [streamk]`.

**Game** (`gamek-web`, `https://gamek.ai`) — per the mission's own "current status," GameK Phase 1
platform integration is complete: Shared Auth, Shared Account, Product Context, Avatar Menu, My
Journey deep-link, Arena Invitation handoff. This is the most-integrated non-Avatar product in the
ecosystem today. One confirmed real defect carries over from Account: `docs/
SHARED_PROFILE_SOURCE_OF_TRUTH.md` documents that GameK's copy of `@avatark/account` reads/writes
`auth.users.user_metadata` while this repo's copy reads/writes canonical `public.profiles` — a
correctness defect in the shared contract, fix belongs in `gamek-web`, out of scope here. `status:
'beta'` (product maturity) but `integrationStatus: 'live'` (platform integration) — these two axes are
allowed to diverge, and do. Sub-experiences: FlowK, PathK, GeometriK, ChronicleK.

**Studio** (`studiok`) — no confirmed local repository in this workspace; a real, actively-deployed
Vercel project exists under a name that doesn't match this ecosystem's planning docs. Under active
development in a separate workstream per the mission — nothing here duplicates or touches it.
`visibility: internal`, no `journeyRole`/`integrationStatus` set (not yet positioned on the platform
journey graph).

**Stream** (`streamk-web`, `https://streamk.ai`) — domain is reachable, but "scope (feature-level
integration with Platform, beyond domain reachability) not yet confirmed" per the registry's own
description. This repo's `/watch-first` route is real and static, not StreamK-powered content;
`EchoToStreamKHandoff` (`lib/journey/handoffContracts.ts`) has no real implementation.
`integrationStatus: in-development`, `journeyRole: expression`, order 1, `nextProductIds: [cinemak]`.

**Cinema** (`cinemak-web`, `https://cinemak.ai`) — `visibility: internal`, the least-integrated
product with a real repo: `ecosystemMap.ts`'s own comment states "No CinemaK adapter or handoff
contract exists anywhere in this repo." `integrationStatus: vision`, the least mature value on that
axis, `journeyRole: expression`, order 2, terminal (`nextProductIds: []`).

**Atlas** (`atlas-web`, `https://atlas.dt4i.ai`) — exploration/reference product, `visibility:
internal`, scope not yet integrated with Platform beyond registry membership. `integrationStatus:
preview`, `journeyRole: growth-engine`, order 3, `nextProductIds: [arenak]`.

**Setpoint** (`setpointk`, `https://setpointk.ai`) — `status: internal`, `repository: null`.
Historically backed by its own Cognito auth, explicitly not yet integrated with Platform identity —
the one product in the registry with zero `true` capability flags and no `journeyRole`/
`integrationStatus` at all, marking it as legacy/disconnected rather than early-stage.

## Cross-cutting gaps visible only in matrix form

- **Notifications column is entirely ❌/🎯** — no product, including Avatar itself, has a real
  notification path today. This is the starkest single column in the matrix.
- **Organizations column is entirely ❌ except Avatar's schema-only 🎯** — no other product has any
  organization-context integration, confirming this is correctly scoped as AvatarK-only,
  document-only work per the mission.
- **Living Echo column has exactly one ✅ (producer, Prometheus)** and no real ✅ consumers anywhere
  — "every product links to or embeds it" (the mission's phrasing) is not yet true of any product,
  including Avatar's own link-only relationship to it.
- **Invitations column has exactly one ✅ producer (Arena, contract-real/API-unreachable) and one real
  ✅ consumer (Avatar, local resolver) plus one Phase-1-complete consumer (Game)** — Prometheus,
  Stream, and Studio's consumption is target-only despite being named in the mission's "Consumed by"
  list.
