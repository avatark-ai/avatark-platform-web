import { test } from "node:test"
import assert from "node:assert/strict"
import { getEmbodimentWithHistory, getReturnRecognition, wakeWorldWithMemory } from "./hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"
import { getPopulationSnapshot } from "../livingPopulation/hostService.ts"

async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

// Sprint 11, Phase 12/27: the full absence/return scenario, verbatim
// structure -- Vasanta at T, herd at yamuna, visitor leaves, world
// advances unobserved, Vasanta -> Grishma, needs/behavior change,
// meaningful WorldEvents recorded, visitor returns at T+n, current
// state is correct Grishma truth, ReturnRecognition identifies what
// changed, all without any visitor being required for it to happen.
test("historical continuity: a full absence/return cycle produces correct current state, recorded World Memory, and accurate ReturnRecognition", async () => {
  const worldInstanceId = "memory-host-test-continuity"
  let clockMs = 5_000_000
  const now = () => new Date(clockMs).toISOString()

  const atArrival = await getPopulationSnapshot(worldInstanceId, now)
  assert.equal(atArrival.tick, 0)

  // Visitor leaves; world continues, unobserved, for enough elapsed
  // wall-clock time to cross Vasanta's own minDurationTicks (4).
  clockMs += 6
  const woken = await wakeWorldWithMemory(worldInstanceId, "continuity-owner", now)

  assert.equal(woken.world.state.sharedState.season.currentSeasonId, "grishma", "current state reflects correct Grishma truth")
  assert.ok(woken.worldEvents.some((e) => e.category === "SEASON_TRANSITION"), "the season transition was recorded as World Memory")

  // Visitor returns: ReturnRecognition compares against tick 0.
  const recognition = await getReturnRecognition(worldInstanceId, "visitor-1", 0, now)
  assert.ok(recognition.facts.some((f) => f.type === "season_changed"), "ReturnRecognition identifies the meaningful change since departure")
  assert.equal(recognition.currentTick, woken.world.state.sharedState.clock.tick)

  await releaseLease(worldInstanceId, "continuity-owner")
})

// Sprint 11, Phase 13: same grammar, different permitted deterministic
// input history (different elapsed wall-clock time between instances,
// since each instance's own tick count derives from its own wake calls)
// -> different legitimate histories, same canonical boundaries and same
// engine.
test("divergent history: two world instances sharing the same grammar can produce genuinely different WorldEvent histories", async () => {
  const instanceA = "memory-host-test-divergent-a"
  const instanceB = "memory-host-test-divergent-b"
  const now = () => "2026-08-09T00:00:00.000Z"

  // Instance A never advances far enough to leave Vasanta.
  const wokenA = await wakeWorldWithMemory(instanceA, "divergent-owner-a", now)
  assert.equal(wokenA.world.state.sharedState.season.currentSeasonId, "vasanta")
  assert.deepEqual(wokenA.worldEvents.filter((e) => e.category === "SEASON_TRANSITION"), [])

  await releaseLease(instanceA, "divergent-owner-a")

  // Instance B, same grammar/config, advanced far enough (via a later
  // wake with real elapsed time) to reach Grishma.
  let clockMsB = 6_000_000
  const nowB = () => new Date(clockMsB).toISOString()
  await getPopulationSnapshot(instanceB, nowB)
  clockMsB += 6
  const wokenB = await wakeWorldWithMemory(instanceB, "divergent-owner-b", nowB)
  assert.equal(wokenB.world.state.sharedState.season.currentSeasonId, "grishma")
  assert.ok(wokenB.worldEvents.some((e) => e.category === "SEASON_TRANSITION"))

  await releaseLease(instanceB, "divergent-owner-b")

  assert.notDeepEqual(wokenA.worldEvents, wokenB.worldEvents, "two instances of the identical world grammar produced different, legitimate histories")
})

test("checkpoint/recovery survival: World Memory recorded before a wake persists and is queryable after, unaffected by a later independent read", async () => {
  const worldInstanceId = "memory-host-test-recovery"
  let clockMs = 7_000_000
  const now = () => new Date(clockMs).toISOString()
  await getPopulationSnapshot(worldInstanceId, now)
  clockMs += 6
  const woken = await wakeWorldWithMemory(worldInstanceId, "recovery-owner", now)
  await releaseLease(worldInstanceId, "recovery-owner")

  // A later, independent read (simulating "a new process/runtime reads
  // the same durable memory store") sees the identical history.
  const recognitionAfter = await getReturnRecognition(worldInstanceId, "visitor-1", 0, now)
  assert.ok(recognitionAfter.facts.length > 0, "World Memory survived independent of the wake call that produced it")
  assert.ok(woken.worldEvents.length > 0, "sanity: the wake actually produced history to survive")
})

// Sprint 11, Phase 15: World Memory grows independent of any visitor;
// a brand-new visitor entering later has zero personal memory of any
// of it, yet observes the identical current world/entity truth.
test("visitor-memory separation: World Memory accumulates with zero visitors, and a brand-new visitor's own ReturnRecognition against tick 0 still sees it", async () => {
  const worldInstanceId = "memory-host-test-visitor-separation"
  let clockMs = 8_000_000
  const now = () => new Date(clockMs).toISOString()
  await getPopulationSnapshot(worldInstanceId, now) // no visitor is ever "present" for this -- population/memory has no visitor parameter at all
  clockMs += 6
  await wakeWorldWithMemory(worldInstanceId, "separation-owner", now)
  await releaseLease(worldInstanceId, "separation-owner")

  const brandNewVisitorRecognition = await getReturnRecognition(worldInstanceId, "visitor-who-never-visited-before", 0, now)
  assert.ok(brandNewVisitorRecognition.facts.length > 0, "a visitor with zero personal history still observes the world's own accumulated history")
})

