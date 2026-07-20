# Session 1 — Home & Navigation Implementation Checklist

**Status:** grounded audit, not architecture. One focused pass. Written before any application
code in this session changes.

---

## 1. Current branch and repository state

- Repo has **no `main` branch**. Local branches: `feature/product-registry-package` (current,
  `HEAD=fec4c81`), `identity-account-admin/checkpoint-1-20260720`, `platform/foundation-20260714`.
  A worktree at `.claude/worktrees/rc5-handoff-docs` (branch `worktree-rc5-handoff-docs`) exists,
  clean, not being modified by any running process — leftover from a prior session, left alone.
- History is **linear**: `platform/foundation-20260714` (RC1–RC6 shell) →
  `identity-account-admin/checkpoint-1-20260720` (Platform Completion P1–P8) →
  `feature/product-registry-package` (product registry package + architecture-freeze docs, 7
  commits, not yet pushed). `feature/product-registry-package` already contains everything prior
  work produced — it is the correct base for Session 1.
- Working tree is clean except untracked `.claude/` (harness-local settings; not touched).
- Confirmed no other Claude Code session has this checkout open — the two other running `claude`
  processes have `cwd=/home/user/workspace/gamek-web`, a different repo.
- Architecture docs from the previous session (`ARCHITECTURE_INDEX_V1.md`,
  `ARCHITECTURE_DECISION_LOG_V1.md`, etc.) are **already committed** (`fec4c81`), not uncommitted.

## 2. Existing homepage route and current behavior

