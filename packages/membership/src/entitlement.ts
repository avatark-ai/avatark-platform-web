// Canonical distinction (AvatarK Identity RC1, Part 8):
//   Identity     -- who is the person?              (@avatark/identity)
//   Membership   -- what commercial/institutional
//                   relationship exists?             (MembershipPlan, ./types.ts)
//   Entitlement  -- which product/feature may the
//                   person access, and why?          (EntitlementSource, ProductAccess, below)
//   Role         -- what function do they perform
//                   in a product or organization?    (ProductAccess.roles, below)
//   Capability   -- which exact action is permitted? (resolveCapability, below)
//   Organization -- under whose authority/community
//                   is the access granted?           (ProductAccess.organizationId, @avatark/organizations)
//
// Contract only -- no backend, no live entitlement rows. Do not fabricate
// entitlements for products whose backends don't exist; every real
// ProductAccess row must come from an actual source (see EntitlementSource).
// Self-contained: does not import @avatark/product-registry or
// @avatark/account -- productId is a plain string here so this stays usable
// independent of either package's internal shape.

export type ProductAccessState =
  | "not_requested"
  | "requested"
  | "invited"
  | "active"
  | "suspended"
  | "expired"
  | "revoked"

export type EntitlementSource =
  | "public"
  | "invitation"
  | "purchase"
  | "organization"
  | "administrator"
  | "scholarship"
  | "promotion"
  | "research_enrollment"
  | "care_relationship"

// deploymentStatus/integrationStatus mirror the vocabulary used by
// @avatark/product-registry's AvatarKProduct (status/integrationStatus)
// but are declared independently here on purpose: this contract must be
// importable and type-checkable without depending on that package's
// internals. A caller composing both is expected to pass the registry's
// values through as plain strings.
export interface ProductAccess {
  productId: string
  deploymentStatus: string
  integrationStatus: string
  accessState: ProductAccessState
  membershipPlan: import("./types.ts").MembershipPlan
  roles: string[]
  capabilities: string[]
  source: EntitlementSource
  organizationId?: string
  validFrom?: string
  validUntil?: string
  suspensionReason?: string
  expiryReason?: string
}

export const PRODUCT_ACCESS_STATES: ProductAccessState[] = [
  "not_requested",
  "requested",
  "invited",
  "active",
  "suspended",
  "expired",
  "revoked",
]

export const ENTITLEMENT_SOURCES: EntitlementSource[] = [
  "public",
  "invitation",
  "purchase",
  "organization",
  "administrator",
  "scholarship",
  "promotion",
  "research_enrollment",
  "care_relationship",
]

// Server-safe authorization: never depends on UI visibility. Defaults to
// DENY whenever access is missing, not active, or the capability isn't
// explicitly listed. `access` may be undefined -- an unknown/missing
// entitlement is treated identically to an explicit deny, never as an
// implicit allow.
export function resolveCapability(access: ProductAccess | undefined, capability: string): boolean {
  if (!access) return false
  if (access.accessState !== "active") return false
  return access.capabilities.includes(capability)
}

// Same default-deny rule, without a specific capability -- "can this
// person touch this product at all right now."
export function hasActiveAccess(access: ProductAccess | undefined): boolean {
  return access?.accessState === "active"
}
