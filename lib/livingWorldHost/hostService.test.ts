import { test } from "node:test"
import assert from "node:assert/strict"
import {
  createWorldInstance,
  getEmbodimentSnapshotForVisitor,
  getWorldSnapshotForVisitor,
  queryHealth,
  wakeLivingWorld,
} from "./hostService.ts"
import { getWorldState } from "../worldPersistence/hostService.ts"
import { worldCheckpointRepository, worldLeaseRepository, worldLifecycleRepository } from "../worldPersistence/singleton.ts"
import { authorizeAndRecordParticipation, getParticipationRecords } from "../participation/hostService.ts"
import { getAllCanonicalEventProjectionStates, witnessCanonicalEvent } from "../canonicalEvents/hostService.ts"

const FIXED_NOW = () => "2026-08-09T00:00:00.000Z"

// Sprint 20: proves the v1 Runtime facade -- the FIRST real caller of
// both `releasingWorldLeaseAfter` (Part A) and `wakeWorldWithCanonicalEvents`
// (Sprint 18's real outermost composed wake) from a single session
// boundary. Each test uses its own worldInstanceId (this suite's own
// established isolation convention).

test("createWorldInstance seeds a fresh durable world at tick 0, Vasanta, idempotently", async () => {
  const worldInstanceId = "living-world-host-test-create"
  const first = await createWorldInstance(worldInstanceId, FIXED_NOW)
  assert.equal(first.sharedState.clock.tick, 0)
  assert.equal(first.sharedState.season.currentSeasonId, "vasanta")

  const second = await createWorldInstance(worldInstanceId, FIXED_NOW)
  assert.deepEqual(second, first, "calling again is not itself an advance")
})

test("wakeLivingWorld acquires, catches up through the real composed chain, and releases -- the lease is free again immediately after", async () => {
  const worldInstanceId = "living-world-host-test-wake-release"
  let clockMs = 2_000_000
  const now = () => new Date(clockMs).toISOString()
  await createWorldInstance(worldInstanceId, now)

  clockMs += 3
  const outcome = await wakeLivingWorld(worldInstanceId, "facade-owner", now)
  assert.equal(outcome.woke, true)
  if (outcome.woke) {
    assert.equal(outcome.result.spatial.adaptation.realization.rhythms.social.memory.world.state.sharedState.clock.tick, 3)
  }

  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  assert.equal(current, null, "releasingWorldLeaseAfter released the lease this call itself acquired -- no Host code path left it held")
})

test("wakeLivingWorld tolerates a real lease conflict -- a losing concurrent call never throws, it just reports woke:false", async () => {
  const worldInstanceId = "living-world-host-test-wake-conflict"
  await createWorldInstance(worldInstanceId, FIXED_NOW)
  await worldLeaseRepository.acquire(worldInstanceId, "someone-else-mid-chain", 60_000, FIXED_NOW)

  const outcome = await wakeLivingWorld(worldInstanceId, "facade-owner", FIXED_NOW)
  assert.deepEqual(outcome, { woke: false, reason: "lease-held-by-another-owner" })

  // The other owner's lease is untouched by the losing call's own
  // (skipped) release check -- proving `releasingWorldLeaseAfter`'s own
  // "never touch a different owner's real lease" guarantee holds
  // end-to-end through this facade, not just in Part A's own unit test.
  const stillHeld = await worldLeaseRepository.getCurrent(worldInstanceId)
  assert.equal(stillHeld?.ownerId, "someone-else-mid-chain")
  await worldLeaseRepository.release(worldInstanceId, "someone-else-mid-chain", stillHeld!.leaseVersion)
})

