# Platform package distribution

## Why this document exists

The 14 `packages/*` workspace packages (`@avatark/account-ui`, `auth`,
`identity`, `invitations`, `journey`, `living-echo`, `membership`, `motion`,
`navigation`, `notifications`, `organizations`, `product-registry`,
`recommendations`, `timeline`) were built (Phase 1/2, prior sessions) as
`workspace:*` dependencies inside this repo. **Independent repositories
cannot depend on `workspace:*`** — that protocol only resolves inside a
pnpm workspace. Before this session, none of the 14 had ever crossed a
repo boundary; the one precedent for cross-repo distribution in this
ecosystem, `@avatark/account` (vendored into this repo and `gamek-web` as
a hand-copied `avatark-account-0.1.1.tgz`), is explicitly documented in
three separate docs (`PLATFORM_CONTRACTS.md`, `AVATARK_SHARED_PLATFORM_ARCHITECTURE.md`,
`IDENTITY_ACCOUNT_ADMIN_HANDOFF.md`) as a **drift-prone anti-pattern**, not
a workflow to copy — "no publishing pipeline, no drift protection."

This document establishes a better near-term mechanism: still a tarball
(no artifact registry or CI publish pipeline exists in this environment to
build one), but a *reproducible, scripted* one with real compiled output,
checksums, and a documented upgrade/rollback procedure — the thing the
existing precedent was missing, not a different distribution model.

**RC4 update:** a 15th package, `@avatark/bootstrap` (the Platform Adoption
Kit — see `docs/PRODUCT_BOOTSTRAP.md`), was added using this exact same
mechanism (`scripts/build-packages.mjs`/`pack-packages.mjs` both updated to
include it, in dependency-ordered position after `navigation`). Everything
below describing "the 14 packages" is an accurate historical snapshot of
this document's original audit — read `docs/PRODUCT_REGISTRY.md`'s and
`docs/CROSS_PRODUCT_INTEGRATION.md`'s own "Phase" sections for what changed
in each package's contents since, and the refreshed checksum table below
for the current, real state of all 15.

## What was found before any fix (the audit)

Every one of the 14 packages, before this session:
- Had `"types"`/`"exports"` pointing directly at `./src/index.ts` — **raw
  TypeScript source, not compiled output.** No package had a `dist/`, a
  `build` script, or a `files` field.
- Worked inside this repo only because pnpm's workspace linking symlinks
  `node_modules/@avatark/<name>` straight to `packages/<name>`, and
  Next.js's own bundler resolves `.ts` source directly. Neither mechanism
  exists for an external repo installing a tarball.
- Had one real, undeclared dependency: `packages/journey/src/manifest.ts`
  and `recovery.ts` import `@avatark/invitations`, but `journey`'s
  `package.json` never listed it — it only worked by accident, via pnpm's
  flat hoisting of every workspace package into `node_modules`. **Fixed**
  in this session (`journey/package.json` now declares it).
