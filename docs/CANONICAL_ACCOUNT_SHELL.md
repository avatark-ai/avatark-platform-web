# Canonical Account Shell

Status: **frozen contract, wired into `app/account/page.tsx` (Part 16 landed).** This repo owns the source of `@avatark/account` (`packages/account/`) and the headless primitives in `@avatark/account-ui` (`packages/account-ui/`). The vendored tarball (`avatark-account-0.1.1.tgz`) has been removed from `package.json` and deleted from the repo — `app/account/page.tsx` now imports `@avatark/account` resolved via the pnpm workspace (`workspace:*`), not a tarball. See `packages/account/PROVENANCE.md` for the full import history and every change made during the fork.

## Ownership

| Package | Role |
|---|---|
| `@avatark/account` (`packages/account/`) | Canonical account contracts (`src/contracts/`), canonical tab UI (`src/ui/`), and the extension-slot mechanism (`src/extensions/`, `src/ui/ExtensionTab.tsx`). This repo's source of truth, now the actual runtime dependency of `app/account/page.tsx`. |
| `@avatark/account-ui` (`packages/account-ui/`) | Headless, app-shell-level primitives (`AvatarMenu`, `IdentityBadge`, `MembershipBadge`, `ProductSwitcher`, `JourneyRail`, `NotificationBell`, `AccountDrawer`) used in the header row around the account shell, not inside it. Unchanged in role by this work. |

`lib/account/adapters.ts` (`avatarKPlatformAdapters`) was updated to match the canonical `MembershipAdapter` signature (`getSummary`/`getRoles` now take `stats: StatEntry[]`, and `MembershipSummary` no longer carries the old `usagePractices`/`borrowedCount` fields AvatarK Platform never had real data for). `pnpm typecheck`, `pnpm test` (461 cases), `pnpm lint`, and `pnpm build` all pass against the migrated app.

## The 9 canonical sections

Profile, Products, Membership, Preferences, Privacy, Security, Data & Export, Feedback, Support.

The forked source's own tab set was `profile | signin | products | membership | preferences | privacy | activity | echoes | data` (9 keys, but not the same 9 names). Reconciliation:

| Mission section | Package tab key | Notes |
|---|---|---|
| Profile | `profile` | unchanged |
| Products | `products` | unchanged |
| Membership | `membership` | unchanged |
| Preferences | `preferences` | unchanged |
| Privacy | `privacy` | unchanged, optional (only shown if `adapters.privacy` is supplied) |
| **Security** | `signin` | **key unchanged for compatibility; label changed from "Sign-in Methods" to "Security"** (`contracts/tabs.ts`) |
| Data & Export | `data` | unchanged |
| ~~Activity~~ / ~~Echoes~~ | *(removed as core tabs)* | were PrometheusK-specific core tabs in the source; now dynamic extension-slot tabs (see below), plus legacy compat versions kept in `src/extensions/` |
| **Feedback** | *(not a package tab)* | **host-composed**, matching this repo's own existing `app/account/page.tsx` pattern (renders `FeedbackView` locally, at the same rail level as the package's tabs, not nested under a second "Account" tab) |
| **Support** | *(not a package tab)* | same pattern as Feedback |

Feedback and Support are deliberately **not** folded into the package. This repo's current `app/account/page.tsx` already renders them as host-level sections alongside the package's tab strip, and that pattern works — there was no reason to redesign a working seam during a fork whose job is to preserve behavior. A future host that wants Feedback/Support inside the package itself can register them as extension slots instead (see `ACCOUNT_EXTENSION_CONTRACT.md`).

## Product-specific sections are never core tabs

The forked source hardcoded `activity` and `echoes` as static members of its tab-key union — meaning every host, including one with no "Echoes" concept, shipped a fixed union that named a PrometheusK concept. The canonical package fixes this:

- `CoreTabKey` (`packages/account/src/contracts/tabs.ts`) is now exactly the 7 fixed sections above.
- `AccountTabKey = CoreTabKey | \`ext:${string}\`` — any additional section is a dynamically-keyed **extension tab**, added at render time by `AvatarKAccount` from `adapters.extensions` (see `ACCOUNT_EXTENSION_CONTRACT.md`).
- `ActivityAdapter`/`EchoesAdapter` and their tabs are kept, **unchanged, for API compatibility**, moved to `packages/account/src/extensions/` and marked deprecated. New hosts should use the generic `extensions` mechanism instead.

## Stats are generic, not PrometheusK-shaped

The source's `ProfileTab`/`MembershipTab` took hardcoded numeric props (`practices`, `reflections`, `borrowed`, `publishedEchoes`, `draftEchoes`) — real PrometheusK metric names baked into a supposedly platform-neutral contract. The canonical version replaces these with `StatEntry[]` (`{ key, label, value }`), which `AvatarKAccount` derives honestly from whatever optional adapters/extensions are actually present. A host with none of `activity`/`echoes`/`extensions` gets an empty, honest stat list — never a fabricated one.

## Known gaps / open items

- **The "0"/"A" unlabeled-chip issue** (audit Part 1, Finding 5) was fixed in `packages/account-ui`: `NotificationBell`'s bare unread-count and `AvatarMenu`'s bare initial letter now carry screen-reader labels.
- **Two divergent avatar-menu implementations** (`components/echo/shell/EchoAvatarMenu.tsx` vs. `@avatark/account-ui`'s `AvatarMenu`) still exist and are deliberately **not** reconciled by this phase — they are not visibly duplicated on any single screen today (confirmed: `EchoAvatarMenu` owns the global-nav "Account" link; `@avatark/account-ui`'s `AvatarMenu` is only ever rendered inside `/account`'s own header). Merging them is a real, separate architectural change with its own risk, not a mechanical rename — deferred and tracked as an open risk in `docs/IDENTITY_RC1_RELEASE_GATE.md`, not silently dropped.
- **No browser-level visual verification was performed** for this phase (desktop/tablet/mobile review of sign-in, account, and their sub-states) — only `pnpm typecheck`/`pnpm test`/`pnpm lint`/`pnpm build` were run. This is a real gap against mission Part 19's release-gate checklist, called out explicitly rather than claimed done.
