import { test } from "node:test"
import assert from "node:assert/strict"
import { catchUpCausalEnvironment, commitWakeCompletion, getWorldState, wakeWorld } from "./hostService.ts"
import { worldLeaseRepository, worldLifecycleRepository } from "./singleton.ts"

// Sprint 17, §4/§10 task 1: the core proof that a crash between the
// environment's own catch-up commit and the composed chain's final
// `commitWakeCompletion` is safely retryable -- neither losing the
// missed catch-up window (the pre-Sprint-17 bug, since fixed by
// deferring the commit) nor double-applying it (what a naive "just
// defer the commit" fix would reintroduce -- see
// @avatark/world-persistence-runtime's own resolveTicksToApply doc
// comment, and its wakeCatchUpPlanner.test.ts for the pure-formula
// proof this test exercises end to end through the real Host layer).

test("crash mid-wake + retry: a crash after catchUpCausalEnvironment succeeds but before commitWakeCompletion is retried without losing or double-applying ticks", async () => {
  const worldInstanceId = "crash-recovery-" + "attempt-1"
  let clockMs = 0
  const now = () => new Date(clockMs).toISOString()

  await getWorldState(worldInstanceId, now) // seed at tick 0

  // The soon-to-"crash" attempt: environment catch-up succeeds (this IS
  // catchUpCausalEnvironment's own real conditionalSave/checkpoint work)
  // but we deliberately never call commitWakeCompletion -- exactly what
  // a crash between those two points would leave behind.
  clockMs = 5_000
  const crashedAttempt = await catchUpCausalEnvironment(worldInstanceId, "owner-1", now)
  assert.equal(crashedAttempt.ticksApplied, 5_000)
  assert.equal(crashedAttempt.state.sharedState.clock.tick, 5_000)

  const lifecycleAfterCrash = await worldLifecycleRepository.get(worldInstanceId)
  assert.equal(lifecycleAfterCrash?.state, "WAKING", "the WAKING transition was written, but never advanced to ACTIVE -- lastActiveAt/lastCheckpointTick are still stale")
  assert.equal(new Date(lifecycleAfterCrash!.lastActiveAt).getTime(), 0, "commitWakeCompletion never ran, so the WAKING pre-write's own lastActiveAt still reflects the world's true pre-attempt anchor (seed time), not this attempt's now()")

  // The retry can only reacquire the lease once the crashed attempt's
  // own lease has expired (60s TTL, acquired at clockMs=5000) -- exactly
  // the real-world mechanism ("expiry lets a dead owner's lease be
  // reclaimed").
  clockMs = 70_000
  const retry = await catchUpCausalEnvironment(worldInstanceId, "owner-1", now)
  await commitWakeCompletion(worldInstanceId, retry.lifecycleStateBeforeCommit, retry.state.sharedState.clock.tick, now)

  // Baseline: a single, never-crashed continuous wake straight from
  // tick 0 at t=0 to t=70000 -- what the retry must reproduce exactly if
  // the crashed attempt's already-applied 0..5000 window isn't
  // double-counted.
  const baselineWorldId = worldInstanceId + "-baseline"
  await getWorldState(baselineWorldId, () => new Date(0).toISOString())
  const baseline = await wakeWorld(baselineWorldId, "owner-1", () => new Date(70_000).toISOString())

  assert.equal(retry.state.sharedState.clock.tick, baseline.state.sharedState.clock.tick, "retry must land on the SAME final tick as an uninterrupted wake to the same wall-clock instant")
  assert.equal(retry.state.sharedState.clock.tick, 70_000)
  assert.equal(retry.ticksApplied, 65_000, "the retry applies only the REMAINING window (65000), not the full 70000ms delta on top of the already-advanced 5000")

  const lifecycleAfterRetry = await worldLifecycleRepository.get(worldInstanceId)
  assert.equal(lifecycleAfterRetry?.state, "ACTIVE")
  assert.equal(lifecycleAfterRetry?.lastCheckpointTick, 70_000)
})

test("same wake retried twice with no crash (identical instant) is a no-op replay -- zero additional ticks, zero drift", async () => {
  const worldInstanceId = "crash-recovery-no-crash-replay"
  const now = () => "2026-08-08T00:00:00.000Z"

  await getWorldState(worldInstanceId, now)
  const first = await wakeWorld(worldInstanceId, "owner-1", now)
  await worldLeaseRepository.release(worldInstanceId, "owner-1", (await worldLeaseRepository.getCurrent(worldInstanceId))!.leaseVersion)

  const second = await wakeWorld(worldInstanceId, "owner-1", now)

  assert.equal(second.ticksApplied, 0)
  assert.deepEqual(second.state, first.state, "replaying at the identical instant, after a clean (non-crashed) prior commit, changes nothing")
})
