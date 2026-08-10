import { test } from "node:test"
import assert from "node:assert/strict"
import { buildSpatialMembershipIndex } from "@avatark/spatial-ecology-runtime"
import { emptyProtectedNarrativeProjection } from "@avatark/living-systems-contracts"
import { resolveEncounterRealization } from "@avatark/encounter-realization-runtime"
import { computeReturnRecognition, deriveWorldEvents } from "@avatark/world-memory-runtime"
import { fixedRateTickPolicy, InMemoryWorldLeaseRepository, resolveTicksToApply } from "@avatark/world-persistence-runtime"
import { LIVING_FOREST_SPATIAL_GRAMMAR, LIVING_FOREST_WORLD_ID } from "./definition.ts"
import {
  advanceForest,
  authorizeAndRecordForestParticipation,
  buildForestMemoryHints,
  buildForestWorldSnapshot,
  computeForestEncounterOpportunities,
  createFreshForestSharedState,
  createInitialForestPopulation,
  realizeForestEncounters,
  recordForestMemory,
} from "./hostService.ts"
import type { ForestPopulation } from "./hostService.ts"
import { createLivingForestRepositories } from "./repositories.ts"
import { buildForestEmbodimentSnapshot } from "./embodiment.ts"

// StudioK Living World Kernel vertical slice -- SECOND world proof.
//
// Every generic runtime package this file exercises already has its OWN
// `livingForest*Portability.test.ts` unit-level fixture, independently
// proving the SAME functions don't hardcode Living Vrindavan (see
// docs/STUDIOK_LIVING_WORLD_KERNEL_VERTICAL_SLICE.md §1 for the full
// inventory). What did NOT exist anywhere in this repository before this
// file is an actual composed, end-to-end HOST-LAYER world -- content
// definitions + a wake/tick/memory/embodiment chain wiring them together
// -- proving the composition itself (not just each isolated function) is
// portable, and demonstrating the mission's own required narrative arc:
//
//   morning world state -> environmental/resource conditions -> animal
//   rhythm -> movement toward water/resource -> visitor enters patch ->
//   encounter opportunity -> encounter realization -> consequence ->
//   world/entity/place memory -> future behavior changes -> renderer-
//   neutral presentation projection -- persisting across leave/return.
//
// Nothing below is scripted per-step: every assertion reads the REAL
// output of a REAL, unmodified generic function, called through this
// world's own (new, isolated) Host-layer composition in lib/livingForest/.

const now = () => "2026-08-10T06:00:00.000Z"
const visitorId = "forest-visitor-1"

function freshWorld() {
  const repositories = createLivingForestRepositories()
  const sharedState = createFreshForestSharedState()
  const population = createInitialForestPopulation()
  const protectedNarrative = emptyProtectedNarrativeProjection(LIVING_FOREST_WORLD_ID)
  return { repositories, sharedState, population, protectedNarrative }
}

// ---------------------------------------------------------------------
// A. Spatial addressing (World -> Domain -> Sector -> Quadrant -> Patch
// -> Local Place -> Entity), per the mission's own architectural law:
// Sector/Quadrant/Patch are StudioK semantic units, never a renderer
// streaming/grid concept -- proven here by construction (nothing in
// this grammar or `buildSpatialMembershipIndex` names a World Partition
// cell, PCG grid, or HLOD level).
test("A. spatial addressing resolves Sector F01 / Quadrant NW / Patch P01 membership for the entry location", () => {
  const membership = buildSpatialMembershipIndex(LIVING_FOREST_SPATIAL_GRAMMAR)
  const entry = membership.get("forest-clearing")
  assert.equal(entry?.localPlaceId, "place-forest-clearing")
  assert.equal(entry?.patchId, "patch-forest-p01")
  assert.equal(entry?.quadrantId, "forest-f01-nw")
  assert.equal(entry?.sectorId, "forest-f01")
  assert.equal(entry?.domainId, "forest-domain")

  const stream = membership.get("forest-stream")
  assert.equal(stream?.patchId, "patch-forest-p02")
  const pond = membership.get("forest-pond")
  assert.equal(pond?.patchId, "patch-forest-p03")
})

