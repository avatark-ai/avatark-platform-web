import { test } from "node:test"
import assert from "node:assert/strict"
import { fixedRateTickPolicy } from "./tickPolicy.ts"

test("fixedRateTickPolicy floor-divides elapsed wall-clock ms by the configured rate", () => {
  const policy = fixedRateTickPolicy(1_000)
  assert.equal(policy.ticksElapsed(0, 4_500), 4)
  assert.equal(policy.ticksElapsed(0, 999), 0)
  assert.equal(policy.ticksElapsed(1_000, 1_000), 0, "no time elapsed, no ticks")
})

test("fixedRateTickPolicy never returns negative ticks for time moving backward", () => {
  const policy = fixedRateTickPolicy(1_000)
  assert.equal(policy.ticksElapsed(5_000, 1_000), 0)
})

test("fixedRateTickPolicy rejects a non-positive rate at construction, not at call time", () => {
  assert.throws(() => fixedRateTickPolicy(0), RangeError)
  assert.throws(() => fixedRateTickPolicy(-5), RangeError)
})
