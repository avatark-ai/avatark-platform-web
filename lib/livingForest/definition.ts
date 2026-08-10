import type { EncounterRule, EntityArchetype, SeasonDefinition } from "@avatark/living-systems-contracts"
import type { EntityBehaviorProfile, LocationResourceAffordance, RhythmSchedule } from "@avatark/living-population-contracts"
import type { DayPhaseSchedule } from "@avatark/living-rhythms-contracts"
import type { RoutineWindowInput } from "@avatark/living-population-runtime"
import type { SignificanceConfig } from "@avatark/world-memory-runtime"
import type { DomainDefinition, LocalPlaceDefinition, PatchDefinition, QuadrantDefinition, SectorDefinition, SpatialGrammar } from "@avatark/spatial-ecology-contracts"
import type { DirectedEdge } from "@avatark/living-population-runtime"

// StudioK Living World Kernel vertical slice -- SECOND world content,
// proving @avatark/* runtime packages are genuinely portable rather than
// secretly Vrindavan-shaped. Every one of the ~10 generic runtime
// packages this world exercises already carries its OWN
// `livingForest*Portability.test.ts` fixture, independently proving the
// same thing at the single-package level; this file is Host-layer
// CONTENT (data only, zero engine logic), the same category of artifact
// `lib/*/vrindavanXDefinition.ts` already is for Living Vrindavan -- see
// docs/STUDIOK_LIVING_WORLD_KERNEL_VERTICAL_SLICE.md for the full
// reconciliation of what already existed vs. what this file adds.
//
// World id deliberately reuses the SAME "living-forest-fixture" id
// already used by 6+ existing package-level portability tests
// (spatial-ecology-runtime, living-population-runtime,
// participation-runtime, world-memory-runtime, world-adaptation-runtime,
// world-persistence-runtime) -- one canonical Living Forest identity
// across the whole repository, not a second, incompatible naming
// scheme invented here.
export const LIVING_FOREST_WORLD_ID = "living-forest-fixture"

// ---------------------------------------------------------------------
// Spatial addressing (Sprint 16 hierarchy): World -> Domain -> Sector ->
// Quadrant -> Patch -> Local Place -> Entity. Mission's own reference
// slice ("Sector F01, Quadrant NW, Patch P01") extended with the two
// additional Patches the movement-toward-water proof needs (P02/P03,
// both water-tagged -- see LIVING_FOREST_RESOURCE_AFFORDANCES below for
// why two, not one). Deliberately NOT the richer 4-quadrant/16-patch
// fixture already living inside
// spatial-ecology-runtime/src/livingForestSpatialEcologyPortability.test.ts
// -- that fixture proves the ENGINE handles an arbitrary-cardinality
// grammar; this one is real Host content for an actual (if small)
// world, proportionate to a vertical slice, not a second copy of the
// engine's own stress-test fixture.
const DOMAIN: DomainDefinition = { id: "forest-domain", name: "Living Forest", sectorIds: ["forest-f01"] }
const SECTOR: SectorDefinition = { id: "forest-f01", domainId: "forest-domain", name: "F01", nominalExtentDescription: "1 mile x 1 mile (~640 acres / ~2.59 km2)", quadrantIds: ["forest-f01-nw"] }
const QUADRANT: QuadrantDefinition = { id: "forest-f01-nw", sectorId: "forest-f01", label: "NW", patchIds: ["patch-forest-p01", "patch-forest-p02", "patch-forest-p03"] }
const PATCHES: PatchDefinition[] = [
  { id: "patch-forest-p01", quadrantId: "forest-f01-nw", habitatType: "clearing", containedLocationIds: ["forest-clearing"] },
  { id: "patch-forest-p02", quadrantId: "forest-f01-nw", habitatType: "riverbank", containedLocationIds: ["forest-stream"] },
  { id: "patch-forest-p03", quadrantId: "forest-f01-nw", habitatType: "wetland", containedLocationIds: ["forest-pond"] },
]
const LOCAL_PLACES: LocalPlaceDefinition[] = [
  { id: "place-forest-clearing", patchId: "patch-forest-p01", locationId: "forest-clearing" },
  { id: "place-forest-stream", patchId: "patch-forest-p02", locationId: "forest-stream" },
  { id: "place-forest-pond", patchId: "patch-forest-p03", locationId: "forest-pond" },
]

export const LIVING_FOREST_SPATIAL_GRAMMAR: SpatialGrammar = { domains: [DOMAIN], sectors: [SECTOR], quadrants: [QUADRANT], patches: PATCHES, localPlaces: LOCAL_PLACES }

