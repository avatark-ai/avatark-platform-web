# Wave 1 — Registry & Navigation Integration Report

| Owner | Status | Version | Last Reviewed |
|---|---|---|---|
| AvatarK Ecosystem Program Office (EPO) | Final | 1.0 | 2026-07-21 |

Session 6, Wave 1. Repository: `avatark-platform-web`, branch
`feature/avatar-home-registry-navigation`. Scope: Registry and Navigation
integration only, per `docs/ecosystem/MERGE_PLAN_V1_1.md` §3.1 and
`docs/ecosystem/ECOSYSTEM_INTEGRATION_PLAN_V1_1.md` §5 and §13 step 1
(both read from `dt4m-os` as instructed). No architecture was redesigned,
no new products introduced, no cross-repo code touched.

---

## 1. Registry verification — six products

Per-field verification against the live registry (`packages/product-registry/src/registry.ts`)
and, where a domain claim could be checked, a real HTTP request (not
inferred, not fabricated).

| Product | Display name | Status | Domain (before → after) | Navigation visibility (before → after) | Consumer availability |
|---|---|---|---|---|---|
| GameK | GameK ✓ | `beta` (unchanged) | `https://app.avatark.ai/gamek` (unchanged) — HTTP 307, reachable, page contains "GameK" text, but `<title>` reads "AWE Platform," not GameK-branded, unlike every other confirmed domain below. Not changed: no better-confirmed URL exists in the four governance documents or this repo. | `public` (unchanged) | `beta` badge + real href, shown |
| PrometheusK | PrometheusK ✓ | `live` (unchanged) | `https://prometheusk.avatark.io` (unchanged) — HTTP 200, `<title>PrometheusK</title>`, confirmed | `public` (unchanged) | routes through AvatarK's own `/start` funnel per `OWN_ENTRY_POINTS`, not the raw domain — `available` |
| ArenaK | ArenaK ✓ | `alpha` (unchanged — see §3) | `null` → **`https://next.arenak.ai`** — HTTP 307, `<title>ArenaK — AvatarK</title>` after redirect, confirmed live 2026-07-21 | `internal` → **`public`** | still `coming_soon` (status gate, see §3) |
| StreamK | StreamK ✓ | `alpha` (unchanged — see §3) | `null` → **`https://www.streamk.ai`** — HTTP 200, `<title>StreamK — The Broadcast Layer for AvatarK</title>`, confirmed live 2026-07-21 | `internal` → **`public`** | still `coming_soon` (status gate, see §3) |
| StudioK | StudioK ✓ | `alpha` (unchanged) | `null` (unchanged) — no candidate domain confirmed in the four governance documents or this repo; not guessed | `internal` (unchanged) | `coming_soon` |
| Atlas | Atlas ✓ | `alpha` (unchanged) | `null` (unchanged) — same as StudioK; also carries the ecosystem's known multi-sense "Atlas" naming collision (registry product vs. "Atlas Intelligence" recommendation capability referenced in `ECOSYSTEM_INTEGRATION_PLAN_V1_1.md` §6) — not resolved here, that's a naming decision, not a registry-data fix | `internal` (unchanged) | `coming_soon` |

**Verification method for the two changed entries**: a direct `curl` GET
against each candidate domain, checking both HTTP status and rendered
page title/content for product branding — not just DNS resolution. This
is the same discipline `lib/products/health.ts`'s `checkProductHealth`
already uses in the admin Products page, applied manually here before
committing the registry change, rather than treating a plausible-looking
prior finding (dt4m-os project memory, for ArenaK) as sufficient on its
own.

**GameK's title mismatch** ("AWE Platform" rather than GameK branding) is
reported as a verification gap, not fixed — no alternative URL is
confirmed anywhere in this session's read-first scope, and guessing one
would violate "do not invent."

## 2. Navigation — duplicated decisions

**Found and fixed**: `lib/onboarding/prometheusk.ts` carried a hardcoded
literal fallback, `|| "https://prometheusk.avatark.io"`, duplicating the
registry's own `prometheusk.domain` value outside the registry. In
practice this was dead code (`prometheusk` is a static registry entry
with a non-null domain, so the fallback could never trigger), but it
meant a future domain change in the registry would silently leave this
file pointing at the old URL instead of failing loudly. Replaced with an
explicit invariant check that throws if the registry entry or its
resolved domain is ever missing, rather than silently falling back to a
duplicated literal.

