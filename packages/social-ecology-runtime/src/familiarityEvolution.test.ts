import assert from "node:assert/strict"
import { test } from "node:test"
import { DEFAULT_FAMILIARITY_THRESHOLDS, deriveFamiliarityBand, evolveFamiliarity } from "./familiarityEvolution.ts"

test("deriveFamiliarityBand: zero evidence is UNKNOWN", () => {
  assert.equal(deriveFamiliarityBand({ coPresenceTicks: 0, sharedGroupTicks: 0, encounterCount: 0 }), "UNKNOWN")
})

test("deriveFamiliarityBand: crosses seenAbove threshold into SEEN", () => {
  assert.equal(deriveFamiliarityBand({ coPresenceTicks: 1, sharedGroupTicks: 0, encounterCount: 0 }, DEFAULT_FAMILIARITY_THRESHOLDS), "SEEN")
})

test("deriveFamiliarityBand: crosses familiarAbove threshold into FAMILIAR", () => {
  assert.equal(deriveFamiliarityBand({ coPresenceTicks: 6, sharedGroupTicks: 0, encounterCount: 0 }, DEFAULT_FAMILIARITY_THRESHOLDS), "FAMILIAR")
  assert.equal(deriveFamiliarityBand({ coPresenceTicks: 5, sharedGroupTicks: 0, encounterCount: 0 }, DEFAULT_FAMILIARITY_THRESHOLDS), "SEEN")
})

test("evolveFamiliarity: starts fresh from null current and accumulates one tick", () => {
  const state = evolveFamiliarity("world-1", "cow-b", "cow-a", null, true, false, 10)
  assert.equal(state.entityAId, "cow-a")
  assert.equal(state.entityBId, "cow-b")
  assert.deepEqual(state.evidence, { coPresenceTicks: 1, sharedGroupTicks: 0, encounterCount: 0 })
  assert.equal(state.band, "SEEN")
  assert.equal(state.lastUpdatedTick, 10)
})

test("evolveFamiliarity: accumulates onto existing evidence regardless of argument order", () => {
  const first = evolveFamiliarity("world-1", "cow-a", "cow-b", null, true, true, 1)
  const second = evolveFamiliarity("world-1", "cow-b", "cow-a", first, true, true, 2)
  assert.deepEqual(second.evidence, { coPresenceTicks: 2, sharedGroupTicks: 2, encounterCount: 0 })
})

test("evolveFamiliarity: a tick with neither co-presence nor shared group leaves evidence unchanged", () => {
  const first = evolveFamiliarity("world-1", "cow-a", "cow-b", null, true, false, 1)
  const second = evolveFamiliarity("world-1", "cow-a", "cow-b", first, false, false, 2)
  assert.deepEqual(second.evidence, first.evidence)
  assert.equal(second.lastUpdatedTick, 2)
})

test("evolveFamiliarity: preserves encounterCount from current state (not incremented here)", () => {
  const first = evolveFamiliarity("world-1", "cow-a", "cow-b", null, true, false, 1)
  const seeded = { ...first, evidence: { ...first.evidence, encounterCount: 3 } }
  const second = evolveFamiliarity("world-1", "cow-a", "cow-b", seeded, true, false, 2)
  assert.equal(second.evidence.encounterCount, 3)
})
