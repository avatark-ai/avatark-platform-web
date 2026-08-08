import { test } from "node:test"
import assert from "node:assert/strict"
import { bandAtLeast, bandIndex, ENVIRONMENTAL_BANDS } from "./environmentalBand.ts"

test("ENVIRONMENTAL_BANDS is exactly low/moderate/high, in order", () => {
  assert.deepEqual(ENVIRONMENTAL_BANDS, ["low", "moderate", "high"])
})

test("bandIndex ranks bands ordinally", () => {
  assert.equal(bandIndex("low"), 0)
  assert.equal(bandIndex("moderate"), 1)
  assert.equal(bandIndex("high"), 2)
})

test("bandAtLeast is a >= comparison over the ordinal ranking", () => {
  assert.equal(bandAtLeast("high", "low"), true)
  assert.equal(bandAtLeast("moderate", "moderate"), true)
  assert.equal(bandAtLeast("low", "moderate"), false)
  assert.equal(bandAtLeast("low", "high"), false)
})
