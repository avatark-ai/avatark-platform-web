import { test } from "node:test";
import assert from "node:assert/strict";
import { bootstrapProduct } from "./bootstrap.ts";

test("bootstrapProduct resolves a registered product's own domain/account/callback URLs", () => {
  const boot = bootstrapProduct("gamek");
  assert.equal(boot.self?.displayName, "GameK");
  assert.equal(boot.domain, "https://gamek.ai");
  assert.equal(boot.accountUrl, "https://gamek.ai/account");
  assert.equal(boot.callbackUrl, "https://gamek.ai/auth/callback");
});

test("bootstrapProduct returns every ecosystem capability for a registered product", () => {
  const boot = bootstrapProduct("avatark");
  assert.equal(boot.capabilities.auth, "confirmed");
  assert.equal(boot.capabilities.echo, "not_supported");
  assert.equal(boot.capabilities.admin, "confirmed");
});

test("bootstrapProduct handles an unregistered product id honestly, without throwing", () => {
  const boot = bootstrapProduct("not-a-real-product");
  assert.equal(boot.self, null);
  assert.equal(boot.domain, null);
  assert.equal(boot.accountUrl, null);
  assert.equal(boot.callbackUrl, null);
  // Every capability falls back to "unconfirmed" for an unregistered product.
  assert.ok(Object.values(boot.capabilities).every((status) => status === "unconfirmed"));
});

test("bootstrapProduct's switcherEntries mark this product as current among public products", () => {
  const boot = bootstrapProduct("gamek");
  const current = boot.switcherEntries.filter((e) => e.isCurrent);
  assert.equal(current.length, 1);
  assert.equal(current[0].id, "gamek");
});

test("bootstrapProduct.buildReturnTo carries a validated return path to another product's domain", () => {
  const boot = bootstrapProduct("gamek");
  const url = boot.buildReturnTo("avatark", "/journey/today", "/journey");
  assert.ok(url);
  const parsed = new URL(url!);
  assert.equal(parsed.origin, "https://avatark-platform-web.vercel.app");
  assert.equal(parsed.searchParams.get("return"), "/journey/today");
});

test("bootstrapProduct.env is null when no env option is supplied", () => {
  const boot = bootstrapProduct("gamek");
  assert.equal(boot.env, null);
});

test("bootstrapProduct.env reflects a real EnvValidationReport when env is supplied", () => {
  const boot = bootstrapProduct("gamek", {
    env: {
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "a.b.c",
      siteUrl: "https://gamek.ai",
    },
  });
  assert.ok(boot.env);
  assert.equal(boot.env!.productId, "gamek");
});
