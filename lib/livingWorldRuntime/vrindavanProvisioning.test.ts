import { test } from "node:test"
import assert from "node:assert/strict"
import { createWorldInstance, wakeLivingWorld, queryHealth } from "../livingWorldHost/hostService.ts"
import { worldCheckpointRepository, worldLeaseRepository } from "../worldPersistence/singleton.ts"
import { LIVING_VRINDAVAN_BUILD_MANIFEST } from "./vrindavanBuildManifest.ts"

const FIXED_NOW = () => "2026-08-09T00:00:00.000Z"
// A real wake that elapses zero wall-clock time from creation correctly
// produces NO checkpoint (`catchUpCausalEnvironment` only saves one when
// `ticksElapsed > 0`, per Sprint 9's own design) -- so the wake in this
// test deliberately happens a few seconds after provisioning, exactly
// as a real visitor's first request would.
const WAKE_NOW = () => "2026-08-09T00:00:05.000Z"

// Living Vrindavan Build 01, Phase B: proves the real chain --
// Living Vrindavan definition -> approved artifact ingestion (already
// enforced at module load by every vrindavanXDefinition.ts file's own
// verifyArtifactIngestion call) -> world instance creation (Sprint 20's
// real createWorldInstance) -> worldInstanceId -> initial durable state
// -> initial checkpoint (Sprint 20's real wakeLivingWorld, the first
// caller that both wakes and safely releases) -> READY/DORMANT,
// inspectable state -- using the real Sprint 20 v1 facade, no parallel
// provisioning path.
async function releaseIfHeld(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current && current.ownerId === ownerId) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

test("Living Vrindavan Build 01: a real worldInstanceId provisions to a deterministic, inspectable READY/DORMANT state", async () => {
  const worldInstanceId = "living-vrindavan-build-01-provisioning"

  const initial = await createWorldInstance(worldInstanceId, FIXED_NOW)
  assert.equal(initial.sharedState.clock.tick, 0)
  assert.equal(initial.sharedState.season.currentSeasonId, LIVING_VRINDAVAN_BUILD_MANIFEST.initialSeason.id, "provisioned instance starts in the manifest's own declared initial season")

  const healthBeforeWake = await queryHealth(worldInstanceId, FIXED_NOW)
  assert.equal(healthBeforeWake.lifecycleState, "DORMANT", "a created-but-never-woken instance is legitimately DORMANT, not unhealthy")
  assert.equal(healthBeforeWake.rollup, "healthy")

  const wake = await wakeLivingWorld(worldInstanceId, "build-01-provisioning-test", WAKE_NOW)
  assert.equal(wake.woke, true)
  await releaseIfHeld(worldInstanceId, "build-01-provisioning-test")

  // "Which exact StudioK artifact/version produced this instance?" --
  // answerable directly from the real build manifest (Phase A),
  // composed from the same checksum-verified vendor pins every
  // vrindavanXDefinition.ts already enforces at import time.
  const { world, systems } = LIVING_VRINDAVAN_BUILD_MANIFEST.studioKArtifactProvenance
  assert.equal(world.specStatus, "Approved")
  assert.equal(systems.specStatus, "Approved")

  // "Which runtime version is executing it?" -- the manifest's own
  // declared runtime-compatibility version (Sprint 20's own honest
  // substitute until a real WorldRuntimeManifest version field exists).
  assert.equal(LIVING_VRINDAVAN_BUILD_MANIFEST.runtimeCompatibilityVersion, "0.1.0")

  // "What is its current checkpoint?" -- a real, loadable checkpoint
  // now exists after the one real wake above.
  const checkpoint = await worldCheckpointRepository.loadLatest(worldInstanceId)
  assert.ok(checkpoint, "a checkpoint must exist after a real wake")
  assert.equal(checkpoint!.worldInstanceId, worldInstanceId)
  assert.equal(checkpoint!.tick, 5_000, "5 real elapsed seconds at this environment's own 1-tick-per-ms reference rate -- a real, inspectable checkpoint tick, not fabricated")

  const healthAfterWake = await queryHealth(worldInstanceId, WAKE_NOW)
  assert.equal(healthAfterWake.rollup, "healthy")
  assert.notEqual(healthAfterWake.lifecycleState, "WAKING", "the lease was released -- the instance is not stuck mid-wake")
})

test("Living Vrindavan Build 01: provisioning the same worldInstanceId twice is idempotent, never a second world", async () => {
  const worldInstanceId = "living-vrindavan-build-01-provisioning-idempotent"
  const first = await createWorldInstance(worldInstanceId, FIXED_NOW)
  const second = await createWorldInstance(worldInstanceId, FIXED_NOW)
  assert.deepEqual(first, second)
})
