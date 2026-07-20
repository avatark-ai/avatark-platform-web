import { PRODUCT_REGISTRY } from './registry.ts'
import type { AvatarKProduct, ProductCapabilityKey, ProductCategory, ProductStatus, ProductVisibility } from './types.ts'

export function getProductById(id: string, registry: AvatarKProduct[] = PRODUCT_REGISTRY): AvatarKProduct | null {
  return registry.find((p) => p.id === id) ?? null
}

export function getProductBySlug(slug: string, registry: AvatarKProduct[] = PRODUCT_REGISTRY): AvatarKProduct | null {
  return registry.find((p) => p.slug === slug) ?? null
}

export function isValidProductId(id: string, registry: AvatarKProduct[] = PRODUCT_REGISTRY): boolean {
  return registry.some((p) => p.id === id)
}

export function listProducts(registry: AvatarKProduct[] = PRODUCT_REGISTRY): AvatarKProduct[] {
  return [...registry]
}

export function filterProducts(
  predicate: (product: AvatarKProduct) => boolean,
  registry: AvatarKProduct[] = PRODUCT_REGISTRY
): AvatarKProduct[] {
  return registry.filter(predicate)
}

export function getProductsByCategory(
  category: ProductCategory,
  registry: AvatarKProduct[] = PRODUCT_REGISTRY
): AvatarKProduct[] {
  return registry.filter((p) => p.category === category)
}

export function getProductsByStatus(
  status: ProductStatus,
  registry: AvatarKProduct[] = PRODUCT_REGISTRY
): AvatarKProduct[] {
  return registry.filter((p) => p.status === status)
}

export function getProductsByVisibility(
  visibility: ProductVisibility,
  registry: AvatarKProduct[] = PRODUCT_REGISTRY
): AvatarKProduct[] {
  return registry.filter((p) => p.visibility === visibility)
}

export function getProductsWithCapability(
  capability: ProductCapabilityKey,
  registry: AvatarKProduct[] = PRODUCT_REGISTRY
): AvatarKProduct[] {
  return registry.filter((p) => p[capability] === true)
}

export type ProductSortField = 'displayName' | 'id' | 'status' | 'category'
export type SortDirection = 'asc' | 'desc'

const STATUS_RANK: Record<ProductStatus, number> = { live: 0, beta: 1, alpha: 2, internal: 3 }

export function sortProducts(
  registry: AvatarKProduct[] = PRODUCT_REGISTRY,
  field: ProductSortField = 'displayName',
  direction: SortDirection = 'asc'
): AvatarKProduct[] {
  const sorted = [...registry].sort((a, b) => {
    if (field === 'status') return STATUS_RANK[a.status] - STATUS_RANK[b.status]
    return a[field].localeCompare(b[field])
  })
  return direction === 'desc' ? sorted.reverse() : sorted
}
