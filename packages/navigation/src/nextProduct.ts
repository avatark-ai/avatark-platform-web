import { getProductById, type AvatarKProduct } from "@avatark/product-registry";

// The real, already-populated part of "next product" navigation --
// AvatarKProduct.nextProductIds (packages/product-registry/src/registry.ts)
// -- resolved to full product records. This is genuinely portable logic,
// unlike the "return to Avatar" decision (lib/journey/continuity.ts),
// which stays app-specific: it depends on this app's own PrometheusK-URL
// builder, intention taxonomy, and witness slug, none of which are
// portable ecosystem facts.
export function resolveNextProducts(currentProductId: string): AvatarKProduct[] {
  const current = getProductById(currentProductId);
  if (!current?.nextProductIds) return [];
  return current.nextProductIds
    .map((id) => getProductById(id))
    .filter((product): product is AvatarKProduct => product !== null);
}
