import { test } from "node:test"
import assert from "node:assert/strict"
import { translateToUnrealCommands } from "@avatark/world-embodiment-runtime"
import { createWorldInstance } from "../livingWorldHost/hostService.ts"
import { getEmbodimentWithCanonicalEvents } from "../canonicalEvents/hostService.ts"
import { projectVrindavanPresentation } from "./vrindavanPresentationProjection.ts"

const seedNow = () => "2026-08-09T12:00:00.000Z"

// Living Vrindavan Build 02, Part 2, req 10/11 + acceptance proofs A/F/J.
//
// req 11 / proof A: `projectVrindavanPresentation` is a pure read over
// already-durable state -- calling it twice against the identical
// worldInstanceId/tick/now MUST produce byte-identical output. No
// hidden mutation, no non-deterministic ordering.
//
// req 10 / proof J: the EXISTING, real Unreal command translator
// (`translateToUnrealCommands`, Sprint 8/10, `packages/
// world-embodiment-runtime`) already accepts `WorldEmbodimentSnapshot`
// -- the exact base object `projectVrindavanPresentation` flattens
// through unmodified (Part 1's own "no reinterpretation" discipline).
// This proves the rich, canonical-events-aware chain still produces a
// base snapshot the existing translator accepts with zero
// modification to the translator itself -- no parallel translator was
// built.
//
// proof F extends A: the Unreal-translated COMMANDS are also
// deep-equal across two identical replays, not merely the presentation
// state -- proving determinism survives all the way to the renderer
// boundary.
test("Build 02 Part 2, req 11 / proof A: identical inputs to projectVrindavanPresentation produce byte-identical presentation state", async () => {
  const worldInstanceId = "living-vrindavan-build-02-determinism-proof"
  await createWorldInstance(worldInstanceId, seedNow)

  const first = await projectVrindavanPresentation(worldInstanceId, "determinism-visitor", "yamuna", ["vrindavan-entry", "kadamba-grove", "govardhan-path"], null, seedNow)
  const second = await projectVrindavanPresentation(worldInstanceId, "determinism-visitor", "yamuna", ["vrindavan-entry", "kadamba-grove", "govardhan-path"], null, seedNow)

  assert.deepEqual(first, second, "two reads against identical, unchanged durable state must be byte-identical -- this is a pure projection, not a source of its own randomness")
})

test("Build 02 Part 2, req 10 / proof J: the existing real Unreal command translator accepts the rich chain's base embodiment snapshot unmodified", async () => {
  const worldInstanceId = "living-vrindavan-build-02-unreal-translation-proof"
  await createWorldInstance(worldInstanceId, seedNow)

  // The same real base `WorldEmbodimentSnapshot` `projectVrindavanPresentation`
  // flattens through -- fetched directly here (not via the flattened
  // type, which intentionally omits `worldVersion`) to prove the
  // EXACT object type the existing translator's own real signature
  // (`translateToUnrealCommands(snapshot: WorldEmbodimentSnapshot)`)
  // requires is what this rich chain actually produces, with no
  // adapter, no field renaming, no parallel translator.
  const withCanonicalEvents = await getEmbodimentWithCanonicalEvents(worldInstanceId, "unreal-proof-visitor", "yamuna", ["vrindavan-entry", "kadamba-grove", "govardhan-path"], null, seedNow)
  const baseSnapshot = withCanonicalEvents.embodimentWithSpatialEcology.embodimentWithAdaptation.embodimentWithEncounterRealization.embodimentWithRhythms.embodimentWithSocialEcology.embodimentWithHistory.embodiment

  const commands = translateToUnrealCommands(baseSnapshot)
  assert.ok(Array.isArray(commands), "the existing translator returns a real command array, not a thrown error, for the rich chain's own base snapshot")
  assert.ok(commands.length > 0, "a real, seeded Vrindavan location produces at least one real Unreal command (region/entity presentation), not an empty translation")
})

test("Build 02 Part 2, proof F: identical replay produces deep-equal Unreal-translated commands, not just deep-equal presentation state", async () => {
  const worldInstanceId = "living-vrindavan-build-02-determinism-replay-proof"
  await createWorldInstance(worldInstanceId, seedNow)

  const withCanonicalEventsA = await getEmbodimentWithCanonicalEvents(worldInstanceId, "replay-visitor", "yamuna", ["vrindavan-entry"], null, seedNow)
  const withCanonicalEventsB = await getEmbodimentWithCanonicalEvents(worldInstanceId, "replay-visitor", "yamuna", ["vrindavan-entry"], null, seedNow)

  const baseA = withCanonicalEventsA.embodimentWithSpatialEcology.embodimentWithAdaptation.embodimentWithEncounterRealization.embodimentWithRhythms.embodimentWithSocialEcology.embodimentWithHistory.embodiment
  const baseB = withCanonicalEventsB.embodimentWithSpatialEcology.embodimentWithAdaptation.embodimentWithEncounterRealization.embodimentWithRhythms.embodimentWithSocialEcology.embodimentWithHistory.embodiment

  const commandsA = translateToUnrealCommands(baseA)
  const commandsB = translateToUnrealCommands(baseB)

  assert.deepEqual(commandsA, commandsB, "two identical reads must translate into deep-equal Unreal commands -- determinism holds all the way to the renderer boundary, not just at the presentation-state layer")
})
