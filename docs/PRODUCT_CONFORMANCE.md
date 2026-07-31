# Product Conformance Checklist

The standard every product must satisfy before production, per RC4's mission. Machine-checkable via
`@avatark/bootstrap`'s `checkProductConformance(productId, options)` (`docs/PRODUCT_BOOTSTRAP.md`) —
this document is the checklist's narrative form; the function is its executable form. Every item
below states honestly whether it's something this tool can actually confirm statically, or whether
it fundamentally needs a live check or a human — the checker never fabricates a "pass" for the
latter kind.

## The 11 items

| # | Item | What "pass" means | Can this tool confirm it alone? |
|---|---|---|---|
| 1 | **Product Registry** | The product has a real entry in `PRODUCT_REGISTRY` (`packages/product-registry`) | Yes |
| 2 | **Account** | The product's own `/account` URL resolves (its domain is known) | Yes |
| 3 | **Navigation** | The product appears in the Product Switcher's entry list (`@avatark/navigation`'s `buildProductSwitcherEntries`) | Yes |
| 4 | **Redirects** | The product's own domain resolves via the Redirect Manager | Yes |
| 5 | **Deep Links** | For the 4 products with a defined role in the Deep Link Resolver's six kinds (`avatark`, `arenak`, `studiok`, `gamek` — see `docs/DEEP_LINKS.md`), its domain resolves. Not applicable to the other 5 products today. | Yes, where applicable |
| 6 | **Invitations** | `PRODUCT_REGISTRY`'s `supportsInvitations` flag is `true` for this product | Yes |
| 7 | **Product Registry** *(capability participation)* | The product participates in the Ecosystem Capability Matrix (i.e. it's registered — see item 1) | Yes |
| 8 | **Capability Matrix** | Same as above; env-driven capability *mismatches* are surfaced through the Environment Validator, not duplicated as a separate pass/fail here | Yes |
| 9 | **Return Paths** | A malicious injected return value does not survive a round trip through `buildCrossProductReturnUrl` back to this product | Yes |
| 10 | **Auth** | Supabase URL/anon key/Site URL are present and internally consistent (Environment Validator) | Yes, structurally — reachability/liveness is a separate concern (`lib/products/health.ts`'s pattern in this repo) |
| 11 | **OAuth (Google)** | Structural prerequisites (item 10) are met | **No** — actual provider enablement can only be confirmed against Supabase's live `/auth/v1/settings` endpoint (`docs/GOOGLE_OAUTH_DEPLOYMENT_CHECKLIST.md`). Always reports `needs_live_verification` once prerequisites pass. |
| 12 | **Magic Link** | Supabase URL/anon key present — magic link is unconditional once these exist (`docs/AUTH_REFERENCE_IMPLEMENTATION.md`'s behavior #1), unlike OAuth | Yes |

(Counted as 11 distinct checklist dimensions per the mission's list; "Product Registry" and
"Capability Matrix" collapse to two closely-related but separately-named checks in the checker's own
`ConformanceCheckId` union: `product_registry` and `capability_matrix`.)

## Reading a report

```ts
import { checkProductConformance } from "@avatark/bootstrap"

const report = checkProductConformance("gamek", {
  env: { supabaseUrl, supabaseAnonKey, siteUrl, callbackUrl },
})
```

- `report.checks` — one `{ id, status, detail }` per item above. `status` is `"pass"`, `"fail"`, or
  `"needs_live_verification"` — never a bare boolean, so "we couldn't check this" is never confused
  with "this failed."
- `report.ready` — `true` when nothing **fails**. A `needs_live_verification` item (OAuth, always;
  Auth/Magic Link, only when no `env` was supplied) does not block readiness on its own — see
  `docs/PRODUCT_BOOTSTRAP.md`'s design note for why treating it as a hard blocker would make `ready`
  permanently `false` for every product.
- `report.pendingLiveVerification` — the checklist ids still requiring a human/live confirmation
  before real production sign-off, even when `ready` is `true`.

## Before production, a human must still

1. Close out every id in `pendingLiveVerification` — today, that always includes `oauth` (Google
   provider enablement can only be confirmed by checking Supabase's dashboard or the live settings
   endpoint), and `auth`/`magic_link` if the conformance check was run without a real `env`.
2. Confirm the product's real Supabase project's migrations, RLS policies, and Redirect URLs
   allowlist match what the environment variables claim — this checker validates *shape*, not
   *live database/dashboard state* (the same boundary `docs/PLATFORM_DATABASE_VERIFICATION.md`
   already draws for this repo's own migrations).
3. Exercise the actual sign-in → callback → account flow in a real browser at least once — no
   automated tool in this repo's toolchain can substitute for that (`docs/ACCOUNT_COMPOSITION.md`'s
   own "not verified" section names the same limitation for this repo's UI).

## What this checklist does not do

- It does not gate a merge or a deploy automatically — there is no CI wiring for
  `checkProductConformance` in this repo (nothing in `.github/` or a pre-commit hook calls it). It's
  a tool a product's own CI can adopt, not one this repo enforces on anyone's behalf.
- It does not check UI/visual conformance (avatar menu styling, account page layout) — those are
  product-owned design decisions, not part of this integration-layer checklist.