**Checked, found clean**:
- `components/SiteHeader.tsx`, `components/ActivityCard.tsx`,
  `app/page.tsx` — all navigation and labels already derive from
  `lib/activities/registry.ts`'s `getActivityCards()`, which itself
  derives from `@avatark/product-registry`. No hardcoded product URLs,
  no duplicated Activity labels found anywhere else in `app/` or
  `components/`.
- Grepped the full `app/`, `components/`, `lib/` tree for literal product
  domains/paths (`avatark.io`, `arenak`, `streamk`, `gamek`,
  `prometheusk` as string literals) — the only other hit was
  `getProductById("prometheusk")` calls, which are registry lookups by
  id, not hardcoded URLs.
- `lib/activities/registry.ts`'s own `ACTIVITY_DEFINITIONS` (Explore/
  Practice/Together/Watch labels, intent copy, CTA labels) is the single
  place these are defined — no second copy exists anywhere in the app.

**No other duplicated navigation decisions found.** This app's registry-
navigation integration was already substantially complete before this
session; Wave 1's job here was verification plus one real fix, not a
rebuild.

## 3. Deliberately not changed: `status`

`ArenaK` and `StreamK`'s `domain`/`visibility` fields were corrected;
their `status` field was **not** touched, and this is a decision, not an
oversight — flagged explicitly per this session's own "document, don't
invent" mandate:

- `MERGE_PLAN_V1_1.md` §3.1 and `ECOSYSTEM_INTEGRATION_PLAN_V1_1.md` §5
  both scope the recommended registry fix as "domain + visibility"
  specifically, every time they mention it — never `status`.
- `lib/activities/registry.ts`'s `registryAvailability()` requires
  **both** `visibility === 'public'` **and** `status` in `{'live',
  'beta'}` before ever returning something other than `coming_soon`.
  Fixing domain+visibility alone therefore has **no visible effect on
  the consumer home page** — confirmed by manually running the dev
  server and inspecting the rendered HTML (see §5): the "Together" and
  "Watch" cards still render "Not available yet."
- Deciding whether ArenaK/StreamK warrant a `beta` bump (matching
  GameK's precedent) is a product-maturity judgment call, not a
  registry-data correction — explicitly left to a human, consistent with
  `PROGRAM_STATUS_V1_1.md`'s existing discipline around similar naming/
  maturity calls (e.g. §2.6).

## 4. Return flow

The registry schema (`AvatarKProduct` in
`packages/product-registry/src/types.ts`) has **no fields at all** for
return-to-Platform, return destination, display title, or breadcrumb —
this is a schema gap, not a per-product data gap, and extending the
schema would be an architecture change, out of Wave 1's scope. Per
product, based on this repo's own code (no other repo was read this
session):

| Product | Return to Avatar Platform | Return destination | Display title | Consumer breadcrumb |
|---|---|---|---|---|
| PrometheusK | **Yes** — RC5 signed completion receipt, verified server-side in `app/continue/page.tsx` | `returnTo` query param, e.g. `/continue` (`lib/onboarding/prometheusk.ts`) | "You completed your first practice." / "Welcome back." (`app/continue/ContinueGate.tsx`) | `intention`/`witness` params carried through and rendered in `app/journey/today/page.tsx`'s "Current intention"/"Current practice" |
| GameK | **Missing** — no return-to-Platform code found anywhere in this repo | — | — | — |
| ArenaK | **Missing** — matches `ECOSYSTEM_INTEGRATION_PLAN_V1_1.md` §10's finding: "ArenaK ↔ anything: no return flow exists in either direction" | — | — | — |
| StreamK | **Missing** — not documented anywhere in the four governance documents or this repo | — | — | — |
| StudioK / Atlas | **Not applicable yet** — neither product is integrated with Platform beyond a registry stub | — | — | — |

**Not invented**: no return-flow code was added for GameK, ArenaK,
StreamK, StudioK, or Atlas. Only PrometheusK's pre-existing flow was
verified against this repo's own code, which is all that could honestly
be checked without reading another repository.

## 5. Handoffs — Avatar Platform → product

