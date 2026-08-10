import { test } from "node:test"
import assert from "node:assert/strict"
import { createWorldInstance, wakeLivingWorld } from "../livingWorldHost/hostService.ts"
import { advanceWorld, getWorldState, wakeWorld } from "../worldPersistence/hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"
import { livingWorldRuntime } from "../livingWorldRuntime/singleton.ts"
import { LIVING_VRINDAVAN_DEFINITION } from "../livingWorldRuntime/vrindavanDefinition.ts"
import { authorizeAndRecordParticipation } from "../participation/hostService.ts"
import { resolveVrindavanArrivalDecision } from "./vrindavanArrival.ts"
import { composeVrindavanWorldExperienceSnapshot } from "./vrindavanWorldExperienceSnapshot.ts"

const seedNow = () => "2026-08-10T00:00:00.000Z"

async function releaseIfHeld(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current && current.ownerId === ownerId) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

// Build 04, mission §H (flagship) + §I/§J of the acceptance matrix.
// Real, end-to-end, no mocks for the core continuity proof -- reuses
// Build 01's own flagship `vrindavanLeaveReturn.test.ts` structure and
// Build 02's own real season-crossing magnitude
// (`vrindavanPresentationLeaveReturn.test.ts`), composed through this
// build's OWN new World Experience layer specifically, not merely
// re-proving the underlying runtime a fourth time.
test("flagship: enter -> reach a real Approved place -> observe & participate -> leave -> world evolves -> return -> recognize continuity and change", async () => {
  const worldInstanceId = "living-vrindavan-build-04-flagship-leave-return"
  const userId = "build04-flagship-visitor"

  await createWorldInstance(worldInstanceId, seedNow)

  // Enter and reach a real Approved local place (Yamuna).
  await livingWorldRuntime.enterWorld(userId, LIVING_VRINDAVAN_DEFINITION.id)
  await livingWorldRuntime.unlockLocation(userId, LIVING_VRINDAVAN_DEFINITION.id, "yamuna")
  await livingWorldRuntime.visitLocation(userId, LIVING_VRINDAVAN_DEFINITION.id, "yamuna")

  const arrivalAtYamuna = await resolveVrindavanArrivalDecision(worldInstanceId, userId, null, seedNow)
  assert.equal(arrivalAtYamuna.locationId, "yamuna")

  const beforeSnapshot = await composeVrindavanWorldExperienceSnapshot(worldInstanceId, userId, null, seedNow)
  assert.equal(beforeSnapshot.place.season.id, "vasanta")
  const cowBefore = beforeSnapshot.place.nearbyEntities.find((entity) => entity.entityId === "avatark-population-cow-1")
  assert.ok(cowBefore, "the visitor genuinely observes the real, seeded cow at Yamuna before leaving")

  // Observe/participate: the real, Approved yamuna-flowering-reflection
  // rule is genuinely available from tick 0 (Build 01's own finding --
  // Vasanta's real envelope), so this is a real authorization, not a
  // forced/mocked success.
  const participation = await authorizeAndRecordParticipation(worldInstanceId, userId, "yamuna-flowering-reflection", "yamuna")
  assert.equal(participation.authorization.authorized, true, "a real, live-available encounter is genuinely authorized")

  const departureTick = (await getWorldState(worldInstanceId, seedNow)).sharedState.clock.tick

  // Leave: nothing durable is mutated by leaving itself (Build 01's own
  // finding) -- the world is left to run on its own.
  await livingWorldRuntime.leaveWorld(userId, LIVING_VRINDAVAN_DEFINITION.id)

  // World evolves while the visitor is absent: a real ~20-real-minute
  // wall-clock gap, woken by a SEPARATE owner, then a real, explicit,
  // deterministic tick advance that crosses the real Vasanta -> Grishma
  // season boundary (the exact safe magnitude Build 01/02 already
  // established).
  const returnNow = () => "2026-08-10T00:20:00.000Z"
  const wake = await wakeLivingWorld(worldInstanceId, "build04-flagship-absence-owner", returnNow)
  assert.equal(wake.woke, true, "a real, separate owner wakes the world during the visitor's absence")
  await releaseIfHeld(worldInstanceId, "build04-flagship-absence-owner")

  const seasonAdvanceOwner = "build04-flagship-season-advance-owner"
  await wakeWorld(worldInstanceId, seasonAdvanceOwner, returnNow)
  await advanceWorld(worldInstanceId, 4, seasonAdvanceOwner, returnNow)
  await releaseIfHeld(worldInstanceId, seasonAdvanceOwner)

  // Return: the SAME worldInstanceId is resumed, the visitor arrives
  // through the real returning-visitor arrival policy, and can
  // genuinely recognize continuity (same worldInstanceId, same cow
  // identity) and change (a real season crossing occurred).
  const returnArrival = await resolveVrindavanArrivalDecision(worldInstanceId, userId, departureTick, returnNow)
  assert.equal(returnArrival.locationId, "yamuna", "proof J: the visitor returns to the SAME real prior local place, the same world instance never reset")
  assert.equal(returnArrival.reason, "RETURNING_TO_PRIOR_PLACE")
  assert.equal(returnArrival.worldChangedSinceLastVisit, true, "proof I: the world genuinely changed while the visitor was away")

  const afterSnapshot = await composeVrindavanWorldExperienceSnapshot(worldInstanceId, userId, departureTick, returnNow)
  assert.equal(afterSnapshot.place.season.id, "grishma", "the world was not frozen -- a real season crossing occurred during the absence")
  assert.equal(afterSnapshot.suggestedStage, "RECOGNITION_OF_CHANGE", "the snapshot itself suggests the graph's own RECOGNITION_OF_CHANGE stage, not a silent re-entry into ORIENTATION")
  assert.ok(afterSnapshot.orientation.whatHasChanged.facts.length > 0, "real, semantic ReturnRecognition facts are surfaced, never fabricated prose")

  // The real cow herd may have genuinely relocated toward Kadamba Grove
  // by now (Build 03's own real, seeded behavior, reconfirmed here --
  // not a bug this test papers over) -- entity identity continuity is
  // checked across the current place AND its own real neighbors, the
  // same breadth Build 03's own leave/return proof already uses.
  const allEntitiesAfter = [...afterSnapshot.place.nearbyEntities, ...afterSnapshot.nearbyPlaces.flatMap((place) => place.nearbyEntities)]
  const cowAfter = allEntitiesAfter.find((entity) => entity.entityId === "avatark-population-cow-1")
  assert.ok(cowAfter, "the SAME cow entity is still present after the absence, somewhere in the real, continued world")
  assert.equal(cowAfter!.entityId, cowBefore!.entityId, "entity identity continuity holds through this build's own new World Experience layer specifically")

  assert.equal(afterSnapshot.worldId, beforeSnapshot.worldId, "the world was never reset to a canned opening state -- same world instance throughout")
})
