import { test } from "node:test"
import assert from "node:assert/strict"
import { getEmbodimentWithSocialEcology, getSocialPerception, wakeWorldWithSocialEcology } from "./hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"
import { populationEntityStateRepository } from "../livingPopulation/singleton.ts"
import { COW_ARCHETYPE_ID } from "../livingPopulation/vrindavanPopulationDefinition.ts"
import { separationRepository } from "./singleton.ts"
import { getEmergentEncounterOpportunities } from "../worldMemory/hostService.ts"

async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

// Sprint 12, Phase 4/9: the first wake seeds the parent/offspring
// relationship (and its own group/home-range fixtures) exactly once,
// and the two seeded cows start co-located -- no separation, one tick
// of co-presence evidence, matching Sprint 10's own seed locations.
test("first wake seeds the parent/offspring relationship and produces no separation while the herd stays together", async () => {
  const worldInstanceId = "social-ecology-host-test-seed"
  const now = () => "2026-08-09T00:00:00.000Z"

  const result = await wakeWorldWithSocialEcology(worldInstanceId, "seed-owner", now)
  await releaseLease(worldInstanceId, "seed-owner")

  assert.equal(result.relationships.length, 1)
  assert.equal(result.relationships[0].relationshipType, "PARENT_OFFSPRING")
  assert.equal(result.relationships[0].evidence.coPresenceTicks, 1, "both seeded cows start co-located at yamuna")
  assert.deepEqual(result.activeSeparations, [])

  // Waking a second time at the identical instant is a no-op catch-up
  // (zero elapsed ticks) -- evidence must not double-count.
  const second = await wakeWorldWithSocialEcology(worldInstanceId, "seed-owner", now)
  await releaseLease(worldInstanceId, "seed-owner")
  assert.equal(second.memory.world.ticksApplied, 0)
  assert.equal(second.relationships[0].evidence.coPresenceTicks, 1, "no additional co-presence evidence accrues when zero ticks actually elapsed")
})

// Sprint 12, Phase 9/10/12: a real location divergence between the two
// related cows -- forced directly on the population repository (never
// through the emergent engine) so the scenario is deterministic --
// must be detected purely from a before/after comparison, recorded as
// an active SeparationState, and surfaced as MEANINGFUL World Memory.
test("separation: forcing the offspring away from its co-located parent is detected and recorded as World Memory", async () => {
  const worldInstanceId = "social-ecology-host-test-separation"
  const now = () => "2026-08-09T00:00:00.000Z"

  await wakeWorldWithSocialEcology(worldInstanceId, "sep-owner", now)
  await releaseLease(worldInstanceId, "sep-owner")

  const offspringId = `${COW_ARCHETYPE_ID}-2`
  const entities = await populationEntityStateRepository.list(worldInstanceId)
  const offspring = entities.find((e) => e.id === offspringId)
  assert.ok(offspring)
  await populationEntityStateRepository.save(worldInstanceId, { ...offspring, locationId: "kadamba-grove" })

  // Identical `now` as the seed wake -- zero elapsed ticks, so the
  // simulation itself cannot move the offspring back before detection
  // runs; the forced divergence survives untouched into the check.
  const separated = await wakeWorldWithSocialEcology(worldInstanceId, "sep-owner", now)
  await releaseLease(worldInstanceId, "sep-owner")

  assert.equal(separated.memory.world.ticksApplied, 0, "sanity: zero elapsed ticks, the simulation did not move the offspring")
  // Two distinct active separations: the offspring is separated both
  // FROM its parent (a RELATIONSHIP subject) and from its own
  // (unmoved) group's location (a GROUP_MEMBERSHIP subject) -- the
  // generic subjectType discriminator covers both without collision.
  assert.equal(separated.activeSeparations.length, 2)
  assert.ok(separated.activeSeparations.every((s) => s.entityId === offspringId))
  assert.deepEqual(new Set(separated.activeSeparations.map((s) => s.subjectType)), new Set(["RELATIONSHIP", "GROUP_MEMBERSHIP"]))
  assert.ok(separated.socialWorldEvents.some((e) => e.category === "SEPARATION_OCCURRED"), "the separation was recorded as World Memory")

  const relationship = separated.relationships.find((r) => r.relationshipType === "PARENT_OFFSPRING")
  assert.ok(relationship)
  assert.equal(relationship.evidence.coPresenceTicks, 1, "co-presence evidence does not accumulate further while separated")
})

