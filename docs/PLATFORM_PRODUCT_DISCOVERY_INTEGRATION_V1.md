# Platform Product Discovery & Integration — V1

**Status:** design document, not implemented. No application code changes accompany this file.
**Date:** 2026-07-20. **Builds on:** `packages/product-registry` (`docs/PRODUCT_REGISTRY.md`),
committed on `feature/product-registry-package`, not yet wired into any navigation.
**Scope:** how `avatark-platform-web` (and, eventually, GameK/PrometheusK/ArenaK/StreamK/CinemaK/
Atlas/StudioK) use the Product Registry to *discover and route to each other* — not another
generic package, and not new product functionality. No new products are proposed here; the 9
already in the registry are the complete set discussed.

---

## 1. What this document is

`packages/product-registry` answered "what is the shape of a product, and what are the 9 real
ones." This document answers the next question up: **how does that data actually reach a user** —
a nav bar, an intent picker, a "you don't have access yet" screen — **without any app hardcoding a
menu.** It is the implementation guide for that wiring. It intentionally stops short of writing
that code.

Two honesty constraints carried over from every prior phase in this repo (RC1–RC6,
Identity/Account/Admin, the registry itself) apply here too:
- **No re-implementation.** AvatarK never renders another product's practice/reflection/game/
  streaming/challenge UI itself — it links out. This has been a hard rule since RC1 and nothing
  here changes it.
- **No fabricated readiness.** A product's registry entry says what's *known*, not what's
  aspirational. Today, that means real gaps stay visible (e.g. ArenaK/StudioK have no confirmed
  repository) rather than being smoothed over once they're wired into navigation.

---

## 2. The core idea in one sentence

**Every surface that currently asks "which products exist and how do I get to them" should ask
the registry, not a local constant** — and the registry should carry enough structure (entry
points, intents, audiences, flags, readiness) that "ask the registry" is actually sufficient,
instead of every call site still needing its own special-case logic bolted on top.

```
                     ┌─────────────────────────────┐
                     │   packages/product-registry  │
                     │   (single source of truth)   │
                     └──────────────┬───────────────┘
                                    │  read-only, everywhere
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
   ┌───────────────┐       ┌───────────────┐        ┌────────────────┐
   │  Navigation    │       │  Intent /     │        │  Access &      │
   │  generation    │       │  Start flow   │        │  entitlement   │
   │ (header, admin,│       │ ("what do you │        │  checks        │
   │  switcher)     │       │  want to do?") │        │ (already built,│
   │                │       │               │        │  product_access)│
   └───────────────┘       └───────────────┘        └────────────────┘
```

Nothing here proposes a registry *service* (an API other repos call over the network). As of this
document, there is no shared package registry, no cross-repo CI pipeline, and no deployed API for
this data — so Section 8 is explicit that V1 is a single, centrally-maintained data file, and
"self-registration" is a described migration path, not a claim that it exists today.

---

## 3. Schema additions this integration needs (proposed, not yet implemented)

`AvatarKProduct` (as built) already carries `id`, `slug`, `displayName`, `status`, `visibility`,
`category`, the 13 `supportsX` capability flags, and link arrays. It does **not** yet carry the
concepts this integration needs to route users by *intent* or *audience*, or to gate by an
*operational* flag independent of the product's declared maturity. This section proposes the
additions; none of them exist in `packages/product-registry/src/types.ts` today.

### 3.1 Entry points

A product isn't one link — PrometheusK has a "start a practice" link and (per its `/my/echo`
route, confirmed in the RC4 audit) a "view your Living Echo" link, which are different
destinations for different audiences. Today's `AvatarKProduct.domain` is a single root URL; that's
enough for a "coming soon" table row, not enough to route a specific intent to a specific place.

```ts
export type ProductAudience = 'consumer' | 'creator' | 'admin'

export interface ProductEntryPoint {
  id: string                     // stable, e.g. "prometheusk.start-practice"
  label: string
  href: string                   // relative to `domain`, or absolute if it must leave `domain`
  audience: ProductAudience
  intents: IntentCategory[]      // which user intents this entry point satisfies (see 3.2)
  requiresAuth: boolean
  featureFlag: string | null     // see 3.4
}
```

`AvatarKProduct` gains `entryPoints: ProductEntryPoint[]`. A product with no creator or admin
surface simply has no entry points tagged `creator`/`admin` — not a null field, an absent case,
consistent with how `navigationLinks`/`footerLinks` already default to `[]` rather than null.

### 3.2 Intent categories

