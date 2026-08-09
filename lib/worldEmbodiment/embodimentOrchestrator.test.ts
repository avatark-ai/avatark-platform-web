import { test } from "node:test"
import assert from "node:assert/strict"
import { createWorldRuntime, InMemoryWorldStateRepository } from "@avatark/living-world-runtime"
import { LIVING_VRINDAVAN_DEFINITION } from "../livingWorldRuntime/vrindavanDefinition.ts"
import { resolveWorldEmbodimentSnapshot } from "./embodimentOrchestrator.ts"
import { advanceWorld, wakeWorld } from "../worldPersistence/hostService.ts"
import { WORLD_ID } from "../livingSystems/singleton.ts"

// Sprint 20, §Step B: rewritten against the durable, worldInstanceId-
// scoped family this module now reads (was Sprint 7's singleton,
// resetLivingSystemsSingletonForTests/advanceLivingSystemsSimulation).
// Each test uses its own worldInstanceId -- the SAME isolation
// convention lib/worldPersistence/hostService.test.ts's own top-of-file
// comment already establishes ("these Host-level module singletons are
// process-lifetime... tests isolate themselves by identity"). Every
// real, user-visible claim these tests made before this rewrite is
// preserved unchanged -- only the mechanism proving it moved.

function freshWorldRuntime() {
  return createWorldRuntime({ definitions: [LIVING_VRINDAVAN_DEFINITION], repository: new InMemoryWorldStateRepository() })
}

test("a fresh visitor's embodiment snapshot shows Vasanta at the entry location, with no reachable regions yet", async () => {
  // Sprint 20: a FIXED `now` is required here, not incidental style --
  // the durable family's wake advances ticks proportional to REAL
  // elapsed wall-clock ms between seed and wake (`DEFAULT_TICK_POLICY`,
  // 1 tick/ms), and this seed's own Vasanta season is only 4 ticks long
  // (`hostService.test.ts`'s own "advanceWorld ... 4 ... grishma"
  // precedent) -- ordinary async scheduling overhead between this
  // call's internal seed and its internal wake is easily >4ms of REAL
  // time, which would otherwise flakily cross a season boundary before
  // the assertion below ever runs. The old singleton never had this
  // failure mode (Sprint 7 only advanced ticks on an explicit call);
  // this is a genuine behavioral difference the durable migration
  // introduces, not a test artifact to work around silently.
  const now = () => "2026-08-09T00:00:00.000Z"
  const runtime = freshWorldRuntime()
  await runtime.enterWorld("u1", "living-vrindavan")

  const snapshot = await resolveWorldEmbodimentSnapshot({ userId: "u1", locationId: "vrindavan-entry", livingWorldRuntime: runtime, worldInstanceId: "embodiment-orchestrator-test-fresh", now })
  assert.equal(snapshot.season.id, "vasanta")
  assert.equal(snapshot.current.locationId, "vrindavan-entry")
  assert.equal(snapshot.current.environment.atmosphere.semantic, "arrival")
})

test("after visiting Yamuna, the embodiment's reachable regions include both branches with 'branching-choice' transitions", async () => {
  const now = () => "2026-08-09T00:00:00.000Z" // see the fixed-`now` comment above -- same reason
  const runtime = freshWorldRuntime()
  await runtime.enterWorld("u2", "living-vrindavan")
  await runtime.unlockLocation("u2", "living-vrindavan", "yamuna")
  await runtime.visitLocation("u2", "living-vrindavan", "yamuna")

  // Real, discovered constraint (Sprint 20): `findTransitionAffordance`
  // (Sprint 6's own experience catalog, unchanged) keys
  // `EXPERIENCE_DESCRIPTIONS` by the LITERAL worldId string
  // "living-vrindavan" -- transition-affordance content is genuinely
  // Vrindavan-specific authored content, not a per-instance concern, so
  // this is the one field in this file that legitimately needs
  // `worldInstanceId === WORLD_ID` rather than a synthetic per-test id.
  // Confirmed safe: no other test file in this suite uses `WORLD_ID` as
  // a durable `worldInstanceId` (grepped), so this does not collide with
  // this file's own per-test isolation for every other assertion.
  const snapshot = await resolveWorldEmbodimentSnapshot({ userId: "u2", locationId: "yamuna", livingWorldRuntime: runtime, worldInstanceId: WORLD_ID, now })
  const reachableIds = snapshot.reachable.map((r) => r.locationId).sort()
  assert.deepEqual(reachableIds, ["govardhan-path", "kadamba-grove"])
  assert.ok(snapshot.transitions.every((t) => t.affordance === "branching-choice"))
})

