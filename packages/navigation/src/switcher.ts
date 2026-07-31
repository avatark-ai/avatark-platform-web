import { PRODUCT_REGISTRY, getProductsByVisibility, type AvatarKProduct, type ProductVisibility } from "@avatark/product-registry";
import { resolveProductDomain, type ResolveDomainOptions } from "./redirect.ts";

// Product Switcher -- the canonical API powering a cross-product switcher
// UI for all 9 registered products (AvatarK, GameK, PrometheusK, ArenaK,
// StreamK, StudioK, Atlas, CinemaK, SetpointK). This module builds the
// *data* a switcher renders; @avatark/account-ui's ProductSwitcher.tsx
// (already real, already headless, zero consumers today) is the one real
// UI that can consume it, unmodified -- its `products: AvatarKProduct[]`
// prop is exactly `listProducts()`'s shape, and its `onSelect` callback is
// exactly where a host would call buildProductSwitcherHref() below to
// decide where a click actually navigates. No new UI is required for this
// contract to be complete.

export interface ProductSwitcherEntry {
  id: string;
  displayName: string;
  icon: string;
  /** Resolved destination URL (see redirect.ts's Redirect Manager). Null only when the product's domain can't be resolved -- a switcher UI should render this entry disabled, never silently omit or mis-link it. */
  href: string | null;
  isCurrent: boolean;
  status: AvatarKProduct["status"];
  visibility: ProductVisibility;
}

export interface ProductSwitcherOptions extends ResolveDomainOptions {
  /** Restrict entries to a visibility tier. Defaults to 'public' -- the switcher a signed-in visitor actually sees should not surface internal/unlaunched products by default. Pass null to include every registered product regardless of visibility (e.g. an internal admin-only switcher). */
  visibility?: ProductVisibility | null;
}

/**
 * The one function that turns "who's signed in, on which product" into
 * the full list a Product Switcher renders. Always includes every
 * registered product matching `options.visibility` (default: 'public'),
 * even the current one -- a switcher UI decides whether to hide or merely
 * disable the current entry (`isCurrent`), this contract never makes that
 * presentation choice for it.
 */
export function buildProductSwitcherEntries(
  currentProductId: string,
  options: ProductSwitcherOptions = {}
): ProductSwitcherEntry[] {
  const registry = options.registry ?? PRODUCT_REGISTRY;
  const visibility = options.visibility === undefined ? "public" : options.visibility;
  const products = visibility === null ? registry : getProductsByVisibility(visibility, registry);

  return products.map((product) => ({
    id: product.id,
    displayName: product.displayName,
    icon: product.icon,
    href: resolveProductDomain(product.id, { preview: options.preview, registry }),
    isCurrent: product.id === currentProductId,
    status: product.status,
    visibility: product.visibility,
  }));
}
