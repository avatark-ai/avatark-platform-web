"use client"

import type { AvatarKProduct } from "@avatark/product-registry"

export interface ProductSwitcherProps {
  products: AvatarKProduct[]
  currentProductId: string
  onSelect: (productId: string) => void
  className?: string
}

// Headless list -- no navigation/routing opinion (the host decides what
// onSelect actually does, e.g. router.push(product.domain)). Not wired
// into any real product switcher yet.
export function ProductSwitcher({ products, currentProductId, onSelect, className }: ProductSwitcherProps) {
  return (
    <div className={className} data-avatark-component="product-switcher" role="listbox">
      {products.map((product) => (
        <button
          key={product.id}
          type="button"
          role="option"
          aria-selected={product.id === currentProductId}
          data-avatark-part="product-option"
          data-current={product.id === currentProductId}
          onClick={() => onSelect(product.id)}
        >
          {product.displayName}
        </button>
      ))}
    </div>
  )
}
