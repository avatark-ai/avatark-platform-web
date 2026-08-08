import { test } from "node:test"
import assert from "node:assert/strict"
import { createWorldRuntime, InMemoryWorldStateRepository } from "@avatark/living-world-runtime"
import { LIVING_VRINDAVAN_DEFINITION } from "../livingWorldRuntime/vrindavanDefinition.ts"
import { resolveWorldEmbodimentSnapshot } from "./embodimentOrchestrator.ts"
import { advanceLivingSystemsSimulation } from "../livingSystems/orchestrator.ts"
import { resetLivingSystemsSingletonForTests } from "../livingSystems/singleton.ts"

function freshWorldRuntime() {
  return createWorldRuntime({ definitions: [LIVING_VRINDAVAN_DEFINITION], repository: new InMemoryWorldStateRepository() })
}

test("a fresh visitor's embodiment snapshot shows Vasanta at the entry location, with no reachable regions yet", async () => {
  await resetLivingSystemsSingletonForTests()
  const runtime = freshWorldRuntime()
  await runtime.enterWorld("u1", "living-vrindavan")

  const snapshot = await resolveWorldEmbodimentSnapshot({ userId: "u1", locationId: "vrindavan-entry", livingWorldRuntime: runtime })
  assert.equal(snapshot.season.id, "vasanta")
  assert.equal(snapshot.current.locationId, "vrindavan-entry")
  assert.equal(snapshot.current.environment.atmosphere.semantic, "arrival")
})

test("after visiting Yamuna, the embodiment's reachable regions include both branches with 'branching-choice' transitions", async () => {
  await resetLivingSystemsSingletonForTests()
  const runtime = freshWorldRuntime()
  await runtime.enterWorld("u2", "living-vrindavan")
  await runtime.unlockLocation("u2", "living-vrindavan", "yamuna")
  await runtime.visitLocation("u2", "living-vrindavan", "yamuna")

  const snapshot = await resolveWorldEmbodimentSnapshot({ userId: "u2", locationId: "yamuna", livingWorldRuntime: runtime })
  const reachableIds = snapshot.reachable.map((r) => r.locationId).sort()
  assert.deepEqual(reachableIds, ["govardhan-path", "kadamba-grove"])
  assert.ok(snapshot.transitions.every((t) => t.affordance === "branching-choice"))
})

test("Phase 16/18: leave, advance the shared world to Grishma, return -- same visitor continuity, genuinely different embodiment", async () => {
  await resetLivingSystemsSingletonForTests()
  const runtime = freshWorldRuntime()
  await runtime.enterWorld("u3", "living-vrindavan")
  await runtime.unlockLocation("u3", "living-vrindavan", "yamuna")
  await runtime.visitLocation("u3", "living-vrindavan", "yamuna")

  const before = await resolveWorldEmbodimentSnapshot({ userId: "u3", locationId: "yamuna", livingWorldRuntime: runtime })
  assert.equal(before.season.id, "vasanta")

  await runtime.leaveWorld("u3", "living-vrindavan")
  await advanceLivingSystemsSimulation(4) // the world evolves independent of any visitor

  const after = await resolveWorldEmbodimentSnapshot({ userId: "u3", locationId: "yamuna", livingWorldRuntime: runtime })
  assert.equal(after.season.id, "grishma")
  assert.notDeepEqual(before.current.environment, after.current.environment)
  assert.equal(after.visitorContext.lastLocationId, "yamuna", "visitor's own memory survives, untouched by the world's evolution")
})

test("Phase 17: two visitors at the same logical world time receive embodiments that agree on world/season/environment, but not on visitor-specific fields", async () => {
  await resetLivingSystemsSingletonForTests()
  const runtimeA = freshWorldRuntime()
  const runtimeB = freshWorldRuntime()
  await runtimeA.enterWorld("visitor-a", "living-vrindavan")
  await runtimeB.enterWorld("visitor-b", "living-vrindavan")

  const snapshotA = await resolveWorldEmbodimentSnapshot({ userId: "visitor-a", locationId: "vrindavan-entry", livingWorldRuntime: runtimeA })
  const snapshotB = await resolveWorldEmbodimentSnapshot({ userId: "visitor-b", locationId: "vrindavan-entry", livingWorldRuntime: runtimeB })

  assert.equal(snapshotA.season.id, snapshotB.season.id)
  assert.deepEqual(snapshotA.current.environment, snapshotB.current.environment)
  assert.equal(snapshotA.worldId, snapshotB.worldId)
  assert.deepEqual(snapshotA.visitorContext, { userId: "visitor-a", lastLocationId: "vrindavan-entry", meaningfulEncounterCount: 0, reflectionCount: 0 })
  assert.deepEqual(snapshotB.visitorContext, { userId: "visitor-b", lastLocationId: "vrindavan-entry", meaningfulEncounterCount: 0, reflectionCount: 0 })
})
