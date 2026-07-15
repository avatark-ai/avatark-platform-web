# RC4 Route Contract — Platform / Prometheus Integration

**Audited:** 2026-07-15, against real code in `prometheusk-web`
(`/home/user/workspace/prometheusk-web`). No routes below are invented
— every entry has a file reference. Five independent audits were run,
one per RC4 deliverable, before any implementation started, per RC4's
global rule to preserve every RC1 stop condition.

## 1. Canonical return contract — STOP CONDITION TRIGGERED

**Verdict: no canonical mechanism exists. Confirmed, not stale — this reconfirms RC1's finding with direct code evidence.**

- Repo-wide grep for `returnTo`/`return_to`/`redirectTo`/`redirect_to`/`callbackUrl`/`callback_url`/`returnUrl`/`return_url` finds exactly two hits, both same-origin OAuth/magic-link redirects hardcoded to `window.location.origin` (`lib/account/services/authService.ts:17`, `app/login/page.tsx:38`) — neither reads or forwards any external URL.
- Zero hits anywhere in the repo for `witness`, `intention`, or `source=avatark-*` — Platform's handoff params are not read at all, not just `returnTo`.
- The practice route Platform links to (`app/(workspace)/my/borrow/[journeyId]/practice/[practiceId]/page.tsx`) calls only `useParams()`, never `useSearchParams()` — every query param, including `returnTo`, is dropped on load.
- The only "return" concept anywhere, `sanitizeNext()` (`app/login/page.tsx:9-13`), explicitly rejects absolute/external URLs by design (anti-open-redirect) and could not be repurposed without removing that safety check.
- Practice completion is a static client-side state machine (`runtime → reflection → echo → recommendation`) terminating in `RecommendationRuntime` (`lib/practice-runtime-v2/runtimes/RecommendationRuntime.tsx`), whose only exits are hardcoded internal `<Link>`s (`/my/timeline`, `/reflect-your-practice`, `/library`, `/create/new`). No prop, query param, or stored value lets it redirect externally.
- `next.config.js` has no `redirects()`/`rewrites()` referencing external domains.

