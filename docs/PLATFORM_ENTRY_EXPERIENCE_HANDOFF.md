# AvatarK Platform Entry Experience — Handoff & Current State

**As of:** 2026-07-20 (two sessions: "Session 1" home/nav build, "Session 1B" production audit),
branch `feature/avatar-home-registry-navigation`. Base: `feature/product-registry-package` @
`fec4c81` (this repo has no `main` — see "Repo topology" below). **2 commits ahead of origin, not
pushed** (`014a48f`, `f29e415` — Session 1's 5 commits were pushed at the time; Session 1B's audit
commits were not, since that session's brief didn't include push in its exit criteria the way
Session 1's did). Not merged. Not deployed.

This document is the **current-state summary** — read this first when picking the work back up.
`docs/SESSION_1_HOME_NAV_CHECKPOINT.md` and `docs/SESSION1B_CHECKPOINT.md` are the specific
per-session reports; `docs/PLATFORM_PRODUCTION_AUDIT_V1.md` is the detailed audit.

## Repo topology (easy to get wrong)

No `main` branch exists. The real trunk lineage is linear:

```
platform/foundation-20260714 (RC1-RC6 shell)
  -> identity-account-admin/checkpoint-1-20260720 (Platform Completion P1-P8)
    -> feature/product-registry-package (Product Registry package + architecture-freeze docs)
      -> feature/avatar-home-registry-navigation (THIS WORK — Sessions 1 & 1B)
```

`feature/product-registry-package` and everything before it in that chain is pushed. This branch
is pushed only through Session 1's last commit (`14070ba`).

## How to tell what state this is in when you come back

```
git log --oneline fec4c81..HEAD
git log origin/feature/avatar-home-registry-navigation..HEAD --oneline   # commits not yet pushed
pnpm exec tsc --noEmit && pnpm lint && pnpm test && pnpm build
```

All four passed clean as of `f29e415` (100/100 tests). If they don't, something changed — trust
the commands over this document.

## Mission recap

Session 1: implement the first real AvatarK consumer home and registry-driven navigation — make
the ratified Activity/Product architecture (`ARCHITECTURE_DECISION_LOG_V1.md`) visible to a user
for the first time, without redesigning any of it. Session 1B: audit that work end-to-end for
production readiness, fix what was safe to fix, document what wasn't.

## What's real and working right now

- **Home (`/`)**: four intent-first cards — Explore, Practice, Together, Watch — replacing the old
  PrometheusK-only hero. No forced sign-in, no fabricated availability. `lib/activities/registry.ts`
  is the single source of truth for the Activity→Product mapping (a new, app-level, non-shared-
  package file — `packages/product-registry` itself is untouched, byte-for-byte, since before
  Session 1).
- **Real handoffs**: Explore → GameK (`beta`, public, `https://app.avatark.ai/gamek`). Practice →
  AvatarK's own `/start` funnel (unchanged RC1–RC6 onboarding, not a raw PrometheusK link).
- **Honest non-handoffs**: Together → ArenaK and Watch → StreamK both show "Coming soon" with no
  href — both are `alpha`/`visibility: internal`/`domain: null` in the registry today. This is a
  **data gap in those products' registry entries**, not something fixable from this repo. Nav items
  for them point at `/#together`/`/#watch` (same-page anchor), never a dead link.
- **`SiteHeader`** (`components/SiteHeader.tsx`): global, responsive (desktop row / mobile
  disclosure), self-excludes on `/admin/*` by pathname check so it never merges with `AdminNav`.
  Shows Sign in (signed-out) or Continue + Account (signed-in, Account only if
  `NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED`). Reuses the existing `resolveClientPrincipal()` — did not
  reimplement auth-state resolution.
- **`HomeContinuity`** (`components/HomeContinuity.tsx`): signed-in-only banner from real data
  already in `auth.users.user_metadata.journey` (RC5) — renders nothing if there's no real signal,
  never invents a universal cross-product resume state.
- **Migrated off two hardcoded cross-product URLs**: `app/page.tsx`'s old `WATCH_FIRST_URL` literal
  (Session 1) and `lib/onboarding/prometheusk.ts`'s independent `PROMETHEUSK_ORIGIN` literal
  (Session 1B) both now resolve through `resolveProductUrl()` against the shared registry. Verified
  byte-identical output both times — zero behavior change, just one fewer place PrometheusK's domain
  is spelled out by hand.
- **Accessibility**: every new interactive element has visible `focus-visible:outline` styling
  (matching the one pre-existing precedent, `/start`'s buttons); the home page's quiet-links `<nav
  aria-label>` landmark (present in the pre-Session-1 page, briefly dropped, restored in 1B); the
  mobile hamburger's glyph is `aria-hidden`.
- **Cleaned up**: `app/privacy/` and `app/products/`, two empty directories with no `page.tsx` and
  zero git footprint, removed (Privacy is a tab inside `/account`; Products has no consumer route
  by design).
- **Tests**: `lib/activities/registry.test.ts` (new, 6 tests) covers all four cards resolve, Explore
  gets a real href+beta, Practice routes through `/start` not PrometheusK's domain, Together/Watch
  are honest coming-soon with no href, and an invariant that `href === null` always implies
  `availability === 'coming_soon'`.

## Known gaps — not yet done, don't assume otherwise

- **Together and Watch cannot go live from this repo alone.** ArenaK and StreamK need a confirmed
  public domain and `visibility: 'public'` in `packages/product-registry`'s `PRODUCT_REGISTRY`
  array — that's a registry-data PR (or upstream confirmation from those products' own repos), not
  a platform-shell task. Don't try to "fix" this by editing the shared package's shape; that's an
  explicit non-goal both sessions were given.
- **`availability` means two different things in two files.** `lib/products/registry.ts`'s
  `PLATFORM_PRODUCTS.availability` (admin-facing) is `'live' | 'coming_soon'` and treats `beta` as
  `coming_soon`. `lib/activities/registry.ts`'s `ActivityAvailability` (consumer-facing) is
  `'available' | 'beta' | 'coming_soon'` and treats `beta` as shown-with-a-badge. Both are correct
  for their own audience; nobody has reconciled the naming collision. If you touch either file,
  check the other doesn't silently disagree with what you just changed.
- **Light/dark theme split, now more visible.** `/auth/sign-in` and `/account` use a light
  black/white/`neutral-*` theme (Track B, Identity/Account/Admin). Everything else — home, `/start`,
  `/journey/*`, `/enter`, `/continue`, `/witness/*`, `/guide/*` — uses the dark
  `midnight`/`paper`/`gold` token system (Track A, RC1–RC6). This predates both sessions, but the
  new global `SiteHeader` (dark) now sits above the light pages too, making the seam a real,
  visible thing a user will see, not just an internal inconsistency. Nobody has decided which theme
  wins — that's a design-system decision, explicitly out of scope for both sessions.
- **No component/DOM test framework.** `pnpm test` runs Node's built-in test runner directly over
  `.test.ts` files (no jsdom/RTL/Playwright/vitest). All verification of `SiteHeader`/`ActivityCard`/
  `HomeContinuity` rendering was done by reading real SSR HTML from a `next build && next start`,
  not by an automated test. If you add a test framework, this is the first place that would benefit.
- **No live signed-in verification, either session.** No Supabase test credentials exist in this
  environment. Continue/Account nav branches and the `HomeContinuity` banner are verified by code
  reading plus pre-existing lower-level tests (`resolveClientPrincipal`, `readJourneyContext`), not
  by actually signing in and looking.
- **`docs/ECOSYSTEM_IMPLEMENTATION_GUIDE_V1.md` does not exist.** Session 1B's brief listed it as
  required reading. Checked every branch's full git history and the filesystem — it was never
  created. If a future session's brief references it again, it's still not there; don't assume it
  appeared.

## Findings worth carrying forward

- **`PlatformProduct`** (interface in `lib/products/registry.ts`) has zero importers anywhere else
  in the repo. Harmless — it documents `PLATFORM_PRODUCTS`'s real, live shape — but noted in case a
  future cleanup pass wants to demote it from `export`. Not worth churn on its own.
- **Import convention for anything that might run under `pnpm test`**: this repo's test files run
  via plain `node --experimental-strip-types --test`, which does **not** understand the `@/*`
  tsconfig path alias. Any `lib/**/*.ts` file that's imported (even transitively) by a `.test.ts`
  file must use relative imports with explicit `.ts` extensions (e.g. `../products/registry.ts`),
  not `@/lib/products/registry`. Got this wrong once in Session 1B while fixing
  `lib/onboarding/prometheusk.ts` (it's imported by `receipt.ts`, which `receipt.test.ts` exercises)
  — caught immediately by running the test, but worth knowing up front next time instead of
  rediscovering it.
- **Process note**: both sessions ran entirely inline (no sub-agent delegation for code changes),
  so there's no sub-agent-scope-creep risk to flag here, unlike the Identity/Account/Admin
  handoff's note about that.

## Next priorities

1. Get ArenaK and StreamK confirmed public domains + `visibility: 'public'` in the registry so
   Together/Watch can go live — the actual highest-value next step, and entirely a data/cross-repo
   question, not code here.
2. Decide the light/dark theme split (§ Known gaps) — either commit to one theme ecosystem-wide or
   formally document the two-theme split as intentional.
3. Reconcile or explicitly document the `availability` naming collision between the two registry
   adapter files.
4. If UI regressions in nav/home start recurring, add a jsdom/RTL or Playwright layer — deliberately
   not built in either session.
5. Live-verify signed-in nav and `HomeContinuity` once test credentials exist.
6. Push `014a48f`/`f29e415` to origin once reviewed (not done automatically this session, unlike
   Session 1's exit criteria which explicitly called for a push).