| Handoff | State | Evidence |
|---|---|---|
| Avatar → GameK | **Real** | Registry-resolved static link (`resolveProductUrl`), confirmed reachable this session (§1); shown with a `beta` badge on the home page |
| Avatar → PrometheusK | **Real** | Routes through AvatarK's own signed `/start` onboarding funnel (RC1–RC6), not a plain link — confirmed unchanged and still `available` on the home page after this session's build/test/manual check |
| Avatar → ArenaK | **Registry fixed, consumer-facing handoff still incomplete** | Domain+visibility now correct; the "Together" card still renders "Not available yet" because `status` remains `alpha` (§3) — manually confirmed via `curl` against a locally-run `next dev` server after the build |
| Avatar → StreamK | **Registry fixed, consumer-facing handoff still incomplete** | Same shape as ArenaK, immediately above |

No handoff was invented. The two "still incomplete" rows are reported
honestly as partial progress, not overstated as done.

## Completed

- Verified all six products' `displayName`, `status`, `domain`,
  `visibility`, and derived consumer availability against the registry
  and, for two of them, a live HTTP check.
- Corrected `arenak` and `streamk`'s `domain` and `visibility` fields
  with real, verified evidence (not inferred from memory alone).
- Removed the one hardcoded/duplicated URL literal found in the
  navigation-adjacent code (`lib/onboarding/prometheusk.ts`).
- Updated the two now-stale test assertions/titles this change touched
  (`packages/product-registry/src/helpers.test.ts`,
  `lib/activities/registry.test.ts`) so the suite reflects, rather than
  contradicts, the corrected registry data.
- Ran `tsc --noEmit`, `eslint .`, `npm test` (100/100 passing), and
  `npm run build` (33 routes, no unexpected change) — all clean.
- Manually verified navigation by running `next dev` and inspecting the
  rendered home page HTML: GameK beta+real link, Practice `/start`,
  Together/Watch honest coming-soon — exactly as the registry data now
  predicts.

## Missing

- GameK's registry domain (`https://app.avatark.ai/gamek`) resolves but
  its page `<title>` doesn't match GameK branding the way every other
  confirmed domain's does — unresolved, not enough evidence to act on.
- StudioK and Atlas have no confirmed domain anywhere in this session's
  scope — registry stays `null`/`internal` for both, honestly.
- Return-to-Platform flow is missing for GameK, ArenaK, and StreamK (§4)
  — no fix attempted; this is cross-repo, multi-product work, not a
  Wave 1 registry task.

## Deferred

- **ArenaK/StreamK `status` bump** (`alpha` → `beta`/`live`) — the one
  decision that would actually change consumer-visible behavior on the
  home page. Explicitly deferred to a human per §3; not made in this
  pass.
- **GameK's domain-branding mismatch** — worth a closer look (is
  `app.avatark.ai/gamek` really GameK's dedicated route, or a
  broader-platform page that happens to mention GameK?) but not
  investigated further this session — would need reading `gamek-web`
  itself, out of this session's scope.
- **StudioK/Atlas domain confirmation** — same shape as ArenaK/StreamK's
  fix, blocked purely on not having a confirmed candidate domain yet.

## Architectural Debt

- **The Product Registry schema has no return-flow fields at all**
  (§4) — every product pair's return mechanism today is ad hoc,
  per-repo code (PrometheusK's RC5 receipt, GameK's `ReturnToGameK`
  documented in `ECOSYSTEM_INTEGRATION_PLAN_V1_1.md` §10) rather than a
  registry-modeled concept. Extending `AvatarKProduct` with return-flow
  fields would be an architecture change — explicitly out of Wave 1's
  scope, flagged here for a future, properly-scoped session.
- **The Atlas naming collision** (registry product vs. "Atlas
  Intelligence") is pre-existing debt this session did not create and
  did not resolve — carried forward, not newly discovered.
- **`ArenaK`'s `repository` field stays `null`** by the field's own
  documented convention (a confirmed sibling-repo name in this
  workspace) even though its real implementation is known to live
  inside `dt4m-os`'s `apps/avatark-consumer` — the field's convention
  and the ecosystem's actual repo topology no longer cleanly match now
  that one product's real repo isn't a sibling-workspace folder. Not
  changed here (would be a schema/convention decision); documented in
  the `arenak` entry's own updated description comment instead.
