import { test } from "node:test"
import assert from "node:assert/strict"
import { ContextRuntime, InMemoryContextRepository } from "@avatark/context-runtime"
import { InMemoryJourneyRepository, JourneyRuntime, type JourneyDefinition } from "@avatark/experience-runtime"
import { ExperienceRegistry, InMemoryExperienceEventRepository } from "@avatark/experience-registry"
import { createWorldRuntime, InMemoryWorldStateRepository, type WorldDefinition } from "@avatark/living-world-runtime"
import { createInMemoryNarrativeRepository, createNarrativeRuntime, type NarrativeDefinition } from "@avatark/narrative-runtime"

// Reference end-to-end Runtime Kernel test (Sprint 3, Phase 9). Generic,
// content-free fixtures only -- no franchise data of any kind. Proves all
// five Runtime Kernel packages can participate in one host-coordinated
// workflow for a single user, with the test itself playing the Host role
// (calling each runtime's public API directly, exactly as
// lib/runtimeKernel/orchestrator.ts does) -- no runtime here ever calls
// another runtime.

const PRODUCT_ID = "generic-product"

const WORLD: WorldDefinition = {
  id: "generic-world",
  name: "Generic World",
  entryLocationId: "location-a",
  locations: [
    { id: "location-a", name: "Location A", order: 0 },
    { id: "location-b", name: "Location B", order: 1, requiresLocationIds: ["location-a"] },
  ],
  activities: [],
}

const EXPERIENCE_DEFINITION: JourneyDefinition = {
  id: "generic-experience",
  title: "Generic Experience",
  episodes: [
    { id: "episode-1", title: "Episode 1", prerequisites: [] },
    { id: "episode-2", title: "Episode 2", prerequisites: ["episode-1"] },
  ],
  livingWorlds: [{ id: "generic-world", title: "Generic World", prerequisites: [] }],
  practices: [],
  reflections: [],
  milestones: [],
  // Non-trivial on purpose (an empty object is vacuously satisfied and
  // would auto-complete the moment start() runs) -- requires an episode
  // this flow never completes, so status stays "active" throughout.
  completionCriteria: { requiredEpisodeIds: ["episode-2"] },
}

const NARRATIVE_DEFINITION: NarrativeDefinition = {
  id: "generic-narrative",
  version: 1,
  title: "Generic Narrative",
  entrySeasonId: "season-1",
  seasons: [
    {
      id: "season-1",
      title: "Season 1",
      entryEpisodeId: "narrative-episode-1",
      episodes: [
        {
          id: "narrative-episode-1",
          title: "Narrative Episode 1",
          entrySceneId: "scene-1",
          scenes: [
            {
              id: "scene-1",
              title: "Scene 1",
              entryBeatId: "beat-1",
              beats: [{ id: "beat-1", kind: "narration", next: { to: "end" } }],
            },
          ],
        },
      ],
    },
  ],
}

function buildKernel(userId: string) {
  return {
    context: new ContextRuntime(new InMemoryContextRepository()),
    experience: new JourneyRuntime(EXPERIENCE_DEFINITION, new InMemoryJourneyRepository()),
    narrative: createNarrativeRuntime({ definition: NARRATIVE_DEFINITION, repository: createInMemoryNarrativeRepository() }),
    livingWorld: createWorldRuntime({ definitions: [WORLD], repository: new InMemoryWorldStateRepository() }),
    registry: new ExperienceRegistry(new InMemoryExperienceEventRepository()),
    userId,
  }
}

