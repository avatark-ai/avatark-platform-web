import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveEncounterRealization } from "@avatark/encounter-realization-runtime"
import { resolvePreferredResourceLocation } from "@avatark/world-memory-runtime"
import { applyWorldAdaptation, wakeWorldWithAdaptation } from "./hostService.ts"
import { entityMemoryRepository } from "../worldMemory/singleton.ts"
import { relationshipRepository } from "../socialEcology/singleton.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"

async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

const SEED_NOW = () => "2026-08-09T00:00:00.000Z"

// Sprint 15's own central acceptance proof (mission's own "EMERGENT
// FUTURES PROOF" section): WORLD A and WORLD B both start from the
// SAME world grammar and the SAME deterministic initial conditions --
// two fresh Vrindavan world instances, whose very first organic wake is
// structurally identical (same seeded cows/birds, same starting
// locations, same initial relationship evidence -- proven independently
// by lib/encounterRealization/multiInstance.test.ts's own first test).
// From that shared starting point, each world then lives through a
// DIFFERENT legitimate subsequent history of realized encounters, and
// this test proves they now legitimately differ -- while both still run
// the exact same world-adaptation engine, the exact same Protected
// Canon (untouched, never referenced by this domain), and the exact
// same simulation laws (Sprint 7-14, none of them modified this
// sprint).
test("EMERGENT FUTURES: two worlds sharing the identical grammar and starting conditions diverge in entity memory, relationship band, and encounter-realization outcome because different things actually happened in each", async () => {
  const worldA = "world-adaptation-emergent-futures-a"
  const worldB = "world-adaptation-emergent-futures-b"

  // Shared starting point: both worlds' first organic wake, through the
  // completely unmodified Sprint 7-14 stack.
  const seedA = await wakeWorldWithAdaptation(worldA, "owner-a", SEED_NOW)
  await releaseLease(worldA, "owner-a")
  const seedB = await wakeWorldWithAdaptation(worldB, "owner-b", SEED_NOW)
  await releaseLease(worldB, "owner-b")

  assert.equal(seedA.realization.encounterRecords.map((r) => r.ruleId).sort().join(","), seedB.realization.encounterRecords.map((r) => r.ruleId).sort().join(","), "both worlds' shared starting point genuinely realizes the identical set of rules on their own first wake")

  // WORLD A's own subsequent legitimate history: an entity is
  // repeatedly involved in a realized encounter at kadamba-grove,
  // crossing rule A's own bounded threshold. A synthetic entity id is
  // used here deliberately (never one of the organically-seeded
  // cows/birds) so this specific divergence is isolated from the
  // ALREADY-identical organic consequence both worlds' shared seed wake
  // produces for the real seeded population (proven equal just above) --
  // this measures ONLY what adaptation itself, not Sprint 14's own
  // per-encounter consequence, contributes.
  // Note: WORLD A's shared organic seed wake above ALREADY realized this
  // same rule for the REAL bird flock, so the PLACE/WORLD_POSSIBILITY
  // pressure for this exact (location, rule) pair already has a head
  // start and crosses ITS OWN threshold sooner than the fork entity's
  // own, freshly-started ENTITY pressure does -- the loop below
  // deliberately keeps going until the ENTITY effect specifically
  // appears, not merely "any" effect.
  const forkEntityId = "fork-entity"
  let worldAResult
  for (let tick = 1; tick <= 8; tick++) {
    worldAResult = await applyWorldAdaptation({ worldId: worldA, tick, realizedEncounters: [{ ruleId: "kadamba-grove-ambient-presence", locationId: "kadamba-grove", participantEntityIds: [forkEntityId], relationshipIdsInvolved: [], tick, causalReferences: [] }], resourceReadings: [] })
    if (worldAResult.effects.some((e) => e.domain === "ENTITY")) break
  }
  assert.ok(worldAResult!.effects.some((e) => e.domain === "ENTITY"), "WORLD A's own repeated history crossed rule A's threshold")

  // WORLD B's own subsequent legitimate history: DIFFERENT -- a single,
  // one-off realized encounter, never repeated. Same rule, same
  // participant, same engine -- a different amount of it actually
  // happened.
  const worldBResult = await applyWorldAdaptation({ worldId: worldB, tick: 1, realizedEncounters: [{ ruleId: "kadamba-grove-ambient-presence", locationId: "kadamba-grove", participantEntityIds: [forkEntityId], relationshipIdsInvolved: [], tick: 1, causalReferences: [] }], resourceReadings: [] })
  assert.equal(worldBResult.effects.length, 0, "WORLD B's own single encounter never crossed the same threshold")

  // 1. ENTITY BEHAVIOR now legitimately differs.
  const memoryA = await entityMemoryRepository.list(worldA, forkEntityId)
  const memoryB = await entityMemoryRepository.list(worldB, forkEntityId)
  assert.equal(resolvePreferredResourceLocation(memoryA), "kadamba-grove", "WORLD A's fork entity now carries an adaptation-driven resource preference")
  assert.notEqual(resolvePreferredResourceLocation(memoryB), "kadamba-grove", "WORLD B's fork entity carries no such preference -- a genuinely different future, from the identical starting grammar")

  // 2. RELATIONSHIP STATE can be made to differ the same way (SCENARIO
  // B's own mechanism, reproven here across the two forked worlds using
  // two otherwise-identical seeded relationship records).
  const seedRelationship = { entityAId: "avatark-population-cow-1", entityBId: "avatark-population-cow-2", relationshipType: "PARENT_OFFSPRING" as const, band: "WEAK" as const, evidence: { coPresenceTicks: 0, sharedGroupTicks: 0, reunionCount: 0, encounterCount: 1 }, establishedTick: 0, lastRelevantTick: 0 }
  await relationshipRepository.save({ ...seedRelationship, id: "fork-relationship-a", worldId: worldA })
  await relationshipRepository.save({ ...seedRelationship, id: "fork-relationship-b", worldId: worldB })

  for (let tick = 1; tick <= 8; tick++) {
    const result = await applyWorldAdaptation({ worldId: worldA, tick: tick + 100, realizedEncounters: [{ ruleId: "yamuna-flowering-reflection", locationId: "yamuna", participantEntityIds: ["avatark-population-cow-1", "avatark-population-cow-2"], relationshipIdsInvolved: ["fork-relationship-a"], tick: tick + 100, causalReferences: [] }], resourceReadings: [] })
    if (result.effects.some((e) => e.domain === "RELATIONSHIP")) break
  }
  // WORLD B's fork-relationship-b receives no further evidence at all.

  const relationshipA = await relationshipRepository.get(worldA, "fork-relationship-a")
  const relationshipB = await relationshipRepository.get(worldB, "fork-relationship-b")
  assert.notEqual(relationshipA!.band, "WEAK", "WORLD A's relationship band was legitimately raised by its own accumulated history")
  assert.equal(relationshipB!.band, "WEAK", "WORLD B's otherwise-identical relationship never received that history, and stays exactly where it started")

  // 3. AVAILABLE ENCOUNTERS now legitimately differ: the identical
  // marginal opportunity realizes in WORLD A (whose relationship band
  // adaptation raised it) but not in WORLD B (whose band never moved) --
  // zero modification to resolveEncounterRealization itself.
  const marginalOpportunity = {
    opportunity: { ruleId: "yamuna-flowering-reflection", locationId: "yamuna", category: "ambient" as const, contributingEntityIds: ["avatark-population-cow-1", "avatark-population-cow-2"], tick: 500 },
    protectedNarrative: { worldId: worldA, episodeRef: null, sceneRef: null, resolved: true },
    presentEntityIds: ["avatark-population-cow-1", "avatark-population-cow-2"],
    routineCompatibleEntityIds: ["avatark-population-cow-1", "avatark-population-cow-2"],
    groupCohesion: null,
    resourceOpportunityAvailable: false,
    variation: 0.9,
  }
  const outcomeInWorldA = resolveEncounterRealization({ ...marginalOpportunity, relationshipBand: relationshipA!.band })
  const outcomeInWorldB = resolveEncounterRealization({ ...marginalOpportunity, relationshipBand: relationshipB!.band })
  assert.equal(outcomeInWorldA.status, "REALIZED")
  assert.equal(outcomeInWorldB.status, "EXPIRED")
  assert.notEqual(outcomeInWorldA.status, outcomeInWorldB.status, "the SAME world grammar, the SAME opportunity, the SAME simulation laws -- a different legitimate future because different things actually happened")
})