// ---------------------------------------------------------------------
// B. Morning world state / environmental conditions -- the mission's
// own opening step. Canopy-wet's real envelope (unmodified
// @avatark/living-systems-runtime engine) gives high animal/vegetation
// activity and high hydrology at tick 0; tick 1 lands inside the
// world-shared MORNING day phase (living-rhythms-runtime, unmodified).
test("B. morning world state carries real environmental/resource conditions from the causal engine, unmodified", () => {
  const { sharedState } = freshWorld()
  assert.equal(sharedState.season.currentSeasonId, "canopy-wet")
  assert.equal(sharedState.environment.ecology.animalActivityBand, "high")
  assert.equal(sharedState.environment.hydrology.hydrologyBand, "high")
})

// ---------------------------------------------------------------------
// C/D/E/F. The main narrative: arrival -> encounter opportunity ->
// realization -> consequence -> memory -> rhythm-driven movement toward
// water -> renderer-neutral presentation, entirely through real,
// unmodified generic functions.
test("C-F. visitor arrival -> encounter opportunity -> realization -> consequence -> memory, then rhythm/movement toward water", async () => {
  const { repositories, sharedState, population, protectedNarrative } = freshWorld()

  // "Visitor enters patch" -- read at the moment of arrival, before any
  // tick advances (see computeForestEncounterOpportunities' own doc
  // comment for why this ordering matters).
  const opportunities = computeForestEncounterOpportunities(population.entities, sharedState, protectedNarrative)
  assert.equal(opportunities.length, 1)
  assert.equal(opportunities[0].ruleId, "forest-clearing-ambient-presence")
  assert.deepEqual(new Set(opportunities[0].contributingEntityIds), new Set(["deer-1", "deer-2"]))

  const realized = await realizeForestEncounters({
    opportunities,
    populationEntities: population.entities,
    behaviorStates: population.behaviorStates,
    groups: population.groups,
    protectedNarrative,
    worldVersion: sharedState.worldVersion,
    tick: sharedState.clock.tick,
    seasonId: sharedState.season.currentSeasonId,
    repositories,
  })
  assert.equal(realized.records.length, 1)
  assert.equal(realized.records[0].status, "REALIZED", "both deer present + stationary + real resource opportunity -> realizes, not guaranteed by presence alone (see test G for the non-guaranteed case)")

  // Visitor participates in the now-available, now-realized encounter.
  const arrivalSnapshot = buildForestWorldSnapshot(sharedState, population.entities, "forest-clearing", visitorId, now)
  const participation = await authorizeAndRecordForestParticipation(visitorId, "forest-clearing-ambient-presence", "forest-clearing", arrivalSnapshot, repositories, now)
  assert.equal(participation.authorization.authorized, true)
  assert.equal(participation.record?.encounterRecordId, realized.records[0].id, "the visitor's own participation record links to the real EncounterRecord already derived, never a second consequence authority")

  // Consequence -> world/entity/place memory, from the REALIZED
  // encounter alone (no population movement yet this tick).
  const memoryFromEncounter = await recordForestMemory({ now, populationEvents: [], resolvedEncounters: realized.resolvedForMemory, repositories })
  assert.ok(memoryFromEncounter.worldEvents.some((e) => e.category === "ENCOUNTER_RESOLVED"))
  assert.ok(memoryFromEncounter.entityMemoryEntries.some((e) => e.entityId === "deer-1" && e.type === "RECENT_ENCOUNTER_INVOLVEMENT"))

  // Rhythm + movement toward water: advancing one tick lands in the
  // world-shared MORNING day phase, whose routine bonus (real
  // living-rhythms-runtime data, wired through
  // `routineEntriesByArchetypeId`) makes MOVE_TO_RESOURCE outscore
  // GRAZE/REST for a thirsty deer -- an emergent utility comparison
  // (needs pressure + rhythm-phase bonus + routine bonus), never a
  // scripted "move on tick 1" branch.
  const advanced = advanceForest({ sharedState, population, ticks: 1, seed: "vertical-slice-main", now, protectedNarrative })
  assert.equal(advanced.sharedState.clock.tick, 1)
  for (const entity of advanced.population.entities) {
    assert.equal(entity.locationId, "forest-stream", "both deer, with no memory hint yet, independently resolve the SAME deterministic default (first reachable water location) -- see test H for the memory-diverges-this case")
  }
  const movementEvents = advanced.result.populationEvents.filter((e) => e.type === "entity.moved")
  assert.equal(movementEvents.length, 2)

  const memoryFromMovement = await recordForestMemory({ now, populationEvents: advanced.result.populationEvents, resolvedEncounters: [], repositories })
  assert.ok(memoryFromMovement.worldEvents.some((e) => e.category === "POPULATION_MOVEMENT"))

  // G. Renderer-neutral presentation projection -- the pipeline's own
  // final step. Built from the EXACT unmodified `resolveWorldEmbodiment`
  // (Sprint 8, already backing Living Vrindavan's own Unreal
  // translation path) -- no Unreal-specific type appears anywhere in
  // its input or output.
  const streamSnapshot = buildForestWorldSnapshot(advanced.sharedState, advanced.population.entities, "forest-stream", visitorId, now)
  const clearingSnapshot = buildForestWorldSnapshot(advanced.sharedState, advanced.population.entities, "forest-clearing", visitorId, now)
  const embodiment = buildForestEmbodimentSnapshot(streamSnapshot, [clearingSnapshot])
  assert.equal(embodiment.current.locationId, "forest-stream")
  assert.equal(embodiment.current.entities.length, 2, "both deer are now presented at forest-stream, reflecting the real movement above")
  assert.equal(embodiment.reachable.length, 1)
  const embodimentSource = JSON.stringify(embodiment)
  assert.ok(!/UObject|AActor|Blueprint|Unreal/i.test(embodimentSource), "no Unreal-specific type leaks into the renderer-neutral snapshot")
})

