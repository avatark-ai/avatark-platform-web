import { test } from "node:test"
import assert from "node:assert/strict"
import { normalizeEntityPair } from "./familiarity.ts"

test("normalizeEntityPair orders any pair the same way regardless of call order", () => {
  assert.deepEqual(normalizeEntityPair("cow-2", "cow-1"), ["cow-1", "cow-2"])
  assert.deepEqual(normalizeEntityPair("cow-1", "cow-2"), ["cow-1", "cow-2"])
})

test("normalizeEntityPair is idempotent for an entity paired with itself", () => {
  assert.deepEqual(normalizeEntityPair("cow-1", "cow-1"), ["cow-1", "cow-1"])
})
