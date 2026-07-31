import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUCT_REGISTRY } from "@avatark/product-registry";
import { validateProductEnv } from "./envValidator.ts";

const FAKE_JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.abc123signature";

function validEnv(overrides: Partial<Parameters<typeof validateProductEnv>[0]> = {}) {
  return {
    productId: "avatark",
    supabaseUrl: "https://hapoerzbcnagyfafqojg.supabase.co",
    supabaseAnonKey: FAKE_JWT,
    siteUrl: "https://avatark-platform-web.vercel.app",
    callbackUrl: "https://avatark-platform-web.vercel.app/auth/callback",
    ...overrides,
  };
}

test("a fully-populated, well-formed environment validates clean", () => {
  const report = validateProductEnv(validEnv());
  assert.equal(report.valid, true);
  assert.deepEqual(report.issues, []);
});

test("missing supabaseUrl/supabaseAnonKey/siteUrl are each reported as errors", () => {
  const report = validateProductEnv({ productId: "avatark" });
  const fields = report.issues.filter((i) => i.severity === "error").map((i) => i.field);
  assert.ok(fields.includes("supabaseUrl"));
  assert.ok(fields.includes("supabaseAnonKey"));
  assert.ok(fields.includes("siteUrl"));
  assert.equal(report.valid, false);
});

test("a non-URL supabaseUrl is an error, not silently accepted", () => {
  const report = validateProductEnv(validEnv({ supabaseUrl: "not-a-url" }));
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((i) => i.field === "supabaseUrl" && i.severity === "error"));
});

test("a non-JWT-shaped anon key is a warning, not an error", () => {
  const report = validateProductEnv(validEnv({ supabaseAnonKey: "not-a-jwt" }));
  assert.equal(report.valid, true);
  assert.ok(report.issues.some((i) => i.field === "supabaseAnonKey" && i.severity === "warning"));
});

test("a callback URL on a different origin than the site URL is an error", () => {
  const report = validateProductEnv(
    validEnv({ callbackUrl: "https://totally-different-origin.example.com/auth/callback" })
  );
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((i) => i.field === "callbackUrl" && i.severity === "error"));
});

test("an absent callback URL is only a warning, since it can be derived from siteUrl", () => {
  const report = validateProductEnv(validEnv({ callbackUrl: undefined }));
  assert.equal(report.valid, true);
  assert.ok(report.issues.some((i) => i.field === "callbackUrl" && i.severity === "warning"));
});

test("capability mismatch: registry says supportsAuth=true but no Supabase credentials -- error", () => {
  // avatark's real registry entry has supportsAuth: true.
  const report = validateProductEnv({ productId: "avatark", siteUrl: "https://avatark-platform-web.vercel.app" }, PRODUCT_REGISTRY);
  assert.ok(report.issues.some((i) => i.field === "supportsAuth" && i.severity === "error"));
});

test("capability mismatch: full auth env present but registry says supportsAuth=false -- warning, not error", () => {
  // prometheusk's real registry entry has supportsAuth: false (separate Supabase project).
  const report = validateProductEnv(validEnv({ productId: "prometheusk" }), PRODUCT_REGISTRY);
  assert.equal(report.valid, true);
  assert.ok(report.issues.some((i) => i.field === "supportsAuth" && i.severity === "warning"));
});

test("an unknown product id skips capability-mismatch checks with a warning, never throws", () => {
  const report = validateProductEnv(validEnv({ productId: "not-a-real-product" }), PRODUCT_REGISTRY);
  assert.ok(report.issues.some((i) => i.field === "productId" && i.severity === "warning"));
});

test("a preview URL, if given, must also be a valid absolute URL", () => {
  const report = validateProductEnv(validEnv({ previewUrl: "not-a-url" }));
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((i) => i.field === "previewUrl" && i.severity === "error"));
});
