// Section 7 ("From Philosophy to Platform") groups every product into
// Live/Preview/Building/Research -- a presentation bucket derived purely
// from each product's real, registry-confirmed status+visibility, never a
// separate maturity score. Same "derive, don't fabricate" discipline as
// lib/activities/registry.ts's registryAvailability().
import { PRODUCT_REGISTRY, type AvatarKProduct } from '@avatark/product-registry'

export type EcosystemStatus = 'live' | 'preview' | 'building' | 'research'

export interface EcosystemStatusEntry {
  id: string
  name: string
  tagline: string | null
  status: EcosystemStatus
}

function toStatus(product: AvatarKProduct): EcosystemStatus {
  if (product.visibility === 'public' && product.status === 'live') return 'live'
  if (product.visibility === 'public' && (product.status === 'beta' || product.status === 'alpha')) return 'preview'
  if (product.visibility === 'internal' && product.status === 'alpha') return 'building'
  return 'research'
}

// AvatarK itself is the platform/shell, not a consumer-facing ecosystem
// product -- excluded here the same way it's excluded from the Ecosystem
// nav/section groups.
const ECOSYSTEM_PRODUCT_IDS = new Set(PRODUCT_REGISTRY.map((p) => p.id).filter((id) => id !== 'avatark'))

export function getEcosystemStatusEntries(): EcosystemStatusEntry[] {
  const fromRegistry: EcosystemStatusEntry[] = PRODUCT_REGISTRY.filter((p) => ECOSYSTEM_PRODUCT_IDS.has(p.id)).map(
    (product) => ({
      id: product.id,
      name: product.displayName,
      tagline: product.tagline,
      status: toStatus(product),
    }),
  )

  // Echo has no registry entry -- it's the one honest exception, called
  // out explicitly rather than silently omitted: the whole architecture
  // this page describes serves a product that hasn't been built yet.
  return [
    ...fromRegistry,
    { id: 'echo', name: 'Echo', tagline: 'A person’s wisdom becoming useful to another life.', status: 'research' },
  ]
}

export const STATUS_GROUP_ORDER: { status: EcosystemStatus; label: string }[] = [
  { status: 'live', label: 'Live' },
  { status: 'preview', label: 'Preview' },
  { status: 'building', label: 'Building' },
  { status: 'research', label: 'Research' },
]
