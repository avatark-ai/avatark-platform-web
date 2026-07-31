# Cross-Product Integration Foundation

**Date:** 2026-07-31. **Branch:** `feature/avatar-platform-rc3`.

This is the entry point for this phase's work: shifting AvatarK's own repo focus from *building*
shared packages (Workstream D, Phases 1–2 — see `docs/PLATFORM_PACKAGE_DISTRIBUTION.md`) to making
AvatarK the **canonical integration layer every product consumes**. Nothing here refactors an
existing package for cleanliness; every change either extends an existing package additively or
adds new, narrowly-scoped contract modules to an existing package that already owns the adjacent
concept. Companion docs: `docs/PRODUCT_REGISTRY.md` (registry field history, this phase's additions),
`docs/INVITATION_CONTRACTS.md` (the new invitation entities), `docs/DEEP_LINKS.md` (the deep-link
kinds). `docs/PLATFORM_CONTRACTS.md` remains the canonical statement of what AvatarK owns as a
platform layer overall — this doc is the integration-foundation companion to it, not a replacement.

## Why extend existing packages instead of adding new ones

Every one of this phase's 7 deliverables maps onto a package that already owns the adjacent domain:

| Deliverable | Home | Why there, not a new package |
|---|---|---|
| 1. Product Registry | `@avatark/product-registry` (existing) | Already the registry; extending its fields keeps it the one source of truth instead of creating a second, competing catalog |
| 2. Redirect Manager | `@avatark/navigation` (existing) | Already resolves cross-product facts from the registry (`nextProduct.ts`); redirect resolution is the same kind of fact |
| 3. Product Switcher (API) | `@avatark/navigation` (existing) | Same reasoning — the switcher's data is a navigation concern, and `@avatark/account-ui`'s real `ProductSwitcher.tsx` UI is the consumer, unmodified |
| 4. Deep Link Resolver | `@avatark/navigation` (existing) | Also a navigation/routing concern; kept in a distinctly-named file (`crossProductLinks.ts`) from `@avatark/journey`'s own `deepLinks.ts` to avoid yet another same-filename collision (see `docs/PLATFORM_PRODUCT_ADOPTION_MATRIX.md`) |
| 5. Shared Invitation Contracts | `@avatark/invitations` (existing) | Already the invitation authority; Entry Door/Campaign/Target/Return Product are refinements of the same concept, not a new one |
| 6. Ecosystem Capability Matrix | `@avatark/product-registry` (existing) | Indexed by product id, derived from the registry's own capability flags wherever possible |
| 7. Cross-product integration tests | Alongside each module above | This repo's existing convention — every package tests itself, no separate test package |

No 15th package was added. `pnpm-workspace.yaml`'s `packages/*` glob, the root `test` script (which
lists every test file explicitly — no glob), and `scripts/build-packages.mjs`'s dependency-ordered
build list are all unchanged in shape; only file contents and the two new dependency edges below
were added.

## Dependency graph — two new edges, zero cycles

```
navigation   -> product-registry, auth   (NEW: navigation -> auth, for the Redirect Manager's return-path guard)
account-ui   -> journey, membership, product-registry
journey      -> auth, invitations
living-echo  -> timeline, recommendations
(auth, identity, product-registry, timeline, recommendations, membership,
 invitations, notifications, organizations, motion remain leaves)
```

The one new edge (`navigation -> auth`) is safe: `auth` is a leaf (zero `@avatark/*` dependencies of
its own), so no cycle is possible. `invitations` deliberately gained **no** new edges despite adding
Membership/Organization/Journey-shaped fields — see `docs/INVITATION_CONTRACTS.md`'s "No new package
dependency" section for why (a real cycle risk with `journey`, and an established plain-id
convention for the other two).

## 1. Product Registry — single source of truth

`AvatarKProduct` gained `previewDomain` and 5 new capability flags (`supportsAuth`,
`supportsAccount`, `supportsInvitations`, `supportsLivingEcho`, `supportsNavigation`) — full detail,
per-product values, and citations in `docs/PRODUCT_REGISTRY.md`'s "Phase 3" section. All 9 products
(`avatark`, `prometheusk`, `gamek`, `arenak`, `streamk`, `studiok`, `atlas`, `cinemak`, `setpointk`)
already existed in the registry from prior phases — this phase only widened the shape they conform
to, never added or removed a product.