// ---------------------------------------------------------------------
// E (continued). Encounter opportunity does not guarantee realization --
// the SAME real `resolveEncounterRealization` function, given a
// deliberately low-compatibility/no-resource scenario, returns EXPIRED
// rather than REALIZED. This directly exercises the mission's own "not
// guaranteed by presence alone" requirement using the identical
// mechanism the REALIZED case above uses, not a weaker substitute.
test("E. encounter realization is conditional, not guaranteed -- the same function returns EXPIRED for a low-compatibility case", () => {
  const protectedNarrative = emptyProtectedNarrativeProjection(LIVING_FOREST_WORLD_ID)
  const result = resolveEncounterRealization({
    opportunity: { ruleId: "forest-clearing-ambient-presence", locationId: "forest-clearing", category: "ambient", contributingEntityIds: ["deer-1"], tick: 0 },
    protectedNarrative,
    presentEntityIds: ["deer-1"],
    routineCompatibleEntityIds: [],
    groupCohesion: null,
    relationshipBand: null,
    resourceOpportunityAvailable: false,
    variation: 0.9,
  })
  assert.equal(result.status, "EXPIRED")
})

// ---------------------------------------------------------------------
// H. Future behavior changes via memory -- an ISOLATED, directly-
// constructed proof rather than folded into the main narrative above.
//
// Why isolated: the main narrative's own tick-0 ambient encounter
// already writes a REAL `PREVIOUS_RESOURCE_LOCATION` memory entry
// (pointing at `forest-clearing`, from the encounter's own
// `RESOURCE_PREFERENCE` consequence -- confirmed by direct inspection,
// not assumed), and the tick-1 movement writes a SECOND one (pointing
// at `forest-stream`, the very destination the main narrative's own
// deterministic default already picks). Folding this proof into that
// same run would only re-confirm the existing default, not demonstrate
// divergence FROM it. This test instead directly seeds one deer with a
// `PREVIOUS_RESOURCE_LOCATION` entry representing history from BEFORE
// this session's own simulated window (exactly as legitimate as
// authoring any other piece of initial world state -- a real Host
// layer choosing initial content, never a scripted per-step branch),
// leaving a second, otherwise-identical deer with no such history as
// the control.
//
// This resolves a real, previously-named limitation: Living Vrindavan's
// own Build 03 final report flagged `memoryHint`'s divergence as
// "currently unobservable" purely because Vrindavan's own resource
// affordances map every tag to exactly one location. Living Forest's
// content deliberately does not collapse that way (forest-stream AND
// forest-pond both carry "water"), so the SAME already-live-wired
// bridge (`resolvePreferredResourceLocation` -> `selectBehavior`'s own
// `preferMemoryOrFirst`) finally diverges observably. Zero new runtime
// code; a content-authoring choice only.
test("H. a seeded PREVIOUS_RESOURCE_LOCATION memory entry changes which water source an otherwise-identical entity chooses", async () => {
  const { repositories, sharedState, population, protectedNarrative } = freshWorld()

  await repositories.entityMemory.append({
    id: "seed-deer-1-forest-pond",
    worldId: LIVING_FOREST_WORLD_ID,
    entityId: "deer-1",
    type: "PREVIOUS_RESOURCE_LOCATION",
    tick: -1,
    detail: { locationId: "forest-pond" },
    significance: "MEANINGFUL",
    provenance: { derivedFromEventIds: [], derivationRule: "seeded-prior-history", causalReferences: [] },
  })

  const memoryHintByEntityId = await buildForestMemoryHints(["deer-1", "deer-2"], repositories)
  assert.equal(memoryHintByEntityId.get("deer-1")?.preferredResourceLocationId, "forest-pond")
  assert.equal(memoryHintByEntityId.get("deer-2")?.preferredResourceLocationId, null)

  const advanced = advanceForest({ sharedState, population, ticks: 1, seed: "vertical-slice-memory", now, protectedNarrative, memoryHintByEntityId })
  const deer1 = advanced.population.entities.find((e) => e.id === "deer-1")
  const deer2 = advanced.population.entities.find((e) => e.id === "deer-2")
  assert.equal(deer1?.locationId, "forest-pond", "memory-directed: diverges from the raw default")
  assert.equal(deer2?.locationId, "forest-stream", "no memory: the SAME deterministic default as the main narrative")
})

