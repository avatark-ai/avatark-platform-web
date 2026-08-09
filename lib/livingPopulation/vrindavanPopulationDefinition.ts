import { buildUndirectedLocationGraph } from "@avatark/living-population-runtime"
import type { EntityBehaviorProfile, LocationResourceAffordance, RhythmSchedule } from "@avatark/living-population-contracts"
import type { LivingEntityState } from "@avatark/living-systems-contracts"
import worldArtifact from "../livingWorldRuntime/vendor/livingVrindavan.world.json" with { type: "json" }

// Sprint 10, Phase 2: two NEUTRAL, non-narrative, capability-tagged
// population archetypes for Living Vrindavan -- "cow" and "bird-flock,"
// exactly the vocabulary the Sprint 10 mission brief itself names as an
// example ("cow, calf, bird... where supported"). DELIBERATELY NOT part
// of the StudioK-vendored systems artifact (lib/livingWorldRuntime/
// vendor/livingVrindavan.systems.json) -- this is a Host-layer,
// AvatarK-supplied, judgment call kept easy to remove/replace/reject
// without touching canon. See docs/SPRINT10_GROUND_TRUTH.md's
// "roster-split decision" for the full reasoning, including why this is
// a SEPARATE roster from the two vendored archetypes
// (riverbank-vegetation, ambient-bird-flock) that Sprint 7/8/9 already
// wire through the unmodified ecological-lifecycle-stepping mechanism.
//
// Resource tagging is likewise a Host-layer, non-canonical derivation
// from the vendored artifact's own already-Approved location
// role/purpose text -- Yamuna ("River / reflection threshold") -> water;
// Kadamba Grove ("Grove / intimacy with living environment") ->
// vegetation + shelter; Govardhan Path ("Path / movement/
// responsibility") -> gathering. No new location, no new narrative
// content -- only a systems-config tag on locations StudioK already
// described.
export const COW_ARCHETYPE_ID = "avatark-population-cow"
export const BIRD_FLOCK_ARCHETYPE_ID = "avatark-population-bird-flock"

export const VRINDAVAN_RESOURCE_AFFORDANCES: LocationResourceAffordance[] = [
  { locationId: "yamuna", resourceTags: ["water"] },
  { locationId: "kadamba-grove", resourceTags: ["vegetation", "shelter"] },
  { locationId: "govardhan-path", resourceTags: ["gathering"] },
  { locationId: "vrindavan-entry", resourceTags: [] },
]

export const COW_RHYTHM_SCHEDULE: RhythmSchedule = {
  id: "avatark-population-cow-schedule",
  ticksPerCycle: 8,
  entries: [
    { phase: "WAKE", startFractionOfDay: 0 },
    { phase: "FORAGE", startFractionOfDay: 0.125 },
    { phase: "DRINK", startFractionOfDay: 0.375 },
    { phase: "SOCIAL", startFractionOfDay: 0.5 },
    { phase: "REST", startFractionOfDay: 0.625 },
  ],
}

export const BIRD_FLOCK_RHYTHM_SCHEDULE: RhythmSchedule = {
  id: "avatark-population-bird-flock-schedule",
  ticksPerCycle: 6,
  entries: [
    { phase: "WAKE", startFractionOfDay: 0 },
    { phase: "FORAGE", startFractionOfDay: 1 / 6 },
    { phase: "SOCIAL", startFractionOfDay: 3 / 6 },
    { phase: "REST", startFractionOfDay: 4 / 6 },
  ],
}

export const COW_BEHAVIOR_PROFILE: EntityBehaviorProfile = {
  archetypeId: COW_ARCHETYPE_ID,
  capabilities: ["can_move", "can_graze", "can_drink", "can_rest", "can_group"],
  needDefinitions: [
    { dimension: "hunger", baselinePressurePerTick: 0.08, thresholds: { urgentAbove: 0.8 } },
    { dimension: "thirst", baselinePressurePerTick: 0.1, thresholds: { urgentAbove: 0.8 } },
    { dimension: "rest", baselinePressurePerTick: 0.06, thresholds: { urgentAbove: 0.8 } },
    { dimension: "social", baselinePressurePerTick: 0.04, thresholds: { urgentAbove: 0.8 } },
  ],
  rhythmScheduleId: COW_RHYTHM_SCHEDULE.id,
  groupKind: "herd",
}

