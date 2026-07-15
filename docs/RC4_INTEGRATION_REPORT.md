# RC4 Integration Report — Platform / Prometheus Integration

**Completed:** 2026-07-15. Spec: `docs/RC4_SPEC.md`. Route contract
audit backing every decision below: `docs/RC4_ROUTE_CONTRACT.md`.

## Outcome per deliverable

| Deliverable | Outcome |
|---|---|
| Canonical return contract | **Stop condition** — no route in `prometheusk-web` reads `returnTo` or any handoff param; every query param is silently dropped; the terminal `RecommendationRuntime` only exits to hardcoded internal links. Fixing this requires new code in `prometheusk-web`, outside this session's repo. Reported, not built. |
| Journey synchronization | **Stop condition** — the type shaped for this (`UserJourneyStage`) is defined but never wired to any query or route; every real progress endpoint requires a PrometheusK-issued Supabase token, which is cross-domain auth Platform cannot produce. Reported, not built. |
| Practice continuation | **Implemented.** PrometheusK's homepage (`/`) already resumes the right practice for a signed-in visitor via `useNextAction`, with zero params. `lib/onboarding/prometheusk.ts`'s new `buildContinueUrl()` links there. |
| Recommendation entry | **Implemented**, same change as above — `TodaysRecommendationCard` renders on the same homepage dashboard, so one link covers both deliverables. |
| Living Echo preview | **Stop condition** — the only real Living Echo route requires a live session to render anything; a share-slug UI implies a public preview route that was designed but never built (`app/echo/[slug]` doesn't exist anywhere in `prometheusk-web`). Reported, not built. |

No cross-product database table was added. No cross-domain auth was introduced. Nothing sensitive was placed in a URL. Every RC1 stop condition was preserved, and three of five deliverables tripped one — reported here rather than worked around.

## What changed

- `lib/onboarding/prometheusk.ts` — added `buildContinueUrl()`, linking to PrometheusK's `/` for returning users; left `buildBorrowUrl()` untouched for first-time onboarding.
- `app/journey/today/page.tsx` — the returning-user branch (`context.witness` set) now uses `buildContinueUrl()` instead of re-sending users to the same fixed onboarding practice via `buildBorrowUrl()` with an already-confirmed-inert `returnTo`. Removed the now-dead `origin`/`useSyncExternalStore` plumbing that existed only to build that inert `returnTo`.

## Commits (oldest to newest)

- `d1d6601` docs: record RC4 spec verbatim
- `75bcc07` feat: send returning users to PrometheusK's homepage for practice continuation + recommendation (RC4)
- `68bdbf3` docs: record RC4 route contract audit

Each commit builds independently (`npm run lint`, `npx tsc --noEmit`, `npm run build` all pass at each commit).

## Hosted Playwright verification (2026-07-15, `https://avatark-platform-web.vercel.app`, built from `68bdbf3`)

| Flow segment | Result |
|---|---|
| `/enter/tok-123?intention=focus` → Meet Guide redirect | **PASS** — 200, redirects to `/guide/the-returner?invitation=tok-123&intention=focus` |
| Meet Guide page renders, links to Threshold | **PASS** — heading "Meet your guide", href carries `intention`+`invitation` forward |
| Threshold (`/witness/...`) loads | **PASS** — 200 |
| Orb gesture gates Borrow link | **PASS** — link count 0 before click, visible after click |
| Borrow href → PrometheusK | **PASS** — carries `witness`/`intention`/`invitation`/`returnTo`/`source` correctly |
| `/journey/today`, `/journey/history`, `/journey/settings` signed out | **PASS** — all 200, all correctly redirect to `/auth/sign-in?return=...` (pre-existing, unaffected behavior — regression check only) |
| PrometheusK `/` reachable, signed-out view matches audit | **PASS** — 200, generic "Welcome to Prometheus" landing, no dashboard content (confirms the audit's claim that dashboard personalization is auth-gated) |

**Not verified hosted, with a real signed-in session:** the returning-user branch itself (`buildContinueUrl()`'s link rendering and the "Return to your practice" CTA on `/journey/today` for a user with `witness` already set). This environment has no test Supabase account, magic-link email access, or service-role key to establish a real signed-in PrometheusK-linked session end-to-end. Instead, this was verified with a temporary local fixture harness (`app/rc4previewtmp`, same pattern as the prior Journey-continuity work's `app/journeypreviewtmp` — real component render, fixture props, deleted before any commit, never pushed): confirmed the returning-user branch renders "Return to your practice" with `href="https://prometheusk.avatark.io/?source=avatark-platform"`, alongside the other two branches ("Begin with an Echo" → `/start`, "Continue to the practice" → `/witness/...`) rendering correctly and unaffected.

**Flagging this explicitly rather than calling it hosted-verified:** if true end-to-end hosted verification of the authenticated path is needed (e.g. before RC5 builds on this boundary), it requires either a real test account with email access or a service-role-provisioned Supabase user with `journey` metadata pre-set — neither exists in this environment today.

## Stop conditions triggered (full detail in `docs/RC4_ROUTE_CONTRACT.md`)

1. Canonical return contract — no PrometheusK route reads or acts on `returnTo`.
2. Journey synchronization — cross-domain auth would be required; no wired route exists either way.
3. Living Echo preview — no PrometheusK route suitable (real Living Echo requires auth to render anything; implied public preview route was never built).

None were worked around. All three require changes on PrometheusK's side (`prometheusk-web`), a repo outside this session's mandate.

## Not started (explicitly out of scope per RC4 rules)

RC5 (Episode 000 / Threshold / practitioner archetype) and RC6 (beta audit) — not begun, per direct instruction.
