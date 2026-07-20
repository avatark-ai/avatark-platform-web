// AvatarK Platform's app-level view of the shared @avatark/product-registry
// package -- this file used to hold the hardcoded product list directly;
// now it derives from the registry and layers on two things that are
// genuinely local to this app rather than portable, ecosystem-wide facts:
// per-deployment domain overrides (env vars) and this app's own knowledge
// of which products have a product-local admin surface it can link to.
import { NO_BILLING_SYSTEM_NOTE, PRODUCT_REGISTRY, type AvatarKProduct } from '@avatark/product-registry'

export interface PlatformProduct {
  id: string
  name: string
  purpose: string
  url: string | null
  // Product-local admin surface, if one is known to exist. Almost always
  // null: per the mission's data boundary, product-local administration
  // stays product-owned and this repo doesn't assume a URL it hasn't
  // confirmed.
  adminUrl: string | null
  availability: 'live' | 'coming_soon'
  // A confirmed, product-published release version. Left null for every
  // product today -- none publishes a version manifest/endpoint this repo
  // can read, and each product's own package.json version is Next.js
  // scaffold boilerplate (e.g. "0.1.0"), not a real release marker, so
  // surfacing it would be more misleading than an honest null.
  version: string | null
}

export const SUBSCRIPTION_MODEL_NOTE = NO_BILLING_SYSTEM_NOTE

// Real env vars, unchanged from before this app's registry moved to the
// shared package -- the package itself stays free of Next.js/env
// assumptions so non-Next consumers (landing page, future billing) can
// use it too. A deployment-specific override always wins over the
// package's own best-known default.
const DOMAIN_OVERRIDES: Record<string, string | undefined> = {
  avatark: process.env.NEXT_PUBLIC_PLATFORM_ORIGIN,
  prometheusk: process.env.NEXT_PUBLIC_PROMETHEUSK_URL,
  gamek: process.env.NEXT_PUBLIC_GAMEK_URL,
  arenak: process.env.NEXT_PUBLIC_ARENAK_URL,
  streamk: process.env.NEXT_PUBLIC_STREAMK_URL,
  cinemak: process.env.NEXT_PUBLIC_CINEMAK_URL,
  studiok: process.env.NEXT_PUBLIC_STUDIOK_URL,
  atlas: process.env.NEXT_PUBLIC_ATLAS_URL,
  setpointk: process.env.NEXT_PUBLIC_SETPOINTK_URL,
}

// This app's own admin surface is the only one this repo can honestly
// claim to know about -- every other product's admin surface is
// product-owned and not centrally tracked.
const ADMIN_URLS: Record<string, string | null> = {
  avatark: '/admin',
}

function toPlatformProduct(product: AvatarKProduct): PlatformProduct {
  return {
    id: product.id,
    name: product.displayName,
    purpose: product.tagline ?? product.description,
    url: DOMAIN_OVERRIDES[product.id] || product.domain,
    adminUrl: ADMIN_URLS[product.id] ?? null,
    availability: product.status === 'live' ? 'live' : 'coming_soon',
    version: null,
  }
}

export const PLATFORM_PRODUCTS: PlatformProduct[] = PRODUCT_REGISTRY.map(toPlatformProduct)
