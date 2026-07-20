'use client'

import { useMemo } from 'react'
import { PRODUCT_REGISTRY } from './registry.ts'
import { getProductById, getProductsByCategory, getProductsByVisibility } from './helpers.ts'
import type { AvatarKProduct, ProductCapabilityKey, ProductCategory } from './types.ts'

// The registry is static, in-memory data -- these hooks exist purely for
// consumption ergonomics (memoized lookups) inside React components, not
// for fetching. Pass a custom `registry` only when a consumer legitimately
// has a different product set (e.g. tests); real apps use the default.

export function useProductRegistry(registry: AvatarKProduct[] = PRODUCT_REGISTRY): AvatarKProduct[] {
  return registry
}

export function useProduct(id: string, registry: AvatarKProduct[] = PRODUCT_REGISTRY): AvatarKProduct | null {
  return useMemo(() => getProductById(id, registry), [id, registry])
}

export function useProductsByCategory(
  category: ProductCategory,
  registry: AvatarKProduct[] = PRODUCT_REGISTRY
): AvatarKProduct[] {
  return useMemo(() => getProductsByCategory(category, registry), [category, registry])
}

export function useVisibleProducts(registry: AvatarKProduct[] = PRODUCT_REGISTRY): AvatarKProduct[] {
  return useMemo(() => getProductsByVisibility('public', registry), [registry])
}

export function useProductCapability(
  id: string,
  capability: ProductCapabilityKey,
  registry: AvatarKProduct[] = PRODUCT_REGISTRY
): boolean {
  return useMemo(() => getProductById(id, registry)?.[capability] === true, [id, capability, registry])
}
