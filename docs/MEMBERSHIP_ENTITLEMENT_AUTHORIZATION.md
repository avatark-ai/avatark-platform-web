# Membership, Entitlement, Role, Capability & Organization Authorization

Frozen contract for AvatarK Identity RC1, Part 8. This document names and
separates six concepts that are easy to conflate, and points at the exact
package/types that implement each one today.

## The six concepts

| Concept | Question it answers | Where it lives |
|---|---|---|
| **Identity** | Who is the person? | `@avatark/identity` |
| **Membership** | What commercial/institutional relationship exists? | `@avatark/membership`'s `MembershipPlan` |
| **Entitlement** | Which product/feature may they access, and why? | `@avatark/membership`'s `ProductAccess`, `EntitlementSource` |
| **Role** | What function do they perform in a product or org? | `ProductAccess.roles` (product-scoped); `OrganizationMembership.role` (org-scoped, `@avatark/organizations`) |
| **Capability** | Which exact action is permitted? | `ProductAccess.capabilities` + `resolveCapability()` |
| **Organization context** | Under whose authority/community is access granted? | `ProductAccess.organizationId` + `@avatark/organizations`'s `OrganizationContext` |

These are independent axes. A person's **identity** never changes based on
product. Their **membership** plan is ecosystem-wide. Their **entitlement**,
**role**, and **capabilities** are per-product (and optionally per-organization).
**Organization context** determines under whose authority a given entitlement
was granted, not who the person is.

## `ProductAccess` (`@avatark/membership`)

```ts
interface ProductAccess {
  productId: string
  deploymentStatus: string   // caller passes through @avatark/product-registry's `status` value
  integrationStatus: string  // caller passes through @avatark/product-registry's `integrationStatus` value
  accessState: ProductAccessState
  membershipPlan: MembershipPlan
  roles: string[]
  capabilities: string[]
  source: EntitlementSource
  organizationId?: string
  validFrom?: string
  validUntil?: string
  suspensionReason?: string
  expiryReason?: string
}
```

`deploymentStatus`/`integrationStatus` are declared as plain `string` on
purpose: this contract is self-contained and does not import
`@avatark/product-registry` or the forked `@avatark/account`. A caller that
has both a registry entry and an entitlement row passes the registry's
values through verbatim; the two packages don't need to agree on internal
enum names to compose.

### Access states

```
not_requested → requested → invited → active
                                  ↓        ↓
                              suspended  expired / revoked
```

`not_requested | requested | invited | active | suspended | expired | revoked`
— exactly the seven states in the mission spec. No implicit eighth state.

### Entitlement sources

`public | invitation | purchase | organization | administrator | scholarship |
promotion | research_enrollment | care_relationship`

Every real `ProductAccess` row must be traceable to one of these. **Do not
fabricate a live entitlement row for a product whose backend doesn't exist**
— this package is contract + pure functions only, never a data source.

## Default-deny authorization

```ts
function resolveCapability(access: ProductAccess | undefined, capability: string): boolean
function hasActiveAccess(access: ProductAccess | undefined): boolean
```

Both default to **deny**:
- `access === undefined` (no entitlement row at all) → `false`.
- `accessState !== "active"` (suspended/expired/revoked/pending states) → `false`.
- `capability` not explicitly listed in `access.capabilities` → `false`.

Authorization must never depend on whether a UI element is visible. Any
server-side check (API route, RSC data loader) should call
`resolveCapability` directly against a real `ProductAccess` row it fetched —
never infer permission from "the button was rendered."

## Organization-scoped entitlement

`@avatark/organizations`'s `organizationProductAccess(context, organizationId,
access)` composes a `ProductAccess` (minus `organizationId`) with an
`OrganizationContext`, and returns `undefined` — not a fabricated row — if the
caller isn't actually a member of that organization. See
[`ORGANIZATION_CONTEXT.md`](./ORGANIZATION_CONTEXT.md) for the full
organization contract.

## Relationship to the forked `@avatark/account` package

A parallel workstream (Part 5) is forking the vendored account package's
`EntitlementState`/`ProductAccessAdapter` shapes into this repo. This
contract does not depend on that package's internal types and was written
without reading its in-progress source, by design — the two are expected to
converge by the account package's adapter layer mapping its own entitlement
shape onto (or reading from) `@avatark/membership`'s `ProductAccess`, not by
this contract adopting the account package's field names.

## Non-goals

- No billing implementation. `paid`/`enterprise`/`education` membership
  plans remain targets; `free` is the only plan issued anywhere today.
- No organization-admin application (see `ORGANIZATION_CONTEXT.md`).
- No live entitlement backend — every `ProductAccess` in this repo today is
  either a test fixture or must be sourced from a real row a calling
  package fetches; this package supplies types and pure functions only.