// Sprint 12, Phase 9/10/12: a pre-existing active separation whose
// subject is once again co-located resolves to a ReunionEvent -- set
// up directly on the repository (the runtime's own evaluateSeparationTransition
// math is already exhaustively unit-tested in
// packages/social-ecology-runtime) so this test proves only the Host
// layer's own wiring: repository -> transition -> World Memory.
test("reunion: an existing active separation whose subject is co-located again resolves as a meaningful World Memory reunion", async () => {
  const worldInstanceId = "social-ecology-host-test-reunion"
  let clockMs = 13_000_000
  const now = () => new Date(clockMs).toISOString()

  await wakeWorldWithSocialEcology(worldInstanceId, "reunion-owner", now)
  await releaseLease(worldInstanceId, "reunion-owner")

  // Advance real elapsed ticks so the fabricated separation below has
  // a genuine, meaningful (>= 2 tick) duration to resolve against --
  // a fresh world starts at tick 0, so "5 ticks ago" only means
  // anything once the world has actually lived past tick 5.
  clockMs += 6
  const seeded = await wakeWorldWithSocialEcology(worldInstanceId, "reunion-owner", now)
  await releaseLease(worldInstanceId, "reunion-owner")
  const currentTick = seeded.memory.world.state.sharedState.clock.tick
  assert.ok(currentTick >= 5, "sanity: the world advanced far enough for the fabricated separation below to be genuinely old")
  const relationship = seeded.relationships[0]

  await separationRepository.save({
    id: "forced-separation-for-reunion-test",
    worldId: worldInstanceId,
    subjectType: "RELATIONSHIP",
    subjectId: relationship.id,
    entityId: relationship.entityBId,
    separatedSinceTick: currentTick - 5,
    active: true,
    resolvedAtTick: null,
  })

  // Both cows remain untouched at their shared seed location -- from
  // the repository's perspective, the next wake observes "was
  // separated, is no longer."
  const reunited = await wakeWorldWithSocialEcology(worldInstanceId, "reunion-owner", now)
  await releaseLease(worldInstanceId, "reunion-owner")

  assert.deepEqual(reunited.activeSeparations, [])
  const reunionEvent = reunited.socialWorldEvents.find((e) => e.category === "REUNION_OCCURRED")
  assert.ok(reunionEvent, "a reunion of meaningful duration (>= 2 ticks) was recorded as World Memory")
})

// Sprint 12, Phase 8: getSocialPerception's own bounded facts, resolved
// entirely from already-authoritative relationship/group/home-range
// state.
test("getSocialPerception surfaces the seeded relationship, group co-presence, and home-range facts for one entity", async () => {
  const worldInstanceId = "social-ecology-host-test-perception"
  const now = () => "2026-08-09T00:00:00.000Z"
  await wakeWorldWithSocialEcology(worldInstanceId, "perception-owner", now)
  await releaseLease(worldInstanceId, "perception-owner")

  const perception = await getSocialPerception(worldInstanceId, `${COW_ARCHETYPE_ID}-1`, now)
  assert.equal(perception.entityId, `${COW_ARCHETYPE_ID}-1`)
  assert.ok(perception.relationships.some((r) => r.otherEntityId === `${COW_ARCHETYPE_ID}-2` && r.relationshipType === "PARENT_OFFSPRING"))
  assert.deepEqual(perception.nearbyKnownEntityIds, [`${COW_ARCHETYPE_ID}-2`])
  assert.equal(perception.withinHomeRange, true, "the herd starts at its own home range's preferred location")
  assert.equal(perception.separationActive, false)
})

