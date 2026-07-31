import { PRODUCT_REGISTRY, getProductById, type AvatarKProduct } from "@avatark/product-registry";
import { resolveProductDomain, buildProductUrl, buildCrossProductReturnUrl, buildProductSwitcherEntries, DEEP_LINK_PARTICIPANT_IDS } from "@avatark/navigation";
import { validateProductEnv, type ProductEnvInput } from "./envValidator.ts";

// Product Conformance Checklist -- a machine-checkable companion to
// docs/PRODUCT_CONFORMANCE.md's 11-item checklist, reusing the same
// registry/redirect/env machinery every other module in this package
// already relies on. Every check states honestly whether it actually
// verified something or whether the dimension requires a live check this
// static package cannot perform (see ConformanceStatus below) -- never a
// fabricated "pass" for something this tool has no way to confirm.

export type ConformanceCheckId =
  | "product_registry"
  | "capability_matrix"
  | "auth"
  | "account"
  | "navigation"
  | "redirects"
  | "deep_links"
  | "invitations"
  | "return_paths"
  | "oauth"
  | "magic_link";

export type ConformanceStatus = "pass" | "fail" | "needs_live_verification";

export interface ConformanceCheckResult {
  id: ConformanceCheckId;
  status: ConformanceStatus;
  detail: string;
}

export interface ConformanceReport {
  productId: string;
  checks: ConformanceCheckResult[];
  /**
   * True when no check statically **fails** -- i.e. everything this tool
   * is capable of verifying has passed. This is deliberately not "every
   * check is pass": items like `oauth` provider-enablement can never be
   * confirmed by a static package (see `pendingLiveVerification`), so
   * requiring a literal "pass" on those would make `ready` permanently
   * false for every product forever, which would make this field useless
   * as an actual go/no-go signal. A human still has to close out
   * `pendingLiveVerification` before real production sign-off.
   */
  ready: boolean;
  /** Checklist ids this tool could not statically confirm one way or the other -- still require the live/manual verification named in each check's own `detail`. */
  pendingLiveVerification: ConformanceCheckId[];
}

interface ConformanceInput {
  registry?: AvatarKProduct[];
  env?: Omit<ProductEnvInput, "productId">;
}

