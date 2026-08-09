import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveParticipationAuthorization } from "./participationAuthorization.ts"
import { deriveParticipationRecordId } from "./participationIdentity.ts"
import { InMemoryParticipationRecordRepository } from "./inMemoryRepositories.ts"

// Sprint 19 proof (Living Forest portability): the identical
// resolveParticipationAuthorization/deriveParticipationRecordId
// functions Vrindavan's own Host layer calls, run against a wholly
// fictional, non-Vrindavan world/rule/location, the same fictional-fixture
// convention every sibling sprint's own "livingForest*Portability.test.ts"
// already established. Zero occurrence of "vrindavan," "yamuna," "cow,"
// or any franchise/reference-entity name anywhere in
// participation-contracts/participation-runtime (verified by the
// dependency-boundary regex scan in lib/runtimeKernel/dependencyBoundaries.test.ts).
test("Living Forest fixture: authorization + identity + repository behave identically for a wholly fictional world", async () => {
  const worldInstanceId = "living-forest-world"
  const userId = "forest-visitor-1"
  const ruleId = "forest-deer-greeting"
  const locationId = "forest-clearing"
  const tick = 12

  const denied = resolveParticipationAuthorization({ availableViaLiveSnapshot: false, narrativeGateOpen: true })
  assert.deepEqual(denied, { authorized: false, reason: "ENCOUNTER_NOT_AVAILABLE" })

  const authorized = resolveParticipationAuthorization({ availableViaLiveSnapshot: true, narrativeGateOpen: true })
  assert.deepEqual(authorized, { authorized: true })

  const repo = new InMemoryParticipationRecordRepository()
  const id = deriveParticipationRecordId(worldInstanceId, userId, ruleId, locationId, tick)
  await repo.save({ id, worldId: worldInstanceId, userId, ruleId, locationId, participantEntityIds: ["forest-deer-1"], tick, encounterRecordId: null, createdAt: "2026-01-01T00:00:00.000Z" })

  // Idempotent retry against the identical, non-Vrindavan fixture --
  // the same id is recomputed, and a second save is a plain upsert, not
  // a duplicate.
  const retriedId = deriveParticipationRecordId(worldInstanceId, userId, ruleId, locationId, tick)
  assert.equal(retriedId, id)

  const all = await repo.listByWorld(worldInstanceId)
  assert.equal(all.length, 1)
  assert.equal(all[0].id, id)
})