// ---------------------------------------------------------------------
// F/I. Persistence across leave/return, using @avatark/world-persistence-runtime's
// own real, generic lease + tick-policy primitives directly (never
// touching lib/worldPersistence/hostService.ts, which bakes Living
// Vrindavan's own content in at module scope -- see the final report's
// architecture-boundary section for why a parallel call-site was used
// instead of that file).
test("F/I. leave -> world evolves while away -> return -> Place Continuity/ReturnRecognition-equivalent facts are observable", async () => {
  const { repositories, sharedState, population, protectedNarrative } = freshWorld()
  const leaseRepo = new InMemoryWorldLeaseRepository()
  const tickPolicy = fixedRateTickPolicy(1_000) // 1 tick per real second, injected time only

  const acquired = await leaseRepo.acquire(LIVING_FOREST_WORLD_ID, visitorId, 60_000, () => "2026-08-10T06:00:00.000Z")
  assert.equal(acquired.status, "acquired")

  const departureTick = sharedState.clock.tick
  const departureAt = "2026-08-10T06:00:00.000Z"
  await leaseRepo.release(LIVING_FOREST_WORLD_ID, visitorId, acquired.lease.leaseVersion)

  // The visitor leaves. The world evolves on its own for a real,
  // injected span of elapsed time -- long enough to cross a full
  // season's `minDurationTicks` (3), so canopy-wet -> drought fires
  // through the SAME unmodified season-transition rule every other
  // build in this repository already relies on.
  const returnAt = "2026-08-10T06:00:05.000Z" // +5s = +5 ticks at 1 tick/s
  const ticksWhileAway = resolveTicksToApply({ lastActiveAt: departureAt, lastCheckpointTick: departureTick, currentTick: departureTick, now: () => returnAt, tickPolicy })
  assert.equal(ticksWhileAway, 5)

  const whileAway = advanceForest({ sharedState, population, ticks: ticksWhileAway, seed: "vertical-slice-leave-return", now: () => returnAt, protectedNarrative })
  assert.equal(whileAway.sharedState.season.currentSeasonId, "drought", "the world's own season rule fires while nobody is present to watch it, unmodified engine")

  const memoryWhileAway = await recordForestMemory({
    now: () => returnAt,
    populationEvents: whileAway.result.populationEvents,
    resolvedEncounters: [],
    repositories,
  })
  // Season transitions are only recorded via `seasonTransitions` input,
  // not `populationEvents` -- append that fact directly (mirrors
  // lib/worldMemory/hostService.ts's own before/after diffing), the
  // ONE piece of Host-layer diffing this proof performs by hand rather
  // than obtaining it as a side-channel from advanceForest.
  const seasonEvent = deriveWorldEvents({
    worldId: LIVING_FOREST_WORLD_ID,
    now: () => returnAt,
    seasonTransitions: [{ tick: departureTick + 3, fromSeasonId: "canopy-wet", toSeasonId: "drought" }],
    environmentalBandChanges: [],
    locationConditionChanges: [],
    populationEvents: [],
    encounterAvailabilityChanges: [],
  })
  for (const event of seasonEvent) await repositories.worldEvents.append(event)

  // Return: re-acquire the lease, then read back what changed since
  // departure -- the Living Forest analogue of Build 04's own
  // `ReturnRecognition`.
  const reacquired = await leaseRepo.acquire(LIVING_FOREST_WORLD_ID, visitorId, 60_000, () => returnAt)
  assert.equal(reacquired.status, "acquired")

  const eventsSinceDeparture = [...memoryWhileAway.worldEvents, ...seasonEvent]
  const recognition = computeReturnRecognition(LIVING_FOREST_WORLD_ID, visitorId, departureTick, whileAway.sharedState.clock.tick, eventsSinceDeparture)
  assert.ok(recognition.facts.some((f) => f.type === "season_changed"), "the returning visitor's own recognition surfaces the season change that happened while away")
  assert.ok(recognition.facts.some((f) => f.type === "population_relocated"), "and the population's own real movement during the absence")

  // Presentation reflects continuity, not a reset: the entities that
  // moved while the visitor was away are still identity-stable
  // (`deer-1`/`deer-2`), never respawned.
  assert.deepEqual(new Set(whileAway.population.entities.map((e) => e.id)), new Set(["deer-1", "deer-2"]))
})

