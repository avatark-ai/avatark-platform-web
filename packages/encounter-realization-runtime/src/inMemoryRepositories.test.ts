import assert from "node:assert/strict"
import { test } from "node:test"
import { InMemoryEncounterRecordRepository } from "./inMemoryRepositories.ts"
import type { EncounterRecord } from "@avatark/encounter-realization-contracts"

function record(overrides: Partial<EncounterRecord> = {}): EncounterRecord {
  return {
    id: "rec-1",
    worldId: "w1",
    ruleId: "rule-1",
    category: "ambient",
    locationId: "loc-1",
    participantEntityIds: ["a", "b"],
    participantGroupIds: [],
    startTick: 10,
    realizationTick: 10,
    completionTick: null,
    status: "REALIZED",
    causalReferences: [],
    relationshipContext: [],
    protectedNarrativeGateOpen: true,
    worldEventId: null,
    encounterHistoryEntryId: null,
    variationConsulted: null,
    ...overrides,
  }
}

test("save then get by (worldId, id) round-trips the exact record", async () => {
  const repo = new InMemoryEncounterRecordRepository()
  await repo.save(record())
  assert.deepEqual(await repo.get("w1", "rec-1"), record())
})

test("get returns null for an unknown id, and worlds are isolated from one another", async () => {
  const repo = new InMemoryEncounterRecordRepository()
  await repo.save(record())
  assert.equal(await repo.get("w1", "never-saved"), null)
  assert.equal(await repo.get("w2", "rec-1"), null)
})

test("save is an upsert by id -- saving the same id twice with a new status replaces it, never duplicates", async () => {
  const repo = new InMemoryEncounterRecordRepository()
  await repo.save(record({ status: "REALIZED" }))
  await repo.save(record({ status: "CONSEQUENCES_APPLIED" }))
  const stored = await repo.get("w1", "rec-1")
  assert.equal(stored?.status, "CONSEQUENCES_APPLIED")
  assert.equal((await repo.listByLocation("w1", "loc-1")).length, 1)
})

test("listByLocation filters to the requested location only", async () => {
  const repo = new InMemoryEncounterRecordRepository()
  await repo.save(record({ id: "rec-1", locationId: "loc-1" }))
  await repo.save(record({ id: "rec-2", locationId: "loc-2" }))
  assert.deepEqual((await repo.listByLocation("w1", "loc-1")).map((r) => r.id), ["rec-1"])
})

test("listRecent returns most-recent-first by startTick, bounded by limit", async () => {
  const repo = new InMemoryEncounterRecordRepository()
  await repo.save(record({ id: "rec-early", startTick: 5 }))
  await repo.save(record({ id: "rec-late", startTick: 15 }))
  const recent = await repo.listRecent("w1", 1)
  assert.deepEqual(recent.map((r) => r.id), ["rec-late"])
})
