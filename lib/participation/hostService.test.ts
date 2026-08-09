import { test } from "node:test"
import assert from "node:assert/strict"
import { authorizeAndRecordParticipation, getParticipationRecords } from "./hostService.ts"
import { getWorldState } from "../worldPersistence/hostService.ts"
import { wakeWorldWithEncounterRealization } from "../encounterRealization/hostService.ts"
import { wakeWorldWithCanonicalEvents, getAllCanonicalEventProjectionStates } from "../canonicalEvents/hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"

const FIXED_NOW = () => "2026-08-09T00:00:00.000Z"

async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

// Sprint 19: proves the real, migrated select-encounter path
// (authorizeAndRecordParticipation) against the durable worldInstanceId
// family this sprint converges onto -- never the Sprint 7 singleton.

test("denies ENCOUNTER_NOT_AVAILABLE for a rule that does not apply at this location, and creates no ParticipationRecord", async () => {
  const worldInstanceId = "participation-host-test-not-available"
  const outcome = await authorizeAndRecordParticipation(worldInstanceId, "visitor-1", "yamuna-flowering-reflection", "vrindavan-entry", FIXED_NOW)
  assert.deepEqual(outcome.authorization, { authorized: false, reason: "ENCOUNTER_NOT_AVAILABLE" })
  assert.equal(outcome.record, null)
  assert.deepEqual(await getParticipationRecords(worldInstanceId, "visitor-1"), [])
})

test("authorizes and records participation via Sprint 7's own AvailableEncounter layer with encounterRecordId honestly null when no wake has ever run", async () => {
  const worldInstanceId = "participation-host-test-available-no-wake"
  const outcome = await authorizeAndRecordParticipation(worldInstanceId, "visitor-1", "yamuna-flowering-reflection", "yamuna", FIXED_NOW)
  assert.deepEqual(outcome.authorization, { authorized: true })
  assert.ok(outcome.record)
  assert.equal(outcome.record!.userId, "visitor-1")
  assert.equal(outcome.record!.ruleId, "yamuna-flowering-reflection")
  assert.equal(outcome.record!.encounterRecordId, null, "no EncounterRecord exists yet -- honestly null, never fabricated")
})

test("idempotent retry: calling twice with identical inputs at the identical tick returns the exact same ParticipationRecord, never a duplicate", async () => {
  const worldInstanceId = "participation-host-test-idempotent"
  const first = await authorizeAndRecordParticipation(worldInstanceId, "visitor-1", "yamuna-flowering-reflection", "yamuna", FIXED_NOW)
  const second = await authorizeAndRecordParticipation(worldInstanceId, "visitor-1", "yamuna-flowering-reflection", "yamuna", FIXED_NOW)
  assert.deepEqual(second.record, first.record)
  const all = await getParticipationRecords(worldInstanceId, "visitor-1")
  assert.equal(all.length, 1, "retry never duplicates the durable record")
})

test("encounterRecordId is populated once a real Sprint 14 EncounterRecord already exists for the identical (ruleId, locationId) pair", async () => {
  const worldInstanceId = "participation-host-test-linked-encounter-record"
  const woken = await wakeWorldWithEncounterRealization(worldInstanceId, "owner-1", FIXED_NOW)
  await releaseLease(worldInstanceId, "owner-1")
  const cowRecord = woken.encounterRecords.find((r) => r.ruleId === "yamuna-flowering-reflection")
  assert.ok(cowRecord && cowRecord.status === "CONSEQUENCES_APPLIED", "the real seeded cow convergence realized on this wake")

  const outcome = await authorizeAndRecordParticipation(worldInstanceId, "visitor-1", "yamuna-flowering-reflection", "yamuna", FIXED_NOW)
  assert.equal(outcome.authorization.authorized, true)
  assert.equal(outcome.record!.encounterRecordId, cowRecord!.id, "the visitor's own participation record links to the real, already-resolved EncounterRecord -- never re-derived")
})

test("bounded consequences: authorizing and recording participation never mutates DurableWorldState -- the only durable write is the additive ParticipationRecord itself", async () => {
  const worldInstanceId = "participation-host-test-bounded-consequences"
  const before = await getWorldState(worldInstanceId, FIXED_NOW)
  await authorizeAndRecordParticipation(worldInstanceId, "visitor-1", "yamuna-flowering-reflection", "yamuna", FIXED_NOW)
  const after = await getWorldState(worldInstanceId, FIXED_NOW)
  assert.deepEqual(after, before, "no durable world truth changed as a side effect of recording participation")
})

test("visitor identity is never coerced into EntityId space -- userId never appears among participantEntityIds", async () => {
  const worldInstanceId = "participation-host-test-identity-separation"
  const outcome = await authorizeAndRecordParticipation(worldInstanceId, "visitor-1", "yamuna-flowering-reflection", "yamuna", FIXED_NOW)
  assert.ok(outcome.record)
  assert.ok(!outcome.record!.participantEntityIds.includes(outcome.record!.userId as never))
})

test("worldInstanceId isolation: participation recorded in one world instance never appears when listing another", async () => {
  await authorizeAndRecordParticipation("participation-host-test-isolation-a", "visitor-1", "yamuna-flowering-reflection", "yamuna", FIXED_NOW)
  await authorizeAndRecordParticipation("participation-host-test-isolation-b", "visitor-1", "yamuna-flowering-reflection", "yamuna", FIXED_NOW)
  const inA = await getParticipationRecords("participation-host-test-isolation-a", "visitor-1")
  const inB = await getParticipationRecords("participation-host-test-isolation-b", "visitor-1")
  assert.equal(inA.length, 1)
  assert.equal(inB.length, 1)
  assert.notEqual(inA[0].id, inB[0].id)
})

test("multi-visitor concurrency: two different visitors selecting the identical encounter at the identical tick each get their own independent ParticipationRecord", async () => {
  const worldInstanceId = "participation-host-test-multi-visitor"
  const outcomeA = await authorizeAndRecordParticipation(worldInstanceId, "visitor-a", "yamuna-flowering-reflection", "yamuna", FIXED_NOW)
  const outcomeB = await authorizeAndRecordParticipation(worldInstanceId, "visitor-b", "yamuna-flowering-reflection", "yamuna", FIXED_NOW)
  assert.notEqual(outcomeA.record!.id, outcomeB.record!.id)
  assert.equal((await getParticipationRecords(worldInstanceId, "visitor-a")).length, 1)
  assert.equal((await getParticipationRecords(worldInstanceId, "visitor-b")).length, 1)
})

test("canonical-event coexistence: waking through wakeWorldWithCanonicalEvents and then recording participation on the same world instance never collides in either direction", async () => {
  const worldInstanceId = "participation-host-test-canonical-coexistence"
  await wakeWorldWithCanonicalEvents(worldInstanceId, "owner-1", FIXED_NOW)
  await releaseLease(worldInstanceId, "owner-1")
  const canonicalStatesBefore = await getAllCanonicalEventProjectionStates(worldInstanceId)

  const outcome = await authorizeAndRecordParticipation(worldInstanceId, "visitor-1", "yamuna-flowering-reflection", "yamuna", FIXED_NOW)
  assert.equal(outcome.authorization.authorized, true, "participation resolves normally alongside canonical-event projection state")

  const canonicalStatesAfter = await getAllCanonicalEventProjectionStates(worldInstanceId)
  assert.deepEqual(canonicalStatesAfter, canonicalStatesBefore, "recording participation never mutates canonical-event projection state")
})
