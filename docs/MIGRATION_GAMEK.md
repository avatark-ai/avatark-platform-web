# Migration guide — GameK (`gamek-web`)

**Read this first:** this repo has no access to `gamek-web`'s actual source — everything below is
either (a) a confirmed fact already established in this repo's own doc corpus (cited inline), or (b)
generic guidance for adopting the RC3/RC4 contracts, not a verified audit of GameK's current code.
Where this repo genuinely cannot confirm GameK's present implementation, that's stated plainly rather
than guessed.

## Where GameK already stands

GameK is **the most-integrated non-Avatar product in the ecosystem today** — Phase 1 platform
integration is confirmed complete: Shared Auth, Shared Account, Identity, Product Context, Avatar
Menu, My Journey deep-link, Arena Invitation handoff (`docs/PLATFORM_INTEGRATION_MATRIX.md`'s Game
row). `PRODUCT_REGISTRY`'s entry for `gamek` reflects this: `supportsAuth`, `supportsAccount`,
`supportsNavigation`, and `supportsInvitations` are all `true` — the only product besides `avatark`
itself where that's the case. This is **not a green-field migration** — it's closing one confirmed
defect and adopting the newer RC4 tooling on top of an already-working integration.

## What to delete

1. **Nothing wholesale.** GameK's existing Shared Auth/Account/Identity/Avatar Menu/Product Context
   work is real and should not be torn out. This migration is additive and corrective, not a rewrite.
2. **Any hand-rolled cross-product URL building for the Arena Invitation handoff and Product Context
   switching**, if GameK's own code currently constructs another product's URL as a literal string
   anywhere. This repo cannot confirm whether that's the case in GameK's own code, but if it is,
   delete it in favor of item 2 below — literal cross-product URLs are exactly the pattern
   `@avatark/navigation`'s Redirect Manager exists to remove (`docs/CROSS_PRODUCT_INTEGRATION.md`).

## What to replace it with

1. **Fix the confirmed profile-store defect.** `docs/SHARED_PROFILE_SOURCE_OF_TRUTH.md` documents,
   as a confirmed cross-repo defect (not fixed in this repo, since it's out of scope here): GameK's
   copy of the vendored `@avatark/account` package reads/writes `auth.users.user_metadata`, while this
   repo's copy reads/writes canonical `public.profiles`. **This is GameK's fix to make** — update its
   `ProfileAdapter` implementation to read/write `public.profiles` (matching
   `lib/account/profileMapping.ts`'s real, working mapping in this repo as the reference), or the two
   repos' Account data will keep silently diverging under one shared-package promise.
2. **Adopt `@avatark/bootstrap`.** Replace any hand-wiring of registry lookup + redirect + switcher
   logic with one call:
   ```ts
   import { bootstrapProduct } from "@avatark/bootstrap"
   const boot = bootstrapProduct("gamek", { env: { supabaseUrl, supabaseAnonKey, siteUrl, callbackUrl } })
   ```
   `boot.switcherEntries` replaces any custom Product Context list; `boot.buildReturnTo(...)`
   replaces any hand-built "return to Avatar" URL.
3. **Run the Environment Validator and Conformance checker** (`docs/PRODUCT_BOOTSTRAP.md`,
   `docs/PRODUCT_CONFORMANCE.md`) against GameK's real env vars before calling this migration done —
   given GameK's maturity, it should be the first non-Avatar product to reach `ready: true` with
   only `oauth` left in `pendingLiveVerification`.
4. **Adopt the Deep Link Resolver for GameK's own sub-experiences**, if `/flowk`, `/pathk`,
   `/geometrik`, `/chroniclek` are ever linked to from another product — `@avatark/navigation`'s
   `gameLink(path)` already resolves against GameK's registry domain
   (`gamek.ai`) rather than requiring the caller to know it.

## What's confirmed NOT required

- No change to GameK's own Identity/Auth provider (still its own Supabase project's real, working
  mount) — only the profile *field mapping* is a confirmed defect, not the auth flow itself.
- No UI redesign — this migration is data-layer and URL-construction only.

## Verification GameK should run

`pnpm lint`/`typecheck`/`test`/`build` in GameK's own repo (this repo cannot run them there), plus:
```ts
checkProductConformance("gamek", { env: { ...real env... } })
```
targeting `ready: true` with `pendingLiveVerification` reduced to `["oauth"]` only (or empty, once
Google is confirmed live against Supabase's own settings endpoint).
