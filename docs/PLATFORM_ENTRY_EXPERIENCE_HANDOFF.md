# AvatarK Platform Entry Experience — Handoff & Current State

**As of:** 2026-07-21 (three sessions: "Session 1" home/nav build, "Session 1B" production audit,
"Session 6 / Wave 1" cross-repo registry & navigation integration), branch
`feature/avatar-home-registry-navigation`. Base: `feature/product-registry-package` @ `fec4c81`
(this repo has no `main` — see "Repo topology" below). **Fully pushed to origin as of `bfd817c`** —
Session 1B's two commits (`014a48f`, `f29e415`) were pushed by Session 6, closing out the "next
priorities" item that had been open since Session 1B. Not merged. Not deployed.

This document is the **current-state summary** — read this first when picking the work back up.
`docs/SESSION_1_HOME_NAV_CHECKPOINT.md` and `docs/SESSION1B_CHECKPOINT.md` are the specific
per-session reports; `docs/PLATFORM_PRODUCTION_AUDIT_V1.md` is the detailed audit;
`docs/ecosystem/SESSION6_CHECKPOINT.md` and `docs/ecosystem/WAVE1_REGISTRY_INTEGRATION_REPORT.md`
cover Session 6 specifically, including full per-product verification detail this document only
summarizes.

## Repo topology (easy to get wrong)

No `main` branch exists. The real trunk lineage is linear:

```
platform/foundation-20260714 (RC1-RC6 shell)
  -> identity-account-admin/checkpoint-1-20260720 (Platform Completion P1-P8)
    -> feature/product-registry-package (Product Registry package + architecture-freeze docs)
      -> feature/avatar-home-registry-navigation (THIS WORK — Sessions 1, 1B & 6)
```

`feature/product-registry-package` and everything before it in that chain is pushed. This branch
is now fully pushed through Session 6's commit (`bfd817c`) — Session 1B's commits sat unpushed for
one session before Session 6 pushed them alongside its own.

## How to tell what state this is in when you come back

```
git log --oneline fec4c81..HEAD
git log origin/feature/avatar-home-registry-navigation..HEAD --oneline   # commits not yet pushed
pnpm exec tsc --noEmit && pnpm lint && pnpm test && pnpm build
```

All four passed clean as of `bfd817c` (100/100 tests, including the two Session 6 updated to match
the intentional ArenaK/StreamK registry change). If they don't, something changed — trust the
commands over this document.

## Mission recap

Session 1: implement the first real AvatarK consumer home and registry-driven navigation — make
the ratified Activity/Product architecture (`ARCHITECTURE_DECISION_LOG_V1.md`) visible to a user
for the first time, without redesigning any of it. Session 1B: audit that work end-to-end for
production readiness, fix what was safe to fix, document what wasn't. Session 6 (Wave 1 of a
cross-repo Ecosystem Integration program, run from `dt4m-os`): verify every registered product's
registry data against real evidence and fix what was directly actionable (ArenaK/StreamK
domain+visibility), without touching status or any other product-maturity call.

## What's real and working right now

- **Home (`/`)**: four intent-first cards — Explore, Practice, Together, Watch — replacing the old
  PrometheusK-only hero. No forced sign-in, no fabricated availability. `lib/activities/registry.ts`
  is the single source of truth for the Activity→Product mapping (a new, app-level, non-shared-
  package file — `packages/product-registry` itself is untouched, byte-for-byte, since before
  Session 1).
- **Real handoffs**: Explore → GameK (`beta`, public, `https://app.avatark.ai/gamek`). Practice →
  AvatarK's own `/start` funnel (unchanged RC1–RC6 onboarding, not a raw PrometheusK link).
- **Honest non-handoffs, partially closed by Session 6**: Together → ArenaK and Watch → StreamK
  still show "Coming soon" with no href, but the reason changed. Both products' `domain` and
  `visibility` are now confirmed and correct (`https://next.arenak.ai` / `https://www.streamk.ai`,
  both `visibility: 'public'` — verified live via direct HTTP request + page-title check, not taken
  on memory). What's left is `status`, still `alpha` for both — `registryAvailability()` requires
  `status` in `{'live','beta'}` **and** `visibility: 'public'` before showing anything but
  coming-soon, so the visible card state hasn't changed yet. Bumping `status` is a product-maturity
  call, deliberately left to a human, not made by Session 6. See
  `docs/ecosystem/WAVE1_REGISTRY_INTEGRATION_REPORT.md` §3 for the full reasoning. Nav items for them
  still point at `/#together`/`/#watch` (same-page anchor), never a dead link.
