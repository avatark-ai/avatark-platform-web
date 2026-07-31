# Identity Product Configuration Contract (AvatarK Identity RC1, Part 4)

Typed, frozen "safe customization" contract every product's sign-in/return experience is built from. Lives at `packages/product-registry/src/identityConfig.ts`, exported from `@avatark/product-registry`. Reads from the existing `PRODUCT_REGISTRY` (`packages/product-registry/src/registry.ts`) rather than duplicating product facts.

## Contract shape

```ts
interface ProductIdentityConfig {
  productId: string
  productName: string
  wordmark: { text: string; assetSlot: boolean }   // assetSlot true once a real logo asset exists
  accentToken: string                              // semantic token name; real color stays AvatarKProduct.accentColor
  signInContext: string                             // canonical per-product return-context sentence
  defaultReturnPath: string                         // must satisfy allowedLocalRoutePrefixes
  allowedLocalRoutePrefixes: string[]                // same-origin allowlist -- no arbitrary callback URLs
  privacyNote: string                                // one sentence, never a legal guarantee
  signedOutSupportLinks: { label: string; href: string }[]
  accountExtensionRegistrations: string[]           // ids only -- mechanism owned by Part 5/10
  deploymentStatus: 'live' | 'not_deployed'          // derived: domain !== null
  integrationStatus: 'live' | 'pending_shared_identity' // derived from registry's IntegrationStatus
  accessState: 'available' | 'entitlement_dependent' | 'entitlement_and_consent_required' // hand-authored
}
```

No arbitrary HTML and no arbitrary callback URL is ever accepted: `defaultReturnPath` and every local `signedOutSupportLinks` entry are validated against `allowedLocalRoutePrefixes` by `validateProductIdentityConfig`, using the same same-origin/backslash/protocol-relative defenses as `packages/auth/src/safeReturnPath.ts` (see `isAllowedLocalRoute`).

## Status vocabulary reconciliation

The mission asks for `deploymentStatus` / `integrationStatus` / `accessState`. The registry (`AvatarKProduct`) already has three real, populated, multiply-consumed fields — `status`, `integrationStatus`, `visibility` — that are close but not identical in meaning. Per the audit's "extend, don't rebuild" verdict, **none of the existing fields were renamed**; a breaking rename would affect every existing consumer of `@avatark/product-registry` (capability matrix, helpers, hooks, `lib/activities/registry.ts`, etc.) for a naming-only change.

Instead:
- `deploymentStatus` is a **new, derived** fact: `domain !== null → 'live'`, else `'not_deployed'`. This is a genuinely different question from the existing `status` field (product maturity) — a product can be `status: 'alpha'` and still `deploymentStatus: 'live'` (CinemaK, SetpointK both have real, reachable production domains today).
- `integrationStatus` (mission sense) is a **derived alias** of the registry's existing `IntegrationStatus` (`'live' | 'preview' | 'coming-online' | 'in-development' | 'vision'`), collapsed to `'live' | 'pending_shared_identity'` — the mission's own examples never distinguish finer than that.
- `accessState` is **hand-authored**, not derived — nothing in the registry today models "can an arbitrary signed-in user actually reach this experience." It is intentionally decoupled from `deploymentStatus`: DNS-live is not the same as access being open.

This means CinemaK.ai and SetpointK.ai are never reported as "coming soon" merely because integration is incomplete (`deploymentStatus: 'live'` for both), while their integration honestly stays `pending_shared_identity`, and their `accessState` stays gated (`entitlement_dependent` / `entitlement_and_consent_required`) rather than fabricating open access.

## Reference configs — all 9 products

| Product | deploymentStatus | integrationStatus | accessState | defaultReturnPath |
|---|---|---|---|---|
| AvatarK | live | live | available | `/account` |
| PrometheusK | live | live | available | `/` |
| GameK | live | live | available | `/` |
| ArenaK | live | pending_shared_identity | entitlement_dependent | `/` |
| StreamK | live | pending_shared_identity | entitlement_dependent | `/` |
| CinemaK | live | pending_shared_identity | entitlement_dependent | `/` |
| StudioK | live | pending_shared_identity | entitlement_dependent | `/` |
| Atlas | live | pending_shared_identity | entitlement_dependent | `/` |
| SetpointK | live | pending_shared_identity | **entitlement_and_consent_required** | `/` |

Full per-product `signInContext`, `privacyNote`, `allowedLocalRoutePrefixes`, and `accountExtensionRegistrations` are defined in `identityConfig.ts` and match the mission's exact canonical copy where specified (verified by `identityConfig.test.ts`).

## What this file does not do

- Does not implement the account-extension *mechanism* (slot rendering, adapter binding) — that's Part 5/10's `@avatark/account` workstream; this file only carries the extension-point ids a product registers.
- Does not implement the auth-UI components that render `signInContext`/`allowedLocalRoutePrefixes` — that's Part 2/3's `@avatark/auth-ui`.
- Does not change `AvatarKProduct`'s existing `status`/`integrationStatus`/`visibility` fields or any existing consumer of them.

## Tests

`packages/product-registry/src/identityConfig.test.ts` (7 cases, all passing): all 9 products have a valid config; every registry product has exactly one config; `signInContext` matches the mission's exact required copy; CinemaK/SetpointK are DNS-live but not platform-integrated and never `accessState: 'available'`; derived helpers never silently mark an unconfirmed product live; `isAllowedLocalRoute` rejects absolute/external/protocol-relative/backslash/`javascript:` targets; extension registrations reference the mission's named per-product extension domains.