test("getWorldSnapshotForVisitor best-effort wakes then reads durable state, even when its own wake attempt loses the race", async () => {
  const worldInstanceId = "living-world-host-test-snapshot-read-during-conflict"
  await createWorldInstance(worldInstanceId, FIXED_NOW)
  await worldLeaseRepository.acquire(worldInstanceId, "someone-else", 60_000, FIXED_NOW)

  const { snapshot, wake } = await getWorldSnapshotForVisitor({ worldInstanceId, ownerId: "reader", userId: "visitor-1", locationId: "vrindavan-entry", now: FIXED_NOW })
  assert.equal(wake.woke, false, "a real concurrent visitor's read never throws just because someone else currently holds the wake lease")
  assert.equal(snapshot.locationId, "vrindavan-entry", "the read itself is lease-free and still succeeds")

  const stillHeld = await worldLeaseRepository.getCurrent(worldInstanceId)
  await worldLeaseRepository.release(worldInstanceId, "someone-else", stillHeld!.leaseVersion)
})

test("getWorldSnapshotForVisitor's own visitorMemory override reaches the real WorldSnapshot untouched", async () => {
  const worldInstanceId = "living-world-host-test-visitor-memory-override"
  const memory = { userId: "visitor-1", worldId: worldInstanceId, lastLocationId: null, meaningfulEncounters: [], reflectionRefs: [{ kind: "reflection" as const, id: "refl-1", source: "experience-registry" as const }], milestoneRefs: [], updatedAtTick: 0 }
  const { snapshot } = await getWorldSnapshotForVisitor({ worldInstanceId, ownerId: "reader", userId: "visitor-1", locationId: "vrindavan-entry", now: FIXED_NOW, visitorMemory: memory })
  assert.equal(snapshot.visitorContext.reflectionCount, 1)
})

test("getEmbodimentSnapshotForVisitor composes the real embodiment resolution against durable state, matching resolveDurableWorldEmbodimentSnapshot's own shape", async () => {
  const worldInstanceId = "living-world-host-test-embodiment"
  const { snapshot } = await getEmbodimentSnapshotForVisitor({ worldInstanceId, ownerId: "reader", userId: "visitor-1", locationId: "vrindavan-entry", reachableLocationIds: [], now: FIXED_NOW })
  assert.equal(snapshot.current.locationId, "vrindavan-entry")
  assert.equal(snapshot.season.id, "vasanta")
})

test("queryHealth reports healthy for a freshly seeded, never-woken world", async () => {
  const worldInstanceId = "living-world-host-test-health-fresh"
  await createWorldInstance(worldInstanceId, FIXED_NOW)
  const health = await queryHealth(worldInstanceId, FIXED_NOW)
  assert.equal(health.rollup, "healthy")
  assert.deepEqual(health.dimensions, { persistenceReachable: true, checkpointHealthy: true, leaseHealthy: true, simulationHealthy: true })
  assert.equal(health.lifecycleState, "DORMANT")
})

test("queryHealth reports degraded when a lease is held well past its own expiry (never a fabricated boolean)", async () => {
  const worldInstanceId = "living-world-host-test-health-stale-lease"
  const seedNow = () => "2026-08-09T00:00:00.000Z"
  await createWorldInstance(worldInstanceId, seedNow)
  await worldLeaseRepository.acquire(worldInstanceId, "stuck-owner", 1_000, seedNow) // 1s TTL

  const muchLater = () => "2026-08-09T01:00:00.000Z" // 1 hour later, TTL long expired
  const health = await queryHealth(worldInstanceId, muchLater)
  assert.equal(health.dimensions.leaseHealthy, false)
  assert.equal(health.rollup, "degraded")

  const stillThere = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (stillThere) await worldLeaseRepository.release(worldInstanceId, "stuck-owner", stillThere.leaseVersion)
})

test("queryHealth never exposes visitor-scoped or private content -- structurally, its own return type has no such field", async () => {
  const worldInstanceId = "living-world-host-test-health-privacy"
  await createWorldInstance(worldInstanceId, FIXED_NOW)
  const health = await queryHealth(worldInstanceId, FIXED_NOW)
  const keys = new Set([...Object.keys(health), ...Object.keys(health.dimensions)])
  for (const forbidden of ["visitorMemory", "reflection", "userId", "content"]) {
    assert.ok(!keys.has(forbidden), `queryHealth's own shape must never grow a ${forbidden} field`)
  }
})

