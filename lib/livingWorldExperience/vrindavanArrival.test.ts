import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveArrivalDecision } from "@avatark/world-experience-runtime"
import { livingWorldRuntime } from "../livingWorldRuntime/singleton.ts"
import { LIVING_VRINDAVAN_DEFINITION } from "../livingWorldRuntime/vrindavanDefinition.ts"
import { createWorldInstance } from "../livingWorldHost/hostService.ts"
import { resolveVrindavanArrivalDecision } from "./vrindavanArrival.ts"

const seedNow = () => "2026-08-10T00:00:00.000Z"

// Build 04, mission §D, acceptance proof A: a visitor who has never
// entered this world instance before materializes at the real,
// Approved `vrindavan-entry` -- the same location Build 01's own Phase
// Q already proved, now reached through a real, explicit, named
// arrival DECISION rather than a bare fallback chain.
test("proof A: first-ever visit materializes at the real Approved entry location", async () => {
  const worldInstanceId = "living-vrindavan-build-04-arrival-first-visit"
  await createWorldInstance(worldInstanceId, seedNow)

  const decision = await resolveVrindavanArrivalDecision(worldInstanceId, "build04-arrival-visitor-first", null, seedNow)
  assert.deepEqual(decision, {
    locationId: "vrindavan-entry",
    reason: "FIRST_EVER_VISIT",
    isFirstEverVisit: true,
    priorLocationId: null,
    worldChangedSinceLastVisit: false,
  })
})

// Proof B/C: a visitor who previously navigated to a real, Approved
// location and left returns to THAT location, not back to the entry --
// the real `WorldRuntime` (Sprint 1-7) singleton's own `currentLocationId`
// is genuine visitor position memory, not a fixture.
test("proofs B/C: a returning visitor is placed back at their own real, valid prior local place", async () => {
  const worldInstanceId = "living-vrindavan-build-04-arrival-returning"
  const userId = "build04-arrival-visitor-returning"
  await createWorldInstance(worldInstanceId, seedNow)

  await livingWorldRuntime.enterWorld(userId, LIVING_VRINDAVAN_DEFINITION.id)
  await livingWorldRuntime.unlockLocation(userId, LIVING_VRINDAVAN_DEFINITION.id, "yamuna")
  await livingWorldRuntime.visitLocation(userId, LIVING_VRINDAVAN_DEFINITION.id, "yamuna")
  await livingWorldRuntime.leaveWorld(userId, LIVING_VRINDAVAN_DEFINITION.id)

  const decision = await resolveVrindavanArrivalDecision(worldInstanceId, userId, null, seedNow)
  assert.equal(decision.locationId, "yamuna")
  assert.equal(decision.reason, "RETURNING_TO_PRIOR_PLACE")
  assert.equal(decision.isFirstEverVisit, false)
  assert.equal(decision.priorLocationId, "yamuna")
})

// Proof D: a stale/no-longer-known prior location falls back to entry,
// distinctly reasoned. Living Vrindavan's own real, closed 4-location
// grammar gives a visitor no organic way to end up with a genuinely
// unknown `currentLocationId` (WorldRuntime validates every location it
// ever stores against the real definition) -- this is an honest,
// structural fact about the current content, not something Build 04
// papers over. The SAME mechanism Vrindavan's own arrival wiring calls
// (`resolveArrivalDecision`) is proven directly against a deliberately
// stale location instead, the identical proof
// `arrivalDecision.test.ts` already gives at the generic-package level,
// reconfirmed here against Vrindavan's own real, closed location set.
test("proof D: the same arrival mechanism Vrindavan calls correctly falls back on a stale prior location, using Vrindavan's own real known-location set", () => {
  const decision = resolveArrivalDecision({
    entryLocationId: LIVING_VRINDAVAN_DEFINITION.entryLocationId,
    priorLocationId: "a-decommissioned-vrindavan-location",
    knownLocationIds: LIVING_VRINDAVAN_DEFINITION.locations.map((location) => location.id),
    canonDirectedLocationIds: [],
    worldChangedSinceLastVisit: false,
  })
  assert.equal(decision.locationId, "vrindavan-entry")
  assert.equal(decision.reason, "STALE_PRIOR_LOCATION_FALLBACK")
})

test("proof G (partial): worldChangedSinceLastVisit is honestly false when no sinceTick is supplied -- never guessed", async () => {
  const worldInstanceId = "living-vrindavan-build-04-arrival-no-sincetick"
  const userId = "build04-arrival-visitor-no-sincetick"
  await createWorldInstance(worldInstanceId, seedNow)
  await livingWorldRuntime.enterWorld(userId, LIVING_VRINDAVAN_DEFINITION.id)
  await livingWorldRuntime.leaveWorld(userId, LIVING_VRINDAVAN_DEFINITION.id)

  const decision = await resolveVrindavanArrivalDecision(worldInstanceId, userId, null, seedNow)
  assert.equal(decision.worldChangedSinceLastVisit, false)
})
