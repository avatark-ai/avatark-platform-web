import { test } from "node:test"
import assert from "node:assert/strict"
import { advanceWorldSimulation } from "@avatark/living-systems-runtime"
import { computeDeterministicCatchUp } from "./catchUp.ts"
import { InvalidCatchUpRequestError } from "@avatark/world-persistence-contracts"
import { fixedNow, freshVrindavanEntities, freshVrindavanSharedState, VRINDAVAN_ARCHETYPES, VRINDAVAN_SEASONS } from "./testFixtures.ts"

function catchUpParams(ticks: number) {
  return {
    worldInstanceId: "living-vrindavan",
    sharedState: freshVrindavanSharedState(),
    entities: freshVrindavanEntities(),
    seasonDefinitions: VRINDAVAN_SEASONS,
    entityArchetypes: VRINDAVAN_ARCHETYPES,
    ticks,
    seed: "sprint9-catchup-seed",
    now: fixedNow,
  }
}

// Test matrix #5: deterministic catch-up.
test("catch-up from tick 0 for N ticks reaches the same season/tick a visitor returning after wall-clock time should see", () => {
  const result = computeDeterministicCatchUp(catchUpParams(4))
  assert.equal(result.sharedState.clock.tick, 4)
  assert.equal(result.sharedState.season.currentSeasonId, "grishma", "Vasanta's own minDurationTicks (4) is crossed")
  assert.equal(result.ticksApplied, 4)
})

// Test matrix #6: active-simulation vs catch-up equivalence -- running
// the SAME total ticks in one call (catch-up, "world was dormant") vs
// many calls of 1 (active simulation, "world was ticking the whole
// time") must reach byte-for-byte identical state, because both paths
// are the exact same pure function.
test("one dormant catch-up of N ticks equals N active single-tick advances, byte for byte", () => {
  const dormant = computeDeterministicCatchUp(catchUpParams(9))

  let active = { sharedState: freshVrindavanSharedState(), entities: freshVrindavanEntities() }
  for (let i = 0; i < 9; i++) {
    const step = advanceWorldSimulation({
      sharedState: active.sharedState,
      seasonDefinitions: VRINDAVAN_SEASONS,
      entityArchetypes: VRINDAVAN_ARCHETYPES,
      entities: active.entities,
      ticks: 1,
      seed: "sprint9-catchup-seed",
      now: fixedNow,
    })
    active = { sharedState: step.sharedState, entities: step.entities }
  }

  assert.deepEqual(dormant.sharedState, active.sharedState)
  assert.deepEqual(dormant.entities, active.entities)
})

// Test matrix #17: Vasanta -> Grīṣma remains correct through the new
// durable path -- the one seasonal transition Sprint 5-8 already proved,
// now proven again through catch-up rather than only through direct
// advanceWorldSimulation calls.
test("Vasanta -> Grishma transition is observable through the durable catch-up path, with a durable event record", () => {
  const result = computeDeterministicCatchUp(catchUpParams(4))
  const transition = result.eventRecords.find((e) => e.type === "season.transitioned")
  assert.ok(transition, "season.transitioned is recorded")
  assert.equal(transition?.detail.from, "vasanta")
  assert.equal(transition?.detail.to, "grishma")
  assert.equal(transition?.worldInstanceId, "living-vrindavan")
  assert.ok(transition?.eventId, "every durable event record carries an idempotency key")
})

test("retrying the identical catch-up call produces identical event ids -- idempotency at the source", () => {
  const a = computeDeterministicCatchUp(catchUpParams(4))
  const b = computeDeterministicCatchUp(catchUpParams(4))
  assert.deepEqual(a.eventRecords.map((e) => e.eventId), b.eventRecords.map((e) => e.eventId))
})

test("negative ticks is rejected with a named error, never silently clamped to zero", () => {
  assert.throws(() => computeDeterministicCatchUp(catchUpParams(-1)), InvalidCatchUpRequestError)
})

test("zero ticks is a legitimate no-op catch-up, not an error", () => {
  const result = computeDeterministicCatchUp(catchUpParams(0))
  assert.deepEqual(result.eventRecords, [])
  assert.equal(result.ticksApplied, 0)
})