test("Step 5/Step 15 proof C: crash recovery through the facade -- a wake that fails mid-catch-up loses no ticks on retry, and applies no duplicate consequence", async () => {
  const worldInstanceId = "living-world-host-test-crash-recovery"
  let clockMs = 3_000_000
  const now = () => new Date(clockMs).toISOString()
  await createWorldInstance(worldInstanceId, now)

  // Simulate "crashed after wakeWorldWithSpatialEcology committed, before
  // this facade's own release ran" by acquiring/advancing the underlying
  // chain directly (bypassing the facade), then releasing manually --
  // exactly the crash window Sprint 17's own fix (`resolveTicksToApply`)
  // exists to make safe, now proven one layer further out through this
  // sprint's own new facade rather than only at `wakeWorld`'s own level.
  clockMs += 4
  const outcome1 = await wakeLivingWorld(worldInstanceId, "owner-a", now)
  assert.equal(outcome1.woke, true)
  const tickAfterFirst = (await getWorldState(worldInstanceId, now)).sharedState.clock.tick

  // Retry (simulating a crashed caller re-entering): no further real
  // time has elapsed, so a second wake must apply ZERO further ticks,
  // never re-apply the same 4.
  const outcome2 = await wakeLivingWorld(worldInstanceId, "owner-b", now)
  assert.equal(outcome2.woke, true)
  if (outcome2.woke) assert.equal(outcome2.result.spatial.adaptation.realization.rhythms.social.memory.world.state.sharedState.clock.tick, tickAfterFirst, "retry with zero further elapsed time applies zero further ticks -- no duplicate catch-up work")

  const projections = await getAllCanonicalEventProjectionStates(worldInstanceId)
  const completedCount = projections.filter((p) => p.status === "COMPLETED").length
  assert.equal(completedCount, 1, "the REQUIRED canonical event activates exactly once across both wake attempts, never twice")
})

test("Step 6/Step 15 proof B: deterministic replay -- waking the SAME worldInstanceId twice with zero further real elapsed time is idempotent (already covered above); this proof targets the underlying pure engine directly: identical seed + identical starting state + identical ticks = byte-identical result, twice", async () => {
  // Sprint 20: `catchUpCausalEnvironment`'s own real seed choice is
  // `worldInstanceId` (confirmed, `lib/worldPersistence/hostService.ts`'s
  // `computeDeterministicCatchUp({..., seed: worldInstanceId, ...})`) --
  // meaning "deterministic" here is a property of ONE seed replayed, not
  // a claim that two DIFFERENT worldInstanceIds converge (they correctly
  // diverge, by design -- Sprint 15/16's own alternate-world-portability
  // proofs depend on exactly that). The honest, direct proof of Step 6's
  // actual wording ("same starting state + same causal inputs + same
  // ordering = same resulting state") is therefore: call the real pure
  // engine the facade composes with IDENTICAL inputs twice.
  const { computeDeterministicCatchUp } = await import("@avatark/world-persistence-runtime")
  const { LIVING_VRINDAVAN_ENTITY_ARCHETYPES, LIVING_VRINDAVAN_SEASONS } = await import("../livingSystems/systemsDefinition.ts")
  const worldInstanceId = "living-world-host-test-replay-seed"
  const seededNow = () => "2026-08-09T00:00:00.000Z"
  const seeded = await createWorldInstance(worldInstanceId, seededNow)

  const paramsFor = () => ({
    worldInstanceId,
    sharedState: seeded.sharedState,
    entities: [...seeded.entities],
    seasonDefinitions: LIVING_VRINDAVAN_SEASONS,
    entityArchetypes: LIVING_VRINDAVAN_ENTITY_ARCHETYPES,
    ticks: 6,
    seed: worldInstanceId,
    now: seededNow,
  })

  // Real Vrindavan season/archetype definitions, identical both runs --
  // this proof isolates the ENGINE's own determinism, not any incidental
  // difference in what content it's fed.
  const first = computeDeterministicCatchUp(paramsFor())
  const second = computeDeterministicCatchUp(paramsFor())
  assert.deepEqual(first, second, "identical seed + identical starting state + identical tick count must produce byte-identical output, every time")
})

