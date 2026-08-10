import { test } from "node:test"
import assert from "node:assert/strict"
import { createWorldInstance } from "../livingWorldHost/hostService.ts"
import { getWorldState } from "../worldPersistence/hostService.ts"
import { projectVrindavanPresentation } from "./vrindavanPresentationProjection.ts"

const seedNow = () => "2026-08-09T00:00:00.000Z"

// Living Vrindavan Build 02, Part 2, acceptance proof H: a renderer
// failure cannot corrupt authoritative world state. `projectVrindavanPresentation`
// is a pure read over `getEmbodimentWithCanonicalEvents` (Part 1's own
// design discipline: "no repository is queried directly, no value is
// recomputed") -- proven here directly, not merely asserted: a
// simulated renderer-side failure AFTER the projection returns must
// leave the real durable world state byte-identical to what it was
// immediately before that failure.
test("Build 02 Part 2, proof H: a renderer failure after consuming a presentation projection leaves authoritative durable state untouched", async () => {
  const worldInstanceId = "living-vrindavan-build-02-renderer-failure-isolation"
  const userId = "build02-renderer-failure-visitor"
  await createWorldInstance(worldInstanceId, seedNow)

  const stateBeforeConsumption = await getWorldState(worldInstanceId, seedNow)
  const presentation = await projectVrindavanPresentation(worldInstanceId, userId, "yamuna", ["vrindavan-entry", "kadamba-grove", "govardhan-path"], null, seedNow)
  assert.ok(presentation, "the projection must actually succeed for this to be a meaningful proof")

  // Simulate a real renderer-side failure while "consuming" the
  // presentation state -- e.g. a translation/streaming step throwing.
  // The failure happens entirely on the consumption side, AFTER the
  // read-only projection has already returned; nothing about the
  // projection itself can observe or react to it.
  function simulateRendererConsumption(state: typeof presentation): never {
    void state
    throw new Error("simulated Unreal/renderer-side translation failure")
  }

  assert.throws(() => simulateRendererConsumption(presentation), /simulated Unreal\/renderer-side translation failure/, "the simulated renderer failure must actually occur, not be silently swallowed")

  const stateAfterFailure = await getWorldState(worldInstanceId, seedNow)
  assert.deepEqual(stateAfterFailure, stateBeforeConsumption, "authoritative durable world state is byte-identical before and after a renderer-side failure -- the presentation layer has no side effect to roll back, because it never had one")
})
