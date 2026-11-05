// Resolves content/foundation/ecosystem.md's editorial groups (Begin/
// Practice/Play/Gather/Watch/Create/Understand) against the real
// @avatark/product-registry -- reused by the Ecosystem nav dropdown,
// homepage section, and footer so all three never diverge.
import { getProductById } from '@avatark/product-registry'
import { resolveProductUrl } from '../products/registry.ts'
import { scopeIProductHref } from '../release/productDestinations.ts'
import { getEcosystemGroupsContent } from './foundation.ts'

export interface EcosystemProductRef {
  id: string
  name: string
  href: string | null
  isEcho: boolean
  purpose: string | null
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
    // Echo has no registry entry (unbuilt). AVK-PROD-03A CD-1: the Echo application is excluded
    // from the institutional release, so Echo carries no executable link here (the footer renders
    // it as plain text).
    return {
      id: 'echo',
      name: 'Echo',
      href: null,
      isEcho: true,
      purpose: 'A person’s wisdom becoming useful to another life.',
    }
  }
  const product = getProductById(id)
  if (!product) {
    return { id, name: id, href: null, isEcho: false, purpose: null }
  }
  return {
    id: product.id,
    name: product.displayName,
    // The institutional page only describes purpose and relationship; the
    // destination product itself owns auth, invitation gating, and
    // availability -- so every product with a known domain gets a real
    // link regardless of visibility/status. AVK-PROD-03B X-1: in Scope I only audited
    // VERIFIED_PUBLIC destinations stay clickable; every other product renders as plain text.
    href: scopeIProductHref(product.id, resolveProductUrl(product)),
    isEcho: false,
    purpose: product.tagline ?? product.description,
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