export const BIRD_FLOCK_BEHAVIOR_PROFILE: EntityBehaviorProfile = {
  archetypeId: BIRD_FLOCK_ARCHETYPE_ID,
  capabilities: ["can_move", "can_forage", "can_rest", "can_flock"],
  needDefinitions: [
    { dimension: "hunger", baselinePressurePerTick: 0.09, thresholds: { urgentAbove: 0.8 } },
    { dimension: "rest", baselinePressurePerTick: 0.07, thresholds: { urgentAbove: 0.8 } },
    { dimension: "social", baselinePressurePerTick: 0.05, thresholds: { urgentAbove: 0.8 } },
  ],
  rhythmScheduleId: BIRD_FLOCK_RHYTHM_SCHEDULE.id,
  groupKind: "flock",
}

export const VRINDAVAN_BEHAVIOR_PROFILES = [COW_BEHAVIOR_PROFILE, BIRD_FLOCK_BEHAVIOR_PROFILE]
export const VRINDAVAN_RHYTHM_SCHEDULES = [COW_RHYTHM_SCHEDULE, BIRD_FLOCK_RHYTHM_SCHEDULE]

// Presentation-facing names only -- never narrative content.
export const VRINDAVAN_POPULATION_ARCHETYPE_NAMES: Record<string, string> = {
  [COW_ARCHETYPE_ID]: "Cow",
  [BIRD_FLOCK_ARCHETYPE_ID]: "Bird Flock",
}

// Sprint 10, Phase 7: the same StudioK-vendored `connections[]` Sprint
// 5's own vrindavanDefinition.ts reads as a DIRECTED visitor-unlock
// graph, read here as UNDIRECTED for physical entity movement legality
// (see docs/SPRINT10_GROUND_TRUTH.md) -- no new location or edge.
export const VRINDAVAN_LOCATION_GRAPH = buildUndirectedLocationGraph((worldArtifact as { connections: { from: string; to: string }[] }).connections)

// worldInstanceId is not part of LivingEntityState itself (identity is
// scoped by the repository's own key, not carried on the record --
// matching every existing LivingEntityState convention since Sprint 7);
// accepted here only so a future multi-instance seeding call site can
// derive distinct entity ids per instance if it ever needs to.
export function initialVrindavanPopulationEntities(_worldInstanceId: string): LivingEntityState[] {
  return [
    { id: `${COW_ARCHETYPE_ID}-1`, archetypeId: COW_ARCHETYPE_ID, locationId: "yamuna", lifecyclePhase: "DORMANT", attributes: {}, lastUpdatedTick: 0 },
    { id: `${COW_ARCHETYPE_ID}-2`, archetypeId: COW_ARCHETYPE_ID, locationId: "yamuna", lifecyclePhase: "DORMANT", attributes: {}, lastUpdatedTick: 0 },
    { id: `${BIRD_FLOCK_ARCHETYPE_ID}-1`, archetypeId: BIRD_FLOCK_ARCHETYPE_ID, locationId: "kadamba-grove", lifecyclePhase: "DORMANT", attributes: {}, lastUpdatedTick: 0 },
    { id: `${BIRD_FLOCK_ARCHETYPE_ID}-2`, archetypeId: BIRD_FLOCK_ARCHETYPE_ID, locationId: "kadamba-grove", lifecyclePhase: "DORMANT", attributes: {}, lastUpdatedTick: 0 },
  ]
}

export function initialVrindavanGroups(worldInstanceId: string) {
  return [
    { worldId: worldInstanceId, id: "avatark-population-cow-herd", kind: "herd" as const, memberEntityIds: [`${COW_ARCHETYPE_ID}-1`, `${COW_ARCHETYPE_ID}-2`], locationId: "yamuna", targetLocationId: null, cohesion: 1, lastUpdatedTick: 0 },
    { worldId: worldInstanceId, id: "avatark-population-bird-flock", kind: "flock" as const, memberEntityIds: [`${BIRD_FLOCK_ARCHETYPE_ID}-1`, `${BIRD_FLOCK_ARCHETYPE_ID}-2`], locationId: "kadamba-grove", targetLocationId: null, cohesion: 1, lastUpdatedTick: 0 },
  ]
}
