import { test } from "node:test"
import assert from "node:assert/strict"
import { ContextRuntime, InMemoryContextRepository } from "@avatark/context-runtime"
import { InMemoryJourneyRepository, JourneyRuntime, type JourneyDefinition } from "@avatark/experience-runtime"
import { ExperienceRegistry, InMemoryExperienceEventRepository } from "@avatark/experience-registry"
import { createWorldRuntime, InMemoryWorldStateRepository, type WorldDefinition } from "@avatark/living-world-runtime"
import { enterLivingWorld, leaveLivingWorld, type RuntimeKernel } from "./orchestrator.ts"

const WORLD: WorldDefinition = {
  id: "living-forest",
  name: "Living Forest",
  entryLocationId: "entry",
  locations: [{ id: "entry", name: "The Threshold", order: 0 }],
  activities: [],
}

const EXPERIENCE_DEFINITION: JourneyDefinition = {
  id: "generic-experience",
  title: "Generic Experience",
  episodes: [{ id: "ep1", title: "Episode 1", prerequisites: [] }],
  livingWorlds: [{ id: "living-forest", title: "Living Forest", prerequisites: [] }],
  practices: [],
  reflections: [],
  milestones: [],
  // Non-trivial on purpose: an empty completionCriteria object is
  // vacuously satisfied (every() over an empty/undefined list is true),
  // which would auto-complete the journey the instant start() runs.
  // Requiring an episode that advance() never completes on its own keeps
  // status "active" for the duration of this test.
  completionCriteria: { requiredEpisodeIds: ["ep1"] },
}

function makeKernel(): RuntimeKernel {
  return {
    context: new ContextRuntime(new InMemoryContextRepository()),
    experience: new JourneyRuntime(EXPERIENCE_DEFINITION, new InMemoryJourneyRepository()),
    livingWorld: createWorldRuntime({ definitions: [WORLD], repository: new InMemoryWorldStateRepository() }),
    registry: new ExperienceRegistry(new InMemoryExperienceEventRepository()),
  }
}

test("enterLivingWorld coordinates Living World, Context, Experience, and Registry via the Host only", async () => {
  const kernel = makeKernel()
  await kernel.experience!.start("user-1")

  const result = await enterLivingWorld(kernel, { userId: "user-1", productId: "avatark", worldId: "living-forest" })

  assert.equal(result.worldState?.currentLocationId, "entry")
  assert.equal(result.contextApplied, true)
  assert.equal(result.experienceAdvanced, true)
  assert.equal(result.eventRecorded, true)

  const snapshot = await kernel.context!.getContext("user-1")
  assert.equal(snapshot.fields.currentLivingWorldId.value, "living-forest")
  assert.equal(snapshot.fields.currentLocationId.value, "entry")

  const events = await kernel.registry!.listRecentEvents("user-1")
  assert.equal(events[0].type, "world.entered")
  assert.equal(events[0].target?.id, "living-forest")
})

test("enterLivingWorld degrades gracefully when the user has no active Experience", async () => {
  const kernel = makeKernel()
  // Deliberately no kernel.experience!.start(...) for this user.

  const result = await enterLivingWorld(kernel, { userId: "user-2", productId: "avatark", worldId: "living-forest" })

  assert.equal(result.experienceAdvanced, false)
  assert.equal(result.worldState?.currentLocationId, "entry")
  assert.equal(result.eventRecorded, true)
})

test("enterLivingWorld resumes a paused Experience before advancing it", async () => {
  const kernel = makeKernel()
  await kernel.experience!.start("user-4")
  await kernel.experience!.pause("user-4")
  const paused = await kernel.experience!.getProgress("user-4")
  assert.equal(paused?.status, "paused")

  const result = await enterLivingWorld(kernel, { userId: "user-4", productId: "avatark", worldId: "living-forest" })

  assert.equal(result.experienceAdvanced, true)
  const resumed = await kernel.experience!.getProgress("user-4")
  assert.equal(resumed?.status, "active")
})

test("leaveLivingWorld coordinates Living World and Registry via the Host only", async () => {
  const kernel = makeKernel()
  await kernel.livingWorld!.enterWorld("user-5", "living-forest")

  const result = await leaveLivingWorld(kernel, { userId: "user-5", productId: "avatark", worldId: "living-forest" })

  assert.equal(result.worldState?.active, false)
  assert.equal(result.eventRecorded, true)

  const events = await kernel.registry!.listRecentEvents("user-5")
  assert.equal(events[0].type, "world.left")
})

test("enterLivingWorld degrades gracefully when a runtime is entirely absent from the kernel", async () => {
  const kernel: RuntimeKernel = {
    livingWorld: createWorldRuntime({ definitions: [WORLD], repository: new InMemoryWorldStateRepository() }),
    // context, experience, registry all omitted.
  }

  const result = await enterLivingWorld(kernel, { userId: "user-3", productId: "avatark", worldId: "living-forest" })

  assert.equal(result.worldState?.currentLocationId, "entry")
  assert.equal(result.contextApplied, false)
  assert.equal(result.experienceAdvanced, false)
  assert.equal(result.eventRecorded, false)
})