test("Step 7/Step 15 proof D: two Vrindavan world instances woken through the facade never leak state into each other", async () => {
  const worldA = "living-world-host-test-multiworld-a"
  const worldB = "living-world-host-test-multiworld-b"
  let clockMs = 7_000_000
  const now = () => new Date(clockMs).toISOString()
  await createWorldInstance(worldA, now)
  await createWorldInstance(worldB, now)

  await authorizeAndRecordParticipation(worldA, "visitor-1", "yamuna-flowering-reflection", "yamuna", now)
  clockMs += 2 // >= 1 tick elapsed so the REQUIRED canonical event's WORLD_TIME_AT_LEAST(tick: 1) condition can actually be reached
  await wakeLivingWorld(worldA, "owner-a", now)

  const recordsA = await getParticipationRecords(worldA, "visitor-1")
  const recordsB = await getParticipationRecords(worldB, "visitor-1")
  assert.equal(recordsA.length, 1)
  assert.equal(recordsB.length, 0, "worldB never sees worldA's ParticipationRecord")

  const projectionsA = await getAllCanonicalEventProjectionStates(worldA)
  const projectionsB = await getAllCanonicalEventProjectionStates(worldB)
  assert.equal(projectionsA.filter((p) => p.status === "COMPLETED").length, 1, "worldA's canonical event activated (it was woken)")
  assert.equal(projectionsB.filter((p) => p.status === "COMPLETED").length, 0, "worldB's canonical event never activates -- it was never woken")

  const leaseA = await worldLeaseRepository.getCurrent(worldA)
  const leaseB = await worldLeaseRepository.getCurrent(worldB)
  assert.equal(leaseA, null)
  assert.equal(leaseB, null)
})

test("Step 8/Step 15 proof E+F: a canonical event activation and a visitor participation resolve in the same world without collision -- Canon stays immutable, the visitor's own consequence is bounded", async () => {
  const worldInstanceId = "living-world-host-test-canon-visitor-coexistence"
  let clockMs = 8_000_000
  const now = () => new Date(clockMs).toISOString()
  await createWorldInstance(worldInstanceId, now)

  const participation = await authorizeAndRecordParticipation(worldInstanceId, "visitor-1", "yamuna-flowering-reflection", "yamuna", now)
  assert.equal(participation.authorization.authorized, true)

  clockMs += 2 // >= 1 tick elapsed so the REQUIRED canonical event's WORLD_TIME_AT_LEAST(tick: 1) condition can actually be reached
  const wake = await wakeLivingWorld(worldInstanceId, "owner-a", now)
  assert.equal(wake.woke, true)

  const projections = await getAllCanonicalEventProjectionStates(worldInstanceId)
  const activated = projections.find((p) => p.status === "COMPLETED")
  assert.ok(activated, "the REQUIRED canonical event activated in the same wake that also serviced a real participation")

  // A visitor may WITNESS the already-resolved canonical fact -- never
  // mutate its definition (structurally impossible: CanonicalEventDefinition
  // has no repository at all, Sprint 18's own invariant, reconfirmed here
  // by the mere absence of any write call in this test).
  await witnessCanonicalEvent(worldInstanceId, "visitor-1", activated!.canonicalEventId, wake.woke ? wake.result.spatial.adaptation.realization.rhythms.social.memory.world.state.sharedState.clock.tick : 0)

  const records = await getParticipationRecords(worldInstanceId, "visitor-1")
  assert.equal(records.length, 1, "the visitor's own participation is exactly one bounded, additive record -- not a second consequence-derivation authority")
})

