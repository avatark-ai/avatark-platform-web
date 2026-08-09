import assert from "node:assert/strict"
import { test } from "node:test"
import { InMemoryPlaceRhythmRepository, typicalOccupancyLevel } from "./placeRhythmEvolution.ts"

test("recordObservation accumulates counts per (dayPhase, occupancyLevel), bounded rather than growing an event log", async () => {
  const repo = new InMemoryPlaceRhythmRepository()
  await repo.recordObservation("world-1", "loc-1", "MORNING", "ACTIVE", 1)
  await repo.recordObservation("world-1", "loc-1", "MORNING", "ACTIVE", 2)
  await repo.recordObservation("world-1", "loc-1", "MORNING", "QUIET", 3)

  const profile = await repo.get("world-1", "loc-1")
  assert.ok(profile)
  assert.equal(profile.counts.length, 2, "exactly two distinct (dayPhase, occupancyLevel) counters, not three rows")
  assert.equal(profile.counts.find((c) => c.occupancyLevel === "ACTIVE")?.observationCount, 2)
  assert.equal(profile.counts.find((c) => c.occupancyLevel === "QUIET")?.observationCount, 1)
})

test("get returns null for a location never observed", async () => {
  const repo = new InMemoryPlaceRhythmRepository()
  assert.equal(await repo.get("world-1", "never-observed"), null)
})

test("worlds and locations are isolated from one another", async () => {
  const repo = new InMemoryPlaceRhythmRepository()
  await repo.recordObservation("world-1", "loc-1", "MORNING", "ACTIVE", 1)
  await repo.recordObservation("world-2", "loc-1", "MORNING", "GATHERING", 1)
  assert.equal((await repo.get("world-1", "loc-1"))?.counts[0].occupancyLevel, "ACTIVE")
  assert.equal((await repo.get("world-2", "loc-1"))?.counts[0].occupancyLevel, "GATHERING")
})

test("typicalOccupancyLevel returns the highest-count occupancy level for a given day phase", async () => {
  const repo = new InMemoryPlaceRhythmRepository()
  await repo.recordObservation("world-1", "loc-1", "MORNING", "ACTIVE", 1)
  await repo.recordObservation("world-1", "loc-1", "MORNING", "ACTIVE", 2)
  await repo.recordObservation("world-1", "loc-1", "MORNING", "QUIET", 3)
  await repo.recordObservation("world-1", "loc-1", "NIGHT", "QUIET", 4)

  const profile = await repo.get("world-1", "loc-1")
  assert.ok(profile)
  assert.equal(typicalOccupancyLevel(profile, "MORNING"), "ACTIVE")
  assert.equal(typicalOccupancyLevel(profile, "NIGHT"), "QUIET")
})

test("typicalOccupancyLevel returns null for a day phase never observed at this location", async () => {
  const repo = new InMemoryPlaceRhythmRepository()
  await repo.recordObservation("world-1", "loc-1", "MORNING", "ACTIVE", 1)
  const profile = await repo.get("world-1", "loc-1")
  assert.ok(profile)
  assert.equal(typicalOccupancyLevel(profile, "DUSK"), null)
})

test("typicalOccupancyLevel ties are broken deterministically by a fixed occupancy-level priority, not iteration order", async () => {
  const repo = new InMemoryPlaceRhythmRepository()
  await repo.recordObservation("world-1", "loc-1", "MORNING", "GATHERING", 1)
  await repo.recordObservation("world-1", "loc-1", "MORNING", "QUIET", 2)
  const profile = await repo.get("world-1", "loc-1")
  assert.ok(profile)
  assert.equal(typicalOccupancyLevel(profile, "MORNING"), "QUIET", "QUIET is earlier in OCCUPANCY_LEVEL_PRIORITY than GATHERING")
})