- Had one real type-environment gap: `packages/journey/src/guestContext.ts`
  uses `localStorage` (a legitimate browser API for its guest-context
  purpose), but `journey`'s own `tsconfig.json` only declared `lib:
  ["esnext"]`, no `"dom"`. This never surfaced because the app's root
  `tsconfig.json` (which does include `"dom"`) is what `pnpm typecheck`
  actually runs against — only building the package standalone exposed
  it. **Fixed** (`journey/tsconfig.json` now includes `"dom"`).
- **Known, documented, NOT fixed this session — client/server boundary
  mixing:** `account-ui`, `motion`, and `product-registry` each ship a
  single barrel `index.ts` that re-exports both `'use client'` components
  and plain server-safe code/data together. A consumer importing anything
  from `account-ui`'s barrel (say, just `IdentityBadge`, which has no
  client directive) transitively pulls in `AvatarMenu`/`ProductSwitcher`/
  `AccountDrawer`/`NotificationBell` (all `'use client'`) through the same
  module graph, forcing the whole import into a client boundary even when
  the consumer only needed server-safe pieces. This is a real, specific,
  actionable gap — fixing it means splitting each package into a `.`
  (server-safe) and `./client` export subpath, touching 3 packages'
  public API shape, which this pass treats as a deliberate follow-up
  rather than folding into an already-large session.

## Dependency graph (verified against actual source imports, not assumed)

```
account-ui   -> journey, membership, product-registry
bootstrap    -> product-registry, navigation
journey      -> auth, invitations
living-echo  -> timeline, recommendations
navigation   -> product-registry, auth
(identity, product-registry, timeline, recommendations, membership,
 invitations, notifications, organizations, motion, auth have zero @avatark/*
 dependencies -- they are the leaves; navigation's edge to auth was added in
 RC3, see docs/CROSS_PRODUCT_INTEGRATION.md)
```

This is also the required **build order** (leaves first), encoded directly
in `scripts/build-packages.mjs`.

## The distribution mechanism

### Build: real compiled output, not source

Each package's `tsconfig.json` uses `allowImportingTsExtensions` +
explicit `.ts` relative imports (a bundler-resolution style) — a plain
`tsc` emit needs two things beyond the type-check-only config already
there: `--rewriteRelativeImportExtensions` (rewrites `.ts`/`.tsx` specifiers
to `.js` in **JS** emit — built into TypeScript 5.7+) and a small,
purpose-built postbuild fixup (`scripts/fix-dts-extensions.mjs`) for the
one gap that flag doesn't cover: emitted `.d.ts` files still reference the
literal `.ts`/`.tsx` specifier (confirmed against TypeScript 5.9.3), which
would force a consumer to resolve a source file the package never ships.
The fixup rewrites exactly that pattern.

```
pnpm build:packages     # scripts/build-packages.mjs -- builds all 14, in dependency order
```

Each package gets a `dist/` with compiled `.js` + matching `.d.ts` (test
files excluded from the build via each `tsconfig.json`'s `exclude`).

### In-repo consumption is unchanged

This repo's own `package.json`/`pnpm-workspace.yaml` still resolve every
`@avatark/*` package via `workspace:*` straight to `packages/<name>/src`
(via each package's **top-level** `types`/`exports`, left exactly as they
were). `pnpm dev`/`typecheck`/`build`/`test` never require `dist/` to
exist — there is no new build step in this repo's own inner loop.

### What a consumer gets: `publishConfig`

Each package's `package.json` adds a `publishConfig` block (main/module/
types/exports repointed at `./dist/...`, plus `"type": "module"`) — the
standard npm/pnpm mechanism for "what changes when this package is packed/
published," independent of what the workspace itself resolves. `pnpm pack`
merges `publishConfig` over the base fields in the tarball's package.json.
Verified directly: unpacking a produced tarball shows `main`/`types`/
`exports` all pointing at `dist/index.js`/`dist/index.d.ts`, while the
source tree's own `package.json` is untouched.

### Pack: versioned, checksummed artifacts

```
pnpm pack:packages      # scripts/pack-packages.mjs -- packs all 14 to dist-packages/*.tgz + manifest.json
```

Writes `dist-packages/<pkg>.tgz` for all 14 packages plus
`dist-packages/manifest.json` (package name, tarball filename, sha256,
byte size). Both `packages/*/dist` and `dist-packages/` are gitignored —
regenerated on demand, not committed source. **This is the one respect in
which this mechanism is not yet better than the `@avatark/account`
precedent**: that package's tarball is checked into git (so any repo can
reference a fixed path); these 14 are not, because there is no CI/artifact
registry in this environment to produce and host them automatically, and
committing 14 regenerable binary blobs (that go stale the moment source
changes without a rebuild) trades one drift risk for another. Until a real
artifact host or CI publish step exists, a consuming repo's maintainer
runs `pnpm build:packages && pnpm pack:packages` against a specific commit
of this repo and copies the resulting tarball(s) into their own repo root
— the same manual step `@avatark/account` already requires today, just
now backed by a real build instead of a hand-authored one.

### Checksums from the last verified build (2026-07-31, RC4 — 15 packages)

| Package | Tarball | sha256 |
|---|---|---|
| `@avatark/account-ui` | `avatark-account-ui-0.1.0.tgz` | `1bf77a9930accd20d8d2cc5ae6b7dd4502574eebe685c1d4840b4807fd11e43b` |
| `@avatark/auth` | `avatark-auth-0.1.0.tgz` | `521546017a21b7588162718f0b7f997029f94016b28380bcb6bdb8db09d12931` |
| `@avatark/bootstrap` | `avatark-bootstrap-0.1.0.tgz` | `4e680f11318675bfafb23cdabdf16cc7a17c49195679d28aefdec3c8ff8eaeab` |
| `@avatark/identity` | `avatark-identity-0.1.0.tgz` | `31c58aa4ac3eea23a6612ce8bc85c21a45d69e837111d35962619c572465359c` |
| `@avatark/invitations` | `avatark-invitations-0.1.0.tgz` | `072a93fd7cd496dd33b10bae1ee978c904e7a4b1e195843f9c0be55c9f405aa6` |
| `@avatark/journey` | `avatark-journey-0.1.0.tgz` | `35eaa6da730fade349d17321809b97b0ce20cc8f831b0f4d869a2e4a87147077` |
| `@avatark/living-echo` | `avatark-living-echo-0.1.0.tgz` | `4288f62d22864cb19cbc4a540720da288740baeb02e7b39e8515fbb03858692d` |
| `@avatark/membership` | `avatark-membership-0.1.0.tgz` | `bbdff187407b681d86a53d6cda5a7c33391b0e8485169bdb16064c2af3b9d390` |
| `@avatark/motion` | `avatark-motion-0.1.0.tgz` | `243a999b6a56c601cfe32f86cfd68126c89877bdcacc91521c2dcdd055e24d9e` |
| `@avatark/navigation` | `avatark-navigation-0.1.0.tgz` | `f40e2a14b9304d29f00d2a6851e36c58f8470d93b09ef82d4afadee9fee49a8b` |
| `@avatark/notifications` | `avatark-notifications-0.1.0.tgz` | `81b472bee74d3bcdac3bf8d201b2ddeceb803c38c8d5fd56a8aa1630e4e1fea8` |
| `@avatark/organizations` | `avatark-organizations-0.1.0.tgz` | `e0e0ff9b23f77723da745f58453f243842f32dc2826bc20b4017c91ffbb76bbf` |
| `@avatark/product-registry` | `avatark-product-registry-0.1.0.tgz` | `eb370684c0efe7ef619f8e4230283aef66d1b64030eb139734e6207ef7d9fe94` |
| `@avatark/recommendations` | `avatark-recommendations-0.1.0.tgz` | `2ed5a4ec68a1d7ebe8c7243eef374c010502080dadb25ac63059d0fb4afd8127` |
| `@avatark/timeline` | `avatark-timeline-0.1.0.tgz` | `1f7215648123968bd4531d25879572113c202442b36b037f2f94ed39dfe18104` |

`invitations`/`navigation`/`organizations`/`product-registry` checksums changed from the original
audit's snapshot above — real content changes from the RC3 (`docs/CROSS_PRODUCT_INTEGRATION.md`) and
RC4 (`docs/PRODUCT_BOOTSTRAP.md`) passes, not drift. `identity`/`journey`/`living-echo`/`membership`/
`motion`/`notifications`/`recommendations`/`timeline`/`account-ui`/`auth` are unchanged since the
original audit.

Reproduce: `pnpm install && pnpm build:packages && pnpm pack:packages`,
then read `dist-packages/manifest.json`.

### Verified against a genuinely clean external consumer

Not just "the script ran" — a separate temp directory outside this repo
(no pnpm workspace, no shared `node_modules`, plain `npm install
<path-to-tarball>.tgz`) actually imported and executed
`@avatark/product-registry` (`PRODUCT_REGISTRY.length === 9`, real data,
not a mock) and `@avatark/identity`, and separately typechecked a `.ts`
file importing `@avatark/product-registry`'s types with a standalone `tsc`
invocation — zero errors. Both the runtime (`.js`) and type (`.d.ts`)
surfaces of the packed artifact work standalone.

## Consumer installation

```jsonc
// consumer repo's package.json
"dependencies": {
  "@avatark/product-registry": "file:./vendor/avatark-product-registry-0.1.0.tgz"
}
```
Copy the tarball into the consumer repo (e.g. a `vendor/` directory, same
placement pattern as `@avatark/account`'s tarball today), record its
checksum from `manifest.json` alongside it, then `pnpm install` /
`npm install`.

## Versioning policy

- Every package is `0.1.0` today (Phase 1/2 baseline) and `"private":
  true` (blocks accidental `npm publish` to a public registry — intended,
  since a `file:` tarball is the only sanctioned distribution path right
  now).
- Bump **patch** for internal fixes with no contract/type change (e.g.
  fixing the `journey`→`invitations` dependency declaration in this
  session would be a patch on its own, in a repo that versions
  independently per package — this repo does not yet, see below).
- Bump **minor** for additive, backward-compatible contract changes (new
  exported type/function, new optional field).
- Bump **major** for any breaking change to an exported type or function
  signature a consumer could already depend on.
- **Today, all 14 share one implicit version line (`0.1.0`)** — there is
  no per-package changelog or independent version bumping yet (matching
  the existing repo-wide absence of any `CHANGELOG*` file, confirmed by
  audit). Introducing per-package independent versioning (e.g. via
  changesets) is a real, reasonable next step but out of scope for this
  pass — flagged, not silently deferred.

## Consumer upgrade procedure

1. Rebuild and re-pack this repo at the desired commit/tag:
   `pnpm install && pnpm build:packages && pnpm pack:packages`.
2. Compare the new `dist-packages/manifest.json` checksum against the
   consumer's currently-vendored tarball's checksum — if unchanged, there
   is nothing to do.
3. If changed, copy the new tarball over the old one in the consumer
   repo's vendor location, update the checksum record, run `pnpm install`
   / `npm install` in the consumer repo, then run the consumer's own
   `typecheck`/`test`/`build` — a breaking change (major bump per the
   policy above) should fail fast at typecheck, not silently at runtime.

## Consumer rollback procedure

1. Keep the previous tarball (do not delete it on upgrade — e.g. `vendor/
   avatark-product-registry-0.1.0-<short-sha>.tgz` naming avoids overwrite
   until the new one is confirmed good).
2. To roll back: restore the previous tarball's `file:` path in
   `package.json`, re-run `pnpm install`/`npm install`, redeploy. No
   registry unpublish step exists or is needed, since nothing was ever
   published to a registry in the first place.

## Prohibited workspace-only assumptions

A consumer repo must not assume:
- `workspace:*` resolution — it does not exist outside this pnpm workspace.
- That `packages/*/src/*.ts` (raw source) is importable directly — only
  `dist/` (via the tarball's `publishConfig`-merged `exports`) is a
  supported entry point for an external repo.
- That every package's barrel export is server-safe — `account-ui`,
  `motion`, and `product-registry` currently mix `'use client'` and
  server-safe code in one entry point (see "Known, documented, NOT fixed"
  above); importing any one export from these three currently pulls in
  the client-only code too.
- That two packages sharing a name across repos are the same package —
  `prometheusk-web`'s own local `@avatark/account` (a *different* package,
  versioned independently at `prometheusk-web/packages/avatar-account`)
  is unrelated to this repo's `@avatark/account-ui`; see
  `docs/PLATFORM_PRODUCT_ADOPTION_MATRIX.md` for the full cross-repo
  naming-collision inventory.
