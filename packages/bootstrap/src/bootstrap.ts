import {
  PRODUCT_REGISTRY,
  getProductById,
  ECOSYSTEM_CAPABILITIES,
  getCapabilityStatus,
  type AvatarKProduct,
  type ProductVisibility,
  type EcosystemCapability,
  type CapabilityConfirmation,
} from "@avatark/product-registry";
import {
  resolveProductDomain,
  buildProductUrl,
  buildCallbackUrl,
  buildCrossProductReturnUrl,
  buildProductSwitcherEntries,
  type ProductSwitcherEntry,
} from "@avatark/navigation";
import { validateProductEnv, type ProductEnvInput, type EnvValidationReport } from "./envValidator.ts";

// Product Bootstrap -- the one function a new product's own app calls to
// initialize itself against every RC3 contract (registry, redirects,
// navigation, auth, account, product metadata) with minimal custom setup.
// See docs/PRODUCT_BOOTSTRAP.md for the full adoption walkthrough.
//
// This is composition, not a new abstraction: every field below is a
// direct call into an already-real, already-tested RC3 module
// (@avatark/product-registry, @avatark/navigation). bootstrapProduct()
// exists only because wiring all of them by hand, correctly, in every
// product's own repo would otherwise be the exact adoption friction this
// phase is meant to remove.

export interface ProductBootstrap {
  productId: string;
  /** This product's own registry entry. Null if the product hasn't been added to PRODUCT_REGISTRY yet -- bootstrapping does not require registration first, it just returns honestly reduced results until it happens. */
  self: AvatarKProduct | null;
  /** This product's own row of the Ecosystem Capability Matrix (docs/CROSS_PRODUCT_INTEGRATION.md). */
  capabilities: Record<EcosystemCapability, CapabilityConfirmation>;
  /** This product's own resolved domain (production, or preview when requested). Null if unresolved. */
  domain: string | null;
  /** This product's own `/account` URL. Null if the domain is unresolved. */
  accountUrl: string | null;
  /** This product's own `/auth/callback` URL. Null if the domain is unresolved. */
  callbackUrl: string | null;
  /** The full Product Switcher entry list for this product's current position (see @avatark/navigation's switcher.ts). */
  switcherEntries: ProductSwitcherEntry[];
  /** Builds a URL back to `toProductId` carrying a validated, open-redirect-safe return path -- the bound, product-agnostic form of @avatark/navigation's buildCrossProductReturnUrl. */
  buildReturnTo(toProductId: string, returnPath: string | null | undefined, returnFallback: string): string | null;
  /** Present only when `options.env` was supplied -- see @avatark/bootstrap's envValidator.ts. */
  env: EnvValidationReport | null;
}

export interface BootstrapOptions {
  registry?: AvatarKProduct[];
  /** Prefer previewDomain over domain when resolving this product's own URLs. */
  preview?: boolean;
  /** Passed through to buildProductSwitcherEntries -- defaults to 'public', pass null for an unrestricted/admin switcher. */
  switcherVisibility?: ProductVisibility | null;
  /** Supply this product's own resolved environment variables to get a real EnvValidationReport back. Omit to skip environment validation entirely (e.g. in a context, like a build script, with no env available). */
  env?: Omit<ProductEnvInput, "productId">;
}

export function bootstrapProduct(productId: string, options: BootstrapOptions = {}): ProductBootstrap {
  const registry = options.registry ?? PRODUCT_REGISTRY;
  const domainOptions = { preview: options.preview, registry };

  const capabilities = {} as Record<EcosystemCapability, CapabilityConfirmation>;
  for (const capability of ECOSYSTEM_CAPABILITIES) {
    capabilities[capability] = getCapabilityStatus(productId, capability, registry).status;
  }

  return {
    productId,
    self: getProductById(productId, registry),
    capabilities,
    domain: resolveProductDomain(productId, domainOptions),
    accountUrl: buildProductUrl(productId, "/account", domainOptions),
    callbackUrl: buildCallbackUrl(productId, domainOptions),
    switcherEntries: buildProductSwitcherEntries(productId, {
      registry,
      preview: options.preview,
      visibility: options.switcherVisibility,
    }),
    buildReturnTo: (toProductId, returnPath, returnFallback) =>
      buildCrossProductReturnUrl(toProductId, returnPath, returnFallback, { registry }),
    env: options.env ? validateProductEnv({ ...options.env, productId }, registry) : null,
  };
}