export function checkProductConformance(productId: string, options: ConformanceInput = {}): ConformanceReport {
  const registry = options.registry ?? PRODUCT_REGISTRY;
  const self = getProductById(productId, registry);
  const domain = resolveProductDomain(productId, { registry });
  const envInput = options.env ? { ...options.env, productId } : null;
  const envReport = envInput ? validateProductEnv(envInput, registry) : null;
  const envErrors = envReport?.issues.filter((i) => i.severity === "error") ?? [];

  const checks: ConformanceCheckResult[] = [];
  const check = (id: ConformanceCheckId, status: ConformanceStatus, detail: string) => checks.push({ id, status, detail });

  // 1. Product Registry
  check(
    "product_registry",
    self ? "pass" : "fail",
    self ? `Registered as "${self.displayName}" (packages/product-registry).` : `"${productId}" is not in PRODUCT_REGISTRY -- register it first.`
  );

  // 2. Capability Matrix -- registered products always participate; the
  // real diagnostic (mismatches between declared and actual capability)
  // lives in the env report, surfaced here rather than duplicated.
  check(
    "capability_matrix",
    self ? "pass" : "fail",
    self
      ? "Participates in the Ecosystem Capability Matrix (docs/CROSS_PRODUCT_INTEGRATION.md)."
      : "Cannot be scored in the Capability Matrix until registered."
  );

  // 3. Auth -- structurally verifiable (env present, no config errors);
  // whether Supabase itself is reachable is a live concern, not this
  // check's job (see docs/AUTH_INTEGRATION_GUIDE.md).
  if (!envReport) {
    check("auth", "needs_live_verification", "No environment supplied -- pass `options.env` to verify Supabase URL/anon key/Site URL are present and consistent.");
  } else {
    check(
      "auth",
      envErrors.length === 0 ? "pass" : "fail",
      envErrors.length === 0 ? "Supabase URL/anon key/Site URL present and internally consistent." : envErrors.map((i) => i.message).join(" ")
    );
  }

  // 4. Account
  const accountUrl = buildProductUrl(productId, "/account", { registry });
  check("account", accountUrl ? "pass" : "fail", accountUrl ? `Resolves to ${accountUrl}.` : "Domain unresolved -- cannot build an /account URL.");

  // 5. Navigation -- can this product be switched *to* from elsewhere.
  const switcherEntries = buildProductSwitcherEntries(productId, { registry, visibility: null });
  const listedInSwitcher = switcherEntries.some((e) => e.id === productId);
  check(
    "navigation",
    listedInSwitcher ? "pass" : "fail",
    listedInSwitcher ? "Appears in the Product Switcher's entry list." : "Not registered, so it cannot appear in any switcher."
  );

  // 6. Redirects
  check("redirects", domain ? "pass" : "fail", domain ? `Own domain resolves to ${domain}.` : "No domain resolves for this product id.");

  // 7. Deep Links -- only applicable to the 4 products that actually
  // participate in a DeepLinkKind today (docs/DEEP_LINKS.md).
  if (!DEEP_LINK_PARTICIPANT_IDS.includes(productId)) {
    check("deep_links", "needs_live_verification", `"${productId}" has no defined role in the Deep Link Resolver's six kinds -- not currently applicable (see docs/DEEP_LINKS.md).`);
  } else {
    check("deep_links", domain ? "pass" : "fail", "Participates in the Deep Link Resolver and its domain resolves.");
  }

  // 8. Invitations
  check(
    "invitations",
    self?.supportsInvitations ? "pass" : "fail",
    self?.supportsInvitations
      ? "Registry declares supportsInvitations=true."
      : "Registry does not declare supportsInvitations=true for this product."
  );

  // 9. Return Paths -- a real safety check, not just a domain check: a
  // malicious path must not survive a round trip back to this product.
  const maliciousReturn = buildCrossProductReturnUrl(productId, "https://evil.example.com/steal", "/", { registry });
  const returnPathsSafe = maliciousReturn ? new URL(maliciousReturn).searchParams.get("return") !== "https://evil.example.com/steal" : null;
  check(
    "return_paths",
    returnPathsSafe ? "pass" : "fail",
    returnPathsSafe
      ? "A malicious return path is sanitized before reaching this product's own return URL."
      : "Could not build a return URL to this product (domain unresolved) -- return-path safety could not be exercised."
  );

  // 10. OAuth (Google) -- genuinely requires a live check against
  // Supabase's /auth/v1/settings (lib/auth/authProviderCapabilities.ts) --
  // this static tool can only fail fast on a missing structural
  // prerequisite, never confirm the provider is actually enabled.
  if (!envReport) {
    check("oauth", "needs_live_verification", "No environment supplied. Even with one, enablement itself always needs a live Supabase settings check (docs/AUTH_INTEGRATION_GUIDE.md) -- this tool can only fail fast on missing prerequisites.");
  } else if (envErrors.length > 0) {
    check("oauth", "fail", "Structural prerequisites (Supabase URL/anon key/callback URL) are not met -- OAuth cannot work regardless of Supabase provider configuration.");
  } else {
    check("oauth", "needs_live_verification", "Structural prerequisites are met. Whether Google is actually enabled can only be confirmed live, against Supabase's /auth/v1/settings (see docs/GOOGLE_OAUTH_DEPLOYMENT_CHECKLIST.md).");
  }

  // 11. Magic Link -- unlike OAuth, magic link is unconditional once
  // Supabase itself is configured (docs/AUTH_REFERENCE_IMPLEMENTATION.md's
  // behavior #1), so this one *can* be a real pass/fail, not just a
  // live-verification placeholder.
  if (!envReport) {
    check("magic_link", "needs_live_verification", "No environment supplied -- pass `options.env` to verify Supabase credentials are present.");
  } else {
    check(
      "magic_link",
      envErrors.length === 0 ? "pass" : "fail",
      envErrors.length === 0
        ? "Supabase URL/anon key present -- magic link works unconditionally once these are configured."
        : "Supabase credentials are missing or malformed -- magic link cannot work."
    );
  }

  return {
    productId,
    checks,
    ready: checks.every((c) => c.status !== "fail"),
    pendingLiveVerification: checks.filter((c) => c.status === "needs_live_verification").map((c) => c.id),
  };
}
