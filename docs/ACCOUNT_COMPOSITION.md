# Canonical account composition

## Starting state

`/account` (`app/account/page.tsx`) already had all 9 required generic
sections (Profile, Products, Membership, Preferences, Privacy, Security,
Data & Export, Feedback, Support) — but sourced from a *different* external
package, `@avatark/account` (vendored from `prometheusk-web`), not from
`@avatark/account-ui` (this repo's own workspace package). Before this
pass, `@avatark/account-ui`'s 6 controls (`AvatarMenu`, `IdentityBadge`,
`MembershipBadge`, `ProductSwitcher`, `NotificationBell`, `AccountDrawer`)
had **zero consumers anywhere in the app** — confirmed by repo-wide grep.

## What changed

`app/account/page.tsx` now composes 5 of the 6 controls into a real header
above the existing section rail, using genuinely live data — no
placeholders:
- **`IdentityBadge`** — real `displayName` (from the signed-in principal,
  itself sourced from `public.profiles` per Part 4) and real `roles`
  (a direct `platform_roles` query, independent of
  `lib/account/adapters.ts`'s own role cache — see the in-code comment on
  why: that cache is only warmed once the embedded `@avatark/account`
  package's Membership tab runs, which may not have happened yet when the
  header first renders).
- **`MembershipBadge`** — `plan="free"`, matching `lib/account/adapters.ts`'s
  own documented fact that Free is genuinely the only plan that exists
  anywhere in this ecosystem today (no fabricated tier).
- **`ProductSwitcher`** — the real `@avatark/product-registry`'s
  `PRODUCT_REGISTRY` (9 real products), navigating via the existing
  `resolveProductUrl()` (env-aware domain resolution, already used
  elsewhere in this repo).
- **`NotificationBell`** — `unreadCount={0}`, honestly: `@avatark/notifications`
  has zero real implementations anywhere in the ecosystem
  (`docs/ADAPTER_CONFORMANCE_CONTRACTS.md`), so this is a truthful zero,
  not a mock claiming a working feed.
- **`AvatarMenu`** — replaces the rail's former plain "Sign Out" text
  button. Same `handleSignOut` call path as before
  (`avatarKPlatformAdapters.auth.signOut()`), just moved into the shared
  component.

All five are genuinely headless/unstyled by design (`account-ui`'s own
package description: "headless and prop-driven ... no app coupling"); a
scoped stylesheet in `AccountRoot` themes them via their `data-avatark-*`
attributes to match this page's existing design tokens
(`var(--gold)`/`var(--paper)`/`var(--surface-line)`) without forking any
component's implementation.

## `AccountDrawer` — deliberately not used

This page is a full-page, tabbed workspace (a persistent rail + section
content), not an overlay/drawer pattern. Forcing `AccountDrawer` in here
would mean either replacing the existing, working rail navigation (a
larger redesign than this pass's scope) or bolting on a drawer with no
real purpose. Documented here as a considered "not supported by this
page's layout" decision, not an oversight.

## Constraints honored

- **No duplicate `/account` links added.** This pass only changed content
  *inside* `/account` — it did not touch `EchoAvatarMenu`, `lib/echo/nav.ts`,
  `EchoFooter`, or any other existing entry point to the page.
- **No Echo-specific tabs mounted.** My Echo / Journal / Progress remain
  entirely outside this surface, exactly as before.
- **Host theming preserved without forking components** — see the scoped
  stylesheet above; every component is used via its public props only.

## Verification

- `pnpm typecheck` / `pnpm lint` / `pnpm build` all pass with these
  changes (see the session's overall verification run).
- Unauthenticated request to `/account` on a production build returns
  `200` with the expected client-side "Loading…" state (confirmed via
  direct `curl` against `pnpm start`) — no server error from the new
  imports/composition.
- **Not verified: full interactive desktop/mobile visual behavior of the
  signed-in header** (hover states, `AvatarMenu` dropdown open/close,
  responsive wrapping under a real narrow viewport). This repo has no
  component-rendering test framework (no Playwright, no React Testing
  Library — confirmed by audit; every existing test is a plain `node:test`
  unit test) and no browser automation tool is available in this
  environment, the same boundary already documented in this session's
  Google OAuth work. The new header reuses this page's existing
  responsive convention (`flex-wrap`, `sm:` breakpoints, the same pattern
  already used by the rail beneath it), rather than inventing a new
  layout approach, but that is a code-level argument, not a substitute for
  an actual rendered-viewport check. Flagged honestly rather than claimed.