## 2. Redirect Manager (`@avatark/navigation/redirect.ts`)

```ts
resolveProductDomain(productId, { preview? }): string | null
buildProductUrl(productId, path, opts?): string | null
buildCallbackUrl(productId, opts?): string | null              // "${domain}/auth/callback"
buildReturnPath(raw, fallback): string                          // open-redirect-safe
buildCrossProductReturnUrl(toProductId, returnPath, fallback, opts?): string | null
```

**No product's URL is ever a literal in this module.** Every function starts from a product id and
looks its domain up in the registry. `buildReturnPath` re-exports `@avatark/auth`'s already-audited
`safeReturnPath` rather than re-implementing open-redirect protection a second time —
`buildCrossProductReturnUrl` runs every return path through it before it ever reaches a query
string, so a caller cannot smuggle an open-redirect target through this layer even from raw user
input.

This is the portable counterpart to two things that deliberately **stay app-local**, unmoved:
`lib/products/registry.ts`'s `resolveProductUrl()` (layers this app's own `NEXT_PUBLIC_*_URL` env
overrides — a genuinely per-deployment concern) and `lib/journey/continuity.ts`'s
`buildContinueUrl()` (hardcodes a PrometheusK URL literal today — exactly the pattern this module
exists to make unnecessary for any *future* redirect, without retrofitting the existing one).

## 3. Product Switcher (`@avatark/navigation/switcher.ts`)

```ts
buildProductSwitcherEntries(currentProductId, { visibility?, preview?, registry? }): ProductSwitcherEntry[]
```

Builds the full entry list — `id, displayName, icon, href, isCurrent, status, visibility` — for
every product matching `visibility` (default `'public'`, i.e. exactly the products a signed-in
visitor should see; pass `visibility: null` for an unrestricted/admin switcher). `href` comes from
the Redirect Manager above, never hand-assembled.

**UI stays minimal, as scoped.** `@avatark/account-ui`'s `ProductSwitcher.tsx` (built in an earlier
phase, still zero real consumers) already accepts `products: AvatarKProduct[]` and an `onSelect`
callback — a host wiring it up today would call `buildProductSwitcherEntries()` to build the list and
`resolveProductDomain()`/the entry's own `href` inside `onSelect`. No UI component was added or
changed this phase.

## 4. Deep Link Resolver (`@avatark/navigation/crossProductLinks.ts`)

Full detail in `docs/DEEP_LINKS.md`. Six kinds (`watch`, `practice`, `echo`, `arena`, `studio`,
`game`); three resolve to this repo's own real local routes, three resolve to another product's
registry domain. Read the linked doc's disambiguation section before using `practice` or `echo` —
both names collide with a differently-scoped ecosystem concept (PrometheusK's Practices, Living
Echo) that this resolver's local routes are **not** the same thing as.

## 5. Shared Invitation Contracts (`@avatark/invitations`)

Full detail in `docs/INVITATION_CONTRACTS.md`. New: `EntryDoor`, `TargetProduct`, `ReturnProduct`,
`InvitationCampaign`, `InvitationContext`, `createInvitationContext()`. Episode and Practice were
already real `InvitationType` values from an earlier phase — nothing new needed for those two.
**No flow, resolver, or store was implemented** — every new export here is a type or a pure,
side-effect-free builder, per the mission's explicit "do not implement invitation flows yet."

## 6. Ecosystem Capability Matrix (`@avatark/product-registry/capabilityMatrix.ts`)

```ts
type EcosystemCapability = "auth" | "account" | "invitation" | "journey" | "echo"
  | "recommendation" | "notifications" | "organizations" | "publisher" | "admin" | "creator"
type CapabilityConfirmation = "confirmed" | "target" | "not_supported" | "unconfirmed"

getCapabilityStatus(productId, capability, registry?): ProductCapabilityStatus
buildCapabilityMatrix(registry?): ProductCapabilityStatus[]           // every (product, capability) cell
getProductsWithCapabilityStatus(capability, status, registry?): string[]
```