The existing `/start` intention picker (RC1, `lib/onboarding/guide.ts` era) hardcodes a small,
PrometheusK-only intention set. Generalized across the ecosystem, "what does this person want to
do right now" is a taxonomy independent of which product answers it:

```ts
export type IntentCategory =
  | 'practice'          // reflect, do a guided practice (PrometheusK)
  | 'compete'           // challenges, leagues, rankings (ArenaK; PrometheusK also, per PBM findings)
  | 'play'              // world/game progress (GameK)
  | 'watch'             // streaming/on-demand video (StreamK, CinemaK)
  | 'create'            // creation tools (StudioK)
  | 'explore'           // reference/exploration (Atlas)
  | 'manage-wellness'   // goal-setting (SetpointK)
  | 'administer'        // platform administration (AvatarK itself)
```

A product can satisfy more than one intent (PrometheusK's challenge routes mean it legitimately
answers both `practice` and `compete`, confirmed by the PBM-002/003 evidence-scoring work already
done against `prometheusk-web`). This is what makes intent routing more than a 1:1 lookup table —
see Section 6.

### 3.3 Visibility rules (extending, not replacing, today's field)

`visibility: 'public' | 'internal'` already exists and is sufficient as a *default* gate. This
integration adds one more axis on top: **who is asking**, not just **is it public**.

| Field | Already exists | Meaning |
|---|---|---|
| `visibility` | yes | Is this product ever shown outside admin surfaces? |
| `status` | yes | `alpha` / `beta` / `live` / `internal` — declared maturity |
| entry point `audience` | proposed | Is *this specific link* meant for a consumer, a creator, or an admin? |
| entry point `featureFlag` | proposed | Is this link operationally on right now, regardless of maturity? |

A product being `visibility: 'public'` and `status: 'beta'` means: show it, but label it Beta (see
3.5). A product being `visibility: 'internal'` means: never show it outside `/admin/products`,
regardless of status — this is exactly SetpointK and, until they're confirmed otherwise, ArenaK
and StudioK today.

### 3.4 Feature flags

