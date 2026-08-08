// Sprint 9, Phase 20: performance CHARACTERIZATION, not a "million user"
// claim -- every number below is a real measurement taken in this
// environment, on this machine, right now. Run with:
//   node --experimental-strip-types scripts/sprint9-performance.ts
import { resolveWorldSnapshot } from "@avatark/living-systems-runtime"
import { emptyProtectedNarrativeProjection, emptyVisitorWorldMemory } from "@avatark/living-systems-contracts"
import type { EntityArchetype, LivingEntityState, SeasonDefinition, SharedWorldState } from "@avatark/living-systems-contracts"
import { computeSpatialLayout, resolveWorldEmbodiment, diffWorldEmbodiment } from "@avatark/world-embodiment-runtime"
import { computeDeterministicCatchUp, createCheckpoint, recoverAuthoritativeState } from "@avatark/world-persistence-runtime"
import { LIVING_VRINDAVAN_DEFINITION } from "../lib/livingWorldRuntime/vrindavanDefinition.ts"
import { LIVING_VRINDAVAN_EXPERIENCE } from "../lib/livingWorldRuntime/experienceDefinition.ts"

const VASANTA_ENVELOPE = { temperatureBand: "moderate" as const, precipitationBand: "moderate" as const, humidityBand: "moderate" as const, hydrologyBaselineBand: "moderate" as const, vegetationActivityBand: "high" as const, animalActivityBand: "moderate" as const }
const GRISHMA_ENVELOPE = { temperatureBand: "high" as const, precipitationBand: "low" as const, humidityBand: "low" as const, hydrologyBaselineBand: "low" as const, vegetationActivityBand: "moderate" as const, animalActivityBand: "low" as const }
const VASANTA: SeasonDefinition = { id: "vasanta", name: "Vasanta", order: 1, canonId: "STK-CAN-006", environmentalEnvelope: VASANTA_ENVELOPE, minDurationTicks: 4, allowedNextSeasonIds: ["grishma"] }
const GRISHMA: SeasonDefinition = { id: "grishma", name: "Grīṣma", order: 2, canonId: "STK-CAN-006", environmentalEnvelope: GRISHMA_ENVELOPE, minDurationTicks: 4, allowedNextSeasonIds: [] }
const SEASONS = [VASANTA, GRISHMA]
const VEGETATION: EntityArchetype = { id: "riverbank-vegetation", name: "Riverbank Vegetation", locationId: "yamuna", lifecyclePhases: ["dormant", "budding", "flowering", "seeding"], initialLifecyclePhase: "dormant" }
const ARCHETYPES = [VEGETATION]
const now = () => "2026-08-08T00:00:00.000Z"
const WORLD_INSTANCE_ID = "living-vrindavan"

