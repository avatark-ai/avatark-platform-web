import { test } from "node:test"
import assert from "node:assert/strict"
import { InMemoryEncounterHistoryRepository, InMemoryEntityMemoryRepository, InMemoryHistoricalMarkerRepository, InMemoryWorldEventRepository } from "./inMemoryRepositories.ts"
import type { EntityMemoryEntry, WorldEvent } from "@avatark/world-memory-contracts"

function worldEvent(overrides: Partial<WorldEvent>): WorldEvent {
  return { id: "evt-1", worldId: "w1", tick: 5, category: "SEASON_TRANSITION", locationId: "yamuna", participantEntityIds: ["cow-1"], causalReferences: [], consequences: [], significance: "LANDMARK", retentionTier: "LANDMARK", provenance: { derivedFromEventIds: [], derivationRule: "test", causalReferences: [] }, occurredAt: "2026-08-09T00:00:00.000Z", ...overrides }
}

test("WorldEventRepository.append is idempotent by id -- a retried append never duplicates", async () => {
  const repo = new InMemoryWorldEventRepository()
  const event = worldEvent({})
  assert.equal((await repo.append(event)).status, "appended")
  assert.equal((await repo.append(event)).status, "duplicate_ignored")
  assert.equal((await repo.listSince("w1", 0)).length, 1)
})

test("WorldEventRepository supports its bounded query surface: by location, by entity, by category, recent", async () => {
  const repo = new InMemoryWorldEventRepository()
  await repo.append(worldEvent({ id: "a", tick: 1, category: "SEASON_TRANSITION", locationId: "yamuna", participantEntityIds: [] }))
  await repo.append(worldEvent({ id: "b", tick: 2, category: "POPULATION_MOVEMENT", locationId: "kadamba-grove", participantEntityIds: ["cow-1"] }))

  assert.equal((await repo.listByLocation("w1", "yamuna")).length, 1)
  assert.equal((await repo.listByEntity("w1", "cow-1")).length, 1)
  assert.equal((await repo.listByCategory("w1", "POPULATION_MOVEMENT")).length, 1)
  assert.equal((await repo.listRecent("w1", 1))[0].id, "b")
  assert.equal((await repo.listSince("w1", 1)).length, 1)
})

test("EntityMemoryRepository is idempotent and bounds entries per (entityId, type)", async () => {
  const repo = new InMemoryEntityMemoryRepository()
  function entry(tick: number): EntityMemoryEntry {
    return { id: `entry-${tick}`, worldId: "w1", entityId: "cow-1", type: "PREVIOUS_RESOURCE_LOCATION", tick, detail: { locationId: `loc-${tick}` }, significance: "MEANINGFUL", provenance: { derivedFromEventIds: [], derivationRule: "test", causalReferences: [] } }
  }
  for (let i = 0; i < 10; i++) await repo.append(entry(i))
  const stored = await repo.list("w1", "cow-1")
  assert.ok(stored.length <= 5, "bounded per type, never an unbounded log")

  const retryResult = await repo.append(entry(9))
  assert.equal(retryResult.status, "duplicate_ignored")
})

test("EntityMemoryRepository isolates entities from each other and across worlds", async () => {
  const repo = new InMemoryEntityMemoryRepository()
  await repo.append({ id: "e1", worldId: "w1", entityId: "cow-1", type: "RECENT_RELOCATION", tick: 1, detail: {}, significance: "MEANINGFUL", provenance: { derivedFromEventIds: [], derivationRule: "test", causalReferences: [] } })
  assert.deepEqual(await repo.list("w1", "cow-2"), [])
  assert.deepEqual(await repo.list("w2", "cow-1"), [])
})

test("HistoricalMarkerRepository and EncounterHistoryRepository are both idempotent by id", async () => {
  const markers = new InMemoryHistoricalMarkerRepository()
  const marker = { id: "m1", worldId: "w1", locationId: "yamuna", tick: 3, category: "resource", detail: {}, provenance: { derivedFromEventIds: [], derivationRule: "test", causalReferences: [] } }
  assert.equal((await markers.append(marker)).status, "appended")
  assert.equal((await markers.append(marker)).status, "duplicate_ignored")
  assert.equal((await markers.listByLocation("w1", "yamuna")).length, 1)

  const history = new InMemoryEncounterHistoryRepository()
  const entry = { id: "h1", worldId: "w1", ruleId: "rule-1", locationId: "yamuna", category: "ambient" as const, status: "AVAILABLE" as const, tick: 3, contributingEntityIds: [] }
  assert.equal((await history.append(entry)).status, "appended")
  assert.equal((await history.append(entry)).status, "duplicate_ignored")
  assert.equal(await history.latestStatus("w1", "rule-1"), "AVAILABLE")
  assert.equal(await history.latestStatus("w1", "nonexistent-rule"), null)
})
