# AvatarK Product Registry

**Date:** 2026-07-20. **Branch:** `feature/product-registry-package` (off `identity-account-admin/checkpoint-1-20260720`).

A new shared platform capability, separate from both the RC1–RC6 onboarding track and the
Identity/Account/Admin track: a single typed catalog of every AvatarK product, replacing scattered
per-app configuration.

## Why a separate package

The mission lists consumers beyond this app (landing page, future billing, feature flags,
documentation) — a catalog only useful to `avatark-platform-web` wouldn't serve that. So the data and
logic live in `packages/product-registry` as a plain, framework-agnostic pnpm workspace package (no
Next.js/env-var assumptions inside it), and this repo consumes it like any other dependency. Turbopack
transpiles workspace packages automatically, so no build step or `transpilePackages` entry is needed —
confirmed against this repo's bundled Next 16 docs before relying on it (`node_modules/next/dist/docs/
01-app/03-api-reference/05-config/01-next-config-js/transpilePackages.md`).

## What's in the package

`packages/product-registry/src/`:
- `types.ts` — `AvatarKProduct` and friends: every field the mission specified (id, slug, displayName,
  tagline, description, status, domain, icon, accentColor, logo, category, owner, repository,
  visibility, requiresAuth, the 13 `supportsX` capability flags, navigationLinks/footerLinks/helpLinks,
  supportEmail, documentation).
- `registry.ts` — `PRODUCT_REGISTRY`, one object per product. A shared `NO_CAPABILITIES` base means
  adding a product means overriding what's actually true for it, not restating 13 `false`s — the "one
  object" design goal from the mission.
- `helpers.ts` — lookup (`getProductById`, `getProductBySlug`, `isValidProductId`), filtering
  (`filterProducts`, `getProductsByCategory/Status/Visibility`, `getProductsWithCapability`), sorting
  (`sortProducts`, by name/id/category/status).
- `validation.ts` — `validateProduct` (slug shape, required strings, email shape, link shape) and
  `validateRegistry` (the above per product, plus duplicate id/slug detection across the set).
- `hooks.ts` — `'use client'` React hooks (`useProduct`, `useProductsByCategory`, `useVisibleProducts`,
  `useProductCapability`) — thin memoized wrappers, since the registry is static in-memory data, not
  something fetched.
- `index.ts` — barrel export.

Tests: `validation.test.ts` and `helpers.test.ts`, run via this repo's existing `node --test` convention
(no new test framework dependency, matching how the rest of this repo already tests). 20 new tests, all
passing; wired into the root `test` script.

## What's honest vs. what's a placeholder

Following this repo's existing discipline (see `docs/PLATFORM_COMPLETION_CHECKPOINT.md`'s "no fabricated
data" rule): every `null` in the registry is a genuine "not confirmed," not an omission.

- **Confirmed from the codebase/cross-repo audits:** PrometheusK's practices/Echo/recommendations/
  challenges (RC4 audit, PBM-002/003), GameK's completion-event exchange (PBM-016–019), ArenaK's
  challenges/leagues/events (its own stated purpose), which products have a local repo in this
  workspace vs. not (ArenaK and StudioK confirmed absent — see `gamek-web`'s
  `docs/execution/PROGRAM_STATUS.md`, which found both deployed on Vercel under names that don't match
  this ecosystem's planning docs).
- **Deliberately null, not guessed:** `owner` (no ownership data exists anywhere), `logo` (no real asset
  file exists in any local repo's `public/`), `documentation` (no public docs URL confirmed for any
  product), `domain`/`repository` wherever no confirmed value exists.
- **Presentation placeholders, not claims of fact:** `icon` and `accentColor` are design decisions so
  every consumer renders something consistent today — swap for real brand tokens when they exist.
- **`status` mapping:** the mission's enum (`alpha`/`beta`/`live`/`internal`) doesn't have a
  `coming_soon` value like the old local registry did. Mapped by best-known integration state: `live`
  for AvatarK and PrometheusK (both hosted-verified elsewhere in this repo's history); `beta` for GameK
  (real, active cross-repo integration work in flight); `alpha` for ArenaK/StreamK/CinemaK/StudioK/Atlas
  (repo exists or a deploy exists, but no confirmed Platform integration); `internal` for SetpointK
  (explicitly legacy/disconnected — historically Cognito-backed, not part of the current identity
  contract at all).

## Integration: `avatark-platform-web` now reads from the registry

`lib/products/registry.ts` no longer hardcodes a product array. It now derives `PLATFORM_PRODUCTS` from
`@avatark/product-registry`'s `PRODUCT_REGISTRY`, layering on exactly two things that are genuinely local
to this app rather than portable ecosystem facts:
- per-deployment domain overrides via the same `NEXT_PUBLIC_*_URL` env vars used before (the package
  itself stays free of Next-specific env assumptions, since a landing page or billing system might not
  be a Next app at all);
- this app's own knowledge of which products have a product-local admin surface it can link to
  (today, only itself — `/admin`).

The exported shape (`PlatformProduct`, `PLATFORM_PRODUCTS`, `SUBSCRIPTION_MODEL_NOTE`) is unchanged, so
every existing consumer works with zero edits and zero visual change:
- `app/admin/products/page.tsx` (Admin Products table)
- `app/admin/page.tsx` (Admin Dashboard's live-product count)
- `lib/account/adapters.ts` (`productAccess.list()` and `membership.getRelationships()`, which feed
  `@avatark/account`'s Products and Membership tabs — i.e. the product switcher)

This is the "read from the registry instead of static objects where practical" integration: the static
object *is* the registry now, one layer down, rather than each call site being rewired individually.

## Remaining integration opportunities

- **Admin Products page** could add columns for the new fields (category, capabilities, visibility)
  that the old `PlatformProduct` shape doesn't carry — deliberately not done here, since the mission
  said not to change visual design.
- **Landing page / marketing surfaces** don't exist yet in this repo beyond `/` — once they do, they'd
  read `getProductsByVisibility('public')` directly instead of going through the `PlatformProduct`
  adapter shape.
- **Feature flags / permissions** — the mission lists these as future consumers of the capability flags
  (`supportsOrganizations`, etc.); nothing in this repo gates on them yet.
- **Cross-repo adoption** — `prometheusk-web`, `gamek-web`, and the rest each still keep their own
  product-config knowledge (e.g. PrometheusK's own `productCatalog.ts`, mentioned in this repo's
  existing comments). This package isn't published or referenced there yet — it's new, workspace-local
  to `avatark-platform-web` only, as scoped by this mission.
- **Validation isn't wired into CI** — `validateRegistry` exists and is exercised by tests against the
  real `PRODUCT_REGISTRY`, but nothing fails a build if a future edit breaks it beyond the test suite
  itself (no separate lint rule or pre-commit hook).

## Verification

- `npx tsc --noEmit` — clean.
- `npm test` — 94/94 passing (74 pre-existing + 20 new).
- `npm run build` — succeeds, same 33-route output as before this change (no route added/removed).
- `npx eslint .` — clean.
- Live `next dev` smoke test: `/` returns 200; `/admin` and `/admin/products` redirect to sign-in
  (307, expected — unauthenticated), confirming the new data path compiles and runs without a server
  error, not just that the build succeeds statically.

No production credentials used, nothing deployed, no production database touched. Committed on
`feature/product-registry-package` only.