`app/page.tsx` is **PrometheusK-only**, not a multi-product AvatarK home: hero copy ("Every life
leaves an Echo"), primary CTAs `/start` and `/enter`, quiet links to a hardcoded
`WATCH_FIRST_URL = "https://prometheusk.avatark.io/watch-first"`, `/continue`, and `/auth/sign-in`.
No Explore/Practice/Together/Watch concept exists anywhere in the UI today. `app/layout.tsx` has
no header/nav — `<body>` renders `{children}` directly.

## 3. Existing navigation components

- No shared, cross-product consumer nav exists.
- `app/journey/layout.tsx` renders its own local tab nav (Today/History/Settings) — PrometheusK-
  continuity-specific, out of scope.
- `app/admin/AdminNav.tsx` + `app/admin/layout.tsx` render AvatarK's own admin sections — **not a
  migration target** (confirmed by `PLATFORM_PRODUCT_DISCOVERY_INTEGRATION_V1.md` §9); must stay
  fully separate from whatever consumer nav this session builds.

## 4. Existing Product Registry package and adapters

- `packages/product-registry` (workspace package `@avatark/product-registry`) is real, tested,
  and already a dependency of this app (`pnpm-workspace.yaml`, `package.json`). It holds 9 products
  (incl. `avatark` itself — see §11). Only `prometheusk` (`live`, `public`, real domain) and
  `gamek` (`beta`, `public`, real domain) are usable by an end user today; `arenak` and `streamk`
  are `alpha`/`visibility: internal` with **no domain** — real gaps, not oversights.
- `lib/products/registry.ts` already derives an app-level `PLATFORM_PRODUCTS` view from the shared
  package (domain-override env vars, admin-URL knowledge) — consumed today only by
  `app/admin/page.tsx`, `app/admin/products/page.tsx`, `lib/account/adapters.ts`. This is the
  pattern to extend, not duplicate.
- `docs/PLATFORM_PRODUCT_DISCOVERY_INTEGRATION_V1.md` is a **design-only** doc (no code) proposing
  a larger `entryPoints`/`IntentCategory`/`ProductAudience` schema extension to the shared package.
  Per this session's mission ("preserve the currently shipped registry shape unless a minimal
  additive change is required"), that full extension is **not** built this session — it's a bigger
  schema migration than 4 cards need. Instead: a small app-level `lib/activities` adapter (new)
  maps the 4 primary Activities to registry product ids and derives availability from
  `status`/`visibility`/`domain` directly, following the same "derive, don't duplicate" pattern
  `lib/products/registry.ts` already established. The shared package itself is not modified.

## 5. Existing account/auth/admin dependencies that must remain untouched

- `/account` is real, mounted behind `NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED` (`true` in `.env.local`),
  uses `@avatark/account` + `lib/account/adapters.ts`. Nav's "Account" link must not assume the flag
  is always on.
- `resolveClientPrincipal()` (`lib/auth/resolveClientPrincipal.ts`) is the existing, tested
  signed-in/signed-out check (races Supabase against a 10s timeout) — reuse for nav state, don't
  reimplement.
- `/start`, `/enter`, `/enter/[token]`, `/continue`, `/journey/*`, `/auth/*` are RC1–RC6 shipped
  flows (intentions, invitation codes, signed completion receipts). None of these are touched by
  this session except: `app/page.tsx`'s CTAs into them stay the same hrefs (`/start`, `/enter`),
  and the hardcoded `WATCH_FIRST_URL` gets resolved through the registry instead of a literal
  string (the one item `ARCHITECTURE_INDEX_V1.md` marks **P1**).
- `/admin/*` layout/authz (`lib/admin/authz.ts`) is untouched; the new consumer header must
  self-hide on `/admin/*` rather than being merged into it.

## 6. Existing tests relevant to home, navigation, registry, auth, account

`package.json`'s `test` script runs Node's built-in test runner (`node --experimental-strip-types
--test`) directly over `.test.ts` files — **there is no jsdom/RTL/vitest configured**, so no
component/DOM-rendering tests exist or can be added without a new framework dependency (out of
scope for this session; noted as a known gap, not silently worked around). Existing relevant
suites: `lib/auth/safeReturnPath.test.ts`, `lib/auth/callbackError.test.ts`,
`lib/products/health.test.ts`, `lib/products/access.test.ts`,
`packages/product-registry/src/validation.test.ts`, `.../helpers.test.ts`. No tests reference the
homepage or a nav component today (none exist).

## 7. Exact files likely to be modified

- `app/page.tsx` — replaced with the four-intent home.
- `app/layout.tsx` — mount the new header component.
- `lib/products/registry.ts` — extract a small exported `resolveProductUrl()` so the new activities
  adapter reuses the existing domain-override logic instead of duplicating it (additive, no
  behavior change to current exports).
- **New files:** `lib/activities/registry.ts` (+ `.test.ts`), `components/SiteHeader.tsx` (+
  mobile nav), `components/ActivityCard.tsx` (or similar), this checklist, the checkpoint doc.

## 8. Exact files that must not be modified

`app/admin/**`, `app/journey/**`, `app/account/page.tsx`, `app/auth/**`, `app/enter/**`,
`app/continue/**`, `lib/auth/**`, `lib/admin/**`, `lib/account/**`, `lib/onboarding/**`,
`lib/journey/**`, `packages/product-registry/src/{types,registry,helpers,hooks,validation}.ts`
(shared package shape stays frozen this session), `supabase/**`, anything under
`.claude/worktrees/`.

## 9. Proposed commit sequence

1. `docs: Session 1 grounded implementation checklist` (this file)
2. `feat: activity registry adapter over the shared Product Registry`
3. `feat: AvatarK intent-first home (Explore/Practice/Together/Watch)`
4. `feat: consumer SiteHeader navigation, admin nav untouched`
5. `test: activity registry coverage`
6. `docs: Session 1 checkpoint and handoff`

## 10. Verification commands

```
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
pnpm dev   # manual: curl/read rendered HTML for signed-out home, nav, /admin isolation
```

## 11. Known blockers or stop conditions — checked, none block

- Another session writing the same files: **checked, clear** (§1).
- Product Registry branch not available/consumable: **false** — it's the current branch.
- Implementing the home requires modifying a destination repo: **not required** — Explore/Practice
  link out to existing external domains; Together/Watch show honest coming-soon states.
- Required destination URL unverifiable: **true for ArenaK/StreamK** — handled by design (coming
  soon), not a blocker.
- Would alter identity ownership: no.
- Would pass auth tokens cross-domain: no — plain `<a href>`/`<Link>` to external origins, no token
  in URL or storage access.
- Would resolve AvatarK-as-product-vs-platform: **not resolved** — `avatark`'s registry entry is
  left exactly as-is; the new home/nav treat AvatarK as the platform brand (logo/wordmark, `/` and
  `/account`), never as a fifth intent card competing with Explore/Practice/Together/Watch.
- Would reopen five-vs-four Activities: **not reopened** — the ratified corpus has five
  (Explore/Practice/Together/Watch/Create); this session's mission explicitly scopes the *home
  page's primary cards* to four, with Create intentionally not a primary card (per mission Phase 1
  and the Decision Log's own "Create is the last-rung, least-used Activity" finding). That's a
  presentation choice for one surface, not a re-count of Activities.
- Existing account/admin/auth tests regressing: none touched; will re-run full suite before commit.
- Repository dirty in ways that can't be isolated: no — clean tree, one untracked harness dir.
