import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUCT_REGISTRY } from "@avatark/product-registry";
import { buildProductSwitcherEntries } from "./switcher.ts";

test("buildProductSwitcherEntries defaults to public-visibility products only", () => {
  const entries = buildProductSwitcherEntries("avatark");
  const publicIds = PRODUCT_REGISTRY.filter((p) => p.visibility === "public").map((p) => p.id);
  assert.deepEqual(
    entries.map((e) => e.id).sort(),
    publicIds.sort()
  );
});

test("buildProductSwitcherEntries with visibility: null includes every registered product", () => {
  const entries = buildProductSwitcherEntries("avatark", { visibility: null });
  assert.equal(entries.length, PRODUCT_REGISTRY.length);
});

test("buildProductSwitcherEntries marks exactly the current product, current or not visible", () => {
  const entries = buildProductSwitcherEntries("gamek");
  const current = entries.filter((e) => e.isCurrent);
  assert.equal(current.length, 1);
  assert.equal(current[0].id, "gamek");
});

test("buildProductSwitcherEntries resolves a real href for every public product", () => {
  const entries = buildProductSwitcherEntries("avatark");
  for (const entry of entries) {
    assert.ok(entry.href, `expected a resolved href for ${entry.id}`);
  }
});

test("buildProductSwitcherEntries names all 9 registered products when visibility is unrestricted", () => {
  const entries = buildProductSwitcherEntries("avatark", { visibility: null });
  assert.deepEqual(
    entries.map((e) => e.id).sort(),
    ["arenak", "atlas", "avatark", "cinemak", "gamek", "prometheusk", "setpointk", "streamk", "studiok"]
  );
});
