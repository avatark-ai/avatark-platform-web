import { test } from "node:test"
import assert from "node:assert/strict"
import { getSpatialSnapshot, wakeWorldWithSpatialEcology } from "./hostService.ts"
import { wakeWorldWithAdaptation } from "../worldAdaptation/hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"

// Sprint 17, §10 task 6 + test matrix items D/H/I (extended across the
// full, now-includes-spatial composed chain): a crash between the
// adaptation layer (the last layer BEFORE spatial ecology's own
// TerritoryClaim persistence + the composed chain's real final
// `commitWakeCompletion`) and spatial ecology's own work is modeled
// here by simply calling `wakeWorldWithAdaptation` and never proceeding
// to `wakeWorldWithSpatialEcology` -- exactly what a crash at that exact
// point in the chain would leave behind, no mocking/throwing required.
// The retry then calls the REAL outermost composed function
// (`wakeWorldWithSpatialEcology`) and must reach the correct total
// elapsed tick, exactly once, with every downstream layer (population
// through spatial territory claims) consistent with that same window.

const FIXED_START = 0
const CRASH_AT_MS = 5_000
const RETRY_AT_MS = 70_000 // past the crashed attempt's 60s lease TTL (acquired at 5000, expires at 65000)

test("crash mid-wake + retry, full composed chain: a crash after adaptation but before spatial's own commit is retried to the correct total tick, exactly once, never double-counted", async () => {
  const worldInstanceId = "spatial-full-chain-crash-recovery"
  const ownerId = "owner-crash-recovery"

  // Seed at tick 0 (establishes the baseline everything else measures
  // elapsed time against).
  const seeded = await wakeWorldWithSpatialEcology(worldInstanceId, ownerId, () => new Date(FIXED_START).toISOString())
  assert.equal(seeded.adaptation.realization.rhythms.social.memory.world.state.sharedState.clock.tick, 0)
  await releaseLease(worldInstanceId, ownerId)

  // "Crash": everything through adaptation succeeds and persists (world
  // environment, population, memory, social ecology, rhythms, encounter
  // realization, adaptation effects) -- but spatial ecology's own
  // TerritoryClaim derivation/append AND the composed chain's real final
  // lifecycle commit never happen, because this test simply never calls
  // wakeWorldWithSpatialEcology for this attempt.
  const crashed = await wakeWorldWithAdaptation(worldInstanceId, ownerId, () => new Date(CRASH_AT_MS).toISOString())
  const crashedTick = crashed.realization.rhythms.social.memory.world.state.sharedState.clock.tick
  assert.equal(crashedTick, CRASH_AT_MS, "the crashed attempt's own environment catch-up genuinely succeeded and persisted")
  const crashedEncounterRecordIds = new Set(crashed.realization.encounterRecords.map((r) => r.id))
  // Deliberately never released -- the retry must wait out the lease's
  // own TTL, the same real "expiry lets a dead owner's lease be
  // reclaimed" mechanism every other lease-conflict test in this
  // codebase already relies on.

  // Retry: the REAL outermost composed function, called fresh.
  const retried = await wakeWorldWithSpatialEcology(worldInstanceId, ownerId, () => new Date(RETRY_AT_MS).toISOString())
  const retriedWorld = retried.adaptation.realization.rhythms.social.memory.world

  assert.equal(retriedWorld.state.sharedState.clock.tick, RETRY_AT_MS, "the retry must reach the true total elapsed tick (70000), never short (lost window) nor long (double-counted)")
  assert.equal(retriedWorld.ticksApplied, RETRY_AT_MS - CRASH_AT_MS, "this attempt applies only the REMAINING window since the crashed attempt's own already-committed progress, not the full wall-clock delta since the world's true seed time")
  assert.equal(retried.lifecycleState, "ACTIVE")

  // Item H: spatial patch state is fresh and consistent with the
  // correct (non-double-counted) tick -- resolvePatchState is a pure
  // read-time projection, so this alone proves patch/resource state
  // reflects the CORRECT post-absence world, not a stale or
  // over-advanced one.
  const spatialSnapshot = await getSpatialSnapshot(worldInstanceId, () => new Date(RETRY_AT_MS).toISOString())
  assert.equal(spatialSnapshot.tick, RETRY_AT_MS)
  assert.ok(spatialSnapshot.patchStates.length > 0)

  // Item I: encounter/consequence evolution across the absence is
  // exactly-once despite the crash -- every EncounterRecord the crashed
  // attempt already realized survives the retry completely unchanged
  // (content-derived id, idempotent lookup-before-work), and the retry
  // never produces a second record for the same id.
  const retriedEncounterRecordIds = retried.adaptation.realization.encounterRecords.map((r) => r.id)
  assert.equal(retriedEncounterRecordIds.length, new Set(retriedEncounterRecordIds).size, "no duplicate EncounterRecord ids after the retry")
  for (const id of crashedEncounterRecordIds) {
    assert.ok(retriedEncounterRecordIds.includes(id), "every record the crashed attempt already realized is still present, not lost or recreated")
  }

  await releaseLease(worldInstanceId, ownerId)
})

async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}
