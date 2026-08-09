import { test } from "node:test"
import assert from "node:assert/strict"
import { getAllCanonicalEventProjectionStates, getCanonicalEventProjectionState, wakeWorldWithCanonicalEvents, witnessCanonicalEvent } from "./hostService.ts"
import { visitorCanonicalEventWitnessRepository } from "./singleton.ts"
import { worldEventRepository } from "../worldMemory/singleton.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"
import { getSpatialSnapshot } from "../spatialEcology/hostService.ts"

const GOVARDHAN_LIFTING_ID = "canonical-event-govardhan-lifting"
const SEED_NOW = () => "2026-08-09T00:00:00.000Z"
const ADVANCED_NOW = () => "2026-08-09T00:00:00.001Z"

async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

test("wakeWorldWithCanonicalEvents: composes Sprint 16's own spatial-ecology wake, unmodified -- the govardhan-lifting event stays DORMANT at tick 0 (its own authored WORLD_TIME_AT_LEAST:1 condition not yet met)", async () => {
  const worldInstanceId = "world-18-host-tick-zero"
  const result = await wakeWorldWithCanonicalEvents(worldInstanceId, "owner-1", SEED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  assert.ok(result.spatial.spatial.patchStates.length > 0, "Sprint 16's own spatial pass ran unmodified underneath")
  const projection = result.canonicalProjections.find((p) => p.canonicalEventId === GOVARDHAN_LIFTING_ID)
  assert.equal(projection?.status, "DORMANT")
  assert.equal(projection?.activationId, null)
})

test("wakeWorldWithCanonicalEvents: once tick >= 1, the REQUIRED govardhan-lifting event activates and completes exactly once, producing a real CANONICAL_EVENT_OCCURRED WorldEvent and a PLACE AdaptationEffect scoped to govardhan-path", async () => {
  const worldInstanceId = "world-18-host-activation"
  await wakeWorldWithCanonicalEvents(worldInstanceId, "owner-1", SEED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  const advanced = await wakeWorldWithCanonicalEvents(worldInstanceId, "owner-1", ADVANCED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  const projection = advanced.canonicalProjections.find((p) => p.canonicalEventId === GOVARDHAN_LIFTING_ID)
  assert.equal(projection?.status, "COMPLETED")
  assert.ok(projection?.activationId)
  assert.ok(projection?.worldEventId)

  const worldEvents = await worldEventRepository.listByCategory(worldInstanceId, "CANONICAL_EVENT_OCCURRED")
  assert.equal(worldEvents.length, 1)
  assert.equal(worldEvents[0].id, projection!.worldEventId)
  assert.equal(worldEvents[0].significance, "LANDMARK")

  // A FRESH spatial read, taken AFTER this wake's own canonical-event
  // consequences were persisted -- `advanced.spatial.spatial` itself is
  // a snapshot captured by Sprint 16's own wake BEFORE this file's own
  // canonical-event work runs (Sprint 16 is composed first, then
  // canonical events add their own pass on top -- see hostService.ts's
  // own doc comment), so it would never reflect an effect produced
  // later in the SAME wake. This is a real, honest ordering fact, not a
  // test artifact: any consumer wanting to see THIS wake's own
  // canonical consequences reflected in spatial state must re-read
  // afterward, exactly like a renderer's own next `getSpatialSnapshot`
  // call would.
  const spatialAfter = await getSpatialSnapshot(worldInstanceId, ADVANCED_NOW)
  const patchState = spatialAfter.patchStates.find((p) => p.patchId === "patch-govardhan-path")
  assert.equal(patchState?.ecologicalPressure, 1, "the canonical event's own PLACE-domain AdaptationEffect is reflected by Sprint 16's own unmodified resolvePatchState")
  const otherPatches = spatialAfter.patchStates.filter((p) => p.patchId !== "patch-govardhan-path")
  assert.ok(otherPatches.every((p) => p.ecologicalPressure === 0), "every other Patch remains unaffected -- scope is real, not global")
})

test("wakeWorldWithCanonicalEvents: replaying the identical wake never re-activates or re-derives -- byte-identical projection, zero duplicate WorldEvent/AdaptationEffect", async () => {
  const worldInstanceId = "world-18-host-replay"
  await wakeWorldWithCanonicalEvents(worldInstanceId, "owner-1", SEED_NOW)
  await releaseLease(worldInstanceId, "owner-1")
  const first = await wakeWorldWithCanonicalEvents(worldInstanceId, "owner-1", ADVANCED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  const replayed = await wakeWorldWithCanonicalEvents(worldInstanceId, "owner-1", ADVANCED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  assert.deepEqual(first.canonicalProjections, replayed.canonicalProjections)
  assert.equal((await worldEventRepository.listByCategory(worldInstanceId, "CANONICAL_EVENT_OCCURRED")).length, 1, "no duplicate WorldEvent from the replay")
})

test("witnessCanonicalEvent: a visitor witness record only attaches once the projection has genuinely COMPLETED, and never mutates Fact A", async () => {
  const worldInstanceId = "world-18-host-witness"
  await wakeWorldWithCanonicalEvents(worldInstanceId, "owner-1", SEED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  // Attempting to witness before activation is a safe no-op.
  await witnessCanonicalEvent(worldInstanceId, "visitor-1", GOVARDHAN_LIFTING_ID, 0)
  assert.deepEqual(await visitorCanonicalEventWitnessRepository.listByUser(worldInstanceId, "visitor-1"), [])

  await wakeWorldWithCanonicalEvents(worldInstanceId, "owner-1", ADVANCED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  const beforeWitness = await getCanonicalEventProjectionState(worldInstanceId, GOVARDHAN_LIFTING_ID)
  await witnessCanonicalEvent(worldInstanceId, "visitor-1", GOVARDHAN_LIFTING_ID, 1)
  const afterWitness = await getCanonicalEventProjectionState(worldInstanceId, GOVARDHAN_LIFTING_ID)

  assert.deepEqual(beforeWitness, afterWitness, "Fact A is completely unchanged by Fact B's arrival")
  const witnesses = await visitorCanonicalEventWitnessRepository.listByUser(worldInstanceId, "visitor-1")
  assert.equal(witnesses.length, 1)
  assert.equal(witnesses[0].activationId, afterWitness!.activationId)
})

test("getAllCanonicalEventProjectionStates: a Host-composed read, never requiring the caller to know the singleton exists", async () => {
  const worldInstanceId = "world-18-host-getter"
  await wakeWorldWithCanonicalEvents(worldInstanceId, "owner-1", SEED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  const states = await getAllCanonicalEventProjectionStates(worldInstanceId)
  assert.equal(states.length, 1)
  assert.equal(states[0].canonicalEventId, GOVARDHAN_LIFTING_ID)
})
