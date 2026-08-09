import { test } from "node:test"
import assert from "node:assert/strict"
import { deriveWorldEvents } from "./worldEventDerivation.ts"
import { deriveEntityMemoryEntries } from "./entityMemoryDerivation.ts"
import { InMemoryEntityMemoryRepository, InMemoryWorldEventRepository } from "./inMemoryRepositories.ts"
import type { DeriveWorldEventsParams } from "./worldEventDerivation.ts"

// Sprint 11, Phase 18: the central replay-idempotency proof. Sprint 9's
// own deterministic catch-up means "restore checkpoint T, replay the
// identical interval" is a real, exercised scenario (world-persistence-
// runtime's own recovery.test.ts already proves the SIMULATION side of
// this) -- this proves the MEMORY side: deriving and appending World
// Memory / Entity Memory for the exact same interval twice must never
// duplicate a record, because every id is content-derived, not
// randomly generated or counter-based.
function interval(): DeriveWorldEventsParams {
  return {
    worldId: "living-vrindavan",
    now: () => "2026-08-09T00:00:00.000Z",
    seasonTransitions: [{ tick: 4, fromSeasonId: "vasanta", toSeasonId: "grishma" }],
    environmentalBandChanges: [{ tick: 4, band: "hydrologyBand", fromBand: "moderate", toBand: "low" }],
    locationConditionChanges: [{ tick: 4, locationId: "yamuna", category: "water", wasAvailable: true, isAvailable: false, entityIdsPresent: ["cow-1"] }],
    populationEvents: [
      { type: "group.relocated", tick: 5, entityId: null, groupId: "cow-herd-1", fromLocationId: "yamuna", toLocationId: "kadamba-grove", fromActivity: null, toActivity: null },
      { type: "entity.moved", tick: 5, entityId: "cow-1", groupId: "cow-herd-1", fromLocationId: "yamuna", toLocationId: "kadamba-grove", fromActivity: null, toActivity: null },
    ],
    encounterAvailabilityChanges: [{ tick: 5, ruleId: "kadamba-grove-ambient-presence", locationId: "kadamba-grove", category: "ambient", becameAvailable: true, contributingEntityIds: ["cow-1"] }],
  }
}

async function runInterval(eventRepo: InMemoryWorldEventRepository, memoryRepo: InMemoryEntityMemoryRepository) {
  const events = deriveWorldEvents(interval())
  for (const event of events) await eventRepo.append(event)
  const entries = deriveEntityMemoryEntries("living-vrindavan", events)
  for (const entry of entries) await memoryRepo.append(entry)
  return { events, entries }
}

test("replaying the identical deterministic interval twice never duplicates World Memory or Entity Memory", async () => {
  const eventRepo = new InMemoryWorldEventRepository()
  const memoryRepo = new InMemoryEntityMemoryRepository()

  const first = await runInterval(eventRepo, memoryRepo)
  const second = await runInterval(eventRepo, memoryRepo) // simulates "restore checkpoint, replay identical interval"

  assert.deepEqual(first.events.map((e) => e.id).sort(), second.events.map((e) => e.id).sort(), "identical interval derives identical event ids")

  const storedEvents = await eventRepo.listSince("living-vrindavan", 0)
  assert.equal(storedEvents.length, first.events.length, "the second, identical derivation appended zero NEW rows -- no M+M duplication")

  const storedMemory = await memoryRepo.list("living-vrindavan", "cow-1")
  const uniqueMemoryIds = new Set(storedMemory.map((e) => e.id))
  assert.equal(uniqueMemoryIds.size, storedMemory.length, "no duplicate entity-memory record ids after replay")
})

test("a genuinely DIFFERENT interval (different tick) produces a different id and appends a new row, proving the idempotency check discriminates content, not just refuses everything", async () => {
  const eventRepo = new InMemoryWorldEventRepository()
  const memoryRepo = new InMemoryEntityMemoryRepository()
  await runInterval(eventRepo, memoryRepo)

  const differentInterval: DeriveWorldEventsParams = { ...interval(), seasonTransitions: [{ tick: 40, fromSeasonId: "vasanta", toSeasonId: "grishma" }], environmentalBandChanges: [], locationConditionChanges: [], populationEvents: [], encounterAvailabilityChanges: [] }
  const differentEvents = deriveWorldEvents(differentInterval)
  assert.equal(differentEvents.length, 1)
  const result = await eventRepo.append(differentEvents[0])
  assert.equal(result.status, "appended", "a genuinely different tick produces a genuinely new, appendable record")
})
