import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveVisitContinuity } from "./visitTransitionContinuity.ts"
import { wakeWorldWithMemory } from "./hostService.ts"
import { getPopulationSnapshot } from "../livingPopulation/hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"
import type { CanonicalVisitTransition } from "@avatark/narrative-ir-adapter"

async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

// R07 -- Return/Revisit Continuity Bridge. Same real Living Vrindavan
// absence/return grammar as ./hostService.test.ts's own "historical
// continuity" test (Vasanta -> Grishma, a real recorded WorldEvent, a real
// getReturnRecognition() call) -- reused, not re-invented -- now driven
// through a canonical VisitTransition (schemas/ir/v0/visit-transition.schema.json,
// IR 0.3.0) instead of a bare caller-supplied sinceTick alone. Canonical
// document shapes mirror packages/narrative-ir-adapter/test/fixtures/r07-living-vrindavan-*.json
// (same repository evidence, no new canon invented).

// Required Proof 9 (recognized): FIRST_ENTRY never calls
// world-memory-runtime -- there is no prior visit to recognize by
// construction, not because of any special-cased fallback here.
test("R07: FIRST_ENTRY VisitTransition yields a not-recognized result and never calls getReturnRecognition", async () => {
  const worldId = "r07-visit-continuity-first-entry"
  const userId = "r07-visitor-first-entry"
  const transition: CanonicalVisitTransition = { kind: "FIRST_ENTRY" }

  const result = await resolveVisitContinuity(worldId, userId, transition, null)

  assert.equal(result.recognized, false)
  assert.equal(result.reason, "first_entry")
  assert.equal(result.returnRecognition, null)
  assert.deepStrictEqual(result.visitContext, { kind: "first_entry", visitOrdinal: null, relationshipDepth: null })
})

// Required Proof 9 (recognized), Required Proofs 5/6/7 (visitor/world/place
// identity + chronology preserved): a real absence/return cycle, real
// season transition recorded as World Memory, canonical RETURN transition
// (visitOrdinal 2) correctly drives the SAME getReturnRecognition() this
// package already certified in Sprint 11 -- not reimplemented here.
test("R07: RETURN VisitTransition with a real continuity record is recognized against real World Memory (Vasanta -> Grishma)", async () => {
  const worldId = "r07-visit-continuity-return-recognized"
  const userId = "r07-visitor-2"
  let clockMs = 5_100_000
  const now = () => new Date(clockMs).toISOString()

  const atArrival = await getPopulationSnapshot(worldId, now)
  assert.equal(atArrival.tick, 0, "visitor's first visit departs at tick 0 -- this is the host's own continuity record")

  clockMs += 6
  const woken = await wakeWorldWithMemory(worldId, "r07-continuity-owner", now)
  assert.ok(woken.worldEvents.some((e) => e.category === "SEASON_TRANSITION"), "a real, meaningful World Memory event was recorded during the absence")

  const transition: CanonicalVisitTransition = { kind: "RETURN", visitOrdinal: 2, relationshipDepth: 1 }
  const result = await resolveVisitContinuity(worldId, userId, transition, 0, now)

  assert.equal(result.recognized, true)
  assert.equal(result.reason, "return_recognized")
  assert.deepStrictEqual(result.visitContext, { kind: "return", visitOrdinal: 2, relationshipDepth: 1 })
  assert.ok(result.returnRecognition, "a real ReturnRecognition value was produced, not null")
  assert.equal(result.returnRecognition!.worldId, worldId, "world identity preserved end to end")
  assert.equal(result.returnRecognition!.userId, userId, "visitor identity preserved end to end")
  assert.equal(result.returnRecognition!.sinceTick, 0, "chronology preserved: the visitor's own departure tick, not fabricated")
  assert.equal(result.returnRecognition!.currentTick, woken.world.state.sharedState.clock.tick, "chronology preserved: current tick matches the real, independently-observed world clock")
  assert.ok(result.returnRecognition!.facts.some((f) => f.type === "season_changed"), "the real recorded season change is surfaced as recognition, never fabricated prose")

  await releaseLease(worldId, "r07-continuity-owner")
})

// Required Proof 9 (not-recognized), an honest failure mode: the canonical
// narrative signals RETURN, but the host has no continuity record to
// substantiate it -- never silently treated as a FIRST_ENTRY, never a
// fabricated recognition.
test("R07: RETURN VisitTransition without a host continuity record is not recognized, distinctly from FIRST_ENTRY", async () => {
  const worldId = "r07-visit-continuity-return-no-record"
  const userId = "r07-visitor-no-record"
  const transition: CanonicalVisitTransition = { kind: "RETURN", visitOrdinal: 3, relationshipDepth: 2 }

  const result = await resolveVisitContinuity(worldId, userId, transition, null)

  assert.equal(result.recognized, false)
  assert.equal(result.reason, "return_claimed_without_continuity_record")
  assert.equal(result.returnRecognition, null)
  assert.notEqual(result.reason, "first_entry", "a claimed RETURN without a record is a distinct outcome from a genuine FIRST_ENTRY")
  assert.deepStrictEqual(result.visitContext, { kind: "return", visitOrdinal: 3, relationshipDepth: 2 })
})

// Required Proof 8: deterministic for identical history -- two independent
// resolveVisitContinuity() calls against the same, unmodified world state
// and the same canonical transition produce byte-identical results.
test("R07: recognition is deterministic for identical history", async () => {
  const worldId = "r07-visit-continuity-determinism"
  const userId = "r07-visitor-determinism"
  let clockMs = 5_200_000
  const now = () => new Date(clockMs).toISOString()

  await getPopulationSnapshot(worldId, now)
  clockMs += 6
  await wakeWorldWithMemory(worldId, "r07-determinism-owner", now)
  await releaseLease(worldId, "r07-determinism-owner")

  const transition: CanonicalVisitTransition = { kind: "RETURN", visitOrdinal: 2 }
  const first = await resolveVisitContinuity(worldId, userId, transition, 0, now)
  const second = await resolveVisitContinuity(worldId, userId, transition, 0, now)

  assert.deepStrictEqual(first, second)
})
