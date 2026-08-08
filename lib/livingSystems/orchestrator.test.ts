import { test } from "node:test"
import assert from "node:assert/strict"
import { createWorldRuntime, InMemoryWorldStateRepository } from "@avatark/living-world-runtime"
import { ExperienceRegistry, InMemoryExperienceEventRepository } from "@avatark/experience-registry"
import { LIVING_VRINDAVAN_DEFINITION } from "../livingWorldRuntime/vrindavanDefinition.ts"
import { advanceLivingSystemsSimulation, resolveLivingSystemsSnapshot } from "./orchestrator.ts"
import { resetLivingSystemsSingletonForTests } from "./singleton.ts"

function freshWorldRuntime() {
  return createWorldRuntime({ definitions: [LIVING_VRINDAVAN_DEFINITION], repository: new InMemoryWorldStateRepository() })
}

function freshRegistry() {
  return new ExperienceRegistry(new InMemoryExperienceEventRepository())
}

test("a fresh visitor sees Vasanta at tick 0 -- the singleton's own seeded starting state", async () => {
  await resetLivingSystemsSingletonForTests()
  const runtime = freshWorldRuntime()
  const snapshot = await resolveLivingSystemsSnapshot({ userId: "u1", locationId: "yamuna", livingWorldRuntime: runtime })
  assert.equal(snapshot.season.id, "vasanta")
  assert.equal(snapshot.simulationTick, 0)
})

test("advanceLivingSystemsSimulation moves the WORLD forward independent of any visitor action, and a later snapshot reflects it", async () => {
  await resetLivingSystemsSingletonForTests()
  const runtime = freshWorldRuntime()

  const before = await resolveLivingSystemsSnapshot({ userId: "u1", locationId: "yamuna", livingWorldRuntime: runtime })
  assert.equal(before.season.id, "vasanta")

  await advanceLivingSystemsSimulation(4)

  const after = await resolveLivingSystemsSnapshot({ userId: "u1", locationId: "yamuna", livingWorldRuntime: runtime })
  assert.equal(after.season.id, "grishma")
  assert.notDeepEqual(before.ecology, after.ecology)
})

test("Phase 15: visitor enters during Vasanta, leaves, world advances to Grishma, visitor returns -- same visitor continuity, new shared world state", async () => {
  await resetLivingSystemsSingletonForTests()
  const runtime = freshWorldRuntime()
  const registry = freshRegistry()

  await runtime.enterWorld("visitor-1", "living-vrindavan")
  await runtime.unlockLocation("visitor-1", "living-vrindavan", "yamuna")
  await runtime.visitLocation("visitor-1", "living-vrindavan", "yamuna")
  const snapshotA = await resolveLivingSystemsSnapshot({ userId: "visitor-1", locationId: "yamuna", livingWorldRuntime: runtime, experienceRegistry: registry })
  assert.equal(snapshotA.season.id, "vasanta")
  assert.equal(snapshotA.visitorContext.lastLocationId, "yamuna")

  await runtime.leaveWorld("visitor-1", "living-vrindavan")
  await advanceLivingSystemsSimulation(4) // the world evolves while the visitor is gone

  const snapshotB = await resolveLivingSystemsSnapshot({ userId: "visitor-1", locationId: "yamuna", livingWorldRuntime: runtime, experienceRegistry: registry })
  assert.equal(snapshotB.season.id, "grishma", "shared world genuinely evolved")
  assert.equal(snapshotB.visitorContext.lastLocationId, "yamuna", "visitor's own meaningful memory survived, untouched by the world's evolution")
})

test("Phase 16: two visitors at the same logical world time see identical shared state, but independent visitor context -- no cross-user bleed", async () => {
  await resetLivingSystemsSingletonForTests()
  const runtimeA = freshWorldRuntime()
  const runtimeB = freshWorldRuntime()

  await runtimeA.enterWorld("visitor-a", "living-vrindavan")
  await runtimeA.unlockLocation("visitor-a", "living-vrindavan", "yamuna")
  await runtimeA.visitLocation("visitor-a", "living-vrindavan", "yamuna")

  await runtimeB.enterWorld("visitor-b", "living-vrindavan")

  const snapshotA = await resolveLivingSystemsSnapshot({ userId: "visitor-a", locationId: "yamuna", livingWorldRuntime: runtimeA })
  const snapshotB = await resolveLivingSystemsSnapshot({ userId: "visitor-b", locationId: "vrindavan-entry", livingWorldRuntime: runtimeB })

  assert.deepEqual(snapshotA.season, snapshotB.season, "shared season")
  assert.deepEqual(snapshotA.ecology, snapshotB.ecology, "shared ecology")
  assert.deepEqual(snapshotA.weather, snapshotB.weather, "shared weather")

  assert.equal(snapshotA.visitorContext.lastLocationId, "yamuna")
  assert.equal(snapshotB.visitorContext.lastLocationId, "vrindavan-entry", "visitor-b only ever entered -- its own location, never visitor-a's yamuna")
})

test("Phase 10: advancing the world simulation never touches the protected-narrative projection", async () => {
  await resetLivingSystemsSingletonForTests()
  const runtime = freshWorldRuntime()

  const before = await resolveLivingSystemsSnapshot({ userId: "u1", locationId: "yamuna", livingWorldRuntime: runtime })
  await advanceLivingSystemsSimulation(8)
  const after = await resolveLivingSystemsSnapshot({ userId: "u1", locationId: "yamuna", livingWorldRuntime: runtime })

  assert.deepEqual(before.protectedNarrative, after.protectedNarrative)
  assert.equal(after.protectedNarrative.resolved, false)
})

test("advanceLivingSystemsSimulation records world/system events, distinct from visitor experience events", async () => {
  await resetLivingSystemsSingletonForTests()
  const result = await advanceLivingSystemsSimulation(4)
  assert.ok(result.events.some((e) => e.type === "season.transitioned"))
})