function freshSharedState(): SharedWorldState {
  return {
    worldId: WORLD_INSTANCE_ID,
    worldVersion: 1,
    clock: { worldId: WORLD_INSTANCE_ID, tick: 0, paused: false },
    season: { currentSeasonId: "vasanta", enteredAtTick: 0 },
    environment: {
      weather: { temperatureBand: "moderate", precipitationBand: "moderate", humidityBand: "moderate" },
      hydrology: { hydrologyBand: "moderate", soilMoistureBand: "moderate" },
      ecology: { vegetationActivityBand: "high", animalActivityBand: "moderate" },
    },
  }
}
function freshEntities(): LivingEntityState[] {
  return [{ id: "e1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "dormant", attributes: {}, lastUpdatedTick: 0 }]
}

function bytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf-8")
}

function timeMs(fn: () => void): number {
  const start = performance.now()
  fn()
  return performance.now() - start
}

console.log("=== Sprint 9, Phase 20: performance measurements (this environment only) ===\n")

// 1. Catch-up execution time at several scales.
for (const ticks of [10, 1_000, 100_000]) {
  let result: ReturnType<typeof computeDeterministicCatchUp> | undefined
  const ms = timeMs(() => {
    result = computeDeterministicCatchUp({ worldInstanceId: WORLD_INSTANCE_ID, sharedState: freshSharedState(), entities: freshEntities(), seasonDefinitions: SEASONS, entityArchetypes: ARCHETYPES, ticks, seed: "perf-seed", now })
  })
  console.log(`catch-up ${String(ticks).padStart(7)} ticks: ${ms.toFixed(2)}ms, ${result!.eventRecords.length} events produced (${(bytes(result!.eventRecords) / Math.max(1, result!.eventRecords.length)).toFixed(0)} bytes/event avg)`)
}

// 2. Checkpoint size.
const checkpointBasis = computeDeterministicCatchUp({ worldInstanceId: WORLD_INSTANCE_ID, sharedState: freshSharedState(), entities: freshEntities(), seasonDefinitions: SEASONS, entityArchetypes: ARCHETYPES, ticks: 4, seed: "perf-seed", now })
const checkpoint = createCheckpoint({ id: "perf-ckpt-1", worldInstanceId: WORLD_INSTANCE_ID, checkpointVersion: 1, stateVersion: 1, sharedState: checkpointBasis.sharedState, entities: checkpointBasis.entities, eventSequenceAsOf: 0, reason: "periodic", now })
console.log(`\ncheckpoint (1 entity): ${bytes(checkpoint)} bytes serialized`)

// 3. Recovery time as a function of how many events must be replayed.
for (const eventsToReplay of [10, 1_000, 10_000]) {
  const postCheckpoint = computeDeterministicCatchUp({ worldInstanceId: WORLD_INSTANCE_ID, sharedState: checkpointBasis.sharedState, entities: checkpointBasis.entities, seasonDefinitions: SEASONS, entityArchetypes: ARCHETYPES, ticks: eventsToReplay, seed: "perf-seed", now })
  const eventsAfterCheckpoint = postCheckpoint.eventRecords.map((e, i) => ({ ...e, sequence: i + 1 }))
  const ms = timeMs(() => {
    recoverAuthoritativeState({ checkpoint, eventsAfterCheckpoint, seasonDefinitions: SEASONS, entityArchetypes: ARCHETYPES, seed: "perf-seed", now })
  })
  console.log(`recovery replaying ${String(eventsToReplay).padStart(6)} ticks-worth of events: ${ms.toFixed(2)}ms`)
}

// 4. WorldSnapshot size.
const snapshot = resolveWorldSnapshot({
  sharedState: checkpointBasis.sharedState,
  seasonDefinitions: SEASONS,
  entities: checkpointBasis.entities,
  encounterRules: [],
  locationId: "yamuna",
  visitorMemory: emptyVisitorWorldMemory("visitor-1", WORLD_INSTANCE_ID),
  protectedNarrative: emptyProtectedNarrativeProjection(WORLD_INSTANCE_ID),
  provenance: { worldArtifactSpecId: "perf-test", systemsArtifactSpecId: "perf-test", canonDocIds: [] },
  now,
})
console.log(`\nWorldSnapshot (1 entity, 0 encounter rules): ${bytes(snapshot)} bytes serialized`)

// 5. WorldEmbodimentSnapshot + delta size across a season transition.
// Reuses the real Living Vrindavan definition/experience data (read-only
// StudioK-sourced fixtures, not fabricated for this script) so
// resolveWorldEmbodiment has genuine LocationExperience content to work
// with, exactly as lib/worldPersistence/durableSnapshot.ts does.
const spatialLayout = computeSpatialLayout(LIVING_VRINDAVAN_DEFINITION.locations)
const locationNames = Object.fromEntries(LIVING_VRINDAVAN_DEFINITION.locations.map((l) => [l.id, l.name]))
const experienceByLocation = Object.fromEntries(LIVING_VRINDAVAN_EXPERIENCE.locations.map((l) => [l.id, l]))
const archetypesById = { "riverbank-vegetation": VEGETATION }

const embodimentBefore = resolveWorldEmbodiment({
  currentSnapshot: snapshot,
  reachableSnapshots: [],
  locationNames,
  spatialLayout,
  experienceByLocation,
  archetypesById,
  transitions: [],
  soundEnabled: false,
  provenance: { worldArtifactSpecId: "perf-test", experienceArtifactSpecId: "perf-test", systemsArtifactSpecId: "perf-test", canonDocIds: [] },
})

const afterTransition = computeDeterministicCatchUp({ worldInstanceId: WORLD_INSTANCE_ID, sharedState: checkpointBasis.sharedState, entities: checkpointBasis.entities, seasonDefinitions: SEASONS, entityArchetypes: ARCHETYPES, ticks: 4, seed: "perf-seed", now })
const snapshotAfter = resolveWorldSnapshot({
  sharedState: afterTransition.sharedState,
  seasonDefinitions: SEASONS,
  entities: afterTransition.entities,
  encounterRules: [],
  locationId: "yamuna",
  visitorMemory: emptyVisitorWorldMemory("visitor-1", WORLD_INSTANCE_ID),
  protectedNarrative: emptyProtectedNarrativeProjection(WORLD_INSTANCE_ID),
  provenance: { worldArtifactSpecId: "perf-test", systemsArtifactSpecId: "perf-test", canonDocIds: [] },
  now,
})
const embodimentAfter = resolveWorldEmbodiment({
  currentSnapshot: snapshotAfter,
  reachableSnapshots: [],
  locationNames,
  spatialLayout,
  experienceByLocation,
  archetypesById,
  transitions: [],
  soundEnabled: false,
  provenance: { worldArtifactSpecId: "perf-test", experienceArtifactSpecId: "perf-test", systemsArtifactSpecId: "perf-test", canonDocIds: [] },
})
const delta = diffWorldEmbodiment(embodimentBefore, embodimentAfter)
console.log(`\nWorldEmbodimentSnapshot (1 region, 1 entity): ${bytes(embodimentAfter)} bytes serialized`)
console.log(`EmbodimentDelta across one season transition: ${bytes(delta)} bytes (${delta.entries.length} entries) vs ${bytes(embodimentAfter)} bytes for the full snapshot -- ${((bytes(delta) / bytes(embodimentAfter)) * 100).toFixed(0)}% of full-snapshot size`)

console.log("\n=== scaling dimensions (not measured directly -- reasoned from the code structure above) ===")
console.log("- catch-up time: linear in ticks requested (one causal-pipeline pass per tick, independent of entity count per Sprint 7's own O(entities) inner loop)")
console.log("- catch-up time: linear in entities per world instance (each tick maps advanceEntityLifecycle over every entity)")
console.log("- checkpoint size: linear in entity count; independent of tick count or event history length (a checkpoint never carries history, only current state)")
console.log("- event volume: proportional to world-system EVENTS (season transitions, lifecycle changes), not ticks -- most ticks emit zero events; only clock.advanced is emitted once per catch-up call regardless of ticks")
console.log("- recovery time: linear in ticks-worth of events replayed since the last checkpoint -- bounded by checkpoint frequency, a lifecycle-policy knob (Phase 5), not a core constant")
console.log("- snapshot/embodiment size: linear in entities + encounter rules AT the current location, and in reachable-location count (each reachable location contributes its own region)")
console.log("- world INSTANCE count: each instance's durable state/checkpoint/event rows are fully independent (proven in multiVisitorMultiInstance.test.ts) -- this dimension scales horizontally by instance count with no shared mutable state between instances in the reference adapters")