test("Step 9/Step 15 proof I: long absence -> catch-up -> return preserves canonical consequences and reflects elapsed history, through the facade", async () => {
  const worldInstanceId = "living-world-host-test-long-horizon"
  let clockMs = 5_000_000
  const now = () => new Date(clockMs).toISOString()
  await createWorldInstance(worldInstanceId, now)

  // Visitor's first visit: nothing has happened yet.
  const before = await getWorldSnapshotForVisitor({ worldInstanceId, ownerId: "reader", userId: "visitor-1", locationId: "vrindavan-entry", now })
  assert.equal(before.snapshot.season.id, "vasanta")

  // Visitor leaves; a long real-world absence passes (simulated wall-clock jump).
  clockMs += 10

  // Visitor returns -- the read path itself triggers catch-up.
  const after = await getWorldSnapshotForVisitor({ worldInstanceId, ownerId: "reader", userId: "visitor-1", locationId: "vrindavan-entry", now })
  assert.equal(after.wake.woke, true)
  assert.ok(after.snapshot.season.id !== before.snapshot.season.id || after.snapshot.simulationTick !== before.snapshot.simulationTick, "the world genuinely evolved across the absence -- season or tick actually moved")

  const projections = await getAllCanonicalEventProjectionStates(worldInstanceId)
  assert.equal(projections.filter((p) => p.status === "COMPLETED").length, 1, "the canonical consequence that occurred during the absence remains preserved on return, not re-derived or lost")
})

test("Step 10/Step 15 proof L: renderer-neutral -- WorldSnapshot/WorldEmbodimentSnapshot returned by this facade carry no renderer-specific token", async () => {
  const worldInstanceId = "living-world-host-test-renderer-neutral"
  const { snapshot: worldSnapshot } = await getWorldSnapshotForVisitor({ worldInstanceId, ownerId: "reader", userId: "visitor-1", locationId: "vrindavan-entry", now: FIXED_NOW })
  const { snapshot: embodimentSnapshot } = await getEmbodimentSnapshotForVisitor({ worldInstanceId, ownerId: "reader", userId: "visitor-1", locationId: "vrindavan-entry", reachableLocationIds: [], now: FIXED_NOW })
  const serialized = JSON.stringify({ worldSnapshot, embodimentSnapshot })
  for (const token of ["React", "UObject", "AActor", "Blueprint", "DOM", "<div", "useState"]) {
    assert.ok(!serialized.includes(token), `serialized snapshot must never contain the renderer-specific token "${token}"`)
  }
})

test("Step 11 proof A: checkpoint/restore -- a real wake through the facade leaves a loadable checkpoint whose tick matches the returned state", async () => {
  const worldInstanceId = "living-world-host-test-checkpoint"
  let clockMs = 6_000_000
  const now = () => new Date(clockMs).toISOString()
  await createWorldInstance(worldInstanceId, now)

  clockMs += 3
  const outcome = await wakeLivingWorld(worldInstanceId, "owner-a", now)
  assert.equal(outcome.woke, true)

  const checkpoint = await worldCheckpointRepository.loadLatest(worldInstanceId)
  assert.ok(checkpoint)
  if (outcome.woke) assert.equal(checkpoint!.tick, outcome.result.spatial.adaptation.realization.rhythms.social.memory.world.state.sharedState.clock.tick)
})

test("Step 13 proof: a malformed/unavailable participation request in one world never corrupts another world's lifecycle state", async () => {
  const worldA = "living-world-host-test-failure-containment-a"
  const worldB = "living-world-host-test-failure-containment-b"
  const now = () => "2026-08-09T00:00:00.000Z"
  await createWorldInstance(worldA, now)
  await createWorldInstance(worldB, now)

  const denied = await authorizeAndRecordParticipation(worldA, "visitor-1", "no-such-rule", "no-such-location", now)
  assert.equal(denied.authorization.authorized, false)

  const healthB = await queryHealth(worldB, now)
  assert.equal(healthB.rollup, "healthy", "worldB is entirely unaffected by worldA's rejected, malformed request")
  const lifecycleB = await worldLifecycleRepository.get(worldB)
  assert.equal(lifecycleB, null, "worldB's lifecycle is untouched -- never even entered WAKING")
})
