import { test } from "node:test"
import assert from "node:assert/strict"
import { getEmbodimentWithRhythms, getGroupRoutineIntent, getPlaceOccupancy, getResourceOpportunities, getSocialInteractionOpportunities, wakeWorldWithRhythms } from "./hostService.ts"
import { placeRhythmRepository } from "./singleton.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"
import { COW_ARCHETYPE_ID } from "../livingPopulation/vrindavanPopulationDefinition.ts"

async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

// Sprint 13, Phase 2/6: the world-shared day phase is resolved purely
// from `tick` (a fresh world starts at tick 0, which the schedule's own
// DAWN entry claims) -- distinct from any archetype's own asynchronous
// RhythmPhase, the same category of shared truth as SeasonState (see
// docs/SPRINT13_GROUND_TRUTH.md's decision 1).
test("wakeWorldWithRhythms resolves the world-shared day phase from tick", async () => {
  const worldInstanceId = "living-rhythms-host-test-dayphase"
  const now = () => "2026-08-09T00:00:00.000Z"

  const result = await wakeWorldWithRhythms(worldInstanceId, "dayphase-owner", now)
  await releaseLease(worldInstanceId, "dayphase-owner")

  assert.equal(result.dayPhase, "DAWN", "a fresh world at tick 0 resolves to the schedule's own zero-fraction entry")
})

// Sprint 13, Phase 9: reconstructed fresh from the live population
// snapshot -- both seeded cows are present at yamuna after the first
// wake.
test("getPlaceOccupancy reflects the live population present at a location", async () => {
  const worldInstanceId = "living-rhythms-host-test-occupancy"
  const now = () => "2026-08-09T00:00:00.000Z"

  await wakeWorldWithRhythms(worldInstanceId, "occupancy-owner", now)
  await releaseLease(worldInstanceId, "occupancy-owner")

  const occupancy = await getPlaceOccupancy(worldInstanceId, "yamuna", now)
  assert.deepEqual(new Set(occupancy.presentEntityIds), new Set([`${COW_ARCHETYPE_ID}-1`, `${COW_ARCHETYPE_ID}-2`]))
  assert.equal(occupancy.entityCountsByArchetype[COW_ARCHETYPE_ID], 2)
})

// Sprint 13, Phase 10: waking twice at the identical instant (zero
// elapsed ticks) must never double-count a PlaceRhythmProfile
// observation -- the same idempotent-replay discipline every prior
// sprint's own evidence accrual already holds.
test("PlaceRhythmProfile accumulates across repeated wakes without double-counting a same-instant replay", async () => {
  const worldInstanceId = "living-rhythms-host-test-place-rhythm"
  const now = () => "2026-08-09T00:00:00.000Z"

  await wakeWorldWithRhythms(worldInstanceId, "rhythm-owner", now)
  await releaseLease(worldInstanceId, "rhythm-owner")
  await wakeWorldWithRhythms(worldInstanceId, "rhythm-owner", now)
  await releaseLease(worldInstanceId, "rhythm-owner")

  const profile = await placeRhythmRepository.get(worldInstanceId, "yamuna")
  assert.ok(profile)
  const totalObservations = profile.counts.reduce((sum, c) => sum + c.observationCount, 0)
  assert.equal(totalObservations, 1, "a same-instant replay (zero elapsed ticks) must not record a second observation")
})

// Sprint 13, Phase 7: a Host-composed read over the seeded cow herd's
// own current member activities -- never a write back into GroupState.
test("getGroupRoutineIntent composes a deterministic intent from the live group's own member activities", async () => {
  const worldInstanceId = "living-rhythms-host-test-group-routine"
  const now = () => "2026-08-09T00:00:00.000Z"

  await wakeWorldWithRhythms(worldInstanceId, "group-routine-owner", now)
  await releaseLease(worldInstanceId, "group-routine-owner")

  const intent = await getGroupRoutineIntent(worldInstanceId, "avatark-population-cow-herd", now)
  assert.equal(intent.groupId, "avatark-population-cow-herd")
  assert.ok(["REST_TOGETHER", "MOVE_TO_RESOURCE", "DISPERSE", "GATHER", "FOLLOW_ROUTE", "OCCUPY_PLACE"].includes(intent.intent))
})

// Sprint 13, Phase 4: resolved fresh from current environment state --
// "gathering" carries no environmental gate (see resourceOpportunityResolution.ts),
// so it is always available regardless of season/weather.
test("getResourceOpportunities composes the Vrindavan resource affordances against current environment state", async () => {
  const worldInstanceId = "living-rhythms-host-test-resource-opportunity"
  const now = () => "2026-08-09T00:00:00.000Z"

  await wakeWorldWithRhythms(worldInstanceId, "resource-owner", now)
  await releaseLease(worldInstanceId, "resource-owner")

  const opportunities = await getResourceOpportunities(worldInstanceId, now)
  assert.ok(opportunities.some((o) => o.locationId === "yamuna" && o.category === "water"))
  assert.ok(opportunities.some((o) => o.locationId === "kadamba-grove" && o.category === "rest"))
  assert.ok(opportunities.some((o) => o.locationId === "govardhan-path" && o.category === "corridor"))
  assert.equal(opportunities.find((o) => o.locationId === "govardhan-path" && o.category === "gathering")?.available, true)
})

// Sprint 13, Phase 11: reuses Sprint 12's own seeded parent/offspring
// relationship directly -- both cows start co-located with a WEAK band,
// which resolves to "remain_near" (see socialInteractionResolution.ts).
test("getSocialInteractionOpportunities composes Sprint 12's own relationship/co-location facts into a closed semantic category", async () => {
  const worldInstanceId = "living-rhythms-host-test-social-interaction"
  const now = () => "2026-08-09T00:00:00.000Z"

  await wakeWorldWithRhythms(worldInstanceId, "social-interaction-owner", now)
  await releaseLease(worldInstanceId, "social-interaction-owner")

  const opportunities = await getSocialInteractionOpportunities(worldInstanceId, now)
  assert.equal(opportunities.length, 1)
  assert.equal(opportunities[0].category, "remain_near", "the seeded parent/offspring relationship starts WEAK-banded and co-located")
  assert.equal(opportunities[0].locationId, "yamuna")
})

// Sprint 13, Phase 5: Host-level composition ONLY, one layer above
// Sprint 12's own WorldEmbodimentSnapshotWithSocialEcology -- never a
// fourth widening of @avatark/world-embodiment-contracts.
test("getEmbodimentWithRhythms composes population/social embodiment with a location-scoped rhythms summary without widening the embodiment contract", async () => {
  const worldInstanceId = "living-rhythms-host-test-embodiment"
  const now = () => "2026-08-09T00:00:00.000Z"

  await wakeWorldWithRhythms(worldInstanceId, "embodiment-owner", now)
  await releaseLease(worldInstanceId, "embodiment-owner")

  const result = await getEmbodimentWithRhythms(worldInstanceId, "visitor-1", "yamuna", ["kadamba-grove", "govardhan-path"], 0, now)
  assert.equal(result.embodimentWithSocialEcology.embodimentWithHistory.embodiment.current.locationId, "yamuna")
  assert.equal(result.rhythms.dayPhase, "DAWN")
  assert.deepEqual(new Set(result.rhythms.placeOccupancy.presentEntityIds), new Set([`${COW_ARCHETYPE_ID}-1`, `${COW_ARCHETYPE_ID}-2`]))
  assert.ok(result.rhythms.resourceOpportunities.every((o) => o.locationId === "yamuna"), "resource opportunities are scoped to the requested location only")
})
