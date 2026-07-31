import { getProductById, type AvatarKProduct } from "@avatark/product-registry";
import { safeReturnPath } from "@avatark/auth";

// Redirect Manager -- the one place that resolves a product's own domain,
// builds a callback URL, or builds a cross-product return URL. Every
// function takes a product id and looks its domain up in
// @avatark/product-registry; none ever accepts or embeds another
// product's URL as a literal string. This is the portable equivalent of
// this app's own lib/products/registry.ts's resolveProductUrl() (which
// layers per-deployment env-var overrides on top -- a genuinely app-local
// concern, left there, not duplicated here) and lib/journey/continuity.ts's
// buildContinueUrl() (which hardcodes a PrometheusK URL literal -- exactly
// the pattern this module exists to make unnecessary for any *future*
// cross-product redirect).

/** The one real, confirmed callback path convention across this ecosystem's products (this repo's own `/auth/callback`; GameK's setup doc names the same path on its own origin -- docs/GAMEK_SHARED_PLATFORM_SETUP.md). Not itself a claim that every product has implemented it. */
export const AUTH_CALLBACK_PATH = "/auth/callback";

export interface ResolveDomainOptions {
  /** Prefer `previewDomain` over `domain` when both are queried. Today this always falls back to `domain`: no product has a confirmed fixed `previewDomain` yet (see AvatarKProduct.previewDomain's own comment). */
  preview?: boolean;
  registry?: AvatarKProduct[];
}

/**
 * The one function that resolves "what is this product's base URL" from
 * the registry. Returns null when neither the requested domain kind nor
 * its fallback exists -- never guessed, never a placeholder string.
 */
export function resolveProductDomain(productId: string, options: ResolveDomainOptions = {}): string | null {
  const product = getProductById(productId, options.registry);
  if (!product) return null;
  if (options.preview && product.previewDomain) return product.previewDomain;
  return product.domain;
}

function joinPath(base: string, path: string): string {
  const trimmedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${trimmedBase}${normalizedPath}`;
}

/**
 * Resolves `productId`'s domain and appends `path` to it. Null when the
 * domain can't be resolved -- the caller decides the fallback (never
 * silently defaulted to a guessed host here).
 */
export function buildProductUrl(productId: string, path: string, options: ResolveDomainOptions = {}): string | null {
  const domain = resolveProductDomain(productId, options);
  if (!domain) return null;
  return joinPath(domain, path);
}

/** `${product's domain}/auth/callback` -- the canonical callback URL for a product, never hand-assembled by a caller. */
export function buildCallbackUrl(productId: string, options: ResolveDomainOptions = {}): string | null {
  return buildProductUrl(productId, AUTH_CALLBACK_PATH, options);
}

/**
 * Validates a same-origin `?return=`-style path before it's ever used as
 * a redirect target. Thin, intentional re-export of @avatark/auth's
 * already-audited guard (packages/auth/src/safeReturnPath.ts) -- this
 * module does not re-implement open-redirect protection a second time,
 * it only makes the one implementation reachable from the navigation
 * contract layer too.
 */
export function buildReturnPath(raw: string | null | undefined, fallback: string): string {
  return safeReturnPath(raw, fallback);
}

export interface CrossProductReturnOptions extends ResolveDomainOptions {
  /** Query param name carrying the validated return path. Defaults to "return", this repo's own real convention (docs/AUTH_REFERENCE_IMPLEMENTATION.md). */
  paramName?: string;
}

/**
 * Builds a URL on `toProductId`'s own domain carrying a validated
 * `returnPath` back into *this* product -- the general, portable shape of
 * the "Product -> back to Avatar -> next product" pattern
 * (docs/PLATFORM_CONTRACTS.md's Phase 2 Shared Navigation Contract),
 * without hardcoding which product that is. `returnPath` is validated via
 * `buildReturnPath` first, so a caller can never smuggle an open-redirect
 * target through this helper even if the input came straight from a query
 * string.
 */
export function buildCrossProductReturnUrl(
  toProductId: string,
  returnPath: string | null | undefined,
  returnFallback: string,
  options: CrossProductReturnOptions = {}
): string | null {
  const domain = resolveProductDomain(toProductId, options);
  if (!domain) return null;
  const safePath = buildReturnPath(returnPath, returnFallback);
  const paramName = options.paramName ?? "return";
  const url = new URL(domain);
  url.searchParams.set(paramName, safePath);
  return url.toString();
}
