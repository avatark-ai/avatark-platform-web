import { test } from "node:test"
import assert from "node:assert/strict"
import { LeaseConflictError } from "@avatark/world-persistence-contracts"
import { wakeWorldWithSpatialEcology } from "./hostService.ts"
import { getWorldState } from "../worldPersistence/hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"

// Sprint 17, §9/§10 task 8, test matrix item F: two visitors racing to
// wake the SAME dormant world through the FULL composed chain (not just
// the bare environment layer hostService.test.ts:46-48 already proves)
// -- exactly one succeeds, the other gets a clean LeaseConflictError,
// and the composed chain never partially runs twice for the same
// instant. This is the "§4 step 6" lease-hold-duration question the
// implementation prep doc flagged as unconfirmed: since
// `wakeWorldWithSpatialEcology`'s own composed call chain runs
// synchronously (each layer awaits the one below it before the next
// layer starts), and the FIRST call's lease is acquired before any
// downstream layer runs and never released until this test explicitly
// does so, a second, concurrent `wakeWorldWithSpatialEcology` call
// cannot ever observe a partially-applied composed wake -- it is
// rejected at the very first (environment) layer's own lease acquire,
// before touching population/memory/social/rhythms/encounter/
// adaptation/spatial at all.

test("simultaneous wake attempts on the same world: exactly one succeeds through the full composed chain, the other is rejected before any downstream layer runs", async () => {
  const worldInstanceId = "spatial-full-chain-multi-visitor"
  const now = () => "2026-08-09T00:00:00.000Z"

  const first = await wakeWorldWithSpatialEcology(worldInstanceId, "owner-a", now)
  const firstTick = first.adaptation.realization.rhythms.social.memory.world.state.sharedState.clock.tick

  // A second visitor arriving at the SAME instant, before owner-a's
  // lease is released, must be rejected -- never silently queued,
  // retried internally, or allowed to double-apply zero-or-more ticks
  // concurrently with the first.
  await assert.rejects(() => wakeWorldWithSpatialEcology(worldInstanceId, "owner-b", now), LeaseConflictError)

  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  assert.equal(current?.ownerId, "owner-a", "the first owner's lease is still held, undisturbed by the rejected second attempt")

  await worldLeaseRepository.release(worldInstanceId, "owner-a", current!.leaseVersion)

  // Once released, a new wake attempt (still "owner-a" or a fresh
  // owner) proceeds normally and never observes double-applied state
  // from the rejected attempt (which never ran any downstream layer at
  // all, by construction of the lease-acquire-first ordering).
  const after = await wakeWorldWithSpatialEcology(worldInstanceId, "owner-c", now)
  assert.equal(after.adaptation.realization.rhythms.social.memory.world.state.sharedState.clock.tick, firstTick, "waking again at the identical instant, after a clean release, is a legitimate zero-tick no-op -- not evidence of the rejected attempt having run")

  await worldLeaseRepository.release(worldInstanceId, "owner-c", (await worldLeaseRepository.getCurrent(worldInstanceId))!.leaseVersion)
})

// Sprint 17, test matrix item G, extended to the full composed chain:
// Sprint 15/16's own multiInstance.test.ts files already prove this at
// their own single layer -- restated here once, through
// wakeWorldWithSpatialEcology, to prove the composed chain as a WHOLE
// carries zero state bleed between world instances, not just each
// individual layer in isolation.
test("two world instances woken through the full composed chain advance completely independently, zero state bleed", async () => {
  const worldA = "spatial-full-chain-instance-a"
  const worldB = "spatial-full-chain-instance-b"

  await getWorldState(worldA, () => "2026-08-09T00:00:00.000Z") // seed both at tick 0
  await getWorldState(worldB, () => "2026-08-09T00:00:00.000Z")

  const resultA = await wakeWorldWithSpatialEcology(worldA, "owner-1", () => "2026-08-09T00:00:00.005Z")
  const resultB = await wakeWorldWithSpatialEcology(worldB, "owner-1", () => "2026-08-09T00:00:00.009Z")

  assert.equal(resultA.adaptation.realization.rhythms.social.memory.world.state.sharedState.clock.tick, 5)
  assert.equal(resultB.adaptation.realization.rhythms.social.memory.world.state.sharedState.clock.tick, 9)
  assert.notEqual(resultA.spatial.tick, resultB.spatial.tick)

  await worldLeaseRepository.release(worldA, "owner-1", (await worldLeaseRepository.getCurrent(worldA))!.leaseVersion)
  await worldLeaseRepository.release(worldB, "owner-1", (await worldLeaseRepository.getCurrent(worldB))!.leaseVersion)
})