- **`SiteHeader`** (`components/SiteHeader.tsx`): global, responsive (desktop row / mobile
  disclosure), self-excludes on `/admin/*` by pathname check so it never merges with `AdminNav`.
  Shows Sign in (signed-out) or Continue + Account (signed-in, Account only if
  `NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED`). Reuses the existing `resolveClientPrincipal()` — did not
  reimplement auth-state resolution.
- **`HomeContinuity`** (`components/HomeContinuity.tsx`): signed-in-only banner from real data
  already in `auth.users.user_metadata.journey` (RC5) — renders nothing if there's no real signal,
  never invents a universal cross-product resume state.
- **Migrated off three hardcoded cross-product URLs, across three sessions**: `app/page.tsx`'s old
  `WATCH_FIRST_URL` literal (Session 1) and `lib/onboarding/prometheusk.ts`'s independent
  `PROMETHEUSK_ORIGIN` literal (Session 1B) both resolve through `resolveProductUrl()` against the
  shared registry. Session 1B's fix left one remnant behind, though: a `|| "https://prometheusk.avatark.io"`
  fallback on `PROMETHEUSK_ORIGIN` itself, for the case `resolveProductUrl()` returned falsy. Session
  6 removed it — `prometheusk` is a static registry entry with a non-null domain, so the fallback
  could never actually trigger, but it silently duplicated the registry's domain value outside the
  registry, meaning a future domain change there would have left this file pointing at a stale URL
  instead of failing loudly. Replaced with an explicit invariant check that throws instead.
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

- **Together and Watch still can't go live, but the reason narrowed in Session 6.** ArenaK and
  StreamK's `domain`/`visibility` are now confirmed and correct (see above) — what's blocking the
  home page now is `status` alone, still `alpha` for both. Bumping it to `beta`/`live` (matching
  GameK's precedent) is the one remaining change that would flip the consumer-visible state — an
  explicit product-maturity decision, not made by any of the three sessions so far. Don't try to
  "fix" this by editing the shared package's shape; that's still an explicit non-goal.
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
- **The ecosystem governance corpus now exists (it didn't as of Session 1B).** Session 1B's brief
  listed `docs/ECOSYSTEM_IMPLEMENTATION_GUIDE_V1.md` as required reading and found it didn't exist
  anywhere. It exists now, but in `dt4m-os`, not this repo: `dt4m-os/docs/ecosystem/
  ECOSYSTEM_IMPLEMENTATION_GUIDE_V1_1.md` and five siblings (Integration Plan, Merge Plan, Release
  Plan, Readiness Scorecard, Program Status — now at version 1.1 after a governance cleanup pass).
  Session 6 read all four of the ones relevant to registry/nav work before touching any code here.
  If a future session's brief references this guide, look in `dt4m-os`, not this repo.

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
- **Process note**: all three sessions ran entirely inline (no sub-agent delegation for code
  changes), so there's no sub-agent-scope-creep risk to flag here, unlike the Identity/Account/Admin
  handoff's note about that. Session 6 additionally verified its two domain claims (ArenaK,
  StreamK) with a real `curl` request and page-title check before writing them into the registry,
  rather than trusting a plausible prior finding (`dt4m-os` project memory) on its own — worth
  doing again for any future registry-domain claim, confirmed or not.

## Next priorities

1. **Decide ArenaK's and StreamK's `status`** (`alpha` → `beta`/`live`) — now the *only* remaining
   change that would make Together/Watch go live on the home page; domain/visibility are done. A
   product-maturity decision, not a data-confirmation task like Session 6's was.
2. Decide the light/dark theme split (§ Known gaps) — either commit to one theme ecosystem-wide or
   formally document the two-theme split as intentional.
3. Reconcile or explicitly document the `availability` naming collision between the two registry
   adapter files.
4. If UI regressions in nav/home start recurring, add a jsdom/RTL or Playwright layer — deliberately
   not built in any of the three sessions so far.
5. Live-verify signed-in nav and `HomeContinuity` once test credentials exist.
6. ~~Push `014a48f`/`f29e415` to origin~~ — done by Session 6 (`bfd817c`, branch now fully pushed).
7. GameK's registry domain (`https://app.avatark.ai/gamek`) resolves and mentions GameK, but its
   `<title>` reads "AWE Platform," not GameK-branded like every other confirmed domain's — Session 6
   flagged this, didn't investigate further (would need reading `gamek-web` itself).
8. Add the registry's missing return-flow modeling — no `AvatarKProduct` field exists for
   return-to-Platform destination/title/breadcrumb today; every product pair that has one (only
   PrometheusK, via RC5) implements it as ad hoc per-repo code. An architecture change, flagged as
   debt by Session 6, not scheduled.