`status` is a *declared* fact ("PrometheusK is live"). A feature flag is an *operational* switch
("PrometheusK's practice-continuation entry point is live, but we're keeping the new challenge
entry point off while PBM-003 is unresolved"). These are different axes and must not be collapsed
into one — this repo already has the pattern to follow: `ACCOUNT_MOUNT_ENABLED`,
`NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED`, the Google OAuth and Resend email flags all built during the
Identity/Account/Admin phase are exactly this shape (an env-var-backed boolean, checked at the call
site). The proposal is to let an entry point *declare* which flag name gates it
(`featureFlag: 'NEXT_PUBLIC_PROMETHEUSK_CHALLENGES_ENABLED'`), so nav generation can resolve it the
same way `ACCOUNT_MOUNT_ENABLED` is resolved today, without a separate parallel flag registry.

### 3.5 Production readiness, beta products, hidden/internal products

These are presentation *consequences* of `status` + `visibility`, not new fields:

| status | visibility: public | visibility: internal |
|---|---|---|
| `live` | shown, no badge | never shown outside `/admin/products` |
| `beta` | shown, "Beta" badge | never shown outside `/admin/products` |
| `alpha` | **not shown** by default (would need an explicit opt-in surface, e.g. a developer-preview toggle — not built) | never shown |
| `internal` | never shown to end users regardless | never shown |

Applied to the real registry today: AvatarK and PrometheusK render normally; GameK renders with a
Beta badge; ArenaK/StreamK/CinemaK/Atlas/StudioK (all `alpha`, all `visibility: internal` per the
registry as seeded) render nowhere except `/admin/products`; SetpointK (`internal`) likewise never
appears to end users. **This is a real, immediate consequence of data already committed** — no
schema change needed to get this specific behavior once nav generation exists.

### 3.6 Consumer vs. Creator vs. Admin

Not a new top-level field on the product — a property of *which entry points exist* and *who
can see them*:

- **Consumer** entry points: the default. Anyone with product access (`product_access` row,
  already modeled) sees these.
- **Creator** entry points: gated by a role, not just access — e.g. a future "Author a practice"
  entry point on PrometheusK, visible only to users whose `platform_roles` (or a product-local
  role PrometheusK reports back — out of scope for this repo to define) includes something creator-
  shaped. No product in this ecosystem has a confirmed creator surface today (checked: none of
  RC1–RC6, PBM, or Identity/Admin found one) — this axis is scaffolding for when one exists, not a
  claim one exists now.
- **Admin** entry points: platform-admin-only, and per the existing rule ("product-local
  administration stays product-owned"), almost always *absent* — AvatarK's own `/admin` is the one
  confirmed admin entry point in the entire registry today.

---

## 4. Product Registry — internal shape (diagram)

```
packages/product-registry/src/
│
├─ types.ts ──────────────┐
│   AvatarKProduct          │  (+ proposed: ProductEntryPoint, IntentCategory, ProductAudience)
│                           │
├─ registry.ts ◄───────────┘
│   PRODUCT_REGISTRY[]        one object per product, capabilities pre-filled from NO_CAPABILITIES
│                             (+ proposed: each product also lists its entryPoints[])
│
├─ helpers.ts
│   getProductById / BySlug          (unchanged)
│   getProductsByCategory/Status/Visibility
│   getProductsWithCapability
│   sortProducts
│   (+ proposed) getEntryPointsForAudience(audience, registry)
│   (+ proposed) getProductsForIntent(intent, registry)
│
├─ validation.ts
│   validateProduct / validateRegistry     (+ proposed: validate entry point id uniqueness,
│                                             intents non-empty, href shape)
│
├─ hooks.ts  ('use client')
│   useProduct / useProductsByCategory / useVisibleProducts / useProductCapability
│   (+ proposed) useEntryPointsForAudience, useProductsForIntent
│
└─ index.ts   barrel export — the only import path any consumer should use
```

---

## 5. AvatarK (the Platform app) — where discovery plugs in

```
                              ┌──────────────────────────┐
                              │  @avatark/product-registry │
                              └─────────────┬─────────────┘
                                            │ read-only import
        ┌───────────────────┬───────────────┼───────────────┬───────────────────┐
        ▼                   ▼               ▼               ▼                   ▼
 ┌─────────────┐   ┌─────────────────┐ ┌───────────┐  ┌─────────────┐   ┌────────────────┐
 │ app/page.tsx │   │ /start (intent  │ │ /journey  │  │ /account     │   │ /admin/*        │
 │ (landing)    │   │  picker)        │ │  (today's │  │ (via          │   │ (already reads  │
 │              │   │                 │ │  practice) │  │ adapters.ts,  │   │  the registry,   │
 │ today: a     │   │ today: hard-    │ │            │  │ already reads │   │  see             │
 │ hardcoded    │   │ coded intention │ │            │  │ the registry) │   │  PRODUCT_REGISTRY.md│
 │ "Watch First"│   │ set, PrometheusK│ │            │  │               │   │                  │
 │ URL to       │   │ -only           │ │            │  │               │   │                  │
 │ PrometheusK  │   │                 │ │            │  │               │   │                  │
 └─────────────┘   └─────────────────┘ └───────────┘  └─────────────┘   └────────────────┘
        │                   │
        └─────────┬─────────┘
                   ▼
      both should resolve their PrometheusK/other-product
      links through the registry (Section 9), not a literal string
```

`/admin/*` is already, partially, on the right side of this diagram — `lib/products/registry.ts`
derives `PLATFORM_PRODUCTS` from the shared package as of the last phase. Everything else in this
diagram is still on the wrong side (hardcoded), which is exactly what Section 9 targets.

---

## 6. Product discovery flow (sequence diagram)

How a nav-like component gets its list of things to render, generically:

```
 Component               getVisibleNav()              Product Registry
    │                          │                              │
    │  render()                │                              │
    │─────────────────────────►│                              │
    │                          │  listProducts()               │
    │                          │─────────────────────────────►│
    │                          │◄─────────────────────────────│
    │                          │  filter: visibility=='public' │
    │                          │  filter: status in            │
    │                          │    {live, beta}                │
    │                          │  filter: featureFlag resolves  │
    │                          │    true (or none set)          │
    │                          │  filter: entry point audience  │
    │                          │    matches current viewer      │
    │                          │  sort: sortProducts(status)    │
    │◄─────────────────────────│                              │
    │  NavItem[] (label, href, │                              │
    │   badge?: 'Beta')         │                              │
    │  render <Link> per item  │                              │
```

No product-specific `if (id === 'prometheusk')` branch anywhere in this path — every decision is a
generic filter over registry fields. This is the actual test for "did this migrate correctly":
if a nav component still special-cases a product id, the registry isn't doing its job yet.

---

## 7. Intent → product routing (diagram)

Today's `/start` picks from a small, PrometheusK-shaped intention set and always routes to
PrometheusK via `buildBorrowUrl`. Generalized:

```
 User picks an intent           /start (or any intent-driven surface)
        │                                │
        │  "I want to compete"           │
        ├───────────────────────────────►│
        │                                │  getProductsForIntent('compete')
        │                                │───────────────────────► Product Registry
        │                                │◄───────────────────────
        │                                │  → [PrometheusK (challenges),
        │                                │      ArenaK (challenges, leagues)]
        │                                │
        │                                │  more than one match:
        │                                │  rank by status (live > beta > alpha)
        │                                │  then by visibility (public first)
        │                                │  ArenaK is alpha/internal today →
        │                                │  PrometheusK wins by construction,
        │                                │  not a hardcoded "always PrometheusK" rule
        │                                │
        │                                │  zero matches (a currently-unregistered
        │                                │  intent, or every match is internal/alpha):
        │                                │  → honest "not available yet" state,
        │                                │    same discipline as RC1's stop
        │                                │    conditions — never a fabricated link
        │◄───────────────────────────────│
        │  redirected to the winning      │
        │  entry point's href             │
```

The important behavior change from today: PrometheusK isn't special-cased in the routing logic —
it wins the `compete` intent today *because* it's the only `live`/`public` match, and that stops
being true automatically the day ArenaK's status changes, with no code edit required at the
routing call site. That's the concrete meaning of Section 8's "registration only" goal.

---

## 8. Consumer navigation generation (diagram) — and where product-owned UI still lives

```
┌───────────────────────────── AvatarK Platform (this repo) ─────────────────────────────┐
│                                                                                          │
│   Header / nav component                                                               │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │  for each product in getVisibleNav():                                          │   │
│   │     render <Link href={resolveHref(product, entryPoint)}>{product.displayName} │   │
│   │       {product.status === 'beta' && <BetaBadge/>}                              │   │
│   │     </Link>                                                                    │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
│                                    │ href points OUT, not to a route in this repo         │
└────────────────────────────────────┼──────────────────────────────────────────────────────┘
                                     ▼
        ┌───────────────────┬────────────────────┬────────────────────┬───────────────────┐
        ▼                   ▼                    ▼                    ▼                   ▼
 ┌─────────────┐    ┌───────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────────┐
 │  GameK       │    │  PrometheusK  │    │  ArenaK       │    │  StreamK     │    │  CinemaK       │
 │  (its own    │    │  (its own     │    │  (its own     │    │  (its own    │    │  (its own      │
 │  game UI,    │    │  practice/    │    │  challenge/   │    │  player UI,  │    │  player UI,    │
 │  own repo,   │    │  Echo UI, own │    │  league UI,   │    │  own repo)   │    │  own repo)     │
 │  own deploy) │    │  repo/deploy) │    │  own repo)    │    │              │    │                │
 └─────────────┘    └───────────────┘    └──────────────┘    └──────────────┘    └───────────────┘
```

AvatarK never renders GameK's board, PrometheusK's practice runtime, or ArenaK's leaderboard. The
registry's job stops at *metadata and routing* — `displayName`, `status`, `entryPoints`, `domain`.
The instant a nav component tried to fetch and render another product's actual content inline,
that would be the re-implementation this ecosystem has explicitly ruled out since RC1. This
document changes *who looks up the link*, never *who owns the experience behind it*.

---

## 9. Migration guidance: from hardcoded navigation to the registry

Concrete, present-tense inventory of what's hardcoded in this repo today, and what changes when
this integration is built. This is guidance for the *next* implementation phase, not a claim any
of it is done.

| Location | Today | After this integration |
|---|---|---|
| `app/page.tsx` `WATCH_FIRST_URL` constant | `"https://prometheusk.avatark.io/watch-first"`, a literal string | `resolveHref(getProductById('prometheusk'), 'prometheusk.watch-first')` — survives PrometheusK's domain changing without a landing-page edit |
| `app/page.tsx` intent CTAs ("Begin with an Echo") | Two static links (`/start`, `/enter`) | Unchanged for now — these are AvatarK's *own* entry points, not another product's, so they're not a registry-migration target. Only cross-product links migrate. |
| `app/admin/AdminNav.tsx` `LINKS` constant | Hardcoded array of **AvatarK's own** admin sections (Users, Organizations, Products, Roles, Audit, Settings) | **Not a migration target.** These are sections within one product's (AvatarK's) admin surface, not a multi-product menu — the registry has nothing to say about them. Flagging this explicitly so a future session doesn't force an unnecessary migration here. |
| `app/admin/products/page.tsx` | Already reads `PLATFORM_PRODUCTS` (registry-derived) | No further migration needed — already correct as of the last phase |
| `lib/account/adapters.ts` `productAccess.list()` / `membership.getRelationships()` | Already reads `PLATFORM_PRODUCTS` | No further migration needed |
| **Not yet built anywhere:** a real cross-product header/switcher outside `/account`'s tab, and a generalized `/start` intent router | N/A | This is the actual net-new surface this document is scoping — build it registry-first from day one rather than hardcoding it and migrating later |

**Migration principle:** don't do a big-bang rewrite. `lib/products/registry.ts`'s own history is
the template — it moved from a hardcoded array to a registry-backed adapter while every consumer's
import stayed identical. The same shape applies here: introduce `resolveHref()` /
`getVisibleNav()` / `getProductsForIntent()` as small, additive helpers, migrate one hardcoded
string at a time (starting with `WATCH_FIRST_URL`, since it's the one confirmed cross-product
hardcoded literal in the app today), and leave anything that isn't actually cross-product
(AdminNav's own sections) alone.

---

## 10. "Registration," honestly: how a product joins the registry today vs. in two years

**Today (V1 — what this document actually recommends building next):** the registry is one array
in one file (`packages/product-registry/src/registry.ts`), inside one repo
(`avatark-platform-web`). "Registering" GameK, ArenaK, etc. today means: someone opens a PR against
this file, adds one object (using `NO_CAPABILITIES` as the base, per the existing pattern), and
`validateRegistry()` (already built, already tested) catches shape mistakes and duplicate
ids/slugs before merge. This is honest about present-day infrastructure: there is no private
package registry this workspace can publish `@avatark/product-registry` to, and no confirmed CI
pipeline across repos — so a cross-repo self-service flow isn't a V1 claim.

**In two years (the aspirational end-state Section 8 of the mission is asking about):** the
mechanism this design points toward, without building it now, is a **manifest + sync** model:

```
  prometheusk-web repo                         avatark-platform-web repo
  ┌─────────────────────────┐                  ┌───────────────────────────┐
  │ avatark-product.ts        │   CI sync job    │ packages/product-registry  │
  │  (product-owned, lives   │  (not built —    │  PRODUCT_REGISTRY[]        │
  │  next to the product's   │───validates via──►│  (generated/merged from    │
  │  own code, reviewed by   │  validateProduct  │  every product's manifest) │
  │  that product's own team)│  before merge)    │                            │
  └─────────────────────────┘                  └───────────────────────────┘
```

Each product owns and versions *its own* manifest, in its own repo, using the same
`AvatarKProduct`/`validateProduct` contract already built — so a brand-new product in two years
needs exactly one new manifest file plus a sync run, never an edit to AvatarK's nav code, `/start`,
or any other consuming app. Getting there requires two pieces of infrastructure that don't exist
yet and are explicitly out of scope for this document: a place to publish/share the
`@avatark/product-registry` types+validators across repos, and a sync job to merge manifests into
one authoritative list (or a move to a real runtime registry service, if that's ever justified).
Calling this out now, rather than silently assuming it, is the same discipline this ecosystem has
applied to every other cross-product boundary so far.

---

## 11. Non-goals (explicit, per this mission's instructions)

- No application code changes accompany this document.
- No change to existing architecture, rules, or stop conditions (RC-era no-reimplementation rule,
  no new cross-product DB tables, no cross-domain auth) — this document extends the *data model*
  and *consumption pattern*, not the trust boundaries.
- No new products. The 9 in the registry are the complete set this document reasons about.
- No claim that entry points/intents/audiences/feature-flag wiring exist in
  `packages/product-registry` today — Section 3 is a proposal for the next implementation phase,
  clearly marked as such throughout.

## 12. Suggested next phase (not started)

1. Add the Section 3 schema fields (`ProductEntryPoint`, `IntentCategory`, `ProductAudience`) to
   `packages/product-registry`, with `entryPoints: []` defaulted for every product until real
   entry points are confirmed per product (starting with AvatarK's and PrometheusK's own, since
   those are the two with confirmed real routes today).
2. Build `getVisibleNav()` / `getProductsForIntent()` / `resolveHref()` as small, tested helpers
   alongside the existing `helpers.ts` functions.
3. Migrate the one confirmed hardcoded cross-product literal (`WATCH_FIRST_URL` in `app/page.tsx`)
   as the first, smallest possible proof that the pattern works end-to-end.
4. Only after that lands: consider a generalized `/start` intent router and any cross-product
   header/switcher — larger surfaces that should be built registry-first rather than hardcoded and
   migrated later.
