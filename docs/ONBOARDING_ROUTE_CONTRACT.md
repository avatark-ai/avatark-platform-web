# Onboarding Route Contract (RC1 Phase 1 Audit)

**Audited:** 2026-07-15, against real code in `avatark-platform-web`,
`prometheusk-web`, and legacy `avatark-web`. No routes below are
invented — every entry has a file reference. Where the prior
`LEGACY_ROUTE_MIGRATION.md` inventory is contradicted by current code,
that's called out explicitly.

## avatark-platform-web (Platform, this repo)

| Route | Auth | Query params | Return behavior | Deployed | RC1 suitable | Defects |
|---|---|---|---|---|---|---|
| `/` | none | — | — | Yes, `https://avatark-platform-web.vercel.app` (no custom domain yet — `avatark.ai` still points to legacy) | **No** — still the unmodified `create-next-app` scaffold (`app/page.tsx`) | Not built |
| `/account` | required (redirects to `/auth/sign-in?return=/account` if signed out) | none | n/a | Yes, verified live (RC0 accepted) | Yes — unchanged per instruction | None known |
| `/auth/sign-in` | n/a (entry point) | none | n/a | Yes | Yes — real magic-link form, functional | None known |
| `/auth/callback` | n/a | `code`, `return` | **Yes, real and safe** — `safeReturnPath()` (`app/auth/callback/route.ts:6-16`) only allows relative, same-origin paths; rejects `//` and `://`, defaults to `/account` | Yes | Yes — reusable pattern for `/continue`'s sign-in preservation | None known |
| `/start` | — | — | — | Directory exists (`app/start/`) but **empty — no `page.tsx`** | Scaffolded only, not implemented | Not built |
| `/enter/[token]` | — | — | — | Directory exists (`app/enter/[token]/`) but **empty — no `page.tsx`** | Scaffolded only, not implemented | Not built |
| `/enter/done` | — | — | — | **Does not exist in this repo at all** (confirmed no directory) | N/A — stays on legacy per below | — |
| `/products` | — | — | — | Directory exists but **empty** | Not implemented | Not built |
| `proxy.ts` (root, this Next version's middleware) | — | — | — | Live — refreshes Supabase session cookie on every non-static request (`proxy.ts`, `lib/supabase/proxy.ts`) | Already correct infra for auth continuity | None known |
| `/api/account/profile`, `/api/account/preferences`, `/api/account/privacy` | required | — | — | Yes | Unrelated to onboarding, unchanged | — |

## PrometheusK (`prometheusk-web`, deployed at `https://prometheusk.avatark.io`)

Next.js 14 App Router. **No `middleware.ts` in the repo** — all auth is
soft/client-side (`WorkspaceShell` sets a Zustand store from a Supabase
session but never redirects); only the `/api/practice-sessions/*`
routes are server-auth-gated. Every page below runs anonymously.

| Route | Auth | Query params | Return-to-caller support | RC1 role |
|---|---|---|---|---|
| `/demo` | none | none | none | Presenter-mode demo, not a real per-user flow |
| `/watch-first` | none | none | none — "Skip" hardcoded to `/onboarding` | Candidate for "Watch First" quiet CTA |
| `/onboarding?journey=` | none | `journey` (one hardcoded value: `guest`) | none | Internal onboarding shell, not designed for external entry |
| `/onboarding/practice/[id]?journey=` | soft | `journey` | none | — |
| `/onboarding/reflect/[id]?journey=&sessionId=` | soft | `journey`, `sessionId` (PrometheusK-internal id) | none | — |
| `/onboarding/echo/[id]?journey=` | none | `journey` | **none** — terminal CTA is a hardcoded `Link href="/"` | Explicitly documented in-file as **not** the real Living Echo — a private onboarding-only concept. Do not treat as a Living Echo preview. |
| **`/run/[practiceId]`** | none to run; auth only extends persistence | **none read at all** | **none** | **Best candidate practice runtime** — canonical, documented as production (`app/(workspace)/run/[practiceId]/page.tsx:2-6`). Chains runtime → reflection → Living Echo → recommendation in one file. |
| **`/my/borrow/[journeyId]/practice/[practiceId]`** | none | none | none | **Best candidate for "borrowable" framing** — identical runtime chain to `/run/`, tagged `metadata.source: 'borrowed_echo'` |
| `/my/borrow`, `/my/borrow/[journeyId]` | none (`publicRoute: true`) | `view` (`/my/borrow` only) | none | Browsable practice list — candidate for a future "choose a practice" step, not needed for RC1's single witness practice |
| `/my/echo?tab=` | soft (shows "Not signed in" inline, no redirect) | `tab` | none | The **real** Living Echo. Out of scope for RC1's honest-fallback design. |
| `/login?next=` | n/a | `next` | **Same-origin only** — `sanitizeNext()` explicitly rejects absolute/protocol-relative URLs | The only redirect-back concept anywhere in the repo, and it architecturally cannot target `avatark-platform-web`'s origin |

**Terminal screen for every practice/reflection flow is the shared
`RecommendationRuntime`** (`lib/practice-runtime-v2/runtimes/RecommendationRuntime.tsx:43-48`).
Its only exits are hardcoded internal links (`/my/timeline`,
`/reflect-your-practice`, `/library`, `/create/new`). No prop, query
param, or stored value lets it redirect externally.

**⚠ No route in `prometheusk-web` can return control to an external
caller after practice/reflection completes.** This is confirmed across
every terminal screen in the repo, not just the top candidate route.

## Legacy avatark-web (`https://avatark.ai`) — invitation/QR compatibility only

| Route | Auth | Query params | Token validation | Return behavior | Deployed | RC1 classification |
|---|---|---|---|---|---|---|
| `/enter/[token]` | none | **none beyond the token** (no campaign/cohort param exists in code, contradicting the prior migration doc) | `GET /api/entry/[token]` (public, unauthenticated) looks up `chapter_deployments.qr_code` in **legacy's own Supabase project** (`qvwgrupvaetzcxlizccu`), a different project than platform-web's (`hapoerzbcnagyfafqojg`), via service-role key | none | Live, confirmed via direct curl | **Redirect (compatibility redirect to legacy), do not migrate token validation** — no shared DB access exists |
| `/enter/done?practiced=&token=` | none | `practiced`, `token` | n/a (terminal thank-you screen) | none — inline content only | Live | Retain on legacy |
| `/api/entry/[token]` | none | — | Same as above | — | Live, public, **no CORS header** — only safely callable server-side | Available if platform-web ever needs to validate a token itself instead of pure-redirecting |

**BITS pilot timing:** the seeded deployment is dated for **2026-07-19**
(4 days from this audit) and requires a manual admin status toggle to
go `live` — "actively used by the BITS pilot" (per the old migration
doc) is closer to "imminently live," not confirmed-active today.

**Prior doc correction:** `LEGACY_ROUTE_MIGRATION.md`'s classification
of `/enter/[token]` and `/enter/done` as "Retain on legacy subdomain
(for now)" is still the right call, but its stated rationale
(preserving "campaign/cohort params") does not match the actual code —
no such params exist to preserve.

## Summary of RC1-blocking findings

1. **No canonical PrometheusK route can return control to the Platform
   after a practice/reflection completes.** This is a stop condition
   per the RC1 brief ("practice completion cannot return safely to the
   Platform") — see the accompanying report for the recommendation.
2. `/run/[practiceId]` and `/my/borrow/[journeyId]/practice/[practiceId]`
   are the two real candidate practice routes; neither reads any query
   parameters today, so onboarding context (`intention`, `witness`,
   `source`, etc.) cannot currently be threaded through to PrometheusK
   even one-way — only appended to the URL for PrometheusK to ignore.
3. Legacy `/enter/[token]` compatibility should be a plain HTTP
   redirect, not a rebuild — no query params to preserve, and no
   shared database to validate against directly.
