import { test } from "node:test"
import assert from "node:assert/strict"
import { getAllCanonicalEventProjectionStates, wakeWorldWithCanonicalEvents } from "./hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"

const GOVARDHAN_LIFTING_ID = "canonical-event-govardhan-lifting"

async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

// Sprint 18, Phase 0 §28 proof E (Different World Responses) and §11's
// own multi-instance isolation requirement, reusing
// `lib/encounterRealization/multiInstance.test.ts`'s own proof shape
// verbatim: two world instances, the SAME globally-shared canonical
// event identity, zero id-set intersection, independent per-instance
// projection state.
test("two world instances hold completely independent WorldInstanceCanonicalProjectionState for the SAME globally-shared canonical event", async () => {
  const instanceA = "world-18-multi-instance-a"
  const instanceB = "world-18-multi-instance-b"

  await wakeWorldWithCanonicalEvents(instanceA, "owner-a", () => "2026-08-09T00:00:00.000Z")
  await releaseLease(instanceA, "owner-a")
  await wakeWorldWithCanonicalEvents(instanceB, "owner-b", () => "2026-08-09T00:00:00.000Z")
  await releaseLease(instanceB, "owner-b")

  const statesA = await getAllCanonicalEventProjectionStates(instanceA)
  const statesB = await getAllCanonicalEventProjectionStates(instanceB)
  assert.equal(statesA.length, 1)
  assert.equal(statesB.length, 1)
  assert.equal(statesA[0].worldInstanceId, instanceA)
  assert.equal(statesB[0].worldInstanceId, instanceB)
})

// Proof E, honestly reconciled against the real Vrindavan grammar (see
// docs/SPRINT18_FINAL_REPORT.md): the govardhan-lifting event's own
// authored activation condition is time-based (`WORLD_TIME_AT_LEAST`),
// not location-based, because no entity in the current Sprint 10
// population grammar ever organically reaches `govardhan-path` (an
// honest finding, not an oversight -- see
// lib/canonicalEvents/vrindavanCanonicalEventDefinition.ts's own doc
// comment). Two instances that advance through DIFFERENT amounts of
// elapsed world-time before their first canonical-event-aware wake
// therefore activate the SAME globally-shared canonical event at
// GENUINELY DIFFERENT ticks -- a real "different world response,"
// while `CanonicalEventIdentity`/`CanonicalEventProvenance` (the
// authored Canon fact itself) stay byte-identical in both.
test("the SAME canonical event activates at a genuinely different tick in two instances with divergent prior elapsed history, while its identity/provenance stay byte-identical", async () => {
  const instanceA = "world-18-multi-instance-divergence-a"
  const instanceB = "world-18-multi-instance-divergence-b"

  // Instance A: two short wakes, reaching a small tick.
  await wakeWorldWithCanonicalEvents(instanceA, "owner-a", () => "2026-08-09T00:00:00.000Z")
  await releaseLease(instanceA, "owner-a")
  const resultA = await wakeWorldWithCanonicalEvents(instanceA, "owner-a", () => "2026-08-09T00:00:00.001Z")
  await releaseLease(instanceA, "owner-a")

  // Instance B: seeded at the SAME instant, but its own first
  // canonical-event-aware wake happens after a longer elapsed gap.
  await wakeWorldWithCanonicalEvents(instanceB, "owner-b", () => "2026-08-09T00:00:00.000Z")
  await releaseLease(instanceB, "owner-b")
  const resultB = await wakeWorldWithCanonicalEvents(instanceB, "owner-b", () => "2026-08-09T00:00:00.010Z")
  await releaseLease(instanceB, "owner-b")

  const projectionA = resultA.canonicalProjections.find((p) => p.canonicalEventId === GOVARDHAN_LIFTING_ID)!
  const projectionB = resultB.canonicalProjections.find((p) => p.canonicalEventId === GOVARDHAN_LIFTING_ID)!

  assert.equal(projectionA.status, "COMPLETED")
  assert.equal(projectionB.status, "COMPLETED")
  assert.notEqual(projectionA.activatedAtTick, projectionB.activatedAtTick, "genuinely different world-instance history produces a genuinely different activation tick")
  assert.notEqual(projectionA.activationId, projectionB.activationId, "activationId is instance-and-tick-scoped, never shared")
  assert.deepEqual(projectionA.provenance, projectionB.provenance, "the authored Canon fact itself -- provenance -- is byte-identical across both instances' own divergent histories")
})
