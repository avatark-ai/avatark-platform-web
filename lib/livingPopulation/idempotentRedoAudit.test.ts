import { test } from "node:test"
import assert from "node:assert/strict"
import { getPopulationSnapshot, wakeWorldWithPopulation } from "./hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"

// Sprint 17, §10 task 7: docs/SPRINT17_IMPLEMENTATION_PREP.md §4 step 4
// asserts population/behavior state's overwrite-based persistence is
// "safe to redo as long as stateBeforeWake is re-read fresh on every
// retry (already true)" -- and explicitly calls out that this needs
// verifying, not taking on faith. This is the strongest version of that
// proof: `wakeWorldWithPopulation` is called repeatedly WITHOUT ever
// calling `commitWakeCompletion` in between (i.e. the lifecycle record
// is never advanced past WAKING) -- the exact pattern a caller stuck
// retrying after repeated crashes, or two sequential lease holders each
// only calling the population layer directly, would produce. If
// population's own overwrite were NOT safe to redo, this would show up
// as drifting/duplicated state across repeated calls; the fix's own
// `resolveTicksToApply` (§4) is what keeps each repeat call's own
// `ticksApplied` correctly bounded to only the genuinely-remaining
// window, which is the precondition population's overwrite-safety
// actually depends on.
async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

test("calling wakeWorldWithPopulation twice at the identical instant, with no lifecycle commit in between, is a genuine no-op the second time -- not a second application of the same window", async () => {
  const worldInstanceId = "population-idempotent-redo-same-instant"
  let clockMs = 0
  const now = () => new Date(clockMs).toISOString()

  await getPopulationSnapshot(worldInstanceId, now) // seed at tick 0
  clockMs = 5_000

  const first = await wakeWorldWithPopulation(worldInstanceId, "owner-1", now)
  await releaseLease(worldInstanceId, "owner-1")
  assert.equal(first.world.ticksApplied, 5_000)

  // No commitWakeCompletion call happened above -- lastActiveAt/
  // lastCheckpointTick are still stale at their pre-wake values. A
  // second call at the SAME instant must recompute ticksApplied as 0
  // (the environment is already at the target tick), not re-derive the
  // full 5000-tick window a second time.
  const second = await wakeWorldWithPopulation(worldInstanceId, "owner-1", now)
  await releaseLease(worldInstanceId, "owner-1")

  assert.equal(second.world.ticksApplied, 0, "the environment is already at the correct tick for this instant -- nothing remains to apply")
  assert.deepEqual(second.population.populationEntities, first.population.populationEntities, "population's own overwrite-based redo produces byte-identical entities, not drifted/duplicated ones")
  assert.deepEqual(second.population.behaviorStates, first.population.behaviorStates)
  assert.deepEqual(second.population.groups, first.population.groups)
})

test("three repeated calls across advancing wall-clock time, never committing in between, reach the same final population state as one direct jump", async () => {
  const repeatedWorldId = "population-idempotent-redo-repeated"
  const directWorldId = "population-idempotent-redo-direct"
  let clockMs = 0
  const now = () => new Date(clockMs).toISOString()

  await getPopulationSnapshot(repeatedWorldId, now)
  await getPopulationSnapshot(directWorldId, now)

  clockMs = 2_000
  await wakeWorldWithPopulation(repeatedWorldId, "owner-1", now)
  await releaseLease(repeatedWorldId, "owner-1")

  clockMs = 5_000
  await wakeWorldWithPopulation(repeatedWorldId, "owner-1", now)
  await releaseLease(repeatedWorldId, "owner-1")

  clockMs = 9_000
  const repeated = await wakeWorldWithPopulation(repeatedWorldId, "owner-1", now)
  await releaseLease(repeatedWorldId, "owner-1")

  const direct = await wakeWorldWithPopulation(directWorldId, "owner-1", () => new Date(9_000).toISOString())
  await releaseLease(directWorldId, "owner-1")

  assert.equal(repeated.world.state.sharedState.clock.tick, 9_000)
  assert.equal(direct.world.state.sharedState.clock.tick, 9_000)
  assert.deepEqual(repeated.world.state.sharedState.season, direct.world.state.sharedState.season, "three redo-safe partial catch-ups reach the identical season progression as one direct 9000-tick jump")
  assert.deepEqual(repeated.world.state.sharedState.environment, direct.world.state.sharedState.environment)
  assert.deepEqual(
    repeated.population.populationEntities.map((e) => ({ ...e, worldId: undefined })),
    direct.population.populationEntities.map((e) => ({ ...e, worldId: undefined })),
    "population's own repeated overwrite-based redo reaches the identical entity state as a single direct advance",
  )
})
