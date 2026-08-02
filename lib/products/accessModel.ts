// Truthful per-product state model for the authenticated account UI
// (RC1.1, Parts 4/5). Composes @avatark/product-registry's identity
// config (product-level facts: is this product deployed, is it wired to
// canonical identity, does it require entitlement) with real
// `product_access` rows (user-level fact: does *this* signed-in user
// actually have a grant) -- the two axes this mission requires to stay
// visibly separate. Never falls back to "Coming Soon": every product in
// the real registry has a confirmed `domain`, so every product's
// deployment fact is genuinely 'live' today.
import { PRODUCT_REGISTRY, getProductIdentityConfig } from '@avatark/product-registry'
import type {
  DeploymentStatus,
  IntegrationStatus,
  ProductAccessRequirement,
  UserAccessState,
  ProductAccessSummary,
  ProductWithAccess,
} from '@avatark/account'
import { resolveProductUrl } from './registry'
import { capabilitiesForProductEntry, friendlyCapabilityLabel } from '@/lib/capabilities/labels'
import type { CapabilityGrantRow } from '@/lib/capabilities/types'

// Canonical-package-adoption status per product (RC1.1, Part 4's explicit
// registry treatment). This is NOT the same axis as the pre-existing
// registry `integrationStatus` field (which tracks the *legacy*, pre-RC1
// avatar-menu/product-context integration) -- deliberately hand-authored
// here rather than derived, since conflating "adopted the old integration"
// with "adopted the new canonical packages" is exactly the bug this
// mission asks to fix. No product besides AvatarK has adopted the new
// canonical packages yet (that would be cross-repo mounting, out of this
// mission's scope) -- see docs/migrations/IDENTITY_*.md, all still
// "target," none "complete."
const CANONICAL_INTEGRATION_STATUS: Record<string, IntegrationStatus> = {
  avatark: 'canonical',
  prometheusk: 'legacy',
  gamek: 'pending',
  arenak: 'pending',
  streamk: 'pending',
  cinemak: 'pending',
  studiok: 'pending',
  atlas: 'pending',
  setpointk: 'pending',
}

interface RealAccessGrant {
  productId: string
  status: string
  grantedAt: string
}

function toDeploymentStatus(domainIsLive: boolean): DeploymentStatus {
  return domainIsLive ? 'live' : 'planned'
}

function toUserAccessState(accessRequirement: ProductAccessRequirement, grant: RealAccessGrant | undefined): UserAccessState {
  if (accessRequirement === 'available') return 'active'
  if (!grant) return 'no_grant'
  if (grant.status === 'active' || grant.status === 'suspended' || grant.status === 'expired' || grant.status === 'revoked') return grant.status
  // A real row exists but its status string isn't one of the four this
  // model specifically distinguishes -- the row's presence still reflects
  // a real, granted access fact, not an unknown one.
  return 'active'
}

export interface ProductAccessInputs {
  currentProductId: string
  grants: RealAccessGrant[]
  /** Real platform_roles for the signed-in user -- only ever surfaced for 'avatark' itself, since that's the only product this repo has real role data for. */
  avatarkRoles: string[]
  /** Real capability_grants rows (migration 020) for the signed-in user, active ones only -- see lib/capabilities/queries.ts's listActiveCapabilityGrants. Optional/defaults to empty: capability_grants has no writers yet in any real environment, so an honest empty list, not a fabricated one, is the correct default until a grant actually exists. */
  capabilityGrants?: CapabilityGrantRow[]
}

export function computeProductAccessEntries(inputs: ProductAccessInputs): ProductAccessSummary[] {
  const grantByProduct = new Map(inputs.grants.map((g) => [g.productId, g]))

  return PRODUCT_REGISTRY.map((product) => {
    const identity = getProductIdentityConfig(product.id)!
    const deploymentStatus = toDeploymentStatus(identity.deploymentStatus === 'live')
    const integrationStatus = CANONICAL_INTEGRATION_STATUS[product.id] ?? 'unknown'
    const accessRequirement = identity.accessState as ProductAccessRequirement
    const grant = grantByProduct.get(product.id)
    const userAccessState = toUserAccessState(accessRequirement, grant)
    const isCurrent = product.id === inputs.currentProductId
    const url = resolveProductUrl(product)

    return {
      productId: product.id,
      productName: product.displayName,
      deploymentStatus,
      integrationStatus,
      accessRequirement,
      userAccessState,
      source: grant ? 'administrator' : accessRequirement === 'available' ? 'public' : null,
      organizationName: null, // product_access has no organization_id column today -- never fabricated
      roles: product.id === 'avatark' ? inputs.avatarkRoles : [],
      // Real capability_grants rows (migration 020), friendly-labeled for
      // this consumer-facing surface -- capabilitiesForProductEntry only
      // ever matches this product's own product-scope grants (plus
      // platform-scope grants, under the 'avatark' entry only), never a
      // different product's or an organization's, per the resolver's own
      // exact-scope-match rule (lib/capabilities/resolver.ts). Empty until
      // a real grant exists, same honest-default posture as before.
      capabilities: capabilitiesForProductEntry(product.id, inputs.capabilityGrants ?? []).map(friendlyCapabilityLabel),
      validFrom: grant?.grantedAt ?? null,
      validUntil: null, // no column exists yet
      suspensionReason: null,
      expiryReason: null,
      nextAction: isCurrent
        ? { kind: 'current', label: "You're here", href: null }
        : userAccessState === 'active'
          ? { kind: 'open', label: 'Open', href: url }
          // No route anywhere writes to product_access (confirmed via
          // docs/IDENTITY_RC11_ACCOUNT_AUDIT.md) -- there is no real
          // request-access workflow to send anyone through, so this links
          // to the product's own real destination for more information
          // rather than fabricating a "Request access" action.
          : { kind: 'learn_more', label: 'Learn more', href: url },
    }
  })
}

export function toProductsWithAccess(entries: ProductAccessSummary[]): ProductWithAccess[] {
  return entries.map((e) => {
    const product = PRODUCT_REGISTRY.find((p) => p.id === e.productId)!
    const entitlement =
      e.nextAction.kind === 'current' ? 'active' as const :
      e.userAccessState === 'active' ? (e.accessRequirement === 'available' ? 'available' as const : 'active' as const) :
      e.accessRequirement === 'available' ? 'available' as const : 'invite_only' as const

    return {
      id: e.productId,
      name: e.productName,
      purpose: product.tagline ?? product.description,
      url: e.nextAction.href,
      availability: e.deploymentStatus === 'live' ? 'live' : 'coming_soon',
      deploymentStatus: e.deploymentStatus,
      integrationStatus: e.integrationStatus,
      accessRequirement: e.accessRequirement,
      roles: e.roles,
      entitlement,
      ctaLabel: e.nextAction.label,
      ctaHref: e.nextAction.href,
    }
  })
}
