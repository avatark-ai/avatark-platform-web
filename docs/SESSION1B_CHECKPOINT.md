# Session 1B Checkpoint — Production Readiness / Consumer Journey Audit

**Branch:** `feature/avatar-home-registry-navigation` (same branch as Session 1; continues it,
does not fork it). **Not merged, not deployed** — per this session's explicit mission.

**Read-first gap:** `docs/ECOSYSTEM_IMPLEMENTATION_GUIDE_V1.md` was listed as required reading but
does not exist anywhere in this repo (checked all branches, full git history, and filesystem).
Proceeded on the other four documents, which do exist and were read in full. See
`docs/PLATFORM_PRODUCTION_AUDIT_V1.md` §0 for the same note.

## Files changed this session

| File | Change |
|---|---|
| `app/layout.tsx` | Stale `<title>`/description (old "Every life leaves an Echo" hero copy) updated to match Session 1's new intent-first home |
| `app/page.tsx` | Restored the `<nav aria-label="Other ways to begin">` landmark Session 1's rewrite had dropped; added `focus-visible` styling to its two quiet links |
| `components/SiteHeader.tsx` | Added `focus-visible:outline` styling to every interactive element (wordmark, activity links, Continue/Account/Sign in, hamburger button); `aria-hidden` on the hamburger glyph |
| `components/ActivityCard.tsx` | Added `focus-visible:outline` to the CTA link/button; fixed a comment citing a doc path (`docs/AVATARK_HOME_EXPERIENCE_V1.md`) that doesn't exist in this repo |
| `components/HomeContinuity.tsx` | Added `focus-visible:outline` to its CTA link |
| `lib/onboarding/prometheusk.ts` | `PROMETHEUSK_ORIGIN` now resolves through `resolveProductUrl(getProductById('prometheusk'))` instead of a second, independent hardcoded copy of PrometheusK's domain — collapses a real duplicate source of truth. Verified byte-identical output before/after. |
| `app/privacy/`, `app/products/` (removed) | Both were empty directories with zero git footprint (never tracked) and no `page.tsx` — dead filesystem debris, not real routes. Removed. |
| `docs/PLATFORM_PRODUCTION_AUDIT_V1.md` (new) | The audit deliverable. |
| `docs/SESSION1B_CHECKPOINT.md` (new) | This file. |

**Not touched:** `packages/product-registry/src/*` (confirmed zero diff against `fec4c81` across
both Session 1 and 1B), `app/admin/**`, `app/journey/**`, `app/account/page.tsx`, `lib/auth/**`,
`lib/admin/**`, `lib/account/**`, `supabase/**`.

## Tests

`pnpm test` — **100/100 pass**, same count as Session 1's checkpoint (no tests added or removed
this session; the `prometheusk.ts` change was verified by direct output comparison, not a new test,
since no test file imports that module today).

## Build

`pnpm exec tsc --noEmit` — clean. `pnpm lint` — clean. `pnpm build` — succeeds, same 33-route
output as Session 1's build, `/` still prerenders as static content.

## Manual verification

Real `next build && next start` on port 3011 (killed after verification, confirmed no orphaned
process left running):
- `/` — all four activity card ids present; nav hrefs resolve correctly (Explore →
  `https://app.avatark.ai/gamek`, Practice → `/start`, Together/Watch → `/#together`/`/#watch`);
  the restored "Other ways to begin" nav landmark renders with both quiet links; 41
  `focus-visible:outline` occurrences found in the rendered HTML (new this session).
- `/admin` — 307 to `/auth/sign-in?return=%2Fadmin`, unchanged, isolated from consumer nav.
  Confirmed via `ps`/`/proc` that no other session's process was touching this checkout before
  starting the server, and that the only other running `claude`/`next` processes on the box
  belonged to a different repo (`gamek-web`).
- `/journey` — `SiteHeader` and Journey's own tab nav coexist without conflict.
- `/account`, `/enter`, `/start`, `/auth/sign-in` — all 200.
- Mobile: viewport meta present, `md:hidden`/`md:flex` responsive classes present in rendered
  markup, hamburger button has `aria-expanded`/`aria-controls`/`aria-label` plus a now-`aria-hidden`
  glyph.
- **Not performed** (no credentials in this environment, same as Session 1): a live signed-in pass.

## Audit findings (full detail in `docs/PLATFORM_PRODUCTION_AUDIT_V1.md`)

- **Fixed:** dropped `<nav>` landmark on the home page, missing focus-visible styling across every
  new interactive element, stale `<title>` copy, a stale/incorrect doc citation, a duplicate
  hardcoded PrometheusK domain, two dead empty route directories.
- **Found, documented, not fixed** (each is either out of this session's mandate or requires a
  change in a different repo/track): the `availability` field-name collision between
  `lib/products/registry.ts` (admin) and `lib/activities/registry.ts` (consumer); the light/dark
  theme split between `/auth/sign-in`+`/account` and everything else; no global focus-visible CSS
  convention; Together/Watch being blocked on ArenaK/StreamK registry data, not platform-shell code;
  the missing `ECOSYSTEM_IMPLEMENTATION_GUIDE_V1.md`.
- **No incorrect routing found** in any AvatarK → product handoff.
- **No architecture-compliance violations found** — Five Activities, AvatarK-as-platform, Registry
  shape, no-reimplementation, and no-cross-domain-auth rules all held.

## Remaining work

See `docs/PLATFORM_PRODUCTION_AUDIT_V1.md` §6 (Remaining technical debt) — none of it blocks this
session's exit; all of it is real, named, future work:
1. Reconcile or clearly document the two different `availability` semantics.
2. Decide whether to unify the light/dark theme split (a design-system decision, not a code fix).
3. Add a jsdom/RTL/Playwright layer if UI regressions become a recurring concern.
4. Get ArenaK/StreamK a confirmed public domain + `visibility: 'public'` in the registry before
   Together/Watch can go live — cross-repo/data work, not something this repo can do alone.
5. Live-verify signed-in nav/continuity once test credentials exist.

## Production readiness

**6.5 / 10.** See `docs/PLATFORM_PRODUCTION_AUDIT_V1.md` §7 for the full justification. Two of four
primary Activities are honestly gated rather than broken; zero fabricated data; zero regressions
found in auth/account/admin; the score is capped by real, named gaps (theme seam, data-blocked
Activities, no UI test coverage), not by anything left undone in this session's actual mandate.

---

Stop. Not merged. Not deployed. No architecture redesign performed.