test("full host-coordinated Runtime Kernel flow: context -> experience -> narrative -> living world -> registry, then resume", async () => {
  const kernel = buildKernel("user-1")

  // 1. Create user context.
  const contextOutcome = await kernel.context.setContext(
    kernel.userId,
    { currentProductId: PRODUCT_ID },
    { productId: PRODUCT_ID },
  )
  assert.ok(contextOutcome.applied.includes("currentProductId"))

  // 2. Start experience.
  const experienceState = await kernel.experience.start(kernel.userId)
  assert.equal(experienceState.status, "active")

  // 3. Start narrative.
  const narrativeState = await kernel.narrative.startNarrative(kernel.userId)
  assert.equal(narrativeState.status, "active")
  assert.equal(narrativeState.progress.sceneId, "scene-1")

  // 4. Enter living world.
  const worldState = await kernel.livingWorld.enterWorld(kernel.userId, WORLD.id)
  assert.equal(worldState.currentLocationId, "location-a")

  // 5. Visit a location.
  await kernel.livingWorld.unlockLocation(kernel.userId, WORLD.id, "location-b")
  const afterVisit = await kernel.livingWorld.visitLocation(kernel.userId, WORLD.id, "location-b")
  assert.equal(afterVisit.currentLocationId, "location-b")
  assert.ok(afterVisit.visitedLocationIds.includes("location-b"))

  // 6. Advance experience (the generic-world livingWorlds gate unlocks and
  // gets entered, since it has no prerequisites and hasn't been visited
  // from the Experience Runtime's own point of view yet).
  const advanced = await kernel.experience.advance(kernel.userId)
  assert.equal(advanced.currentWorldId, "generic-world")

  // 7. Update context to reflect where the user now is.
  const contextUpdate = await kernel.context.setContext(
    kernel.userId,
    { currentLivingWorldId: WORLD.id, currentNarrativeId: NARRATIVE_DEFINITION.id },
    { productId: PRODUCT_ID },
  )
  assert.deepEqual(new Set(contextUpdate.applied), new Set(["currentLivingWorldId", "currentNarrativeId"]))

  // 8. Record registry events for what just happened.
  await kernel.registry.recordEvent({
    type: "world.entered",
    source: { productId: PRODUCT_ID },
    actor: { userId: kernel.userId },
    target: { type: "world", id: WORLD.id },
  })
  await kernel.registry.recordEvent({
    type: "world.location_visited",
    source: { productId: PRODUCT_ID },
    actor: { userId: kernel.userId },
    target: { type: "location", id: "location-b" },
  })
  const recentEvents = await kernel.registry.listRecentEvents(kernel.userId)
  assert.equal(recentEvents.length, 2)
  assert.equal(recentEvents[0].type, "world.location_visited") // most-recent-first

  // 9. Resume state -- every runtime's persisted state survives independent
  // re-reads (simulating a new request against the same repositories).
  const resumedExperience = await kernel.experience.getProgress(kernel.userId)
  assert.equal(resumedExperience?.status, "active")
  const resumedNarrative = await kernel.narrative.getNext(kernel.userId)
  assert.equal(resumedNarrative.status, "active")
  const resumedWorld = await kernel.livingWorld.getState(kernel.userId, WORLD.id)
  assert.equal(resumedWorld?.currentLocationId, "location-b")
  const resumedContext = await kernel.context.getContext(kernel.userId)
  assert.equal(resumedContext.fields.currentLivingWorldId.value, WORLD.id)
  const resumedHistory = await kernel.registry.listRecentEvents(kernel.userId)
  assert.equal(resumedHistory.length, 2)
})

// 10. Verify user isolation.
test("user isolation: two users on the same kernel never see each other's state", async () => {
  const kernelA = buildKernel("alice")
  // Share the same runtime *instances* (same repositories) across both
  // users -- this is the real isolation test: isolation must come from
  // each runtime's own per-user keying, not from using separate objects.
  const kernelB = { ...kernelA, userId: "bob" }

  await kernelA.context.setContext(kernelA.userId, { currentProductId: PRODUCT_ID }, { productId: PRODUCT_ID })
  await kernelA.experience.start(kernelA.userId)
  await kernelA.narrative.startNarrative(kernelA.userId)
  await kernelA.livingWorld.enterWorld(kernelA.userId, WORLD.id)
  await kernelA.registry.recordEvent({
    type: "world.entered",
    source: { productId: PRODUCT_ID },
    actor: { userId: kernelA.userId },
  })

  // Bob has done nothing yet -- every runtime must report that honestly,
  // never leaking Alice's state onto Bob's read.
  const bobContext = await kernelB.context.getContext(kernelB.userId)
  assert.equal(bobContext.fields.currentProductId.value, null)

  const bobExperience = await kernelB.experience.getProgress(kernelB.userId)
  assert.equal(bobExperience, null)

  await assert.rejects(() => kernelB.narrative.getNext(kernelB.userId))

  const bobWorld = await kernelB.livingWorld.getState(kernelB.userId, WORLD.id)
  assert.equal(bobWorld, null)

  const bobEvents = await kernelB.registry.listRecentEvents(kernelB.userId)
  assert.deepEqual(bobEvents, [])

  // Alice's own state is untouched by Bob's (no-op) reads.
  const aliceExperience = await kernelA.experience.getProgress(kernelA.userId)
  assert.equal(aliceExperience?.status, "active")
})
