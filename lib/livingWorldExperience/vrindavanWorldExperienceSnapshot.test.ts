import { test } from "node:test"
import assert from "node:assert/strict"
import { translateToUnrealCommands } from "@avatark/world-embodiment-runtime"
import { createWorldInstance } from "../livingWorldHost/hostService.ts"
import { recordPrivateReflection } from "../privateReflection/hostService.ts"
import { composeVrindavanWorldExperienceSnapshot } from "./vrindavanWorldExperienceSnapshot.ts"

const seedNow = () => "2026-08-10T00:00:00.000Z"

// Proof L: determinism. Two identical reads of the fully composed
// World Experience Snapshot, for a visitor with no durable footprint of
// their own between the two calls, are byte-identical -- the same
// method Build 02's own `vrindavanPresentationDeterminism.test.ts`
// already established, extended through this build's own new
// composition layer.
test("proof L: two identical reads of the World Experience Snapshot are byte-identical", async () => {
  const worldInstanceId = "living-vrindavan-build-04-snapshot-determinism"
  await createWorldInstance(worldInstanceId, seedNow)

  const first = await composeVrindavanWorldExperienceSnapshot(worldInstanceId, "build04-snapshot-visitor-determinism", null, seedNow)
  const second = await composeVrindavanWorldExperienceSnapshot(worldInstanceId, "build04-snapshot-visitor-determinism", null, seedNow)
  assert.deepEqual(first, second)
})

// Proof N: Unreal snapshot/translation compatibility. The EXACT,
// unmodified `translateToUnrealCommands` (Sprint 8/10) accepts the
// embedded `embodiment` field and returns real, non-empty commands --
// the same proof Build 02's own proof J already established, now for
// this build's OWN aggregate snapshot's embedded embodiment, not a
// second translator.
test("proof N: the existing, unmodified Unreal command translator accepts the embedded embodiment snapshot", async () => {
  const worldInstanceId = "living-vrindavan-build-04-snapshot-unreal"
  await createWorldInstance(worldInstanceId, seedNow)

  const snapshot = await composeVrindavanWorldExperienceSnapshot(worldInstanceId, "build04-snapshot-visitor-unreal", null, seedNow)
  const commands = translateToUnrealCommands(snapshot.embodiment)
  assert.ok(commands.length > 0, "the real, unmodified translator produces real, non-empty commands from this build's own embedded embodiment snapshot")
})

// Proof K: visitor privacy isolation. Two different visitors' own
// private reflections/visitor-scoped counts never leak into each
// other's snapshot, and the shared world-truth fields (place, season,
// population) stay identical for both -- the same world, two
// privacy-isolated views.
test("proof K: two visitors' own private content never leaks into each other's snapshot; shared world truth stays identical", async () => {
  const worldInstanceId = "living-vrindavan-build-04-snapshot-privacy"
  await createWorldInstance(worldInstanceId, seedNow)

  await recordPrivateReflection(worldInstanceId, "build04-snapshot-visitor-a", "yamuna", "reflection-a", "visitor A's own private content")

  const snapshotA = await composeVrindavanWorldExperienceSnapshot(worldInstanceId, "build04-snapshot-visitor-a", null, seedNow)
  const snapshotB = await composeVrindavanWorldExperienceSnapshot(worldInstanceId, "build04-snapshot-visitor-b", null, seedNow)

  const serializedB = JSON.stringify(snapshotB)
  assert.ok(!serializedB.includes("visitor A's own private content"), "visitor A's private reflection content never appears anywhere in visitor B's own snapshot")
  assert.notEqual(snapshotA.userId, snapshotB.userId)

  assert.equal(snapshotA.place.worldId, snapshotB.place.worldId)
  assert.equal(snapshotA.place.season.id, snapshotB.place.season.id)
  assert.deepEqual(snapshotA.place.nearbyEntities, snapshotB.place.nearbyEntities, "the shared, real population is the same real population for both visitors")
})
