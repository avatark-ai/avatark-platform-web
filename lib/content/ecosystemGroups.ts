// Resolves content/foundation/ecosystem.md's editorial groups (Begin/
// Practice/Play/Gather/Watch/Create/Understand) against the real
// @avatark/product-registry -- same "never fabricate a destination"
// discipline as lib/activities/registry.ts, reused here rather than
// duplicated because the Ecosystem nav dropdown and homepage section need
// the identical grouping.
import { getProductById } from '@avatark/product-registry'
import { resolveProductUrl } from '../products/registry.ts'
import { getEcosystemGroupsContent } from './foundation.ts'

export interface EcosystemProductRef {
  id: string
  name: string
  href: string | null
  isEcho: boolean
}

export interface EcosystemGroup {
  id: string
  label: string
  body: string
  products: EcosystemProductRef[]
}

function resolveEcosystemProduct(id: string): EcosystemProductRef {
  if (id === 'echo') {
    // Echo has no registry entry -- it isn't built yet, an explicit
    // non-goal for this milestone. Never invent a destination for it.
    return { id: 'echo', name: 'Echo', href: null, isEcho: true }
  }
  const product = getProductById(id)
  if (!product) return { id, name: id, href: null, isEcho: false }
  return {
    id: product.id,
    name: product.displayName,
    // A nav-visible link only for a product that is actually public --
    // internal-visibility products (CinemaK, StudioK, Atlas, SetpointK
    // today) still appear so the ecosystem's shape is honest, just
    // without a real destination yet.
    href: product.visibility === 'public' ? resolveProductUrl(product) : null,
    isEcho: false,
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
