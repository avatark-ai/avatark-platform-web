# Identity Package Distribution (Mission Part 17)

Extends `docs/PLATFORM_PACKAGE_DISTRIBUTION.md` — that document is still the authority on the build/pack/checksum mechanism itself (why it exists, the audit of the pre-fix state, the verified dependency graph, consumer installation/versioning/rollback procedure). This document covers only what changed for the identity/account/auth RC1 mission: 4 new packages and 1 major ownership change.

## What's new since `PLATFORM_PACKAGE_DISTRIBUTION.md` was last updated (RC4, 15 packages)

| Package | Version | Why it's new |
|---|---|---|
| `@avatark/account` | 0.2.0 | Forked from `prometheusk-web`'s vendored `@avatark/account` 0.1.1 into this repo (`packages/account/`, see `PROVENANCE.md`). Previously a `file:` tarball dependency; now `workspace:*`, built/packed like every other package. Version bumped to 0.2.0 to mark the ownership transfer + the extension-slot/`DataExportScope`/`AccountClosureScope` additions — the pre-existing public API is otherwise preserved. |
| `@avatark/auth-ui` | 0.1.0 | New canonical sign-in UI (Mission Parts 2–3) — zero prior art existed anywhere in the repo (`docs/IDENTITY_RC1_AUDIT.md`, Finding 2). |
| `@avatark/locale` | 0.1.0 | New locale registry/format contract (Mission Part 6). |
| `@avatark/appearance` | 0.1.0 | New appearance-mode/product-accent contract (Mission Part 7). |

19 packages total now build and pack (`scripts/build-packages.mjs`'s `BUILD_ORDER`, `scripts/pack-packages.mjs`'s `PACKAGES` list — both updated this session, verified re-run clean: all 19 build, all 19 pack with fresh SHA-256 checksums in `dist-packages/manifest.json`).

## The vendored tarball is gone

`avatark-account-0.1.1.tgz` has been **deleted from the repo and removed from `package.json`'s dependencies** — `app/account/page.tsx` now resolves `@avatark/account` via the pnpm workspace, not a `file:` tarball. This closes the exact "drift-prone anti-pattern" `PLATFORM_PACKAGE_DISTRIBUTION.md`'s original audit named `@avatark/account`'s vendoring as the one precedent to avoid. It is not yet avoided ecosystem-wide: `gamek-web` and `prometheusk-web` still hold their own separate copies of the pre-fork package until they complete their own migrations (`docs/migrations/IDENTITY_GAMEK.md`, `docs/migrations/IDENTITY_PROMETHEUSK.md`).

## Dependency graph additions (verified, not guessed)

- `@avatark/auth-ui` → `@avatark/auth`, `@avatark/product-registry` (both leaves) — placed in the "one hop" build tier.
- `@avatark/account` → no `@avatark/*` dependencies (verified by `packages/account/src/importBoundary.test.ts`'s own regression test asserting `package.json`'s `dependencies` is `{}`) — placed in the leaves tier.
- `@avatark/locale`, `@avatark/appearance` → no dependencies — leaves tier.
- `@avatark/organizations` gained a real dependency on `@avatark/membership` (`EntitlementSource`/`ProductAccess` types, Part 9's organization-scoped entitlement) — already correctly ordered (membership before organizations in the leaves list).

## Compatibility policy for the new/changed packages

- `@avatark/account`: the pre-fork public API (`AvatarKAccount`, `AccountTabs`, `AccountAdaptersProvider`, all adapter interfaces) is preserved exactly, per the explicit migration constraint "preserve the existing public API initially." The only breaking shape change is `MembershipAdapter.getSummary`/`getRoles` now taking `stats: StatEntry[]` and `MembershipSummary` dropping the PrometheusK-specific `usagePractices`/`borrowedCount` fields — a deliberate, cited, mandated change (`PROVENANCE.md` item 3), not an accidental break. Any consumer (this repo's own `lib/account/adapters.ts` was the one found and fixed) must update its adapter implementation to match.
- `@avatark/auth-ui`, `@avatark/locale`, `@avatark/appearance`: 0.1.0, no prior consumers, no compatibility constraint yet — treat as frozen from first publish per the mission's release-gate requirement ("frozen package APIs").

## Regression coverage added this session

- `packages/account/src/importBoundary.test.ts` — no PrometheusK/Living-Echo references outside marked compat files, zero `app/` imports, zero `next/navigation`/`next/link` imports, no hardcoded secrets, zero `@avatark/*` runtime dependencies.
- `packages/auth-ui/src/noSecrets.test.ts` — no Supabase project strings, JWT-shaped literals, or `process.env.*` reads in any auth-ui source file.
- Both packages' typecheck (`tsc --noEmit`) and test suites pass in isolation (not just as part of the app's build).

## Build/pack verification run this session

```
pnpm run build:packages   # All 19 packages built.
pnpm run pack:packages    # Wrote dist-packages/manifest.json (19 packages).
```

Both commands were re-run after every package addition in this session and passed cleanly each time — this is not a one-time, unverified claim.