// Plain topology edges for @avatark/living-population-runtime's own
// `buildUndirectedLocationGraph` -- entry patch reaches BOTH water
// patches directly (a minimal hub, not a chain), so perception's
// `reachableWaterLocationIds` ordering is `[forest-stream, forest-pond]`
// deterministically (edge-declaration order), never randomized.
export const LIVING_FOREST_LOCATION_EDGES: DirectedEdge[] = [
  { from: "forest-clearing", to: "forest-stream" },
  { from: "forest-clearing", to: "forest-pond" },
]

// ---------------------------------------------------------------------
// Seasons (Sprint 7 causal engine). Envelope values deliberately mirror
// the already-established "canopy-wet"/"drought" Living Forest fixture
// (packages/world-persistence-runtime/src/livingForestPortability.test.ts,
// packages/world-adaptation-runtime's own fixture) rather than inventing
// a third pair of season names for the same fictional world.
const CANOPY_WET_ENVELOPE = { temperatureBand: "moderate" as const, precipitationBand: "high" as const, humidityBand: "high" as const, hydrologyBaselineBand: "high" as const, vegetationActivityBand: "high" as const, animalActivityBand: "high" as const }
const DROUGHT_ENVELOPE = { temperatureBand: "high" as const, precipitationBand: "low" as const, humidityBand: "low" as const, hydrologyBaselineBand: "low" as const, vegetationActivityBand: "low" as const, animalActivityBand: "low" as const }

export const LIVING_FOREST_SEASONS: SeasonDefinition[] = [
  { id: "canopy-wet", name: "Canopy Wet", order: 1, canonId: "STK-CAN-999", environmentalEnvelope: CANOPY_WET_ENVELOPE, minDurationTicks: 3, allowedNextSeasonIds: ["drought"] },
  { id: "drought", name: "Drought", order: 2, canonId: "STK-CAN-999", environmentalEnvelope: DROUGHT_ENVELOPE, minDurationTicks: 3, allowedNextSeasonIds: [] },
]

// `canonId: "STK-CAN-999"` is a deliberately fictional, non-existent
// Canon reference -- Living Forest has no real StudioK Canon authority
// (unlike Living Vrindavan's real STK-CAN-001..006). This field exists
// only because SeasonDefinition requires SOME string; it is never
// treated as an Approved-Canon claim anywhere downstream, and no
// protected-narrative/canonical-event machinery is wired for this world
// (see docs/STUDIOK_LIVING_WORLD_KERNEL_VERTICAL_SLICE.md's "deliberately
// not implemented" section -- STOP-gate discipline: don't invent Canon
// authority for a world that has none).

// ---------------------------------------------------------------------
// Encounter rule (Sprint 7 AvailableEncounter source). Ambient, at the
// entry patch, gated on the SAME "animalActivityBand" condition
// already used by the existing (non-Vrindavan) encounter-realization
// portability fixture -- realized only when environmental conditions
// actually allow it (moderate+ animal activity; true in canopy-wet,
// false in drought), never guaranteed by mere visitor presence.
export const LIVING_FOREST_ENCOUNTER_RULES: EncounterRule[] = [{ id: "forest-clearing-ambient-presence", locationId: "forest-clearing", category: "ambient", condition: { band: "animalActivityBand", atLeast: "moderate" } }]

// ---------------------------------------------------------------------
// Resource affordances (living-population-contracts). forest-stream AND
// forest-pond both carry "water" deliberately -- Build 03's own final
// report (Living Vrindavan) named `memoryHint`'s divergence as
// "currently unobservable" purely because Vrindavan's own content maps
// every resource tag to exactly one location. Living Forest's content
// is new-authored, so it can (and does) avoid that 1:1 collapse,
// finally making the pre-existing, already-live-wired memory->behavior
// bridge (`resolvePreferredResourceLocation` /
// `selectBehavior`'s `preferMemoryOrFirst`) observably diverge -- see
// the "future behavior changes" test in
// livingForestVerticalSlice.test.ts. Zero new runtime code was needed
// for this; it is a content-authoring choice only.
export const LIVING_FOREST_RESOURCE_AFFORDANCES: LocationResourceAffordance[] = [
  { locationId: "forest-clearing", resourceTags: ["vegetation", "shelter", "gathering"] },
  { locationId: "forest-stream", resourceTags: ["water"] },
  { locationId: "forest-pond", resourceTags: ["water"] },
]

// ---------------------------------------------------------------------
// Population archetype (living-population-contracts). One archetype,
// "deer" -- capabilities cover move/forage/drink/rest/group so the full
// candidate set in `selectBehavior` is exercised (DRINK/GRAZE/REST/
// MOVE_TO_RESOURCE/SOCIALIZE all become reachable at some point in the
// scenario below).
export const DEER_ARCHETYPE_ID = "deer"
export const DEER_RHYTHM_SCHEDULE_ID = "deer-rhythm"

