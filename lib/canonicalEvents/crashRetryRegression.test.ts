import { test } from "node:test"
import assert from "node:assert/strict"
import { wakeWorldWithSpatialEcology } from "../spatialEcology/hostService.ts"
import { wakeWorldWithCanonicalEvents, getCanonicalEventProjectionState } from "./hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"

const GOVARDHAN_LIFTING_ID = "canonical-event-govardhan-lifting"
const SEED_NOW = () => "2026-08-09T00:00:00.000Z"
const ADVANCED_NOW = () => "2026-08-09T00:00:00.001Z"

async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

// Sprint 18's own reconciliation finding (see hostService.ts's own
// `wakeWorldWithCanonicalEvents` doc comment and docs/SPRINT18_FINAL_REPORT.md):
// `commitWakeCompletion` (Sprint 17) stays exactly where Sprint 16 put
// it, inside `wakeWorldWithSpatialEcology` -- this file's own
// `wakeWorldWithCanonicalEvents` does NOT need to move that commit
// point, because canonical-event evaluation consumes no tick-elapsed
// budget of its own (unlike population/memory/social/rhythms/encounter/
// adaptation/spatial, which all need `ticksElapsed` to correctly
// advance their own per-tick work). This test PROVES that claim rather
// than merely asserting it: it models the exact crash window the prep
// document worried about -- a real, committed spatial-ecology wake
// (the durable "environment/population/.../spatial" commit already
// succeeded) followed by a SEPARATE, later call that performs
// canonical-event work for the first time -- and shows zero ticks are
// lost and eligibility/activation still resolves correctly at the
// world's own already-advanced tick.
test("a real spatial-ecology commit followed by a SEPARATE later canonical-event evaluation call loses no ticks and still activates correctly -- the crash window the prep document worried about is safe", async () => {
  const worldInstanceId = "world-18-crash-retry-regression"

  // Simulates: world seeded, then advances and commits through Sprint
  // 16's own outermost function -- exactly as if a process had crashed
  // immediately after this commit, before any canonical-event work ever
  // ran.
  await wakeWorldWithSpatialEcology(worldInstanceId, "owner-1", SEED_NOW)
  await releaseLease(worldInstanceId, "owner-1")
  const preCanonicalSpatial = await wakeWorldWithSpatialEcology(worldInstanceId, "owner-1", ADVANCED_NOW)
  await releaseLease(worldInstanceId, "owner-1")
  const tickAfterSpatialCommit = preCanonicalSpatial.adaptation.realization.rhythms.social.memory.world.state.sharedState.clock.tick

  // "Retry": a SEPARATE call, at the IDENTICAL later instant, now going
  // through the full canonical-event-aware wake for the first time.
  const retried = await wakeWorldWithCanonicalEvents(worldInstanceId, "owner-1", ADVANCED_NOW)
  await releaseLease(worldInstanceId, "owner-1")
  const tickAfterRetry = retried.spatial.adaptation.realization.rhythms.social.memory.world.state.sharedState.clock.tick

  assert.equal(tickAfterRetry, tickAfterSpatialCommit, "no tick was lost or double-applied between the pre-existing spatial commit and this file's own later canonical-event evaluation")

  const projection = await getCanonicalEventProjectionState(worldInstanceId, GOVARDHAN_LIFTING_ID)
  assert.equal(projection?.status, "COMPLETED", "eligibility/activation still resolves correctly against the world's own already-advanced, already-committed tick")
  assert.equal(projection?.activatedAtTick, tickAfterSpatialCommit)
})
