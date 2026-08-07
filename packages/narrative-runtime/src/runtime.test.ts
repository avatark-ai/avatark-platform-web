import test from "node:test"
import assert from "node:assert/strict"
import { createNarrativeRuntime } from "./runtime.ts"
import { createInMemoryNarrativeRepository } from "./inMemoryRepository.ts"
import {
  NarrativeAlreadyStartedError,
  NarrativeInvalidChoiceError,
  NarrativeInvalidTriggerError,
  NarrativeRuntimeError,
  NarrativeStateNotFoundError,
} from "./errors.ts"
import { buildBranchingDefinition, buildLinearDefinition } from "./testFixtures.ts"
import type { NarrativeRepository } from "./repository.ts"

test("linear episode: plays start to finish across scene and episode boundaries", async () => {
  const repository = createInMemoryNarrativeRepository()
  const runtime = createNarrativeRuntime({ definition: buildLinearDefinition(), repository })

  let state = await runtime.startNarrative("user-1")
  assert.equal(state.progress.beatId, "b1")
  assert.equal(state.status, "active")

  state = await runtime.completeBeat("user-1") // b1 -> b2
  assert.equal(state.progress.beatId, "b2")

  state = await runtime.completeBeat("user-1") // b2 -> sc2 entry (b3), crosses scene boundary
  assert.equal(state.progress.beatId, "b3")
  assert.equal(state.progress.sceneId, "sc2")
  assert.ok(state.progress.completedSceneIds.includes("sc1"))

  state = await runtime.completeBeat("user-1") // b3 -> e2 entry (b4), crosses episode boundary
  assert.equal(state.progress.beatId, "b4")
  assert.equal(state.progress.episodeId, "e2")
  assert.ok(state.progress.completedEpisodeIds.includes("e1"))

  state = await runtime.completeBeat("user-1") // b4 -> end
  assert.equal(state.status, "completed")

  const next = await runtime.getNext("user-1")
  assert.equal(next.status, "completed")
  assert.equal(next.beat, null)
})

test("scene transition: crossing a scene boundary records completedSceneIds and a history entry", async () => {
  const repository = createInMemoryNarrativeRepository()
  const runtime = createNarrativeRuntime({ definition: buildLinearDefinition(), repository })

  await runtime.startNarrative("user-1")
  await runtime.completeBeat("user-1") // b1 -> b2
  await runtime.completeBeat("user-1") // b2 -> sc2, crosses the boundary

  const history = await runtime.getHistory("user-1")
  assert.ok(history.entries.some((e) => e.kind === "sceneCompleted" && e.sceneId === "sc1"))
})

test("completeScene/completeEpisode explicitly mark the current position complete", async () => {
  const repository = createInMemoryNarrativeRepository()
  const runtime = createNarrativeRuntime({ definition: buildLinearDefinition(), repository })

  await runtime.startNarrative("user-1")
  let state = await runtime.completeScene("user-1")
  assert.ok(state.progress.completedSceneIds.includes("sc1"))
  // Idempotent: calling again does not duplicate the entry.
  state = await runtime.completeScene("user-1")
  assert.equal(state.progress.completedSceneIds.filter((id) => id === "sc1").length, 1)

  state = await runtime.completeEpisode("user-1")
  assert.ok(state.progress.completedEpisodeIds.includes("e1"))
})

test("startEpisode jumps directly into a named episode", async () => {
  const repository = createInMemoryNarrativeRepository()
  const runtime = createNarrativeRuntime({ definition: buildLinearDefinition(), repository })

  await runtime.startNarrative("user-1")
  const state = await runtime.startEpisode("user-1", "e2")
  assert.equal(state.progress.episodeId, "e2")
  assert.equal(state.progress.beatId, "b4")

  await assert.rejects(runtime.startEpisode("user-1", "does-not-exist"), NarrativeRuntimeError)
})

test("resume: a fresh runtime instance backed by the same repository picks up saved progress", async () => {
  const repository = createInMemoryNarrativeRepository()
  const definition = buildLinearDefinition()

  const first = createNarrativeRuntime({ definition, repository })
  await first.startNarrative("user-1")
  await first.completeBeat("user-1")

  const second = createNarrativeRuntime({ definition, repository })
  const resumed = await second.resumeNarrative("user-1")
  assert.equal(resumed.progress.beatId, "b2")
})

test("startNarrative rejects a user who is already started", async () => {
  const repository = createInMemoryNarrativeRepository()
  const runtime = createNarrativeRuntime({ definition: buildLinearDefinition(), repository })
  await runtime.startNarrative("user-1")
  await assert.rejects(runtime.startNarrative("user-1"), NarrativeAlreadyStartedError)
})

test("resumeNarrative rejects a user who never started", async () => {
  const repository = createInMemoryNarrativeRepository()
  const runtime = createNarrativeRuntime({ definition: buildLinearDefinition(), repository })
  await assert.rejects(runtime.resumeNarrative("nobody"), NarrativeStateNotFoundError)
})

