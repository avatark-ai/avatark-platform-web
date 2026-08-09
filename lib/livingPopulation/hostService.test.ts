import { test } from "node:test"
import assert from "node:assert/strict"
import { getPopulationSnapshot, wakeWorldWithPopulation } from "./hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"

// Each test uses its own worldInstanceId -- these Host-level module
// singletons are process-lifetime, same convention every existing
// lib/*/singleton.ts test file already uses (see
// lib/worldPersistence/hostService.test.ts).

test("a fresh world instance seeds two cows at yamuna and two birds at kadamba-grove, each with fresh needs", async () => {
  const worldInstanceId = "population-host-test-fresh"
  const snapshot = await getPopulationSnapshot(worldInstanceId)
  assert.equal(snapshot.entities.length, 4)
  assert.ok(snapshot.entities.every((e) => e.needs.length > 0))
  assert.ok(snapshot.entities.filter((e) => e.locationId === "yamuna").length === 2)
  assert.ok(snapshot.entities.filter((e) => e.locationId === "kadamba-grove").length === 2)
  assert.equal(snapshot.groups.length, 2)
})

// Phase 12: catch-up integration -- waking a world with elapsed wall-
// clock time advances BOTH Sprint 9's shared/vegetation state AND
// Sprint 10's population state by the SAME logical tick count.
test("waking a world with elapsed time advances population needs/activity by exactly the ticks Sprint 9's own catch-up applied", async () => {
  const worldInstanceId = "population-host-test-wake"
  let clockMs = 2_000_000
  const now = () => new Date(clockMs).toISOString()

  await getPopulationSnapshot(worldInstanceId, now) // seeds at tick 0, at this test's own fictional `now`

  clockMs += 6 // this environment's reference tick policy: 1 tick per elapsed ms
  const woken = await wakeWorldWithPopulation(worldInstanceId, "population-owner-1", now)

  assert.ok(woken.world.ticksApplied > 0, "Sprint 9's own world catch-up applied real elapsed ticks")
  assert.equal(woken.population.sharedState.clock.tick, woken.world.state.sharedState.clock.tick, "population's own tick-by-tick replay ends at the exact same tick Sprint 9's world catch-up reached")
  assert.deepEqual(woken.population.sharedState, woken.world.state.sharedState, "population replayed the identical environment sequence Sprint 9's catch-up produced")

  await worldLeaseRepository.release(worldInstanceId, "population-owner-1", (await worldLeaseRepository.getCurrent(worldInstanceId))!.leaseVersion)
})

test("population state persists across separate reads -- a second read sees the first read's advanced state, not a re-seed", async () => {
  const worldInstanceId = "population-host-test-persistence"
  let clockMs = 3_000_000
  const now = () => new Date(clockMs).toISOString()

  await getPopulationSnapshot(worldInstanceId, now) // seeds fresh (all needs at zero pressure)
  clockMs += 10
  const woken = await wakeWorldWithPopulation(worldInstanceId, "population-owner-2", now)
  assert.ok(woken.population.behaviorStates.some((s) => s.needs.some((n) => n.pressure > 0)), "advancing real ticks must move needs away from their fresh-zero seed")

  const snapshotAfter = await getPopulationSnapshot(worldInstanceId, now)
  assert.equal(snapshotAfter.tick, woken.population.sharedState.clock.tick)
  assert.deepEqual(
    snapshotAfter.entities.map((e) => e.needs).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    woken.population.behaviorStates.map((s) => s.needs).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    "the second read reflects exactly what the advance persisted, not a re-seed back to fresh needs",
  )

  await worldLeaseRepository.release(worldInstanceId, "population-owner-2", (await worldLeaseRepository.getCurrent(worldInstanceId))!.leaseVersion)
})

// Test matrix: multi-visitor consistency for the population domain --
// two independent reads of the same world instance must see IDENTICAL
// population truth (Phase 13/invariant #12), even though nothing here
// is visitor-scoped in the first place (population has no visitor
// parameter at all -- the strongest possible form of "no per-user
// duplicate population").
test("two independent snapshot reads of the same world instance see identical population truth", async () => {
  const worldInstanceId = "population-host-test-multi-visitor"
  await getPopulationSnapshot(worldInstanceId)

  const readAsVisitorA = await getPopulationSnapshot(worldInstanceId)
  const readAsVisitorB = await getPopulationSnapshot(worldInstanceId)
  assert.deepEqual(readAsVisitorA, readAsVisitorB)
})

test("two different world instances maintain independent population state", async () => {
  const instanceA = "population-host-test-instance-a"
  const instanceB = "population-host-test-instance-b"
  const now = () => "2026-08-08T00:00:00.000Z"

  const wokenA = await wakeWorldWithPopulation(instanceA, "owner-a", now)
  const snapshotB = await getPopulationSnapshot(instanceB)

  assert.notEqual(wokenA.population.sharedState.clock.tick, undefined)
  assert.equal(snapshotB.tick, 0, "instance B was never advanced -- it stays fresh regardless of instance A's own advancement")

  await worldLeaseRepository.release(instanceA, "owner-a", (await worldLeaseRepository.getCurrent(instanceA))!.leaseVersion)
})
