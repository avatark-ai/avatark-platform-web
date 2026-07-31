import { getProductById, PRODUCT_REGISTRY, type AvatarKProduct } from "@avatark/product-registry";

// Environment Validator -- a pure, static check of the handful of
// environment variables every product's auth mount actually needs, plus
// a cross-check against what the Product Registry already declares that
// product supports. Deliberately reads no env directly (no
// `process.env` anywhere in this file): a caller passes in whatever
// values its own runtime resolved, keeping this package usable outside
// Next.js/Vercel too. The real, confirmed variable names this validates
// against come from this repo's own working auth mount (`lib/auth/`,
// `app/auth/*`) -- see docs/AUTH_INTEGRATION_GUIDE.md for the full
// mounting guide these fields correspond to.

export interface ProductEnvInput {
  productId: string;
  /** `NEXT_PUBLIC_SUPABASE_URL` in this repo's own convention. */
  supabaseUrl?: string | null;
  /** `NEXT_PUBLIC_SUPABASE_ANON_KEY` -- the publishable/anon key, never the service-role key. */
  supabaseAnonKey?: string | null;
  /** This product's own canonical origin -- `NEXT_PUBLIC_PLATFORM_ORIGIN` in this repo's own convention. Supabase's "Site URL" should match this. */
  siteUrl?: string | null;
  /** This product's own `/auth/callback` URL. If omitted, the validator assumes `${siteUrl}${AUTH_CALLBACK_PATH}` and only warns. */
  callbackUrl?: string | null;
  /** A confirmed, fixed preview/staging origin, if one exists -- see AvatarKProduct.previewDomain's own comment on why this is rare. */
  previewUrl?: string | null;
}

export type EnvIssueSeverity = "error" | "warning";

export interface EnvIssue {
  field: string;
  severity: EnvIssueSeverity;
  message: string;
}

export interface EnvValidationReport {
  productId: string;
  /** True only when there are zero "error"-severity issues. Warnings alone do not fail validation. */
  valid: boolean;
  issues: EnvIssue[];
}

function isNonEmpty(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidAbsoluteUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function looksLikeJwt(value: string): boolean {
  // Supabase anon/publishable keys are JWTs (header.payload.signature) --
  // a heuristic, not a cryptographic validation of the key itself.
  return value.split(".").length === 3;
}

export function validateProductEnv(
  input: ProductEnvInput,
  registry: AvatarKProduct[] = PRODUCT_REGISTRY
): EnvValidationReport {
  const issues: EnvIssue[] = [];
  const push = (field: string, severity: EnvIssueSeverity, message: string) => issues.push({ field, severity, message });

  // Missing variables -- Supabase URL, anon key, and Site URL are the
  // three required prerequisites for any product mounting this repo's
  // own auth pattern (magic link works unconditionally once these three
  // are present -- docs/PLATFORM_CONTRACTS.md's Authentication section).
  if (!isNonEmpty(input.supabaseUrl)) {
    push("supabaseUrl", "error", "NEXT_PUBLIC_SUPABASE_URL is missing -- no auth mount is possible without it.");
  } else if (!isValidAbsoluteUrl(input.supabaseUrl)) {
    push("supabaseUrl", "error", `"${input.supabaseUrl}" is not a valid absolute URL.`);
  } else if (!input.supabaseUrl.startsWith("https://")) {
    push("supabaseUrl", "error", `"${input.supabaseUrl}" is not https:// -- Supabase Auth requires it.`);
  } else if (!input.supabaseUrl.includes(".supabase.co")) {
    push("supabaseUrl", "warning", "Does not look like a standard *.supabase.co project URL -- confirm this is intentional (e.g. a custom domain).");
  }

  if (!isNonEmpty(input.supabaseAnonKey)) {
    push("supabaseAnonKey", "error", "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing -- required for every Supabase client call, including the public settings check Google sign-in visibility depends on.");
  } else if (!looksLikeJwt(input.supabaseAnonKey)) {
    push("supabaseAnonKey", "warning", "Does not look like a JWT (expected 3 dot-separated segments) -- confirm this is the anon/publishable key, not the service-role key or a placeholder.");
  }

  if (!isNonEmpty(input.siteUrl)) {
    push("siteUrl", "error", "Site URL (NEXT_PUBLIC_PLATFORM_ORIGIN or this product's own equivalent) is missing -- return-path and callback-URL resolution both depend on it.");
  } else if (!isValidAbsoluteUrl(input.siteUrl)) {
    push("siteUrl", "error", `"${input.siteUrl}" is not a valid absolute URL.`);
  }

  if (!isNonEmpty(input.callbackUrl)) {
    push("callbackUrl", "warning", "No explicit callback URL provided -- assumed to be `${siteUrl}/auth/callback`. Confirm this exact URL is in Supabase's Redirect URLs allowlist (docs/GOOGLE_OAUTH_DEPLOYMENT_CHECKLIST.md).");
  } else {
    if (!isValidAbsoluteUrl(input.callbackUrl)) {
      push("callbackUrl", "error", `"${input.callbackUrl}" is not a valid absolute URL.`);
    } else if (isNonEmpty(input.siteUrl) && isValidAbsoluteUrl(input.siteUrl)) {
      const siteOrigin = new URL(input.siteUrl).origin;
      const callbackOrigin = new URL(input.callbackUrl).origin;
      if (siteOrigin !== callbackOrigin) {
        push("callbackUrl", "error", `Callback URL origin (${callbackOrigin}) does not match Site URL origin (${siteOrigin}) -- Supabase's redirect allowlist is origin-specific, this will be rejected.`);
      }
    }
  }

  if (isNonEmpty(input.previewUrl) && !isValidAbsoluteUrl(input.previewUrl)) {
    push("previewUrl", "error", `"${input.previewUrl}" is not a valid absolute URL.`);
  }

  // Capability mismatches -- cross-check the environment against what the
  // registry already declares this product supports.
  const product = getProductById(input.productId, registry);
  if (product) {
    const hasAuthEnv = isNonEmpty(input.supabaseUrl) && isNonEmpty(input.supabaseAnonKey);
    if (product.supportsAuth && !hasAuthEnv) {
      push("supportsAuth", "error", `The registry declares supportsAuth=true for "${input.productId}", but no Supabase URL/anon key was provided -- environment does not back the declared capability.`);
    }
    if (!product.supportsAuth && hasAuthEnv) {
      push("supportsAuth", "warning", `Supabase credentials are present for "${input.productId}", but the registry does not declare supportsAuth=true -- update packages/product-registry, or confirm this product intentionally uses its own separate auth (e.g. PrometheusK's separate Supabase project).`);
    }
  } else {
    push("productId", "warning", `"${input.productId}" is not in the supplied registry -- capability-mismatch checks were skipped.`);
  }

  return {
    productId: input.productId,
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}