// Sprint 12, Phase 16: two visitors observing the same world instance
// see identical social-ecology truth -- relationships/separations are
// systemic world facts, never a per-visitor projection (there is no
// visitor parameter anywhere in this module's own read path).
test("multi-visitor: relationship and separation state is common shared world truth, not scoped to any one visitor", async () => {
  const worldInstanceId = "social-ecology-host-test-multi-visitor"
  const now = () => "2026-08-09T00:00:00.000Z"

  await wakeWorldWithSocialEcology(worldInstanceId, "multi-visitor-owner", now)
  await releaseLease(worldInstanceId, "multi-visitor-owner")

  const perceptionAsSeenAlongsideVisitorA = await getSocialPerception(worldInstanceId, `${COW_ARCHETYPE_ID}-1`, now)
  const perceptionAsSeenAlongsideVisitorB = await getSocialPerception(worldInstanceId, `${COW_ARCHETYPE_ID}-1`, now)
  assert.deepEqual(perceptionAsSeenAlongsideVisitorA, perceptionAsSeenAlongsideVisitorB, "no visitor identity is ever threaded through social-ecology facts")
})

// Sprint 12, Phase 21: reunion feeds the SAME existing generic
// emergent-encounter mechanism (Sprint 11's own
// resolveEmergentEncounterOpportunities, read via
// getEmergentEncounterOpportunities) -- zero new engine, just a new
// rule definition (vrindavanMemoryDefinition.ts) plus events appended
// to the SAME worldEventRepository social ecology already writes to.
test("emergent encounters: a recorded reunion surfaces the existing generic emergent-encounter mechanism's new social rule", async () => {
  const worldInstanceId = "social-ecology-host-test-emergent-encounter"
  let clockMs = 14_000_000
  const now = () => new Date(clockMs).toISOString()

  await wakeWorldWithSocialEcology(worldInstanceId, "emergent-owner", now)
  await releaseLease(worldInstanceId, "emergent-owner")

  clockMs += 6
  const seeded = await wakeWorldWithSocialEcology(worldInstanceId, "emergent-owner", now)
  await releaseLease(worldInstanceId, "emergent-owner")
  const currentTick = seeded.memory.world.state.sharedState.clock.tick
  assert.ok(currentTick >= 5)
  const relationship = seeded.relationships[0]

  await separationRepository.save({
    id: "forced-separation-for-emergent-encounter-test",
    worldId: worldInstanceId,
    subjectType: "RELATIONSHIP",
    subjectId: relationship.id,
    entityId: relationship.entityBId,
    separatedSinceTick: currentTick - 5,
    active: true,
    resolvedAtTick: null,
  })

  const reunited = await wakeWorldWithSocialEcology(worldInstanceId, "emergent-owner", now)
  await releaseLease(worldInstanceId, "emergent-owner")
  const reunionEvent = reunited.socialWorldEvents.find((e) => e.category === "REUNION_OCCURRED")
  assert.ok(reunionEvent, "sanity: the reunion was actually recorded")

  const opportunities = await getEmergentEncounterOpportunities(worldInstanceId, now)
  assert.ok(
    opportunities.some((o) => o.ruleId === "avatark-social-recent-reunion-kadamba-grove" && o.locationId === reunionEvent.locationId),
    "the social reunion rule surfaced an emergent opportunity at the reunion's own recorded location",
  )
})

// Sprint 12, Phase 24/25: Host-level embodiment composition -- the
// parent/offspring relationship, co-located at their shared seed
// location, is visible in the location-scoped social summary without
// any change to @avatark/world-embodiment-contracts itself.
test("getEmbodimentWithSocialEcology composes population embodiment, World Memory history, and location-scoped social facts without widening the embodiment contract", async () => {
  const worldInstanceId = "social-ecology-host-test-embodiment"
  const now = () => "2026-08-09T00:00:00.000Z"
  await wakeWorldWithSocialEcology(worldInstanceId, "embodiment-owner", now)
  await releaseLease(worldInstanceId, "embodiment-owner")

  const result = await getEmbodimentWithSocialEcology(worldInstanceId, "visitor-1", "yamuna", ["kadamba-grove", "govardhan-path"], 0, now)
  assert.equal(result.embodimentWithHistory.embodiment.current.locationId, "yamuna")
  assert.equal(result.social.locationId, "yamuna")
  assert.ok(result.social.relationshipsPresent.some((r) => r.relationshipType === "PARENT_OFFSPRING"), "both seeded cows are co-located at yamuna, so their relationship is visible here")
  assert.deepEqual(result.social.activeSeparationsVisible, [])
})
