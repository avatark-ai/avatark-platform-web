// Section 7 ("From Philosophy to Platform") groups every product using the
// frozen ecosystem status vocabulary (Live/Public Beta/Preview/Private
// Beta/In Development) -- a presentation label derived purely from each
// product's real, registry-confirmed status+visibility, never a separate
// maturity score. Same "derive, don't fabricate" discipline as
// lib/activities/registry.ts's registryAvailability().
import { PRODUCT_REGISTRY, type AvatarKProduct } from '@avatark/product-registry'

export type EcosystemStatus = 'Live' | 'Public Beta' | 'Preview' | 'Private Beta' | 'In Development'

export interface EcosystemStatusEntry {
  id: string
  name: string
  tagline: string | null
  status: EcosystemStatus
}

export function toEcosystemStatusLabel(product: Pick<AvatarKProduct, 'status' | 'visibility'>): EcosystemStatus {
  if (product.status === 'live') return 'Live'
  if (product.status === 'beta') return product.visibility === 'public' ? 'Public Beta' : 'Private Beta'
  if (product.status === 'alpha') return product.visibility === 'public' ? 'Preview' : 'In Development'
  // status === 'internal' -- an existing, functioning product just not yet
  // integrated with Platform identity (e.g. SetpointK), not a from-scratch build.
  return 'Private Beta'
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
      status: toEcosystemStatusLabel(product),
    }),
  )

  // Echo has no registry entry -- it's the one honest exception, called
  // out explicitly rather than silently omitted: the whole architecture
  // this page describes serves a product that hasn't been built yet.
  return [
    ...fromRegistry,
    {
      id: 'echo',
      name: 'Echo',
      tagline: 'A person’s wisdom becoming useful to another life.',
      status: 'In Development',
    },
  ]
}

export const STATUS_GROUP_ORDER: { status: EcosystemStatus; label: string }[] = [
  { status: 'Live', label: 'Live' },
  { status: 'Public Beta', label: 'Public Beta' },
  { status: 'Preview', label: 'Preview' },
  { status: 'Private Beta', label: 'Private Beta' },
  { status: 'In Development', label: 'In Development' },
]
