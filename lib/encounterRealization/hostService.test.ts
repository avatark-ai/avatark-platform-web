import { test } from "node:test"
import assert from "node:assert/strict"
import { getEmbodimentWithEncounterRealization, getEncounterRecords, wakeWorldWithEncounterRealization } from "./hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"
import { relationshipRepository } from "../socialEcology/singleton.ts"
import { worldEventRepository, entityMemoryRepository, encounterHistoryRepository } from "../worldMemory/singleton.ts"

async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

const FIXED_NOW = () => "2026-08-09T00:00:00.000Z"

// Sprint 14, Phase 6/7/8/9: on the very first wake of a fresh Vrindavan
// world instance, the seeded cows (co-located at yamuna, PARENT_OFFSPRING
// related, full group cohesion) and the seeded bird flock (co-located at
// kadamba-grove, full cohesion) both already satisfy
// `yamuna-flowering-reflection`/`kadamba-grove-ambient-presence`'s own
// environment condition -- a real, unforced REALIZED case from the
// live artifact-driven pipeline, not a synthetic fixture.
test("a genuinely converging opportunity REALIZES on first wake and its consequences land in every real, existing domain repository -- World Memory, Entity Memory, Relationship evidence, and Encounter History", async () => {
  const worldInstanceId = "encounter-realization-host-test-first-wake"
  const result = await wakeWorldWithEncounterRealization(worldInstanceId, "owner-1", FIXED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  assert.ok(result.encounterRecords.length >= 2, "both seeded convergences produce a record")
  const cowRecord = result.encounterRecords.find((r) => r.ruleId === "yamuna-flowering-reflection")
  const birdRecord = result.encounterRecords.find((r) => r.ruleId === "kadamba-grove-ambient-presence")
  assert.ok(cowRecord && birdRecord)
  assert.equal(cowRecord!.status, "CONSEQUENCES_APPLIED")
  assert.equal(birdRecord!.status, "CONSEQUENCES_APPLIED")
  assert.deepEqual(cowRecord!.participantEntityIds.sort(), ["avatark-population-cow-1", "avatark-population-cow-2"])
  assert.equal(cowRecord!.relationshipContext[0]?.relationshipType, "PARENT_OFFSPRING")

  // World Memory: a real ENCOUNTER_RESOLVED WorldEvent was appended,
  // through the SAME repository/pipeline every other consequence in
  // this whole domain already uses.
  const worldEvent = await worldEventRepository.listByCategory(worldInstanceId, "ENCOUNTER_RESOLVED")
  assert.equal(worldEvent.length, 2)
  assert.ok(cowRecord!.worldEventId && worldEvent.some((e) => e.id === cowRecord!.worldEventId))

  // Entity Memory: RECENT_ENCOUNTER_INVOLVEMENT and PREVIOUS_RESOURCE_LOCATION
  // for a participant, through Sprint 11's own unmodified derivation.
  const entityMemory = await entityMemoryRepository.list(worldInstanceId, "avatark-population-cow-1")
  assert.ok(entityMemory.some((e) => e.type === "RECENT_ENCOUNTER_INVOLVEMENT"))
  assert.ok(entityMemory.some((e) => e.type === "PREVIOUS_RESOURCE_LOCATION" && e.detail.locationId === "yamuna"))

  // Relationship: the seeded PARENT_OFFSPRING relationship's own
  // evidence.encounterCount incremented through
  // lib/socialEcology/hostService.ts's own additive applyEncounterEvidence
  // -- never a parallel relationship graph.
  const relationship = await relationshipRepository.get(worldInstanceId, cowRecord!.relationshipContext[0].relationshipId)
  assert.equal(relationship?.evidence.encounterCount, 1)

  // Encounter History: recordEncounterResolved, dormant since Sprint 11,
  // finally called -- a real RESOLVED breadcrumb.
  const history = await encounterHistoryRepository.latestStatus(worldInstanceId, "yamuna-flowering-reflection")
  assert.equal(history, "RESOLVED")

  const viaQuery = await getEncounterRecords(worldInstanceId, "yamuna")
  assert.ok(viaQuery.some((r) => r.id === cowRecord!.id))
})

test("waking twice at the identical tick never double-realizes or double-applies a consequence -- replay-safe by the record's own content-derived id", async () => {
  const worldInstanceId = "encounter-realization-host-test-replay"
  const first = await wakeWorldWithEncounterRealization(worldInstanceId, "owner-1", FIXED_NOW)
  await releaseLease(worldInstanceId, "owner-1")
  const second = await wakeWorldWithEncounterRealization(worldInstanceId, "owner-1", FIXED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  assert.deepEqual(
    first.encounterRecords.map((r) => r.id),
    second.encounterRecords.map((r) => r.id),
  )
  assert.deepEqual(first.encounterRecords, second.encounterRecords, "identical status, causal references, consequence references -- not merely identical ids")

  const worldEvents = await worldEventRepository.listByCategory(worldInstanceId, "ENCOUNTER_RESOLVED")
  assert.equal(worldEvents.length, 2, "not 4 -- the second wake's identical opportunities were recognized as already-processed and skipped entirely")

  const cowRecord = first.encounterRecords.find((r) => r.ruleId === "yamuna-flowering-reflection")!
  const relationship = await relationshipRepository.get(worldInstanceId, cowRecord.relationshipContext[0].relationshipId)
  assert.equal(relationship?.evidence.encounterCount, 1, "not 2 -- applyEncounterEvidence was never called a second time for the same real encounter")
})

test("getEmbodimentWithEncounterRealization composes rhythms embodiment with location-scoped encounter records, without widening the embodiment contract a fourth time", async () => {
  const worldInstanceId = "encounter-realization-host-test-embodiment"
  await wakeWorldWithEncounterRealization(worldInstanceId, "embodiment-owner", FIXED_NOW)
  await releaseLease(worldInstanceId, "embodiment-owner")

  const result = await getEmbodimentWithEncounterRealization(worldInstanceId, "visitor-1", "yamuna", ["kadamba-grove", "govardhan-path"], 0, FIXED_NOW)
  assert.equal(result.embodimentWithRhythms.embodimentWithSocialEcology.embodimentWithHistory.embodiment.current.locationId, "yamuna")
  assert.ok(result.encounterRecords.some((r) => r.ruleId === "yamuna-flowering-reflection" && r.status === "CONSEQUENCES_APPLIED"))
})

test("only a REALIZED-then-CONSEQUENCES_APPLIED record ever carries a worldEventId/encounterHistoryEntryId; every other status leaves both null", async () => {
  const worldInstanceId = "encounter-realization-host-test-invariant"
  const result = await wakeWorldWithEncounterRealization(worldInstanceId, "owner-1", FIXED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  for (const record of result.encounterRecords) {
    if (record.status === "CONSEQUENCES_APPLIED") {
      assert.ok(record.worldEventId, `${record.ruleId} is CONSEQUENCES_APPLIED but has no worldEventId`)
      assert.ok(record.encounterHistoryEntryId, `${record.ruleId} is CONSEQUENCES_APPLIED but has no encounterHistoryEntryId`)
    } else {
      assert.equal(record.worldEventId, null, `${record.ruleId} is ${record.status} but fabricated a worldEventId`)
      assert.equal(record.encounterHistoryEntryId, null, `${record.ruleId} is ${record.status} but fabricated an encounterHistoryEntryId`)
    }
  }
})
