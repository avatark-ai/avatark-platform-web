# AvatarK Platform — Production Readiness / Consumer Journey Audit — V1

**Session:** 1B. **Scope:** audit + cleanup of the consumer-facing entry experience built in Session
1 (`feature/avatar-home-registry-navigation`). No new architecture, no navigation redesign, no
Activity redesign, no Product Registry redesign — per this session's explicit mission.

**Read-first compliance:** `docs/ECOSYSTEM_IMPLEMENTATION_GUIDE_V1.md`, listed as required reading
in this session's brief, **does not exist** in this repo — checked against the full working tree,
every branch's git history, and the rest of the filesystem. Nothing in this audit relies on its
content. This is named rather than silently worked around, per this repo's own established
documentation discipline (see `ARCHITECTURE_DECISION_LOG_V1.md`'s own precedent of surfacing
corpus gaps instead of smoothing them over).

---

## 1. Current maturity

| Layer | State |
|---|---|
| Landing (`/`) | **Real.** Four intent-first cards (Explore/Practice/Together/Watch), registry-driven availability, no forced sign-in. |
| Navigation | **Real.** `SiteHeader` — registry-backed, responsive, self-excludes `/admin`. This closes the one load-bearing gap `ARCHITECTURE_INDEX_V1.md` §4 flagged: "every product's Navigation column is NOT STARTED." That finding is now **stale** — Explore and Practice are wired; Together/Watch are honestly gated, not wired, because their registry entries are `alpha`/`internal` with no domain (a data gap, not a nav gap). |
| Explore → GameK | **Real handoff.** `beta`, `public`, resolves to `https://app.avatark.ai/gamek`. |
| Practice → PrometheusK / `/start` | **Real, pre-existing.** Routes through AvatarK's own tested `/start → witness → guide → borrow → receipt` funnel (RC1–RC6), not a raw link to PrometheusK's domain. |
| Together → ArenaK | **Not implementable today.** `alpha`, `visibility: internal`, `domain: null` in the registry. Home/nav show an honest "Coming soon"; this is a data gap in the registry/product side, not a platform-shell gap. |
| Watch → StreamK | **Not implementable today.** Same shape as ArenaK. |
| Continue / Account | **Real for signed-in users**, gated correctly on `resolveClientPrincipal()` and `NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED`. |
| Authentication | **Real, pre-existing, untouched.** Magic link + feature-flagged Google OAuth, tested (`safeReturnPath.test.ts`, `callbackError.test.ts`). |
| Onboarding / Invitation / Journey / Return flow | **Real, pre-existing, untouched.** RC1–RC6 signed-receipt architecture; verified this session only by reading, not re-testing (already covered by existing passing tests). |
| Profile / Privacy | **Exists only as tabs inside `/account`** (via `@avatark/account`). There is no dedicated `/privacy` route — see §5.3. |

**Overall:** AvatarK now functions as a real front door for two of four primary intents (Explore,
Practice), with the other two honestly gated rather than faked. That is the correct, honest state
given the registry's real data — not a shortfall of this session's work.

---

## 2. Architecture compliance

Checked against `ARCHITECTURE_DECISION_LOG_V1.md` and `ARCHITECTURE_INDEX_V1.md`, no violations
found:

- **Five Activities, four primary home cards** — not reopened. Create/StudioK is absent from the
  home by deliberate scope choice (per Session 1's mission and the Decision Log's own "Create is
  the least-used, last-rung Activity" finding), not a re-count of Activities.
- **AvatarK-as-product-vs-platform tension** — untouched. `avatark`'s entry in `PRODUCT_REGISTRY`
  was not modified; AvatarK is never rendered as a fifth intent card.
- **No Franchise/Activity fields added to the Registry** — confirmed; `packages/product-registry/
  src/{types,registry,helpers,hooks,validation}.ts` are byte-for-byte untouched this session (`git
  diff --stat` against `fec4c81` shows zero changes there across both Session 1 and 1B).
- **No re-implementation** — AvatarK still only links out to GameK/PrometheusK; it renders none of
  their practice/game UI itself.
- **No cross-domain auth** — every cross-product link is a plain `<a href>`/`<Link>`; nothing
  passes a Supabase token or session identifier across an origin boundary.

---

## 3. Navigation consistency

- One registry-backed source of Activity→destination truth (`lib/activities/registry.ts`), used
  identically by `SiteHeader` and `app/page.tsx` — no second hardcoded copy.
- **Real inconsistency found, not previously flagged:** `lib/products/registry.ts`'s
  `PLATFORM_PRODUCTS.availability` (admin-facing, `'live' | 'coming_soon'`, treats `beta` as
  `coming_soon`) and `lib/activities/registry.ts`'s `ActivityAvailability` (consumer-facing,
  `'available' | 'beta' | 'coming_soon'`, treats `beta` as shown-with-badge) disagree about GameK:
  the admin Products page reports it `coming_soon`, the consumer home reports it available (beta).
  Both are internally correct for their own audience (an admin dashboard being conservative about
  "live" vs. a consumer surface wanting to show real beta products with a badge), but the same
  field name (`availability`) meaning two different things across two files is a real footgun for
  the next person who reads one and assumes it matches the other. **Not fixed here** — changing
  either file's semantics is an admin-facing behavior change outside this session's consumer-journey
  mandate. Logged as technical debt (§6).
