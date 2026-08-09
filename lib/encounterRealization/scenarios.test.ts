import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveEncounterRealization, deriveConsequences } from "@avatark/encounter-realization-runtime"
import { selectBehavior } from "@avatark/living-population-runtime"
import type { EntityBehaviorProfile } from "@avatark/living-population-contracts"
import { resolvePreferredResourceLocation } from "@avatark/world-memory-runtime"
import { getEmbodimentWithEncounterRealization, getEncounterRecords, wakeWorldWithEncounterRealization } from "./hostService.ts"
import { worldCheckpointRepository, worldLeaseRepository } from "../worldPersistence/singleton.ts"
import { protectedNarrativeStateRepository } from "../livingSystems/singleton.ts"
import { entityMemoryRepository, worldEventRepository } from "../worldMemory/singleton.ts"
import { relationshipRepository } from "../socialEcology/singleton.ts"
import { COW_ARCHETYPE_ID } from "../livingPopulation/vrindavanPopulationDefinition.ts"

async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

const FIXED_NOW = () => "2026-08-09T00:00:00.000Z"

// Sprint 14, Sprint 14 mission "Reference Scenarios" -- each test below
// is named for the scenario letter it proves. Every fixture uses only
// already-authorized Vrindavan world grammar (yamuna, kadamba-grove,
// govardhan-path, the seeded cow herd/bird flock, the two real
// EncounterRule ids from lib/livingWorldRuntime/vendor/livingVrindavan.systems.json)
// -- no new theology, character, location, or canonical claim.

// SCENARIO A -- Causal encounter. Already proven as a first-class test
// in hostService.test.ts's own "a genuinely converging opportunity
// REALIZES on first wake..." -- the two seeded cows (PARENT_OFFSPRING,
// full group cohesion, co-located at yamuna) converge and their
// consequences persist across WorldEvent/EntityMemory/RelationshipEvidence/
// EncounterHistoryEntry. Not duplicated here; see that file.

