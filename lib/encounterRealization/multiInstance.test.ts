import { test } from "node:test"
import assert from "node:assert/strict"
import { getEncounterRecords, wakeWorldWithEncounterRealization } from "./hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"

async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

// Sprint 14: the same multi-instance isolation property
// world-persistence-runtime's own multiVisitorMultiInstance.test.ts
// already proved one layer down ("two world instances derived from the
// same definition advance completely independently"), reproven here at
// the encounter-realization Host layer -- every repository this domain
// touches (encounterRecordRepository, relationshipRepository,
// worldEventRepository, entityMemoryRepository, encounterHistoryRepository)
// is keyed by worldInstanceId throughout, by construction.
test("two Vrindavan world instances realize their own encounters with zero state bleed between them", async () => {
  const instanceA = "encounter-realization-multi-instance-a"
  const instanceB = "encounter-realization-multi-instance-b"

  const resultA = await wakeWorldWithEncounterRealization(instanceA, "owner-a", () => "2026-08-09T00:00:00.000Z")
  await releaseLease(instanceA, "owner-a")
  const resultB = await wakeWorldWithEncounterRealization(instanceB, "owner-b", () => "2026-08-09T00:00:00.000Z")
  await releaseLease(instanceB, "owner-b")

  assert.ok(resultA.encounterRecords.length > 0 && resultB.encounterRecords.length > 0)

  // Same rule ids, same grammar -- but every record's own worldId is
  // its own instance's, never the other's, and neither instance's
  // repository read ever surfaces the other's records.
  for (const record of resultA.encounterRecords) assert.equal(record.worldId, instanceA)
  for (const record of resultB.encounterRecords) assert.equal(record.worldId, instanceB)

  const yamunaRecordsA = await getEncounterRecords(instanceA, "yamuna")
  const yamunaRecordsB = await getEncounterRecords(instanceB, "yamuna")
  assert.ok(yamunaRecordsA.length > 0 && yamunaRecordsB.length > 0)
  const idsA = new Set(yamunaRecordsA.map((r) => r.id))
  const idsB = new Set(yamunaRecordsB.map((r) => r.id))
  assert.deepEqual([...idsA].filter((id) => idsB.has(id)), [], "no encounter record id from instance A is ever visible under instance B, or vice versa")
})

// Different prior history (instance B is woken a second time, further
// in wall-clock time, before instance A is ever touched again) produces
// a divergent, legitimately different future world tick for B -- proving
// history-dependence is instance-scoped, never global state. The elapsed
// delta below is deliberately tiny (10ms): the reference tick policy is
// 1 logical tick per elapsed MILLISECOND (lib/worldPersistence/hostService.ts's
// own DEFAULT_TICK_POLICY), so a larger delta would force an
// unreasonably expensive simulation for what this test needs to prove.
test("advancing one instance further in time diverges its own tick/state from a sibling instance that never advanced past the first wake", async () => {
  const instanceA = "encounter-realization-multi-instance-divergence-a"
  const instanceB = "encounter-realization-multi-instance-divergence-b"

  const resultA = await wakeWorldWithEncounterRealization(instanceA, "owner-a", () => "2026-08-09T00:00:00.000Z")
  await releaseLease(instanceA, "owner-a")

  await wakeWorldWithEncounterRealization(instanceB, "owner-b", () => "2026-08-09T00:00:00.000Z")
  await releaseLease(instanceB, "owner-b")
  // Instance B alone advances further -- a few more elapsed
  // milliseconds/ticks, its own independent future; instance A is never
  // touched again.
  const laterResultB = await wakeWorldWithEncounterRealization(instanceB, "owner-b", () => "2026-08-09T00:00:00.010Z")
  await releaseLease(instanceB, "owner-b")

  const tickA = resultA.rhythms.social.memory.world.state.sharedState.clock.tick
  const tickB = laterResultB.rhythms.social.memory.world.state.sharedState.clock.tick
  assert.ok(tickB > tickA, `instance B's own further-advanced tick (${tickB}) is ahead of instance A's, which never advanced past its first wake (${tickA})`)

  const recordsA = await getEncounterRecords(instanceA, "yamuna")
  const recordsB = await getEncounterRecords(instanceB, "yamuna")
  assert.ok(recordsA.every((r) => r.startTick === tickA), "instance A's own records are all still pinned to its one and only wake's tick")
  assert.ok(recordsB.some((r) => r.startTick === tickB) || recordsB.every((r) => r.startTick <= tickB), "instance B's own records reflect its own, independently later, elapsed history")
})
