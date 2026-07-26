// Resolves content/foundation/ecosystem.md's editorial groups (Begin/
// Practice/Play/Gather/Watch/Create/Understand) against the real
// @avatark/product-registry -- reused by the Ecosystem nav dropdown,
// homepage section, and footer so all three never diverge.
import { getProductById } from '@avatark/product-registry'
import { resolveProductUrl } from '../products/registry.ts'
import { getEcosystemGroupsContent } from './foundation.ts'
import { ENTER_ECHO_HREF } from './links.ts'

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
    // Echo has no registry entry (unbuilt) -- its ecosystem entry point is
    // the same real destination every "Enter Echo" CTA site-wide already
    // uses, not a fabricated separate one.
    return {
      id: 'echo',
      name: 'Echo',
      href: ENTER_ECHO_HREF,
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
    // link regardless of visibility/status.
    href: resolveProductUrl(product),
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
