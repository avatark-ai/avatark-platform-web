# Provenance — `packages/account`

## Source

- **Source repository:** `prometheusk-web` (sibling repo, `/home/user/workspace/prometheusk-web`)
- **Source package:** `@avatark/account`, version `0.1.1`
- **Source path:** `packages/avatar-account/`
- **Source commit:** `75d9ac071b46650f89a8500f941ffe8033a27be8` ("`@avatark/account` v0.1.1: fix a real platform-neutral-boundary defect in PrivacySettings."), dated 2026-07-14
- **Date imported:** 2026-07-31

Files copied: `index.ts`, `package.json` (as reference, rewritten), `components/*.tsx`, `components/internal/Tabs.tsx`, `contracts/*.ts(x)`, `testing/mockAdapters.ts`, `styles.css`. `dist/` (compiled output) was **not** copied — this package has its own build step.

## Why this repo now owns this package

This mission's architecture requires `avatark-platform-web` to be the canonical owner of `@avatark/account`, `@avatark/account-ui`, and `@avatark/auth-ui`, with PrometheusK becoming a *consumer* rather than the upstream owner. `prometheusk-web` was not modified as part of this work (read-only reference only); its own copy of `packages/avatar-account` is untouched and will keep functioning until PrometheusK's own migration (`docs/migrations/IDENTITY_PROMETHEUSK.md`) points it at this package instead.

## What we found in the source

The source package was already substantially host-neutral. Its own git history (`H1`–`H13` phases) shows PrometheusK had already: removed internal PrometheusK adapter ownership, extracted URL/routing concerns to the host composition layer ("Chief Architect Option 2"), removed a `next/link`/`next/navigation` dependency, and built a "zero PrometheusK imports" clean-consumer fixture. The adapter contracts (`contracts/adapters.ts`) were already written defensively (contracts-only file, explicit comment: "No PrometheusK-specific imports, no db.\* calls, no Supabase references").

## Modifications made after import

1. **Generic extension-slot mechanism added** (`ExtensionItem`, `ExtensionSlotContent`, `ExtensionAdapter`, `AccountAdapters.extensions?: ExtensionAdapter[]`, and the `ExtensionTab` UI component). This is the canonical, product-neutral way a host registers a product-specific section going forward. See `docs/ACCOUNT_EXTENSION_CONTRACT.md`.
2. **`ActivityAdapter`/`EchoesAdapter` and their `ActivityTab`/`EchoesTab` components kept, unchanged, but marked deprecated and moved to `src/extensions/`** — API-compatible with the source, but no longer part of the canonical core UI directory (`src/ui/`). New hosts should use `extensions` instead.
3. **`MembershipAdapter.getSummary`/`getRoles` and `ProfileTab`/`MembershipTab`'s stats props changed from hardcoded PrometheusK metric names (`practices`, `publishedEchoes`, `borrowed`, `draftEchoes`, `reflections`) to a generic `StatEntry[]` (`{ key, label, value }`)**. This is a genuine, mandated API change (removing "product-specific activity metrics" per the migration brief), not a preservation-violating redesign — the shell (`AvatarKAccount`) now derives `StatEntry[]` generically from whichever optional adapters/extensions are actually present, so a host with none of `activity`/`echoes`/`extensions` gets an empty, honest stats list instead of a fabricated one.
4. **`PrivacyTab` no longer takes an `echoes` prop** and no longer renders a hardcoded "published Echoes visibility" section — that was a PrometheusK-specific concept baked directly into what the source's own comments already identified as a "platform-neutral boundary." Product-specific per-item visibility now belongs in a host's own `productControls` or an extension slot.
5. **`PreferencesTab`'s "Default landing page" control changed from a hardcoded `<select>` of PrometheusK routes (`/`, `/my/timeline`, `/my/borrow`) to a plain text input** — the package must not assume any host's route structure.
6. **Fixed a real leak in `DataExportTab`**: the source hardcoded `"Contact prometheus@avatark.ai"` in the delete-account copy, bypassing the `AccountSupportConfig` adapter that exists for exactly this purpose (the same class of bug the source's own `SignInMethodsTab` had already been fixed for). Now uses `adapters.support.supportEmail`.
7. **`AccountTabs`/`AccountTabKey` split into `CoreTabKey` (7 fixed sections) + dynamic `` `ext:${string}` `` extension tab keys**, instead of the source's single fixed 9-key union that hardcoded `'activity'`/`'echoes'` as static core tabs. `ACCOUNT_TAB_KEYS`/`ACCOUNT_TAB_LABELS` now only list the 7 core sections; extension tabs are supplied at render time by `AvatarKAccount`.
8. **`'signin'` tab label changed from "Sign-in Methods" to "Security"** to match the mission's canonical section name, while keeping the `'signin'` key itself unchanged for compatibility.
9. Fixed two accessibility gaps in the sibling `@avatark/account-ui` package while working in this area (not part of the fork itself): `NotificationBell`'s bare unread-count and `AvatarMenu`'s bare initial letter both lacked screen-reader labels.

## What was intentionally NOT copied

- `dist/` compiled output, `node_modules`, build artifacts, `.tgz` archives.
- No secrets, env files, or credentials existed in the source package to begin with (it is contracts + UI only).
- No PrometheusK-specific *adapter implementations* existed in the source package either — `prometheusk-web`'s actual `AccountAdapters` implementation lives in its own `lib/account/` (per the source's own architecture, adapters are host-supplied, never packaged), so there was nothing product-specific to strip out of the adapter *implementations* — only the vocabulary/shape leaks listed above.

## Migration status (Part 16)

`app/account/page.tsx` now consumes this local package (`"@avatark/account": "workspace:*"` in the root `package.json`). The vendored tarball (`avatark-account-0.1.1.tgz`) has been removed from `package.json` and deleted from the repo. `lib/account/adapters.ts` was updated to match this package's `MembershipAdapter` signature (`stats: StatEntry[]` parameter, `MembershipSummary` without the old PrometheusK-shaped `usagePractices`/`borrowedCount` fields). `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build` all pass. No browser-level visual verification was performed as part of this change — see `docs/CANONICAL_ACCOUNT_SHELL.md`'s open items and `docs/IDENTITY_RC1_RELEASE_GATE.md`.
