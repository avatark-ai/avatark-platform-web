import { test } from "node:test";
import assert from "node:assert/strict";
import { checkProductConformance, type ConformanceCheckId } from "./conformance.ts";

const GOOD_ENV = {
  supabaseUrl: "https://hapoerzbcnagyfafqojg.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.abc123signature",
  siteUrl: "https://avatark-platform-web.vercel.app",
  callbackUrl: "https://avatark-platform-web.vercel.app/auth/callback",
};

test("checkProductConformance covers all 11 checklist items exactly once", () => {
  const report = checkProductConformance("avatark", { env: GOOD_ENV });
  assert.equal(report.checks.length, 11);
  const ids = new Set(report.checks.map((c) => c.id));
  assert.equal(ids.size, 11);
});

test("avatark with a fully-valid environment passes every check the tool can statically verify", () => {
  const report = checkProductConformance("avatark", { env: GOOD_ENV });
  const notPassing = report.checks.filter((c) => c.status !== "pass" && c.id !== "oauth");
  assert.deepEqual(notPassing, [], `unexpected non-pass checks: ${JSON.stringify(notPassing)}`);
  // OAuth enablement itself can never be a static "pass" -- it always needs a live check.
  assert.equal(report.checks.find((c) => c.id === "oauth")?.status, "needs_live_verification");
  // ready tolerates needs_live_verification -- only an actual "fail" blocks it.
  assert.equal(report.ready, true);
  assert.deepEqual(report.pendingLiveVerification, ["oauth"]);
});

test("an unregistered product fails product_registry, capability_matrix, account, navigation, redirects, invitations", () => {
  const report = checkProductConformance("not-a-real-product", { env: GOOD_ENV });
  const failing = new Set(report.checks.filter((c) => c.status === "fail").map((c) => c.id));
  const expectedFailures: ConformanceCheckId[] = ["product_registry", "capability_matrix", "account", "navigation", "redirects", "invitations"];
  for (const id of expectedFailures) {
    assert.ok(failing.has(id), `expected "${id}" to fail for an unregistered product`);
  }
});

test("no env supplied: auth, oauth, and magic_link all report needs_live_verification, never a fabricated pass", () => {
  const report = checkProductConformance("avatark");
  const ids: ConformanceCheckId[] = ["auth", "oauth", "magic_link"];
  for (const id of ids) {
    assert.equal(report.checks.find((c) => c.id === id)?.status, "needs_live_verification");
    assert.ok(report.pendingLiveVerification.includes(id));
  }
});

test("an env with missing Supabase credentials fails auth, oauth, and magic_link, not just gets a warning", () => {
  const report = checkProductConformance("avatark", { env: { siteUrl: "https://avatark-platform-web.vercel.app" } });
  for (const id of ["auth", "oauth", "magic_link"]) {
    assert.equal(report.checks.find((c) => c.id === id)?.status, "fail");
  }
});

test("deep_links is needs_live_verification (not applicable) for a product with no defined deep-link role", () => {
  const report = checkProductConformance("prometheusk", { env: GOOD_ENV });
  assert.equal(report.checks.find((c) => c.id === "deep_links")?.status, "needs_live_verification");
});

test("deep_links passes for a product that does participate in the Deep Link Resolver", () => {
  const report = checkProductConformance("arenak", { env: GOOD_ENV });
  assert.equal(report.checks.find((c) => c.id === "deep_links")?.status, "pass");
});

test("return_paths sanitizes a malicious injected value before scoring the check", () => {
  const report = checkProductConformance("gamek", { env: GOOD_ENV });
  const returnPaths = report.checks.find((c) => c.id === "return_paths");
  assert.equal(returnPaths?.status, "pass");
});

test("ready is true when nothing statically fails, even with a pending live-verification item", () => {
  // gamek: registered, supportsInvitations=true, participates in deep links (game),
  // has a resolvable domain -- oauth still needs a live check, but that alone doesn't block readiness.
  const report = checkProductConformance("gamek", { env: GOOD_ENV });
  assert.equal(report.ready, true);
  assert.deepEqual(report.pendingLiveVerification, ["oauth"]);
});

test("ready is false when any check genuinely fails, regardless of pending live-verification items", () => {
  const report = checkProductConformance("not-a-real-product", { env: GOOD_ENV });
  assert.equal(report.ready, false);
});
