import { test } from "node:test"
import assert from "node:assert/strict"
import { LeaseConflictError } from "@avatark/world-persistence-contracts"
import { advanceWorld, getWorldSnapshot, getWorldState, interact, wakeWorld } from "./hostService.ts"
import { worldLeaseRepository } from "./singleton.ts"

// Each test uses its own worldInstanceId -- these Host-level module
// singletons are process-lifetime, same convention every existing
// lib/*/singleton.ts already carries, so tests isolate themselves by
// identity rather than by resetting shared state (matching
// lib/livingSystems/orchestrator.test.ts's own convention of using
// distinct userIds per test rather than a global reset).

test("getWorldState seeds a fresh world at tick 0 in Vasanta, and is stable across repeated reads", async () => {
  const worldInstanceId = "host-service-test-fresh"
  const first = await getWorldState(worldInstanceId)
  assert.equal(first.sharedState.clock.tick, 0)
  assert.equal(first.sharedState.season.currentSeasonId, "vasanta")

  const second = await getWorldState(worldInstanceId)
  assert.deepEqual(second, first, "reading world state is not itself an advance")
})

// Phase 4/10: wakeWorld performs deterministic catch-up proportional to
// elapsed wall-clock time (this environment's reference tick policy is 1
// tick per elapsed ms -- see hostService.ts's own DEFAULT_TICK_POLICY
// comment on why the RATE is policy, not core).
test("waking a world advances it by however many ticks the elapsed wall-clock time implies, deterministically", async () => {
  const worldInstanceId = "host-service-test-wake"
  let clockMs = 1_000_000
  const now = () => new Date(clockMs).toISOString()

  await getWorldState(worldInstanceId, now) // seeds at tick 0

  clockMs += 5 // 1 tick per ms reference policy -> 5 ticks elapsed
  const woken = await wakeWorld(worldInstanceId, "owner-1", now)

  assert.equal(woken.lifecycleState, "ACTIVE")
  assert.equal(woken.ticksApplied, 5)
  assert.equal(woken.state.sharedState.clock.tick, 5)
})

test("a second owner cannot wake a world whose lease is still held by the first owner", async () => {
  const worldInstanceId = "host-service-test-lease-conflict"
  const now = () => "2026-08-08T00:00:00.000Z"
  await wakeWorld(worldInstanceId, "owner-a", now)

  await assert.rejects(() => wakeWorld(worldInstanceId, "owner-b", now), LeaseConflictError)

  await worldLeaseRepository.release(worldInstanceId, "owner-a", (await worldLeaseRepository.getCurrent(worldInstanceId))!.leaseVersion)
})

test("advanceWorld requires the caller to already hold the lease -- a non-owner is rejected", async () => {
  const worldInstanceId = "host-service-test-advance-requires-lease"
  await assert.rejects(() => advanceWorld(worldInstanceId, 1, "no-such-owner"), LeaseConflictError)
})

test("the lease holder can explicitly advance the world further after waking it", async () => {
  const worldInstanceId = "host-service-test-advance"
  const now = () => "2026-08-08T00:00:00.000Z"
  await wakeWorld(worldInstanceId, "owner-1", now) // 0 elapsed ticks from fresh seed at the same instant

  const advanced = await advanceWorld(worldInstanceId, 4, "owner-1", now)
  assert.equal(advanced.sharedState.clock.tick, 4)
  assert.equal(advanced.sharedState.season.currentSeasonId, "grishma")
})

// Phase 13: embodiment continuity -- getWorldSnapshot reads through the
// exact same resolveWorldSnapshot pure function Sprint 7 already proved,
// now sourced from the durable layer.
test("getWorldSnapshot reflects the durable state after wake/advance, for any visitor", async () => {
  const worldInstanceId = "host-service-test-snapshot"
  const now = () => "2026-08-08T00:00:00.000Z"
  await wakeWorld(worldInstanceId, "owner-1", now)
  await advanceWorld(worldInstanceId, 4, "owner-1", now)

  const snapshot = await getWorldSnapshot({ worldInstanceId, userId: "visitor-1", locationId: "yamuna", now })
  assert.equal(snapshot.season.id, "grishma")
  assert.equal(snapshot.simulationTick, 4)
})

// Phase 10/14: interact is an exact passthrough to Sprint 8's existing
// dispatchInteractionIntent -- proven here by checking it rejects a
// malformed intent exactly the way that function already does, with no
// Sprint 9 code in between altering the result.
test("interact delegates structural validation to the existing InteractionIntent boundary unchanged", async () => {
  const result = await interact("host-service-test-interact", { type: "not-a-real-intent" }, { livingWorld: undefined, context: undefined, experience: undefined, registry: undefined } as never)
  assert.equal(result.ok, false)
})

// Test matrix #19: renderer cannot mutate world truth. `interact` is the
// ONE renderer-facing mutation boundary Sprint 9 exposes at all (Phase
// 10/14) -- this proves a well-formed intent submitted through it never
// changes DurableWorldState's own tick/season/version, because Sprint
// 8's dispatchInteractionIntent has no code path that touches
// @avatark/world-persistence-runtime's repositories at all (only
// wakeWorld/advanceWorld do, and neither is reachable from `interact`).
test("submitting an intent through interact never advances or mutates a world instance's durable state", async () => {
  const worldInstanceId = "host-service-test-renderer-cannot-mutate"
  const before = await getWorldState(worldInstanceId)

  await interact(worldInstanceId, { type: "enter-world", userId: "visitor-1", worldId: "living-vrindavan" }, { livingWorld: undefined, context: undefined, experience: undefined, registry: undefined } as never)

  const after = await getWorldState(worldInstanceId)
  assert.deepEqual(after, before, "no durable world truth changed as a side effect of a renderer-submitted intent")
})
