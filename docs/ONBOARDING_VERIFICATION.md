# Onboarding Vertical Slice — Verification (RC1 Phase 2)

**Verified:** 2026-07-15, against the deployed Phase 2 slice (commits
`6e6a615`..`cf47760` on `platform/foundation-20260714`). No test
runner is installed in this repo (`package.json` has none, and
`tests/e2e|integration|unit` are empty scaffolds) — per RC0 precedent
(`e7233d4`), verification here is a real, driven browser pass against
both the local dev server and the hosted Vercel deployment, not a
unit-test suite. Adding a test framework was judged out of scope for
"smallest complete vertical slice."

## Local (headless Chromium, `next dev`)

| Step | Result |
|---|---|
| `/` loads | Headline, both primary CTAs, and quiet links (`Watch First`, `Continue Your Journey`, `Sign In`) render. No console errors. |
| `Begin with an Echo` → `/start` | All 6 intentions render as buttons. |
| Choose `I want more clarity` | Navigates to `/witness/the-promise-to-myself?intention=clarity`. Story, practice, time estimate, "why it mattered" all render. |
| `Borrow This Practice` href | `https://prometheusk.avatark.io/my/borrow/builder-journey/practice/aad2380d-8d13-4499-8ac9-eb37d9f41cbb?source=avatark-onboarding&witness=the-promise-to-myself&returnTo=<encoded /continue url>&intention=clarity` — only intention/witness/source/returnTo passed, no reflection/journal data. |
| `/continue?witness=...&intention=...` signed out | Explains continuity, offers magic-link sign-in at `/auth/sign-in?return=%2Fcontinue%3F...` — returnTo preserved. |
| `/journey?witness=...&intention=...` signed out | Client-side redirects to `/auth/sign-in?return=%2Fjourney%3F...` — returnTo preserved. |
| `/account`, `/auth/sign-in` | Both load with no errors; unaffected by onboarding changes. |
| `/enter` | 404 — known, pre-existing gap (see below), not part of this phase's scope. |

## Hosted (`https://avatark-platform-web.vercel.app`, deploy `dpl_6bLeiut94gaVhgAFmxHKcTwsqqVM`, built from `cf47760`)

```
200  /
200  /start
200  /witness/the-promise-to-myself?intention=clarity
200  /continue?witness=the-promise-to-myself&intention=clarity
200  /journey?witness=the-promise-to-myself&intention=clarity
200  /account
200  /auth/sign-in
404  /enter
```

Vercel build succeeded; production alias serves the full slice.

## Known gap: no real return trip from PrometheusK

Per `docs/ONBOARDING_ROUTE_CONTRACT.md`, PrometheusK's practice/reflection
routes read no query parameters and cannot redirect to an external
caller after completion. `returnTo` is sent (forward-compatible) but is
inert today — a visitor who borrows a practice is not carried back to
`/continue` automatically. This is a PrometheusK-side limitation, not a
defect in this repo's handoff code, and is unchanged by this phase.

## Known gap: `/enter`

The landing page's secondary "Enter an Invitation" CTA links to `/enter`,
which 404s. `docs/ONBOARDING_ROUTE_CONTRACT.md` already scoped this: the
invitation path should be a plain redirect to legacy `avatark.ai/enter/[token]`,
not a rebuild, and was out of scope for Phase 2A–2F (the intention-based
path). Left unimplemented; flagged here so it isn't mistaken for coverage.