// SCENARIO B -- Missed encounter. Uses the SAME functions the Host
// layer calls, with a REAL opportunity/rule from an actual wake, one
// causal input changed to the unfavorable side.
test("SCENARIO B: changing routine compatibility from full to zero, with no other favorable factor, EXPIRES a real opportunity and fabricates zero consequences", async () => {
  const worldInstanceId = "encounter-realization-scenario-b"
  const result = await wakeWorldWithEncounterRealization(worldInstanceId, "owner-1", FIXED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  const realOpportunity = result.rhythms.social.memory.population.encounterOpportunities.find((o) => o.ruleId === "kadamba-grove-ambient-presence")
  assert.ok(realOpportunity, "the real bird-flock convergence at kadamba-grove exists in this wake")

  const missed = resolveEncounterRealization({
    opportunity: realOpportunity!,
    protectedNarrative: { worldId: worldInstanceId, episodeRef: null, sceneRef: null, resolved: true },
    presentEntityIds: realOpportunity!.contributingEntityIds,
    routineCompatibleEntityIds: [], // the ONE causal input changed: no one is actually engaging, all mid-transit
    groupCohesion: null,
    relationshipBand: null,
    resourceOpportunityAvailable: false,
    variation: 0.5,
  })
  assert.equal(missed.status, "EXPIRED")

  const consequences = deriveConsequences({ status: missed.status, ruleId: realOpportunity!.ruleId, locationId: realOpportunity!.locationId, participantEntityIds: realOpportunity!.contributingEntityIds, relationshipIdsInvolved: [] })
  assert.deepEqual(consequences, [], "no WORLD_MEMORY or RELATIONSHIP consequence is ever fabricated for a non-REALIZED status")
})

// SCENARIO C -- Historical feedback (the mission's own critical
// path-dependence proof). Encounter A (already realized on first wake,
// cow-1 at yamuna) writes a REAL PREVIOUS_RESOURCE_LOCATION memory entry
// via THIS sprint's own consequence pipeline. That REAL, stored memory
// -- not a synthetic stand-in -- is then fed into Sprint 10/11's own
// unmodified `selectBehavior` (called directly, mirroring Sprint 12
// §10's own "using the population pipeline directly" integration-test
// posture) and demonstrably changes which of two reachable locations a
// thirsty/hungry cow would move toward. Because `yamuna-flowering-reflection`
// is anchored at yamuna, biasing the cow back toward yamuna makes a
// FUTURE realization of that same rule (Encounter B) more likely than
// if the cow had instead defaulted to kadamba-grove, where a DIFFERENT
// rule applies -- concretely, not abstractly, demonstrated.
test("SCENARIO C: a realized encounter's own consequence changes a later behavioral choice, making a future encounter at the SAME location more likely", async () => {
  const worldInstanceId = "encounter-realization-scenario-c"
  await wakeWorldWithEncounterRealization(worldInstanceId, "owner-1", FIXED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  const cowEntries = await entityMemoryRepository.list(worldInstanceId, "avatark-population-cow-1")
  const rememberedLocationId = resolvePreferredResourceLocation(cowEntries)
  assert.equal(rememberedLocationId, "yamuna", "Encounter A's own RESOURCE_PREFERENCE consequence is the real, stored memory driving this scenario -- not fabricated for the test")

  const PROFILE: EntityBehaviorProfile = { archetypeId: COW_ARCHETYPE_ID, capabilities: ["can_move", "can_graze", "can_drink", "can_rest", "can_group"], needDefinitions: [], rhythmScheduleId: "cow-rhythm", groupKind: "herd" }
  const needs = [{ dimension: "hunger" as const, pressure: 0.9 }, { dimension: "thirst" as const, pressure: 0.1 }, { dimension: "rest" as const, pressure: 0.1 }, { dimension: "social" as const, pressure: 0.1 }]
  const perception = {
    entityId: "avatark-population-cow-1",
    currentLocationId: "kadamba-grove",
    reachableLocationIds: ["kadamba-grove", "yamuna"],
    localEnvironment: { weather: { temperatureBand: "moderate" as const, precipitationBand: "moderate" as const, humidityBand: "moderate" as const }, hydrology: { hydrologyBand: "moderate" as const, soilMoistureBand: "moderate" as const }, ecology: { vegetationActivityBand: "high" as const, animalActivityBand: "moderate" as const } },
    waterAvailable: false,
    vegetationAvailable: false,
    reachableWaterLocationIds: [],
    reachableVegetationLocationIds: ["kadamba-grove", "yamuna"], // kadamba-grove listed first -- the perception-default pick without memory
    nearbyEntityIds: [],
    groupId: null,
    availableEncounterRuleIds: [],
  }

  const withoutMemory = selectBehavior({ entityId: "avatark-population-cow-1", profile: PROFILE, needs, rhythmPhase: "FORAGE", perception, group: null, tick: 20 })
  assert.equal(withoutMemory.type, "MOVE_TO_RESOURCE")
  assert.equal(withoutMemory.targetLocationId, "kadamba-grove", "without Encounter A's own memory, the perception-default first-reachable pick wins")

  const withMemory = selectBehavior({ entityId: "avatark-population-cow-1", profile: PROFILE, needs, rhythmPhase: "FORAGE", perception, group: null, tick: 20, memoryHint: { preferredResourceLocationId: rememberedLocationId } })
  assert.equal(withMemory.type, "MOVE_TO_RESOURCE")
  assert.equal(withMemory.targetLocationId, "yamuna", "WITH Encounter A's own real memory, the cow is biased back toward yamuna -- a concrete behavioral difference caused by history")
})

// SCENARIO D -- Offscreen encounter. wakeWorldWithEncounterRealization
// takes no visitor parameter anywhere in its signature -- structurally,
// visitor presence was never a precondition. This test realizes an
// encounter with no embodiment/visitor call at all, THEN separately
// simulates "the visitor returns" via getEmbodimentWithEncounterRealization
// -- a pure READ (encounterRecordRepository.listByLocation) that never
// itself calls wakeWorldWithEncounterRealization, proving the visitor's
// own arrival cannot retroactively cause or duplicate the encounter.
test("SCENARIO D: an encounter realizes with no visitor/embodiment call involved at all; the visitor's later arrival only discovers pre-existing history, never creates it", async () => {
  const worldInstanceId = "encounter-realization-scenario-d"

  // The world advances and realizes purely through the Host process's
  // own wake -- no InteractionIntent, no "select-encounter", no visitor
  // identity anywhere in this call.
  const offscreenResult = await wakeWorldWithEncounterRealization(worldInstanceId, "cron-owner", FIXED_NOW)
  await releaseLease(worldInstanceId, "cron-owner")
  const realizedBeforeVisitor = offscreenResult.encounterRecords.filter((r) => r.status === "CONSEQUENCES_APPLIED")
  assert.ok(realizedBeforeVisitor.length > 0, "at least one encounter realized with zero visitor involvement")

  // "Visitor returns": a read-only embodiment call, for the first time,
  // long after the offscreen realization above.
  const embodiment = await getEmbodimentWithEncounterRealization(worldInstanceId, "returning-visitor-1", "yamuna", ["kadamba-grove", "govardhan-path"], 0, FIXED_NOW)
  assert.deepEqual(
    embodiment.encounterRecords.map((r) => r.id).sort(),
    realizedBeforeVisitor.filter((r) => r.locationId === "yamuna").map((r) => r.id).sort(),
    "the visitor's own read reflects exactly the pre-existing records, byte for byte -- discovery, not creation",
  )

  // Discovery is idempotent too -- reading twice never duplicates or
  // re-derives anything.
  const secondRead = await getEncounterRecords(worldInstanceId, "yamuna")
  assert.deepEqual(secondRead, await getEncounterRecords(worldInstanceId, "yamuna"))
})

// SCENARIO E -- Protected narrative. Uses the REAL "yamuna-narrative-gate"
// rule id from the Vrindavan artifact and the REAL protectedNarrativeStateRepository
// (not a mock) to prove the gate is unresolved in this environment, and
// that resolveEncounterRealization independently enforces BLOCKED even
// when every other causal input is maximally favorable -- defense in
// depth, since Sprint 7's own resolveAvailableEncounters already
// prevents this rule from ever becoming a live EncounterOpportunity in
// the first place (this test deliberately bypasses that earlier gate to
// prove THIS layer holds the line too, independently).
test("SCENARIO E: a narrative-protected opportunity is BLOCKED regardless of favorable causal inputs, and the real protected-narrative repository genuinely reports unresolved in this environment", async () => {
  const worldInstanceId = "encounter-realization-scenario-e"
  const protectedNarrative = await protectedNarrativeStateRepository.get(worldInstanceId)
  assert.equal(protectedNarrative.resolved, false, "no real canonical-narrative system is wired up in this environment -- an honest default, not a gap this domain may work around")

  const result = resolveEncounterRealization({
    opportunity: { ruleId: "yamuna-narrative-gate", locationId: "yamuna", category: "narrative-protected", contributingEntityIds: ["avatark-population-cow-1", "avatark-population-cow-2"], tick: 3 },
    protectedNarrative,
    presentEntityIds: ["avatark-population-cow-1", "avatark-population-cow-2"],
    routineCompatibleEntityIds: ["avatark-population-cow-1", "avatark-population-cow-2"],
    groupCohesion: 1,
    relationshipBand: "STRONG",
    resourceOpportunityAvailable: true,
    variation: 0,
  })
  assert.equal(result.status, "BLOCKED")
})

// SCENARIO F -- Replay. Uses Sprint 9's own REAL checkpoint/restore
// mechanism, not a from-scratch harness: `wakeWorld`
// (lib/worldPersistence/hostService.ts) only calls
// `worldCheckpointRepository.save(createCheckpoint(...))` when real
// elapsed ticks are computed (`ticksElapsed > 0`, line ~63/92) -- a
// world's own FIRST wake (creation and first read at the identical
// instant) never advances any ticks, so no checkpoint exists yet. The
// SECOND wake, 1ms later (the reference tick policy is 1 tick per
// elapsed ms -- see lib/worldPersistence/hostService.ts's own
// DEFAULT_TICK_POLICY), is where a real checkpoint is created and tick
// 1 is reached, with the SAME two opportunities still genuinely
// converging (verified empirically -- by a few ticks later the seeded
// population has already moved on and the opportunities vanish, which
// is itself the correct, honest behavior, just not useful for THIS
// proof); the THIRD wake, at that SAME later instant, is the genuine
// "restore the checkpoint and replay zero further ticks" case.
test("SCENARIO F: checkpoint -> advance -> realize -> apply consequences -> replay the identical range -> identical EncounterRecord id/participants/realizationTick/consequences, zero duplicate writes", async () => {
  const worldInstanceId = "encounter-realization-scenario-f"
  const seedTick = () => "2026-08-09T00:00:00.000Z"
  const advancedTick = () => "2026-08-09T00:00:00.001Z"

  await wakeWorldWithEncounterRealization(worldInstanceId, "owner-1", seedTick)
  await releaseLease(worldInstanceId, "owner-1")

  const advanced = await wakeWorldWithEncounterRealization(worldInstanceId, "owner-1", advancedTick)
  await releaseLease(worldInstanceId, "owner-1")

  const checkpoint = await worldCheckpointRepository.loadLatest(worldInstanceId)
  assert.ok(checkpoint, "wakeWorld's own real checkpoint mechanism persisted a checkpoint once real ticks elapsed")
  assert.equal(checkpoint!.sharedState.clock.tick, advanced.rhythms.social.memory.world.state.sharedState.clock.tick)

  const cowRecord = advanced.encounterRecords.find((r) => r.ruleId === "yamuna-flowering-reflection")!
  const worldEventCountBeforeReplay = (await worldEventRepository.listByCategory(worldInstanceId, "ENCOUNTER_RESOLVED")).length
  const encounterCountBeforeReplay = (await relationshipRepository.get(worldInstanceId, cowRecord.relationshipContext[0].relationshipId))?.evidence.encounterCount

  // Replay: waking again at the identical (later) `now` restores from
  // the same checkpointed state and computes zero additional elapsed
  // ticks.
  const replayed = await wakeWorldWithEncounterRealization(worldInstanceId, "owner-1", advancedTick)
  await releaseLease(worldInstanceId, "owner-1")

  assert.deepEqual(advanced.encounterRecords, replayed.encounterRecords, "identical id, participants, realizationTick, causal references, and consequence references")
  assert.equal((await worldEventRepository.listByCategory(worldInstanceId, "ENCOUNTER_RESOLVED")).length, worldEventCountBeforeReplay, "no duplicate WorldEvent from the replay")
  assert.equal((await relationshipRepository.get(worldInstanceId, cowRecord.relationshipContext[0].relationshipId))?.evidence.encounterCount, encounterCountBeforeReplay, "no duplicate relationship-evidence write from the replay")
})
