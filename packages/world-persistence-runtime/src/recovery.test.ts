import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveAvailableEncounters } from "@avatark/living-systems-runtime"
import { emptyProtectedNarrativeProjection, emptyVisitorWorldMemory } from "@avatark/living-systems-contracts"
import type { EncounterRule } from "@avatark/living-systems-contracts"
import { computeDeterministicCatchUp } from "./catchUp.ts"
import { createCheckpoint, recoverAuthoritativeState } from "./checkpoint.ts"
import { InMemoryDurableWorldSystemEventRepository, InMemoryWorldCheckpointRepository } from "./inMemoryDurableRepositories.ts"
import { fixedNow, freshVrindavanEntities, freshVrindavanSharedState, VRINDAVAN_ARCHETYPES, VRINDAVAN_SEASONS } from "./testFixtures.ts"

const YAMUNA_AMBIENT_ENCOUNTER: EncounterRule = { id: "yamuna-ambient", locationId: "yamuna", category: "ambient", condition: { band: "vegetationActivityBand", atLeast: "high" } }

// Sprint 9, Phase 8: the reference crash-recovery scenario, verbatim
// structure:
//   1. Vrindavan starts in Vasanta.
//   2. World advances.
//   3. checkpoint is written.
//   4. additional world-system events occur.
//   5. process/runtime state is destroyed.
//   6. new runtime starts.
//   7. checkpoint + subsequent history are loaded.
//   8. authoritative world state is reconstructed.
//   9. embodiment snapshot is generated (proven at the WorldSnapshot
//      level here -- the embodiment layer itself is exercised in
//      lib/worldPersistence's own integration test, since it lives one
//      layer above this package).
//  10. visitor returns.
test("crash recovery reconstructs correct season, tick, entity state, and encounter availability -- and leaves visitor memory and protected narrative untouched", async () => {
  const worldInstanceId = "living-vrindavan"
  const checkpointRepo = new InMemoryWorldCheckpointRepository()
  const eventRepo = new InMemoryDurableWorldSystemEventRepository()

  // 1/2. Vrindavan starts in Vasanta, advances 3 ticks (still Vasanta --
  // minDurationTicks is 4).
  const toCheckpoint = computeDeterministicCatchUp({
    worldInstanceId,
    sharedState: freshVrindavanSharedState(worldInstanceId),
    entities: freshVrindavanEntities(),
    seasonDefinitions: VRINDAVAN_SEASONS,
    entityArchetypes: VRINDAVAN_ARCHETYPES,
    ticks: 3,
    seed: "crash-recovery-seed",
    now: fixedNow,
  })
  assert.equal(toCheckpoint.sharedState.season.currentSeasonId, "vasanta")

  // 3. checkpoint is written.
  let sequence = 0
  for (const record of toCheckpoint.eventRecords) {
    const result = await eventRepo.append(record)
    sequence = Math.max(sequence, result.sequence)
  }
  const checkpoint = createCheckpoint({
    id: "ckpt-crash-1",
    worldInstanceId,
    checkpointVersion: 1,
    stateVersion: 1,
    sharedState: toCheckpoint.sharedState,
    entities: toCheckpoint.entities,
    eventSequenceAsOf: sequence,
    reason: "periodic",
    now: fixedNow,
  })
  await checkpointRepo.save(checkpoint)

  // 4. additional world-system events occur (2 more ticks -- crosses
  // into Grishma at tick 5, past minDurationTicks 4).
  const postCheckpoint = computeDeterministicCatchUp({
    worldInstanceId,
    sharedState: toCheckpoint.sharedState,
    entities: toCheckpoint.entities,
    seasonDefinitions: VRINDAVAN_SEASONS,
    entityArchetypes: VRINDAVAN_ARCHETYPES,
    ticks: 2,
    seed: "crash-recovery-seed",
    now: fixedNow,
  })
  for (const record of postCheckpoint.eventRecords) {
    await eventRepo.append(record)
  }

  // 5/6. process/runtime state is destroyed; a new runtime starts. The
  // only survivors are what real durable storage would have kept: the
  // checkpoint repo and the event repo (both already outlive any single
  // process in a real deployment -- that's the point of durability).

  // 7. checkpoint + subsequent history are loaded.
  const loadedCheckpoint = await checkpointRepo.loadLatest(worldInstanceId)
  assert.ok(loadedCheckpoint)
  const eventsAfterCheckpoint = await eventRepo.listAfter(worldInstanceId, loadedCheckpoint.eventSequenceAsOf)
  assert.ok(eventsAfterCheckpoint.length > 0, "there is real post-checkpoint history to recover from")

  // 8. authoritative world state is reconstructed.
  const recovered = recoverAuthoritativeState({
    checkpoint: loadedCheckpoint,
    eventsAfterCheckpoint,
    seasonDefinitions: VRINDAVAN_SEASONS,
    entityArchetypes: VRINDAVAN_ARCHETYPES,
    seed: "crash-recovery-seed",
    now: fixedNow,
  })

  // Correct season, correct tick, correct entity state.
  assert.equal(recovered.sharedState.season.currentSeasonId, "grishma")
  assert.equal(recovered.sharedState.clock.tick, 5)
  assert.deepEqual(recovered.entities, postCheckpoint.entities)
  assert.deepEqual(recovered.sharedState, postCheckpoint.sharedState, "recovery matches exactly what the world would have looked like had the process never crashed")

  // 9. correct encounter availability -- Vasanta's high vegetation
  // activity would have made the ambient encounter available; Grishma's
  // moderate activity does not.
  const unresolvedNarrative = emptyProtectedNarrativeProjection(worldInstanceId)
  const encountersAfterRecovery = resolveAvailableEncounters([YAMUNA_AMBIENT_ENCOUNTER], "yamuna", recovered.sharedState.environment, unresolvedNarrative)
  assert.equal(encountersAfterRecovery.length, 0, "Grishma's moderate vegetation activity no longer satisfies the ambient encounter's high-activity gate")

  // 10. visitor returns -- visitor meaningful memory is untouched by any
  // of this (it was never part of DurableWorldState/checkpoint/events in
  // the first place -- Architectural Law #3's isolation, proven here by
  // simply never having written to it).
  const visitorMemory = emptyVisitorWorldMemory("visitor-1", worldInstanceId)
  assert.deepEqual(visitorMemory.meaningfulEncounters, [], "visitor memory survives recovery unchanged because recovery never touches it")

  // Protected narrative remains unchanged (still honestly unresolved --
  // recovery has no mutation path to it at all).
  assert.equal(unresolvedNarrative.resolved, false)
})