test("Phase 16/18/Sprint 20: leave, advance the shared durable world to Grishma, return -- same visitor continuity, genuinely different embodiment", async () => {
  const worldInstanceId = "embodiment-orchestrator-test-season-advance"
  const now = () => "2026-08-09T00:00:00.000Z"
  const runtime = freshWorldRuntime()
  await runtime.enterWorld("u3", "living-vrindavan")
  await runtime.unlockLocation("u3", "living-vrindavan", "yamuna")
  await runtime.visitLocation("u3", "living-vrindavan", "yamuna")

  const before = await resolveWorldEmbodimentSnapshot({ userId: "u3", locationId: "yamuna", livingWorldRuntime: runtime, worldInstanceId, now })
  assert.equal(before.season.id, "vasanta")

  await runtime.leaveWorld("u3", "living-vrindavan")
  // The durable world evolves independent of any visitor -- via the
  // real owner-gated `advanceWorld` (Sprint 9), never a visitor-facing
  // path, mirroring the old singleton test's own `advanceLivingSystemsSimulation`
  // precedent exactly (production never exposes an equivalent of either
  // to a real signed-in visitor -- see this route's own doc comment).
  await wakeWorld(worldInstanceId, "test-admin", now)
  await advanceWorld(worldInstanceId, 4, "test-admin", now)

  const after = await resolveWorldEmbodimentSnapshot({ userId: "u3", locationId: "yamuna", livingWorldRuntime: runtime, worldInstanceId, now })
  assert.equal(after.season.id, "grishma")
  assert.notDeepEqual(before.current.environment, after.current.environment)
  assert.equal(after.visitorContext.lastLocationId, "yamuna", "visitor's own memory survives, untouched by the world's evolution")
})

test("Phase 17: two visitors at the same logical world time receive embodiments that agree on world/season/environment, but not on visitor-specific fields", async () => {
  const worldInstanceId = "embodiment-orchestrator-test-two-visitors"
  const runtimeA = freshWorldRuntime()
  const runtimeB = freshWorldRuntime()
  await runtimeA.enterWorld("visitor-a", "living-vrindavan")
  await runtimeB.enterWorld("visitor-b", "living-vrindavan")

  const snapshotA = await resolveWorldEmbodimentSnapshot({ userId: "visitor-a", locationId: "vrindavan-entry", livingWorldRuntime: runtimeA, worldInstanceId })
  const snapshotB = await resolveWorldEmbodimentSnapshot({ userId: "visitor-b", locationId: "vrindavan-entry", livingWorldRuntime: runtimeB, worldInstanceId })

  assert.equal(snapshotA.season.id, snapshotB.season.id)
  assert.deepEqual(snapshotA.current.environment, snapshotB.current.environment)
  assert.equal(snapshotA.worldId, snapshotB.worldId)
  assert.deepEqual(snapshotA.visitorContext, { userId: "visitor-a", lastLocationId: "vrindavan-entry", meaningfulEncounterCount: 0, reflectionCount: 0 })
  assert.deepEqual(snapshotB.visitorContext, { userId: "visitor-b", lastLocationId: "vrindavan-entry", meaningfulEncounterCount: 0, reflectionCount: 0 })
})

test("Phase 14: provenance traces concretely back to the real StudioK Canon/Specification ids -- not a placeholder string", async () => {
  const runtime = freshWorldRuntime()
  await runtime.enterWorld("u4", "living-vrindavan")

  const snapshot = await resolveWorldEmbodimentSnapshot({ userId: "u4", locationId: "vrindavan-entry", livingWorldRuntime: runtime, worldInstanceId: "embodiment-orchestrator-test-provenance" })
  assert.equal(snapshot.provenance.worldArtifactSpecId, "STK-SPEC-002")
  assert.equal(snapshot.provenance.experienceArtifactSpecId, "STK-SPEC-004")
  assert.equal(snapshot.provenance.systemsArtifactSpecId, "STK-SPEC-006")
  assert.ok(snapshot.provenance.canonDocIds.includes("STK-CAN-001"), "experience-layer Canon lineage present")
  assert.ok(snapshot.provenance.canonDocIds.includes("STK-CAN-006"), "systems-layer (seasonal identity) Canon lineage present")
})

test("Sprint 20: a visitor with real prior reflections keeps that meaningful-memory history through the durable read path -- the visitorWorldMemoryRepository (empty, unwired) is never silently substituted", async () => {
  const runtime = freshWorldRuntime()
  await runtime.enterWorld("u5", "living-vrindavan")

  const fakeRegistry = {
    listEvents: async () => [{ type: "reflection.created", target: { type: "location", id: "vrindavan-entry" }, metadata: { reflectionId: "refl-1" }, createdAt: "2026-08-09T00:00:00.000Z" }],
  }

  const snapshot = await resolveWorldEmbodimentSnapshot({
    userId: "u5",
    locationId: "vrindavan-entry",
    livingWorldRuntime: runtime,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    experienceRegistry: fakeRegistry as any,
    worldInstanceId: "embodiment-orchestrator-test-visitor-memory-preserved",
  })
  assert.equal(snapshot.visitorContext.reflectionCount, 1, "the real projectVisitorWorldMemory derivation, not the empty durable repository, backs this field")
})
