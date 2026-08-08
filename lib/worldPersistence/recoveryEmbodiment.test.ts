import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveWorldSnapshot } from "@avatark/living-systems-runtime"
import { emptyProtectedNarrativeProjection, emptyVisitorWorldMemory } from "@avatark/living-systems-contracts"
import { computeSpatialLayout, resolveWorldEmbodiment } from "@avatark/world-embodiment-runtime"
import { computeDeterministicCatchUp, createCheckpoint, recoverAuthoritativeState } from "@avatark/world-persistence-runtime"
import { LIVING_VRINDAVAN_ENCOUNTER_RULES, LIVING_VRINDAVAN_ENTITY_ARCHETYPES, LIVING_VRINDAVAN_SEASONS, LIVING_VRINDAVAN_SYSTEMS_PROVENANCE } from "../livingSystems/systemsDefinition.ts"
import { LIVING_VRINDAVAN_DEFINITION } from "../livingWorldRuntime/vrindavanDefinition.ts"
import { LIVING_VRINDAVAN_EXPERIENCE } from "../livingWorldRuntime/experienceDefinition.ts"

const WORLD_INSTANCE_ID = "living-vrindavan"
const now = () => "2026-08-08T00:00:00.000Z"

// Test matrix #16: embodiment after recovery. This does not re-prove
// recovery itself (@avatark/world-persistence-runtime's own
// recovery.test.ts already does, byte for byte) -- it proves the
// RECOVERED sharedState/entities flow through Sprint 7/8's existing
// resolveWorldSnapshot -> resolveWorldEmbodiment chain with zero special
// casing for "this state came from recovery" (Phase 13's own
// requirement: recovery must not require inventing renderer-specific
// state inside persistence).
test("a recovered world's state produces a valid WorldEmbodimentSnapshot through the unmodified Sprint 7/8 resolution chain", () => {
  const toCheckpoint = computeDeterministicCatchUp({
    worldInstanceId: WORLD_INSTANCE_ID,
    sharedState: {
      worldId: WORLD_INSTANCE_ID,
      worldVersion: 1,
      clock: { worldId: WORLD_INSTANCE_ID, tick: 0, paused: false },
      season: { currentSeasonId: "vasanta", enteredAtTick: 0 },
      environment: {
        weather: { temperatureBand: "moderate", precipitationBand: "moderate", humidityBand: "moderate" },
        hydrology: { hydrologyBand: "moderate", soilMoistureBand: "moderate" },
        ecology: { vegetationActivityBand: "high", animalActivityBand: "moderate" },
      },
    },
    entities: LIVING_VRINDAVAN_ENTITY_ARCHETYPES.map((a) => ({ id: `${a.id}-1`, archetypeId: a.id, locationId: a.locationId, lifecyclePhase: a.initialLifecyclePhase, attributes: {}, lastUpdatedTick: 0 })),
    seasonDefinitions: LIVING_VRINDAVAN_SEASONS,
    entityArchetypes: LIVING_VRINDAVAN_ENTITY_ARCHETYPES,
    ticks: 3,
    seed: "recovery-embodiment-seed",
    now,
  })
  const checkpoint = createCheckpoint({
    id: "recovery-embodiment-ckpt-1",
    worldInstanceId: WORLD_INSTANCE_ID,
    checkpointVersion: 1,
    stateVersion: 1,
    sharedState: toCheckpoint.sharedState,
    entities: toCheckpoint.entities,
    eventSequenceAsOf: 0,
    reason: "periodic",
    now,
  })

  const postCheckpoint = computeDeterministicCatchUp({
    worldInstanceId: WORLD_INSTANCE_ID,
    sharedState: toCheckpoint.sharedState,
    entities: toCheckpoint.entities,
    seasonDefinitions: LIVING_VRINDAVAN_SEASONS,
    entityArchetypes: LIVING_VRINDAVAN_ENTITY_ARCHETYPES,
    ticks: 2,
    seed: "recovery-embodiment-seed",
    now,
  })
  const eventsAfterCheckpoint = postCheckpoint.eventRecords.map((e, i) => ({ ...e, sequence: i + 1 }))

  const recovered = recoverAuthoritativeState({
    checkpoint,
    eventsAfterCheckpoint,
    seasonDefinitions: LIVING_VRINDAVAN_SEASONS,
    entityArchetypes: LIVING_VRINDAVAN_ENTITY_ARCHETYPES,
    seed: "recovery-embodiment-seed",
    now,
  })

  const currentSnapshot = resolveWorldSnapshot({
    sharedState: recovered.sharedState,
    seasonDefinitions: LIVING_VRINDAVAN_SEASONS,
    entities: recovered.entities,
    encounterRules: LIVING_VRINDAVAN_ENCOUNTER_RULES,
    locationId: "yamuna",
    visitorMemory: emptyVisitorWorldMemory("visitor-1", WORLD_INSTANCE_ID),
    protectedNarrative: emptyProtectedNarrativeProjection(WORLD_INSTANCE_ID),
    provenance: { worldArtifactSpecId: LIVING_VRINDAVAN_SYSTEMS_PROVENANCE.worldArtifactSpecId, systemsArtifactSpecId: LIVING_VRINDAVAN_SYSTEMS_PROVENANCE.specId, canonDocIds: LIVING_VRINDAVAN_SYSTEMS_PROVENANCE.canonDocIds },
    now,
  })

  const embodiment = resolveWorldEmbodiment({
    currentSnapshot,
    reachableSnapshots: [],
    locationNames: Object.fromEntries(LIVING_VRINDAVAN_DEFINITION.locations.map((l) => [l.id, l.name])),
    spatialLayout: computeSpatialLayout(LIVING_VRINDAVAN_DEFINITION.locations),
    experienceByLocation: Object.fromEntries(LIVING_VRINDAVAN_EXPERIENCE.locations.map((l) => [l.id, l])),
    archetypesById: Object.fromEntries(LIVING_VRINDAVAN_ENTITY_ARCHETYPES.map((a) => [a.id, a])),
    transitions: [],
    soundEnabled: false,
    provenance: {
      worldArtifactSpecId: LIVING_VRINDAVAN_SYSTEMS_PROVENANCE.worldArtifactSpecId,
      experienceArtifactSpecId: LIVING_VRINDAVAN_EXPERIENCE.provenance.specId,
      systemsArtifactSpecId: LIVING_VRINDAVAN_SYSTEMS_PROVENANCE.specId,
      canonDocIds: [...new Set([...LIVING_VRINDAVAN_EXPERIENCE.provenance.canonDocIds, ...LIVING_VRINDAVAN_SYSTEMS_PROVENANCE.canonDocIds])],
    },
  })

  assert.equal(embodiment.simulationTick, 5)
  assert.equal(embodiment.season.id, "grishma")
  assert.equal(embodiment.current.locationId, "yamuna")
  assert.ok(embodiment.current.entities.length > 0, "recovered entity state renders through embodiment with no special-casing")
})
