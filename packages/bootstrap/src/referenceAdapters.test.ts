import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REFERENCE_ADAPTER_PRODUCT_IDS,
  referenceAdapters,
  avatarkAdapter,
  prometheuskAdapter,
  gamekAdapter,
  arenakAdapter,
  streamkAdapter,
  studiokAdapter,
} from "./referenceAdapters.ts";

test("a reference adapter exists for exactly the six named products, no more, no less", () => {
  assert.deepEqual(
    [...REFERENCE_ADAPTER_PRODUCT_IDS].sort(),
    ["arenak", "avatark", "gamek", "prometheusk", "streamk", "studiok"].sort()
  );
  assert.equal(Object.keys(referenceAdapters).length, 6);
});

test("every reference adapter's productId matches the key it's stored under", () => {
  for (const [id, adapter] of Object.entries(referenceAdapters)) {
    assert.equal(adapter.productId, id);
  }
});

test("every reference adapter resolves against a real, registered product", () => {
  for (const adapter of Object.values(referenceAdapters)) {
    assert.ok(adapter.self, `expected ${adapter.productId} to be registered`);
  }
});

test("the named exports are the exact same objects as the referenceAdapters record entries", () => {
  assert.equal(avatarkAdapter, referenceAdapters.avatark);
  assert.equal(prometheuskAdapter, referenceAdapters.prometheusk);
  assert.equal(gamekAdapter, referenceAdapters.gamek);
  assert.equal(arenakAdapter, referenceAdapters.arenak);
  assert.equal(streamkAdapter, referenceAdapters.streamk);
  assert.equal(studiokAdapter, referenceAdapters.studiok);
});

test("no reference adapter was constructed with a live env -- these are starter files, not live integrations", () => {
  for (const adapter of Object.values(referenceAdapters)) {
    assert.equal(adapter.env, null);
  }
});