- `WATCH_FIRST_URL` (flagged **P1** in `ARCHITECTURE_INDEX_V1.md` §2) — migrated in Session 1,
  reconfirmed clean this session (no remaining literal anywhere in the tree).
- **New this session:** `lib/onboarding/prometheusk.ts`'s `PROMETHEUSK_ORIGIN` was a second,
  independent hardcoded copy of PrometheusK's domain (predates the registry). Now resolves through
  `resolveProductUrl(getProductById('prometheusk'))`, with the literal kept only as a same-value
  fallback. Verified byte-identical output before/after (`https://prometheusk.avatark.io`) and all
  100 tests still pass — this was a real duplicate source of truth, now collapsed to one.
- Admin navigation (`AdminNav.tsx`) remains fully separate from consumer navigation, confirmed live
  (`/admin` redirects to sign-in before any consumer chrome would matter; `SiteHeader` self-excludes
  `/admin/*` by pathname check either way).

---

## 4. Accessibility findings

| Finding | Severity | Status |
|---|---|---|
| Home page's quiet-links row lost its `<nav aria-label="Other ways to begin">` landmark when Session 1 rewrote `app/page.tsx` (regression from the original page, which had it) | Medium | **Fixed** this session |
| `SiteHeader`, `ActivityCard`, `HomeContinuity` CTAs and nav links had no visible `focus-visible` outline, inconsistent with the one existing precedent in the repo (`/start`'s intention buttons use `focus-visible:outline`) | Medium | **Fixed** this session — same `focus-visible:outline-2` + `var(--gold)` pattern applied everywhere new this session |
| Mobile hamburger button's glyph (`☰`/`✕`) had no `aria-hidden`, risking double-announcement alongside its `aria-label` in some screen readers | Low | **Fixed** this session |
| Disabled "Not available yet" affordance on coming-soon cards is a non-focusable `<span aria-disabled="true">`, not a real button | None — correct | Verified compliant: an inert control shouldn't be a tab stop at all, which is the WAI-ARIA-preferred pattern over a focusable-but-disabled control |
| `/auth/sign-in` and `/account` use a light theme (black/white/`neutral-*`) with no semantic `<main>` wrapper, while every onboarding/journey/home page uses the dark `midnight`/`paper`/`gold` token system | Medium | **Not fixed** — pre-existing (Track A vs. Track B built independently), now more visible because `SiteHeader` (dark) sits above these pages too. Documented in §6, not silently redesigned. |
| No global `:focus-visible` CSS convention exists (`globals.css` defines no focus rules at all) — every component currently repeats the same Tailwind utility string inline | Low | Not fixed — real duplication, but consolidating it into a shared class/CSS rule is a design-system change, which this session's mission explicitly excludes ("no design system work") |
| No jsdom/RTL/Playwright coverage exists for any of the above — all accessibility verification this session was manual (reading rendered SSR HTML) | Known gap | Unchanged from Session 1's checkpoint; still true |

---

## 5. Consumer journey findings

Walked: Landing, Navigation, Explore, Practice, Together, Watch, Continue, Account, Authentication,
Onboarding, Invitation, Journey, Return flow, Profile, Privacy.

### 5.1 Routing — no incorrect routing found
Every registry-derived href was re-verified against a real `next build && next start` (port 3011,
killed after verification): Explore → `https://app.avatark.ai/gamek`, Practice → `/start`,
Together/Watch → `/#together` / `/#watch` (honest same-page anchors, never a dead link), `/admin` →
307 to `/auth/sign-in?return=%2Fadmin` (unchanged), `/account`, `/enter`, `/start`, `/auth/sign-in`
all 200.

### 5.2 Stale copy found and fixed
- `app/layout.tsx`'s `<title>`/description still read "AvatarK — Every life leaves an Echo" / "Learn
  from people. Practice what works." — the exact hero copy Session 1 removed from the page itself.
  Updated to match the new intent-first framing.
- `components/ActivityCard.tsx` cited `docs/AVATARK_HOME_EXPERIENCE_V1.md` as if it were a file in
  this repo's `docs/` — it only exists in the separate `dt4m-os` reference repo. Comment corrected to
  not claim a local citation it can't back.

### 5.3 Real gap, not a bug: no dedicated `/privacy` or `/products` route
`app/privacy/` and `app/products/` were both empty directories (no `page.tsx`, zero git footprint —
`git ls-files` returned nothing for either, confirming git never tracked them). Privacy is handled
correctly today as a tab inside `/account` (via `@avatark/account`) and `/api/account/privacy`;
Products has no consumer-facing route by design (Product Registry is explicitly "routing
infrastructure, not a consumer-visible layer" per this session's own mission). **Removed both empty
directories** — they were pure filesystem debris that could mislead a future contributor into
thinking a route exists.

### 5.4 "Echo" copy divergence — documented, not changed
The new home page deliberately avoids the "Echo" metaphor (intent-first, product-agnostic copy per
Session 1's mission). Downstream Practice-specific pages (`/start`, `/journey/today`,
`/journey/history`, `/enter`) still use "Echo" as an established RC-era metaphor. This is a
reasonable, deliberate divergence from the redesign, not an inconsistency to fix — rewriting brand
copy across four pre-existing pages to match the new home would be a copy redesign beyond this
session's mandate.

### 5.5 Loading/empty/error states — spot-checked, no defects found
- `/journey/today`'s empty state ("You haven't begun an Echo yet…") correctly links to `/start`.
- `/continue`'s verified/unverified/no-receipt branches (RC5) all render distinct, honest copy.
- `SiteHeader`/`HomeContinuity` render nothing during principal resolution rather than flashing a
  wrong state — consistent with the existing `ContinueGate`/`JourneyChrome` pattern.
- No fabricated data found anywhere in the new surfaces (no fake counts, recommendations, or
  destinations).

---

## 6. Remaining technical debt (not fixed this session — logged, not resolved)

1. **`availability` field-name collision** between `lib/products/registry.ts` (admin, 2-state) and
   `lib/activities/registry.ts` (consumer, 3-state) — see §3.
2. **Light/dark theme split** across the app (`/auth/sign-in`, `/account` light; everything else
   dark) — pre-existing, now more visible under the new global dark header. A real design-system
   gap `ARCHITECTURE_INDEX_V1.md` §4 already named ("no formalized ecosystem-wide design system
   located") — this audit reconfirms it with a concrete, user-visible seam.
3. **No global focus-visible CSS convention** — every interactive element repeats the same inline
   Tailwind string.
4. **No component/DOM test framework** — unchanged from Session 1's checkpoint.
5. **Together/Watch cannot go live from this repo alone** — they're blocked on ArenaK/StreamK
   getting a real, confirmed public domain in the registry, which is data work in those products'
   own repos or a registry PR, not a platform-shell task.
6. **`docs/ECOSYSTEM_IMPLEMENTATION_GUIDE_V1.md` does not exist** despite being referenced as
   required reading by this session's brief — flagged for whoever owns documentation practice next.
7. **`PlatformProduct` (interface in `lib/products/registry.ts`) has zero external importers** —
   harmless (it documents `PLATFORM_PRODUCTS`'s real, live shape), not true dead code, not worth
   churn to remove. Noted, not actioned.

---

## 7. Production readiness score

**6.5 / 10 — real front door for half the ecosystem, honest about the other half.**

**What earns the score:** zero fabricated data anywhere in the consumer journey; every destination
either works or honestly says it doesn't; architecture corpus fully respected (no redesign, no
reopened decisions); admin/auth/account regressions: none found; build/lint/typecheck/tests all
green.

**What caps it below a higher score:** two of four primary Activities (Together, Watch) are
data-blocked, not platform-blocked — a real visitor today gets a home page where half the doors are
locked; a visible light/dark theme seam between the marketing/onboarding surfaces and account/
sign-in; zero automated UI-regression coverage (typecheck/lint/unit tests only); signed-in nav and
continuity states verified by code reading and pre-existing lower-level tests, not a live session
(no credentials in this environment, both this session and the last).

This score reflects the **platform shell's honest current state**, not a judgment on this session's
work — the work is complete and correct for what's actually buildable from this repo alone.
