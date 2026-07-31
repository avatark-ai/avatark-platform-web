import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AUTH_CALLBACK_PATH,
  resolveProductDomain,
  buildProductUrl,
  buildCallbackUrl,
  buildReturnPath,
  buildCrossProductReturnUrl,
} from "./redirect.ts";

test("resolveProductDomain resolves a known product's real domain", () => {
  assert.equal(resolveProductDomain("prometheusk"), "https://prometheusk.avatark.io");
});

test("resolveProductDomain returns null for an unknown product id, never a guessed host", () => {
  assert.equal(resolveProductDomain("not-a-real-product"), null);
});

test("resolveProductDomain falls back from previewDomain to domain when no previewDomain is confirmed", () => {
  // Every product's previewDomain is null today (see AvatarKProduct.previewDomain).
  assert.equal(resolveProductDomain("gamek", { preview: true }), "https://gamek.ai");
});

test("buildProductUrl joins a path onto the resolved domain, normalizing slashes", () => {
  assert.equal(buildProductUrl("gamek", "flowk"), "https://gamek.ai/flowk");
  assert.equal(buildProductUrl("gamek", "/flowk"), "https://gamek.ai/flowk");
});

test("buildProductUrl returns null when the domain can't be resolved -- no product is hard-coded here", () => {
  assert.equal(buildProductUrl("not-a-real-product", "/anything"), null);
});

test("buildCallbackUrl appends the one real, shared callback path", () => {
  assert.equal(buildCallbackUrl("avatark"), "https://avatark-platform-web.vercel.app" + AUTH_CALLBACK_PATH);
});

test("buildReturnPath rejects an absolute/open-redirect target, falling back safely", () => {
  assert.equal(buildReturnPath("https://evil.example.com", "/journey"), "/journey");
  assert.equal(buildReturnPath("/\\evil.example.com", "/journey"), "/journey");
  assert.equal(buildReturnPath("/journey/today", "/journey"), "/journey/today");
});

test("buildCrossProductReturnUrl carries a validated return path as a query param on the target product's own domain", () => {
  const url = buildCrossProductReturnUrl("avatark", "/journey/today", "/journey");
  assert.ok(url);
  const parsed = new URL(url!);
  assert.equal(parsed.origin, "https://avatark-platform-web.vercel.app");
  assert.equal(parsed.searchParams.get("return"), "/journey/today");
});

test("buildCrossProductReturnUrl sanitizes a malicious return path before it ever reaches the target product's URL", () => {
  const url = buildCrossProductReturnUrl("avatark", "https://evil.example.com/steal", "/journey");
  assert.ok(url);
  const parsed = new URL(url!);
  assert.equal(parsed.searchParams.get("return"), "/journey");
});

test("buildCrossProductReturnUrl returns null when the target product's domain can't be resolved", () => {
  assert.equal(buildCrossProductReturnUrl("not-a-real-product", "/x", "/y"), null);
});
