# Product Bootstrap Package

`@avatark/bootstrap` is the RC4 "Platform Adoption Kit": one function a product calls to initialize
itself against every RC3 contract, plus the diagnostic tooling (Environment Validator, Conformance
checker) and reference adapters this phase adds. Nothing in it is a new abstraction over RC3's
packages — every field is direct composition of an already-real, already-tested call into
`@avatark/product-registry` or `@avatark/navigation`. See `docs/CROSS_PRODUCT_INTEGRATION.md` for
those underlying contracts.

## `bootstrapProduct()`

```ts
import { bootstrapProduct } from "@avatark/bootstrap"

const boot = bootstrapProduct("gamek", {
  env: {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    siteUrl: process.env.NEXT_PUBLIC_PLATFORM_ORIGIN,
    callbackUrl: `${process.env.NEXT_PUBLIC_PLATFORM_ORIGIN}/auth/callback`,
  },
})

boot.self              // this product's own AvatarKProduct registry entry (or null if unregistered)
boot.capabilities       // this product's full row of the Ecosystem Capability Matrix
boot.domain             // this product's own resolved production domain
boot.accountUrl         // `${domain}/account`
boot.callbackUrl        // `${domain}/auth/callback`
boot.switcherEntries    // the full Product Switcher entry list, this product marked isCurrent
boot.buildReturnTo("avatark", "/journey/today", "/journey")   // open-redirect-safe cross-product return URL
boot.env                // an EnvValidationReport, since `env` was supplied
```

`bootstrapProduct` never reads `process.env` itself — pass in whatever your own app already
resolved (Next.js, or any other framework). It never throws for an unregistered product id either:
every field just degrades honestly (`self: null`, every capability `"unconfirmed"`, URLs `null`) so
a brand-new product can call this before it's even added to `PRODUCT_REGISTRY`.

**"A new product should require very little custom setup"** means literally this: one function
call, one options object built from that product's own real env vars. Nothing else is required to
get a working registry lookup, redirect helpers, and switcher list.

## Environment Validator

```ts
import { validateProductEnv } from "@avatark/bootstrap"

const report = validateProductEnv({
  productId: "gamek",
  supabaseUrl, supabaseAnonKey, siteUrl, callbackUrl, previewUrl,
})
// { productId, valid: boolean, issues: [{ field, severity: "error" | "warning", message }] }
```

Checks, per the mission's own list:

| Check | How |
|---|---|
| Supabase URL | Present, valid absolute URL, `https://`, warns if it doesn't look like `*.supabase.co` |
| Publishable/anon key | Present, warns if it doesn't look JWT-shaped (3 dot-separated segments) |
| Site URL | Present, valid absolute URL |
| Callback URL | Warns if absent (assumed `${siteUrl}/auth/callback`); errors if present but on a different origin than Site URL |
| Preview URL | If present, must be a valid absolute URL |
| Missing variables | Every required field above reports a specific, named error, never a generic "invalid config" |
| Capability mismatches | Cross-checks `supportsAuth` (Product Registry) against whether Supabase credentials were actually supplied — error if the registry claims it but the environment doesn't back it, warning the other way around (may be intentional, e.g. a product using its own separate auth) |

`valid` is `true` only when zero **error**-severity issues exist — warnings never block validity,
they're informational (e.g. "this doesn't look like a standard key, confirm it's intentional").

## Conformance checker

```ts
import { checkProductConformance } from "@avatark/bootstrap"

const report = checkProductConformance("gamek", { env: { supabaseUrl, supabaseAnonKey, siteUrl, callbackUrl } })
// { productId, checks: [{ id, status: "pass" | "fail" | "needs_live_verification", detail }], ready, pendingLiveVerification }
```

Full detail in `docs/PRODUCT_CONFORMANCE.md` — this is the machine-checkable form of that checklist.
`ready` is `true` whenever nothing **fails** (a check that only `needs_live_verification` — like
Google OAuth's actual enablement — doesn't block it, since no static tool can ever confirm that one
and treating it as a hard blocker would make `ready` permanently `false` for every product). Anything
left in `pendingLiveVerification` still needs a human to close out before real production sign-off.

## Reference adapters

```ts
import { avatarkAdapter, prometheuskAdapter, gamekAdapter, arenakAdapter, streamkAdapter, studiokAdapter } from "@avatark/bootstrap"
// or: import { referenceAdapters } from "@avatark/bootstrap"; referenceAdapters.gamek
```

Each is exactly `bootstrapProduct("<id>")` — one line, zero product-specific logic, per the mission's
explicit "avoid product-specific logic" instruction. **These are starter/reference code, not live
integrations**: this repo has no access to `gamek-web`, `prometheusk-web`, `dt4m-os`'s ArenaK app,
`streamk-web`, or `studiok`'s own runtime environments, so none of the five non-AvatarK adapters is
constructed with a real `env` — every one of them has `env: null`. A product adopting this kit copies
the one-line pattern (`bootstrapProduct("<own-id>")`) into its own repo and supplies its own real
environment there; see that product's own `docs/MIGRATION_<PRODUCT>.md` for the exact call shown with
real env wiring.

## Design note: why this stayed inside one new package

RC4's mission explicitly warns against building new framework abstractions unless they directly
reduce adoption work. `@avatark/bootstrap` is justified on exactly that basis: every one of its four
modules (bootstrap, env validator, conformance checker, reference adapters) replaces what would
otherwise be per-product hand-wiring of 3–4 separate RC3 module calls, repeated with the same
mistakes possible each time (a forgotten origin check, an unvalidated return path, a stale
capability flag). No new package was added beyond this one; every other RC4 deliverable extends an
existing RC3 package or is documentation only.
