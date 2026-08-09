import { test } from "node:test"
import assert from "node:assert/strict"
import { getPopulationEmbodimentSnapshot, getPopulationGroupUnrealCommands, wakeWorldWithPopulation } from "./hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"

// Sprint 10, Phase 15/17/18: proves population entities and groups flow
// through Sprint 8's own embodiment/Unreal-command machinery end to end,
// side by side with Living Systems' own vegetation-roster entities --
// the actual integration point Phase 15 asks for, not just the unit-level
// contract extension.
test("the embodiment snapshot for yamuna includes the population cows alongside any Living Systems entities, each carrying its own group/movement semantics", async () => {
  const worldInstanceId = "population-embodiment-test-yamuna"
  await wakeWorldWithPopulation(worldInstanceId, "embodiment-owner-1", () => "2026-08-08T00:00:00.000Z")

  const snapshot = await getPopulationEmbodimentSnapshot(worldInstanceId, "visitor-1", "yamuna", ["kadamba-grove", "govardhan-path"])
  const cowPresentations = snapshot.current.entities.filter((e) => e.archetypeId === "avatark-population-cow")
  assert.equal(cowPresentations.length, 2, "both seeded cows appear at yamuna")
  assert.ok(cowPresentations.every((e) => e.groupId === "avatark-population-cow-herd"))
  assert.ok(cowPresentations.every((e) => e.presentationArchetype === "Cow"))

  await worldLeaseRepository.release(worldInstanceId, "embodiment-owner-1", (await worldLeaseRepository.getCurrent(worldInstanceId))!.leaseVersion)
})

test("the bird flock's own region (kadamba-grove) shows the bird population, not the cows -- population respects location like any other entity", async () => {
  const worldInstanceId = "population-embodiment-test-kadamba"
  await wakeWorldWithPopulation(worldInstanceId, "embodiment-owner-2", () => "2026-08-08T00:00:00.000Z")

  const snapshot = await getPopulationEmbodimentSnapshot(worldInstanceId, "visitor-1", "kadamba-grove", ["yamuna"])
  assert.ok(snapshot.current.entities.some((e) => e.archetypeId === "avatark-population-bird-flock"))
  assert.ok(!snapshot.current.entities.some((e) => e.archetypeId === "avatark-population-cow"), "cows live at yamuna, not kadamba-grove")

  const yamunaRegion = snapshot.reachable.find((r) => r.locationId === "yamuna")
  assert.ok(yamunaRegion?.entities.some((e) => e.archetypeId === "avatark-population-cow"), "the reachable region still shows its own population, proving this isn't a current-location-only special case")

  await worldLeaseRepository.release(worldInstanceId, "embodiment-owner-2", (await worldLeaseRepository.getCurrent(worldInstanceId))!.leaseVersion)
})

test("Unreal group commands report one SetGroupIntent per seeded group, headless, with zero Unreal dependency", async () => {
  const worldInstanceId = "population-embodiment-test-unreal-groups"
  await wakeWorldWithPopulation(worldInstanceId, "embodiment-owner-3", () => "2026-08-08T00:00:00.000Z")

  const commands = await getPopulationGroupUnrealCommands(worldInstanceId)
  assert.equal(commands.length, 2)
  assert.ok(commands.every((c) => c.op === "SetGroupIntent"))
  assert.ok(commands.some((c) => c.op === "SetGroupIntent" && c.groupId === "avatark-population-cow-herd"))
  assert.ok(commands.some((c) => c.op === "SetGroupIntent" && c.groupId === "avatark-population-bird-flock"))

  await worldLeaseRepository.release(worldInstanceId, "embodiment-owner-3", (await worldLeaseRepository.getCurrent(worldInstanceId))!.leaseVersion)
})
