"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { ProductIdentityConfig } from "./types.ts"

const ProductIdentityContext = createContext<ProductIdentityConfig | null>(null)

export interface ProductIdentityProviderProps {
  value: ProductIdentityConfig
  children: ReactNode
}

export function ProductIdentityProvider({ value, children }: ProductIdentityProviderProps) {
  return <ProductIdentityContext.Provider value={value}>{children}</ProductIdentityContext.Provider>
}

// Throws rather than silently falling back -- a sign-in surface rendered
// without a product identity config is a host wiring bug, not a state to
// paper over.
export function useProductIdentity(): ProductIdentityConfig {
  const value = useContext(ProductIdentityContext)
  if (!value) {
    throw new Error("useProductIdentity() called outside a <ProductIdentityProvider>")
  }
  return value
}