test("pause/resume toggle status and block invalid operations", async () => {
  const repository = createInMemoryNarrativeRepository()
  const runtime = createNarrativeRuntime({ definition: buildLinearDefinition(), repository })

  await runtime.startNarrative("user-1")
  let state = await runtime.pause("user-1")
  assert.equal(state.status, "paused")

  await assert.rejects(runtime.completeBeat("user-1"), NarrativeRuntimeError)
  await assert.rejects(runtime.pause("user-1"), NarrativeRuntimeError) // already paused

  state = await runtime.resume("user-1")
  assert.equal(state.status, "active")

  state = await runtime.completeBeat("user-1")
  assert.equal(state.progress.beatId, "b2")
})

test("branching episode: the good path and the bad path resolve to different outcomes", async () => {
  const repository = createInMemoryNarrativeRepository()
  const runtime = createNarrativeRuntime({ definition: buildBranchingDefinition(), repository })

  await runtime.startNarrative("user-good")
  let state = await runtime.choose("user-good", "choice-good")
  assert.equal(state.progress.beatId, "b2")
  assert.equal(state.flags.path, "good")

  state = await runtime.completeBeat("user-good") // b2 -> b4 (trigger beat)
  state = await runtime.trigger("user-good", "trig-good-path")
  assert.equal(state.status, "completed")

  await runtime.startNarrative("user-bad")
  state = await runtime.choose("user-bad", "choice-bad")
  assert.equal(state.progress.beatId, "b3")
  assert.equal(state.flags.path, "bad")

  state = await runtime.completeBeat("user-bad") // b3 -> b4
  await assert.rejects(runtime.trigger("user-bad", "trig-good-path"), NarrativeInvalidTriggerError)
  state = await runtime.trigger("user-bad", "trig-fallback")
  assert.equal(state.status, "completed")
})

test("advance auto-fires the first matching trigger without an explicit triggerId", async () => {
  const repository = createInMemoryNarrativeRepository()
  const runtime = createNarrativeRuntime({ definition: buildBranchingDefinition(), repository })

  await runtime.startNarrative("user-1")
  await runtime.choose("user-1", "choice-good")
  await runtime.completeBeat("user-1") // now at b4, a trigger beat
  const state = await runtime.advance("user-1")
  assert.equal(state.status, "completed")
})

test("invalid choice is rejected", async () => {
  const repository = createInMemoryNarrativeRepository()
  const runtime = createNarrativeRuntime({ definition: buildBranchingDefinition(), repository })

  await runtime.startNarrative("user-1")
  await assert.rejects(runtime.choose("user-1", "not-a-real-choice"), NarrativeInvalidChoiceError)
})

test("completeBeat rejects a choice beat, and choose() rejects a narration beat", async () => {
  const repository = createInMemoryNarrativeRepository()
  const runtime = createNarrativeRuntime({ definition: buildBranchingDefinition(), repository })

  await runtime.startNarrative("user-1")
  await assert.rejects(runtime.completeBeat("user-1"), NarrativeRuntimeError) // b1 is a choice beat

  await runtime.choose("user-1", "choice-good") // now at b2, a narration beat
  await assert.rejects(runtime.choose("user-1", "choice-good"), NarrativeRuntimeError)
})

test("world/practice/reflection/asset references surface through getNext", async () => {
  const repository = createInMemoryNarrativeRepository()
  const runtime = createNarrativeRuntime({ definition: buildBranchingDefinition(), repository })

  await runtime.startNarrative("user-1")
  await runtime.choose("user-1", "choice-good") // lands on b2, which carries refs
  const next = await runtime.getNext("user-1")
  assert.equal(next.beat?.id, "b2")
  assert.deepEqual(next.refs, {
    world: { worldId: "world-1" },
    practice: { practiceId: "practice-1" },
    reflection: { reflectionId: "reflection-1" },
    asset: { assetId: "asset-1", kind: "video" },
  })
})

test("user isolation: two users on the same runtime and repository never see each other's progress", async () => {
  const repository = createInMemoryNarrativeRepository()
  const definition = buildLinearDefinition()
  const runtime = createNarrativeRuntime({ definition, repository })

  await runtime.startNarrative("user-a")
  await runtime.startNarrative("user-b")

  await runtime.completeBeat("user-a")
  await runtime.completeBeat("user-a")

  const stateA = await runtime.resumeNarrative("user-a")
  const stateB = await runtime.resumeNarrative("user-b")

  assert.equal(stateA.progress.beatId, "b3")
  assert.equal(stateB.progress.beatId, "b1")

  // Directly through the repository too, not just through the runtime facade.
  const rawA = await (repository as NarrativeRepository).getState("user-a", definition.id)
  const rawB = await (repository as NarrativeRepository).getState("user-b", definition.id)
  assert.notEqual(rawA?.progress.beatId, rawB?.progress.beatId)
})

test("mutating a returned state does not corrupt stored progress", async () => {
  const repository = createInMemoryNarrativeRepository()
  const runtime = createNarrativeRuntime({ definition: buildLinearDefinition(), repository })

  const state = await runtime.startNarrative("user-1")
  state.progress.beatId = "tampered"
  state.flags.injected = true

  const resumed = await runtime.resumeNarrative("user-1")
  assert.equal(resumed.progress.beatId, "b1")
  assert.equal(resumed.flags.injected, undefined)
})