A machine-readable companion to `docs/PLATFORM_INTEGRATION_MATRIX.md`'s hand-written markdown table
— same underlying facts, typed and queryable. **7 of the 11 capabilities are derived directly from
registry flags** (`auth→supportsAuth`, `account→supportsAccount`, `invitation→supportsInvitations`,
`echo→supportsLivingEcho`, `recommendation→supportsRecommendations`,
`notifications→supportsNotifications`, `organizations→supportsOrganizations`) — never hand-
duplicated, so the registry stays the single source of truth end to end. **4 have no registry field
to derive from** (`journey`, `publisher`, `admin`, `creator`) and are hand-authored, one cell at a
time, each cited against a real doc section in `capabilityMatrix.ts`'s own comments (e.g. `admin` is
`confirmed` only for `avatark`, citing its real `/admin` surface; `creator` has zero confirmed or
target entries anywhere in the doc corpus, so every product resolves to the honest `unconfirmed`
fallback, never a fabricated `not_supported`).

**`unconfirmed` vs. `not_supported` is a deliberate, load-bearing distinction**, not a redundant
pair of "no" values: `not_supported` is only ever returned when a registry boolean flag is
confirmed `false`, i.e. this repo can actually see the fact. `unconfirmed` means this repo has no
visibility into whether the capability exists in that product's own repo at all — the same
"cannot confirm an absence" discipline `docs/PLATFORM_PRODUCT_ADOPTION_MATRIX.md`'s per-package
notes already established for package-naming collisions.

## 7. Cross-product integration tests

343 tests pass (310 pre-existing + 33 new), zero changes to pre-existing test behavior beyond one
required fixture update (`validation.test.ts`'s `baseProduct()` needed the 6 new required fields —
a mechanical consequence of widening `AvatarKProduct`, not new test coverage).

| Test file | Count | Covers |
|---|---|---|
| `packages/product-registry/src/capabilityMatrix.test.ts` | 7 | Capability lookup — matrix completeness, derived-vs-hand-authored cells, the `unconfirmed` fallback, unknown product ids |
| `packages/navigation/src/redirect.test.ts` | 10 | Redirect generation, return path validation (including the same backslash open-redirect trick `@avatark/auth`'s own tests cover), cross-product return URL sanitization |
| `packages/navigation/src/switcher.test.ts` | 5 | Product Switcher entries — visibility filtering, current-product marking, href resolution, the full 9-product unrestricted list |
| `packages/navigation/src/crossProductLinks.test.ts` | 8 | Deep-link building (all six kinds) and parsing (round-trip for the three local kinds) |
| `packages/invitations/src/context.test.ts` | 3 | `createInvitationContext`'s default/override behavior |

Product-lookup and registry-integrity tests were already real and comprehensive
(`packages/product-registry/src/helpers.test.ts`, `validation.test.ts`) — extended (fixture update)
rather than duplicated.

## Verification

`pnpm lint` / `pnpm typecheck` / `pnpm test` (343/343) / `pnpm build` (80 routes, unchanged) all pass
clean. `pnpm build:packages` builds all 14 packages, in dependency order, with zero errors —
confirming the one new dependency edge (`navigation -> auth`) resolves correctly both inside this
workspace and as compiled `dist/` output.

## Known gaps — carried forward honestly, not fixed here

- **No cross-repo consumer yet.** Every contract in this phase is exercised only by this repo's own
  tests — `gamek-web`, `prometheusk-web`, and the rest have not adopted any of it. Consistent with
  `docs/PLATFORM_PRODUCT_ADOPTION_MATRIX.md`'s existing finding that this repo has no visibility
  into those repos' own package/route conventions.
- **`previewDomain` is null for every product.** No fixed preview/staging domain has been confirmed
  anywhere in this ecosystem's docs — a per-deployment Vercel preview URL cannot be a registry fact.
  The Redirect Manager's `preview` option is real code today, exercised by tests, but has nothing to
  resolve to until a real fixed preview domain exists for at least one product.
- **`ProductSwitcher.tsx` is still not wired into any real page.** The canonical data API
  (`buildProductSwitcherEntries`) is complete and tested; the UI component it would feed remains
  the same zero-consumer component from an earlier phase, per this phase's explicit "UI can remain
  minimal" scope.
- **The Ecosystem Capability Matrix's 4 hand-authored capabilities (`journey`, `publisher`, `admin`,
  `creator`) will silently go stale** if a future phase changes a product's real integration status
  without updating `capabilityMatrix.ts`'s `HAND_AUTHORED` table — there is no CI check tying it to
  the doc corpus it cites. The 7 derived capabilities cannot go stale this way, by construction.
- **Deep-link parsing (`parseLocalDeepLinkPath`) is not wired into any real route/middleware.**