// Sprint 7-level EntityArchetype -- used ONLY for embodiment/naming
// purposes (`archetypesById` in resolveWorldEmbodiment), never for the
// population simulation itself (this world passes `vegetationArchetypes:
// []`/`vegetationEntities: []` to `advancePopulationSimulation`, since
// it has no separately-lifecycled vegetation roster distinct from its
// population). Distinct concept from `LIVING_FOREST_BEHAVIOR_PROFILES`
// below, the same roster-split Vrindavan's own COW_ARCHETYPE_ID holds
// between its EntityArchetype and its EntityBehaviorProfile.
export const LIVING_FOREST_ENTITY_ARCHETYPES: EntityArchetype[] = [{ id: DEER_ARCHETYPE_ID, name: "Deer", locationId: "forest-clearing", lifecyclePhases: ["present"], initialLifecyclePhase: "present" }]

export const LIVING_FOREST_BEHAVIOR_PROFILES: EntityBehaviorProfile[] = [
  {
    archetypeId: DEER_ARCHETYPE_ID,
    capabilities: ["can_move", "can_forage", "can_drink", "can_rest", "can_group"],
    needDefinitions: [
      { dimension: "hunger", baselinePressurePerTick: 0.15, thresholds: { urgentAbove: 0.6 } },
      { dimension: "thirst", baselinePressurePerTick: 0.2, thresholds: { urgentAbove: 0.6 } },
      { dimension: "rest", baselinePressurePerTick: 0.1, thresholds: { urgentAbove: 0.6 } },
    ],
    rhythmScheduleId: DEER_RHYTHM_SCHEDULE_ID,
    groupKind: "herd",
  },
]

// Population-level rhythm cycle (distinct from the world-shared day
// phase below) -- 8 ticks/cycle, mirroring Living Vrindavan's own real
// cow archetype cadence (also 8), not invented independently.
export const LIVING_FOREST_RHYTHM_SCHEDULES: RhythmSchedule[] = [
  {
    id: DEER_RHYTHM_SCHEDULE_ID,
    ticksPerCycle: 8,
    entries: [
      { phase: "REST", startFractionOfDay: 0 },
      { phase: "WAKE", startFractionOfDay: 0.125 },
      { phase: "FORAGE", startFractionOfDay: 0.25 },
      { phase: "DRINK", startFractionOfDay: 0.5 },
      { phase: "SOCIAL", startFractionOfDay: 0.625 },
      { phase: "MOVE", startFractionOfDay: 0.75 },
      { phase: "RETURN", startFractionOfDay: 0.875 },
    ],
  },
]

// ---------------------------------------------------------------------
// World-shared day phase (living-rhythms-contracts) -- the "morning
// world state" the mission names explicitly. Same 8-tick cycle as the
// population rhythm above so tick 1-2 land inside MORNING.
export const LIVING_FOREST_DAY_PHASE_SCHEDULE: DayPhaseSchedule = {
  id: "forest-day-phase-schedule",
  ticksPerCycle: 8,
  entries: [
    { phase: "DAWN", startFractionOfDay: 0 },
    { phase: "MORNING", startFractionOfDay: 0.125 },
    { phase: "MIDDAY", startFractionOfDay: 0.375 },
    { phase: "AFTERNOON", startFractionOfDay: 0.5 },
    { phase: "DUSK", startFractionOfDay: 0.625 },
    { phase: "EVENING", startFractionOfDay: 0.75 },
    { phase: "NIGHT", startFractionOfDay: 0.875 },
  ],
}

// Morning routine window fed into `advancePopulationSimulation` via
// `routineEntriesByArchetypeId` -- a bounded, deterministic NUDGE
// (never an override) toward resource-seeking during the mission's own
// "morning" framing, using population-runtime's own restated
// `RoutineWindowInput` shape (deliberately decoupled from
// living-rhythms-contracts' richer `RoutineWindow`, per that package's
// own documented cross-package decoupling discipline).
export const LIVING_FOREST_ROUTINE_ENTRIES_BY_ARCHETYPE_ID = new Map<string, RoutineWindowInput[]>([[DEER_ARCHETYPE_ID, [{ dayPhase: "MORNING", eligibleActivities: ["DRINK", "GRAZE", "MOVE_TO_RESOURCE"], socialAffinity: 0.1, restBias: -0.2, movementBias: 0.3 }]]])

// ---------------------------------------------------------------------
// World memory significance policy -- identical shape/threshold to
// Living Vrindavan's own VRINDAVAN_SIGNIFICANCE_CONFIG (not a
// Vrindavan-specific value; "surface scarcity-band conditions as
// significant" is a generic policy choice any world can make the same
// way).
export const LIVING_FOREST_SIGNIFICANCE_CONFIG: SignificanceConfig = { scarcityBands: ["low"] }