**Why this is a stop condition, not a Platform-side task:** the browser already holds the referring URL, so no cross-domain auth or new DB table would be needed to make this work — but every piece of code needed (`useSearchParams` on the practice route, threading `returnTo` through 4 runtime stages, an allowlist permitting Platform's domain, and a `window.location.href` call at the terminal stage) lives entirely in `prometheusk-web`, a repo this session has no mandate to modify. **Reported, not implemented.**

## 2. Journey synchronization — STOP CONDITION TRIGGERED

**Verdict: no canonical mechanism exists; both a missing route and cross-domain auth are required.**

- `types/creation.types.ts:1020-1031` defines `UserJourneyStage` (`currentStage`, `totalRuns`, `stage1ReachedAt`…) — the type shaped for this — but it has **zero references anywhere else in the repo**. No DB query builds it, no API route returns it. Dead/unwired code, not a working feature.
- The real, persisted per-user data (`TransmissionStreak`, practice session history) is exposed via `/api/transmissions/streak` and `/api/timeline` (`lib/db.ts:1172,2853,2895`), both gated by `requireAuth` → `getAuthPayload` (`lib/auth.ts:1-50`), which validates a Bearer token against **PrometheusK's own** Supabase project (`bxerfgwrtwowzgahdgrj.supabase.co` in production) — a different project than Platform's. A token minted by Platform's Supabase cannot validate here; there is no shared signing key or trust relationship.
- `app/api/me/route.ts:1-33` merely base64-decodes a JWT with **no cryptographic verification** (an explicit "P0 development" placeholder) — not a legitimate integration surface.
- The only unauthenticated public endpoints (`/api/pass-forwards/[token]`, `/api/test-context/[token]`) are one-time, token-scoped content shares that explicitly strip user identity (`toPublicView` never returns `giver_id`) — not adaptable to a per-user progress feed.

**Reported, not implemented** — would require new cross-domain auth (a stop condition on its own) *and* new PrometheusK-side plumbing to wire up the unused `UserJourneyStage` type, neither of which this session can build from Platform's side alone.

**RC5 reclassification (2026-07-15): deferred beyond minimal RC5 completion receipt.** RC5 (`docs/RC5_HANDOFF_CONTRACT.md`) added a narrow `practiceCompletedAt` flag, recorded only after a signed PrometheusK completion receipt verifies — that is the full extent of cross-product journey state Platform now records. The richer synchronization scoped here (progress feed, streaks, session history) remains undone and still requires the cross-domain auth this audit found missing.

## 3. Practice continuation — IMPLEMENTED

**Verdict: no dedicated route, but an existing one already does the job with zero params.**

- PrometheusK computes "what's next" via `lib/home/useNextAction.ts:34-151` (priority: in-progress session → brand-new fallback → inactive-resume → reflect-pending → personalized-next), rendered by `components/home/HomeHero.tsx` inside `components/home/HomeContent.tsx:55`, mounted at the app root (`app/page.tsx`, route `/`) — only when the visitor has an active PrometheusK session (`isAuthenticated`).
- No `/my/journey`, `/my/continue`, or equivalent dedicated route exists.
- Auth is Supabase-session-based (browser storage, not cookies); the hook reads the signed-in user's own timeline via `/api/timeline` — no `userId` param path exists or would be honored, so this only works for a visitor who already has (or gets, via existing sign-in) a live PrometheusK session. That's the same precondition Platform's existing handoff already assumes — no new auth requirement.
- `app/login/page.tsx` supports a same-origin `?next=` redirect, so `/login?next=/` is available if a sign-in gate is ever needed in front of it, though `/` itself works directly for an already-signed-in visitor.

**Implemented:** `lib/onboarding/prometheusk.ts`'s new `buildContinueUrl()` links straight to `/` — see `docs/RC4_INTEGRATION_REPORT.md` for where it's wired in.

## 4. Recommendation entry — IMPLEMENTED (same route as #3)

**Verdict: the personalized recommendation has no distinct route either — it lives on the same homepage dashboard.**

- `components/home/TodaysRecommendationCard.tsx` (drawing on `lib/insights/recommendationEngine.ts:13`, `getRecommendation`) renders alongside `useNextAction`'s resume card on the same `/` dashboard.
- A distinct, non-personalized fallback exists at `GET /api/intelligence/recommendations` (`publicRoute: true`, no auth) — but it's a JSON API surfacing only a generic `rec_score` catalog ranking, not the personalized "next thing for this user," and not a page a browser could land on.
- `MASTER_PLAN.md:257`'s acceptance criterion ("Returning user sees: active creation card with recommended next action") confirms this was always designed as embedded homepage content, not a separate linkable entry point.

**Implemented:** same `buildContinueUrl()` link as #3 — visiting `/` while signed in surfaces both the resume action and the recommendation in one place, so one integration point covers both deliverables.

## 5. Living Echo preview — STOP CONDITION TRIGGERED

**Verdict: no unauthenticated-safe preview route exists; the only implied one was never built.**

- The real Living Echo (`app/(workspace)/my/echo/page.tsx:1-55`) is reachable without auth (no `middleware.ts` exists anywhere in the repo) but renders only "Not signed in" without a live Supabase session (line 31) — not a usable preview.
- `app/onboarding/echo/[practiceId]/page.tsx` is confirmed (by its own in-file comment) to be a deliberately separate, private, presentational placeholder — explicitly **not** the real Living Echo. It's a static "you created your first Living Echo" congratulations screen with no real data.
- `/watch-first` is a 6-line route with a hardcoded script import — no dynamic params of any kind.
- `components/echo/EchoSharing.tsx:40-46` builds a public share link (`${origin}/echo/{echo_share_slug}`) implying a public preview page exists — but **no `app/echo/[slug]` route exists anywhere in the repo.** The share-slug feature generates a link to a page that was never built.
- A genuinely public, unauthenticated "echoes" concept does exist (`/api/echoes/:id`, `EchoShareCard.tsx`) — but it's approved testimonial-quote content on contributions, an entirely different feature that happens to share the word "echo." Not the Living Echo.

**Reported, not implemented** — building this would require either a new public route in `prometheusk-web` (out of this session's mandate) or full cross-domain auth (a stop condition on its own).

**RC5 reclassification (2026-07-15): deferred; authenticated-only today.** RC5 (`docs/RC5_HANDOFF_CONTRACT.md`) deliberately did not build a public share-slug preview — see that spec's "Living Echo Decision." The authenticated `/my/echo` route in `prometheusk-web` is unaffected and remains the only real Living Echo surface.

## Summary

| Deliverable | Status |
|---|---|
| Canonical return contract | Stop condition — reported, not built |
| Journey synchronization | Stop condition — reported, not built; RC5 deferred a narrow `practiceCompletedAt` flag instead (see `docs/RC5_HANDOFF_CONTRACT.md`) |
| Practice continuation | Implemented via existing `/` |
| Recommendation entry | Implemented via existing `/` (same change as above) |
| Living Echo preview | Stop condition — reported, not built; RC5 deferred, authenticated-only today |
