// Resolves content/foundation/ecosystem.md's editorial groups (Begin/
// Practice/Play/Gather/Watch/Create/Understand) against the real
// @avatark/product-registry -- same "never fabricate a destination"
// discipline as lib/activities/registry.ts, reused here rather than
// duplicated because the Ecosystem nav dropdown and homepage section need
// the identical grouping.
import { getProductById } from '@avatark/product-registry'
import { resolveProductUrl } from '../products/registry.ts'
import { getEcosystemGroupsContent } from './foundation.ts'
import { toEcosystemStatusLabel, type EcosystemStatus } from './statusGroups.ts'

export interface EcosystemProductRef {
  id: string
  name: string
  href: string | null
  isEcho: boolean
  purpose: string | null
  statusLabel: EcosystemStatus
}

export interface EcosystemGroup {
  id: string
  label: string
  body: string
  products: EcosystemProductRef[]
}

// Exported so the footer can reuse the exact same product resolution
// (including Echo's special case) instead of a second, separately
// maintained helper -- the footer previously had its own copy that didn't
// special-case Echo and rendered it as the raw lowercase id.
export function resolveEcosystemProduct(id: string): EcosystemProductRef {
  if (id === 'echo') {
    // Echo has no registry entry -- it isn't built yet, an explicit
    // non-goal for this milestone. Never invent a destination for it.
    return {
      id: 'echo',
      name: 'Echo',
      href: null,
      isEcho: true,
      purpose: 'A person’s wisdom becoming useful to another life.',
      statusLabel: 'In Development',
    }
  }
  const product = getProductById(id)
  if (!product) {
    return { id, name: id, href: null, isEcho: false, purpose: null, statusLabel: 'In Development' }
  }
  return {
    id: product.id,
    name: product.displayName,
    // A nav-visible link only for a product that is actually public --
    // internal-visibility products (CinemaK, StudioK, Atlas, SetpointK
    // today) still appear so the ecosystem's shape is honest, just
    // without a real destination yet.
    href: product.visibility === 'public' ? resolveProductUrl(product) : null,
    isEcho: false,
    purpose: product.tagline ?? product.description,
    statusLabel: toEcosystemStatusLabel(product),
  }
}

export function getEcosystemGroups(): EcosystemGroup[] {
  return getEcosystemGroupsContent().map((group) => ({
    id: group.id,
    label: group.label,
    body: group.body,
    products: group.productIds.map(resolveEcosystemProduct),
  }))
}
