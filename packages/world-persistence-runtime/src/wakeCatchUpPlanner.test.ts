import { test } from "node:test"
import assert from "node:assert/strict"
import { fixedRateTickPolicy } from "./tickPolicy.ts"
import { describeWakeCatchUpPlan, resolveTicksToApply } from "./wakeCatchUpPlanner.ts"

const POLICY = fixedRateTickPolicy(1) // 1 tick per elapsed ms, matching the Host layer's own reference rate

test("resolveTicksToApply: the common case -- current tick already equals lastCheckpointTick -- is exactly the old wall-clock-delta formula", () => {
  const ticks = resolveTicksToApply({
    lastActiveAt: "2026-08-08T00:00:00.000Z",
    lastCheckpointTick: 100,
    currentTick: 100,
    now: () => "2026-08-08T00:00:00.005Z",
    tickPolicy: POLICY,
  })
  assert.equal(ticks, 5)
})

// Sprint 17, §4's own core fix: a prior wake attempt already advanced the
// durable environment (currentTick=105) but never reached the composed
// chain's final commit (lastCheckpointTick is still stale at 100). A
// retry must apply only the REMAINING gap to the target, never the full
// wall-clock-delta window a second time.
test("resolveTicksToApply: an already-advanced current tick (crashed prior attempt) is subtracted back out of the target, not re-applied", () => {
  const ticks = resolveTicksToApply({
    lastActiveAt: "2026-08-08T00:00:00.000Z", // stale -- as of BEFORE the crashed attempt
    lastCheckpointTick: 100, // stale, same reason
    currentTick: 105, // the crashed attempt's own environment catch-up DID succeed
    now: () => "2026-08-08T00:00:00.070Z", // 70ms elapsed since the stale anchor -> target tick 170
    tickPolicy: POLICY,
  })
  assert.equal(ticks, 65, "170 (target) - 105 (already applied) = 65 remaining, not 170")
})

test("resolveTicksToApply: clamps at 0 rather than going negative when current tick is already at or beyond the target", () => {
  const ticks = resolveTicksToApply({
    lastActiveAt: "2026-08-08T00:00:00.000Z",
    lastCheckpointTick: 100,
    currentTick: 999, // e.g. an explicit advanceWorld() call moved the environment far ahead
    now: () => "2026-08-08T00:00:00.005Z", // target would be 105
    tickPolicy: POLICY,
  })
  assert.equal(ticks, 0)
})

test("resolveTicksToApply: zero elapsed wall-clock time and no prior partial advance is a legitimate zero-tick result", () => {
  const ticks = resolveTicksToApply({
    lastActiveAt: "2026-08-08T00:00:00.000Z",
    lastCheckpointTick: 100,
    currentTick: 100,
    now: () => "2026-08-08T00:00:00.000Z",
    tickPolicy: POLICY,
  })
  assert.equal(ticks, 0)
})

test("describeWakeCatchUpPlan: counts season.transitioned events among this attempt's own event records, nothing else", () => {
  const plan = describeWakeCatchUpPlan(0, 10, 10, [
    { type: "clock.advanced" },
    { type: "season.transitioned" },
    { type: "entity.lifecycle_changed" },
    { type: "season.transitioned" },
  ])
  assert.deepEqual(plan, { fromTick: 0, toTick: 10, ticksToApply: 10, seasonCrossings: 2 })
})

test("describeWakeCatchUpPlan: zero ticks applied is a valid plan with zero season crossings", () => {
  const plan = describeWakeCatchUpPlan(5, 5, 0, [])
  assert.deepEqual(plan, { fromTick: 5, toTick: 5, ticksToApply: 0, seasonCrossings: 0 })
})
