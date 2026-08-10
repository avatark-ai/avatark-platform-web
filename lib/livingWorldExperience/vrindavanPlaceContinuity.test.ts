import { test } from "node:test"
import assert from "node:assert/strict"
import { createWorldInstance } from "../livingWorldHost/hostService.ts"
import { composeVrindavanPlaceContinuity, computeVrindavanDirectNeighborLocationIds } from "./vrindavanPlaceContinuity.ts"

const seedNow = () => "2026-08-10T00:00:00.000Z"

// Proof E: nearby-place discovery. Yamuna is Vrindavan's own real
// hydrology hub (Sprint 16) -- directly connected to all three other
// real Approved locations; `vrindavan-entry` connects to Yamuna only
// (Build 01's own real finding, reconfirmed here through the NEW
// nearbyDestinations field specifically).
test("proof E: nearby destinations restate the real, authoritative spatial graph -- Yamuna reaches all three neighbors, entry reaches only Yamuna", async () => {
  const worldInstanceId = "living-vrindavan-build-04-place-continuity-nearby"
  await createWorldInstance(worldInstanceId, seedNow)

  const yamuna = await composeVrindavanPlaceContinuity(worldInstanceId, "build04-place-visitor-1", "yamuna", null, seedNow)
  const yamunaDestinationIds = yamuna.nearbyDestinations.map((d) => d.locationId).sort()
  assert.deepEqual(yamunaDestinationIds, ["govardhan-path", "kadamba-grove", "vrindavan-entry"])

  const entry = await composeVrindavanPlaceContinuity(worldInstanceId, "build04-place-visitor-1", "vrindavan-entry", null, seedNow)
  assert.deepEqual(entry.nearbyDestinations.map((d) => d.locationId), ["yamuna"])

  const govardhanDestination = yamuna.nearbyDestinations.find((d) => d.locationId === "govardhan-path")
  assert.equal(govardhanDestination?.viaRouteId, "route-govardhan-path", "the one real, authored Route (Sprint 16) is surfaced, distinct from plain reachability")
})

test("computeVrindavanDirectNeighborLocationIds agrees with the composed view's own nearbyDestinations", () => {
  assert.deepEqual([...computeVrindavanDirectNeighborLocationIds("yamuna")].sort(), ["govardhan-path", "kadamba-grove", "vrindavan-entry"])
})

// Proof F: living population visibility. The real seeded cow (Sprint
// 10, Build 01) is observed through the place continuity view's own
// `nearbyEntities` -- never manufactured because a visitor "arrived."
test("proof F: the real seeded population is observed, not manufactured -- nearbyEntities matches the real EmbodiedRegion's own entities exactly", async () => {
  const worldInstanceId = "living-vrindavan-build-04-place-continuity-population"
  await createWorldInstance(worldInstanceId, seedNow)

  const yamuna = await composeVrindavanPlaceContinuity(worldInstanceId, "build04-place-visitor-2", "yamuna", null, seedNow)
  assert.deepEqual(yamuna.nearbyEntities, yamuna.region.entities)
  assert.ok(yamuna.nearbyEntities.some((entity) => entity.entityId === "avatark-population-cow-1"), "the real, seeded cow (Build 01) is genuinely observed at its own real home range")
})

// Proof G: environmental/rhythm visibility -- season, day phase, and
// per-Patch ecology (Sprint 16) all reach the place continuity view
// through the extended presentation projection, unmodified.
test("proof G: environmental and rhythm state reach the place continuity view", async () => {
  const worldInstanceId = "living-vrindavan-build-04-place-continuity-environment"
  await createWorldInstance(worldInstanceId, seedNow)

  const yamuna = await composeVrindavanPlaceContinuity(worldInstanceId, "build04-place-visitor-3", "yamuna", null, seedNow)
  assert.equal(yamuna.season.id, "vasanta")
  assert.ok(yamuna.dayPhase.length > 0)
  assert.equal(yamuna.patchState?.patchId, "patch-yamuna")
  assert.ok(yamuna.patchState!.resourceAvailability.includes("water"), "Yamuna's own real, differentiated resource state (Build 03) is visible")
  assert.equal(yamuna.occupancy.locationId, "yamuna")
})

// Proof H: Canon-safe presence. Living Vrindavan's real content never
// activates a canonical event on a fresh, never-woken instance -- an
// honest, empty canonicalPresence array, never fabricated.
test("proof H: a never-activated place presents an honest, empty canonicalPresence -- never fabricated Canon", async () => {
  const worldInstanceId = "living-vrindavan-build-04-place-continuity-canon"
  await createWorldInstance(worldInstanceId, seedNow)

  const govardhanPath = await composeVrindavanPlaceContinuity(worldInstanceId, "build04-place-visitor-4", "govardhan-path", null, seedNow)
  assert.deepEqual(govardhanPath.canonicalPresence, [])
})

// Presentation hints: Build 03's own real microhabitat/vegetation-
// archetype content (additive, presentation-intent-only) is surfaced,
// never invented fresh for this build.
test("presentationHints surfaces Build 03's own real microhabitat/vegetation-archetype content for Kadamba Grove", async () => {
  const worldInstanceId = "living-vrindavan-build-04-place-continuity-hints"
  await createWorldInstance(worldInstanceId, seedNow)

  const grove = await composeVrindavanPlaceContinuity(worldInstanceId, "build04-place-visitor-5", "kadamba-grove", null, seedNow)
  const hintIds = grove.presentationHints.map((hint) => hint.id)
  assert.ok(hintIds.includes("grove-interior"))
  assert.ok(grove.presentationHints.some((hint) => hint.kind === "vegetation-archetype"))
})
