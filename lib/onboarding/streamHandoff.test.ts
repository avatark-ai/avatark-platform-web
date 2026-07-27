// Run with: node --experimental-strip-types --test lib/onboarding/streamHandoff.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { isStreamHandoffAvailable, resolveStreamHandoffTarget } from "./streamHandoff.ts";

test("no story slug has a verified StreamK mapping yet -- the seam is prepared, not fabricated", () => {
  assert.equal(resolveStreamHandoffTarget("any-story-slug"), null);
  assert.equal(isStreamHandoffAvailable("any-story-slug"), false);
});

test("an unknown or empty slug is unavailable, never a crash or a guessed target", () => {
  assert.equal(resolveStreamHandoffTarget(""), null);
  assert.equal(isStreamHandoffAvailable(""), false);
});