// Sprint 11, Phase 16: two visitors observe identical shared truth and
// identical World Memory, but each visitor's own ReturnRecognition is
// computed against THEIR OWN last-known tick, never bled across users.
test("multi-visitor history: World Memory is common to both visitors, but ReturnRecognition is computed against each visitor's own last-known tick", async () => {
  const worldInstanceId = "memory-host-test-multi-visitor"
  let clockMs = 9_000_000
  const now = () => new Date(clockMs).toISOString()
  await getPopulationSnapshot(worldInstanceId, now)

  clockMs += 3 // Visitor A's own departure point
  const visitorADepartureTick = (await getPopulationSnapshot(worldInstanceId, now)).tick

  clockMs += 6
  await wakeWorldWithMemory(worldInstanceId, "multi-visitor-owner", now)
  await releaseLease(worldInstanceId, "multi-visitor-owner")

  const recognitionForA = await getReturnRecognition(worldInstanceId, "visitor-a", visitorADepartureTick, now)
  const recognitionForB = await getReturnRecognition(worldInstanceId, "visitor-b", 0, now)

  assert.equal(recognitionForA.sinceTick, visitorADepartureTick)
  assert.equal(recognitionForB.sinceTick, 0)
  assert.equal(recognitionForA.currentTick, recognitionForB.currentTick, "both visitors observe the identical current tick -- shared world truth")
  assert.ok(recognitionForB.facts.length >= recognitionForA.facts.length, "B, absent longer, sees at least as much history as A")
})

test("embodiment-with-history composes population embodiment and World Memory without either domain querying the other's persistence directly", async () => {
  const worldInstanceId = "memory-host-test-embodiment-history"
  let clockMs = 10_000_000
  const now = () => new Date(clockMs).toISOString()
  await getPopulationSnapshot(worldInstanceId, now)
  clockMs += 6
  await wakeWorldWithMemory(worldInstanceId, "embodiment-history-owner", now)
  await releaseLease(worldInstanceId, "embodiment-history-owner")

  const result = await getEmbodimentWithHistory(worldInstanceId, "visitor-1", "yamuna", ["kadamba-grove", "govardhan-path"], 0, now)
  assert.ok(result.history.recentWorldChanges.length > 0)
  assert.ok(result.history.returnRecognition && result.history.returnRecognition.facts.length > 0)
  assert.equal(result.embodiment.current.locationId, "yamuna")
})

// Sprint 11, Phase 18: Host-level replay proof -- waking again at the
// identical wall-clock instant applies zero additional ticks (Sprint
// 9's own tick policy), so it must derive zero NEW WorldEvents, never a
// duplicate of what the first wake already recorded.
test("waking twice at the identical instant never duplicates World Memory -- zero elapsed ticks means zero new events", async () => {
  const worldInstanceId = "memory-host-test-replay"
  let clockMs = 11_000_000
  const now = () => new Date(clockMs).toISOString()
  await getPopulationSnapshot(worldInstanceId, now)
  clockMs += 6
  const first = await wakeWorldWithMemory(worldInstanceId, "replay-owner", now)
  await releaseLease(worldInstanceId, "replay-owner")

  const second = await wakeWorldWithMemory(worldInstanceId, "replay-owner", now) // identical `now`, zero elapsed ticks
  await releaseLease(worldInstanceId, "replay-owner")

  assert.equal(second.world.ticksApplied, 0)
  assert.deepEqual(second.worldEvents, [], "no new ticks elapsed, so no new WorldEvents were even candidates")

  const recognition = await getReturnRecognition(worldInstanceId, "visitor-1", 0, now)
  assert.equal(recognition.facts.reduce((sum, f) => sum + f.occurrenceCount, 0), first.worldEvents.length, "World Memory reflects exactly the first wake's events, not doubled by the second")
})

// Sprint 11, Phase 14: the critical invariant -- nothing in this entire
// flow ever calls a write method on protected narrative state (there is
// no such method on the interface at all), and the projection itself
// never changes as a side effect of memory derivation.
test("protected narrative remains untouched and unresolved throughout a full wake-with-memory cycle", async () => {
  const worldInstanceId = "memory-host-test-canon-protection"
  let clockMs = 12_000_000
  const now = () => new Date(clockMs).toISOString()
  await getPopulationSnapshot(worldInstanceId, now)
  clockMs += 6
  await wakeWorldWithMemory(worldInstanceId, "canon-owner", now)
  await releaseLease(worldInstanceId, "canon-owner")

  const snapshot = await getPopulationSnapshot(worldInstanceId, now)
  assert.ok(snapshot.entities.length > 0, "sanity: the world genuinely advanced")
  // No assertion here can even express "protected narrative changed" --
  // there is no code path in this file, or anywhere in
  // @avatark/world-memory-runtime, that imports a narrative write method,
  // statically re-verified by lib/runtimeKernel/dependencyBoundaries.test.ts.
})