// ---------------------------------------------------------------------
// H (determinism). The composed chain (environment + population +
// rhythm + memory) is exactly as deterministic as its unmodified
// underlying engine calls -- proven two ways: (1) identical seed/state
// run twice produces identical output, and (2) N ticks in one call
// equals N single-tick calls composed, the SAME catch-up-vs-live-
// stepping equivalence Sprint 9's own causal engine already proves,
// now demonstrated across the full composed chain this vertical slice
// adds on top of it.
test("determinism: identical seed + initial state + inputs reproduce identical output", () => {
  const runOnce = () => {
    const sharedState = createFreshForestSharedState()
    const population = createInitialForestPopulation()
    return advanceForest({ sharedState, population, ticks: 4, seed: "determinism-fixed-seed", now })
  }
  const first = runOnce()
  const second = runOnce()
  assert.deepEqual(first.sharedState, second.sharedState)
  assert.deepEqual(first.population.entities, second.population.entities)
  assert.deepEqual(first.population.behaviorStates, second.population.behaviorStates)
})

test("determinism: 4 ticks in one call produces the identical final state as 4 sequential single-tick calls", () => {
  const batched = advanceForest({ sharedState: createFreshForestSharedState(), population: createInitialForestPopulation(), ticks: 4, seed: "catchup-equivalence-seed", now })

  let sharedState = createFreshForestSharedState()
  let population: ForestPopulation = createInitialForestPopulation()
  for (let i = 0; i < 4; i++) {
    const step = advanceForest({ sharedState, population, ticks: 1, seed: "catchup-equivalence-seed", now })
    sharedState = step.sharedState
    population = step.population
  }

  assert.deepEqual(batched.sharedState, sharedState)
  assert.deepEqual(batched.population.entities, population.entities)
})
