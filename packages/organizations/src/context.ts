// Runtime organization-context contract (AvatarK Identity RC1, Part 9).
// Contract + pure functions only -- no backend, matching this package's
// existing pattern. A user may hold different roles and product
// entitlements in different organizations; these types model that without
// implying an organization-admin application exists.
import type { EntitlementSource, ProductAccess } from "@avatark/membership"
import type { Organization, OrganizationMember } from "./types.ts"

// One row the signed-in user belongs to, denormalized for display without
// requiring a join at every call site.
export interface OrganizationMembership {
  organization: Organization
  role: string
  source: Extract<EntitlementSource, "invitation" | "organization" | "administrator">
}

// The signed-in user's full organization context: everything they belong
// to, plus which one is "current" right now. `currentOrganizationId` is
// `null` for a user with no organization memberships (e.g. Personal-only).
export interface OrganizationContext {
  memberships: OrganizationMembership[]
  currentOrganizationId: string | null
}

export function findMembership(
  context: OrganizationContext,
  organizationId: string
): OrganizationMembership | undefined {
  return context.memberships.find((m) => m.organization.id === organizationId)
}

export function currentMembership(context: OrganizationContext): OrganizationMembership | undefined {
  if (!context.currentOrganizationId) return undefined
  return findMembership(context, context.currentOrganizationId)
}

// A product entitlement scoped to a specific organization -- composes
// @avatark/membership's ProductAccess with this org's membership. Returns
// undefined (not a fabricated row) when the user isn't a member of the
// organization at all.
export function organizationProductAccess(
  context: OrganizationContext,
  organizationId: string,
  access: Omit<ProductAccess, "organizationId">
): ProductAccess | undefined {
  const membership = findMembership(context, organizationId)
  if (!membership) return undefined
  return { ...access, organizationId }
}

export type OrganizationSwitchResult =
  | { ok: true; context: OrganizationContext }
  | { ok: false; reason: "not_a_member" }

// Safe organization switching: never mutates in place, never allows
// switching into an organization the caller doesn't have a membership
// row for (no backend call needed to make that determination -- the
// membership list itself is the source of truth this function trusts).
export function switchOrganization(
  context: OrganizationContext,
  targetOrganizationId: string
): OrganizationSwitchResult {
  if (!findMembership(context, targetOrganizationId)) {
    return { ok: false, reason: "not_a_member" }
  }
  return { ok: true, context: { ...context, currentOrganizationId: targetOrganizationId } }
}

// Raw OrganizationMember rows (as read from the real table) plus the
// Organization rows they reference, joined into the membership list this
// module works with -- kept separate from OrganizationMembership so a
// caller reading straight from the database has an explicit seam.
export function toMembershipList(
  members: OrganizationMember[],
  organizations: Organization[],
  source: OrganizationMembership["source"] = "organization"
): OrganizationMembership[] {
  const byId = new Map(organizations.map((org) => [org.id, org]))
  const memberships: OrganizationMembership[] = []
  for (const member of members) {
    const organization = byId.get(member.orgId)
    if (!organization) continue
    memberships.push({ organization, role: member.role, source })
  }
  return memberships
}
