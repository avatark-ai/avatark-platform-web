import type { EmbodiedTransition, WorldEmbodimentProvenance } from "@avatark/world-embodiment-contracts"
import type { EmbodiedRegion } from "@avatark/world-embodiment-contracts"
import type { ProtectedNarrativeProjection, VisitorContextProjection } from "@avatark/living-systems-contracts"
import type { PatchState } from "@avatark/spatial-ecology-contracts"
import type { AdaptationEffect } from "@avatark/world-adaptation-contracts"
import type { WorldInstanceCanonicalProjectionState } from "@avatark/canonical-event-contracts"
import { getEmbodimentWithCanonicalEvents } from "../canonicalEvents/hostService.ts"
import type { LocationRhythmSummary } from "../livingRhythms/hostService.ts"

const defaultNow = () => new Date().toISOString()

// Living Vrindavan Build 02, Part 1, §2/reqs 2-7: the ONE new,
// Build-02-owned presentation projection -- pure composition over the
// REAL, already-authoritative Sprint 18 `getEmbodimentWithCanonicalEvents`
// (Sprint 9-18's own full onion: base(8/10) -> history(11) ->
// social(12) -> rhythms(13) -> encounterRealization(14) ->
// adaptation(15) -> spatialEcology(16) -> canonicalEvents(18)), NEVER
// the poorer `getEmbodimentSnapshotForVisitor` path Phase 0 found is
// the only one any production/dev route calls today.
//
// This resolves Phase 0's §2 "two embodiment read paths" finding via
// Option A, at the level Build 02 actually owns: Build 02's OWN new
// code (this file, and everything built on top of it in Part 2) reads
// exclusively from the richer, authoritative chain. It does NOT touch
// the real production route (`embodimentOrchestrator.ts`) or the
// existing Sprint 20 v1 facade -- retrofitting THAT route's own
// established, tested behavior is out of Part 1's safe scope (see
// docs/LIVING_VRINDAVAN_BUILD_02_PART1_NOTES.md for the full
// reconciliation). No third embodiment truth is introduced: every
// field below is read, unmodified, from the existing onion -- this
// file flattens nesting depth for a renderer's convenience, it does
// not recompute or reinterpret a single value.
export interface VrindavanPresentationState {
  worldId: string
  simulationTick: number
  season: { id: string; name: string }
  generatedAt: string
  provenance: WorldEmbodimentProvenance
  current: Readonly<EmbodiedRegion>
  reachable: readonly Readonly<EmbodiedRegion>[]
  transitions: readonly Readonly<EmbodiedTransition>[]
  visitorContext: VisitorContextProjection
  protectedNarrative: Readonly<ProtectedNarrativeProjection>
  // req 5 (ecology/resource state) -- Sprint 16's own real PatchState,
  // unmodified: vegetationCondition/hydrologyCondition/resourceAvailability/
  // ecologicalPressure/movementPermeability all already renderer-neutral
  // named quantities, never re-derived here.
  patchEcology: PatchState[]
  // reqs 6/7 (population/occupancy, day-phase/rhythm) -- Sprint 13's
  // own real LocationRhythmSummary, unmodified.
  rhythms: LocationRhythmSummary
  // Sprint 15's own real AdaptationEffect list, unmodified -- the
  // mechanism through which ecology/rhythm PRESSURE becomes a visible
  // consequence over time (Build 02 Part 2's acceptance proof C/D).
  adaptationEffects: AdaptationEffect[]
  // Sprint 18's own real per-instance canonical-event ledger,
  // unmodified -- presented, never mutable through this or any
  // renderer path (Build 02's own Canon-firewall requirement).
  canonicalProjections: WorldInstanceCanonicalProjectionState[]
}

export async function projectVrindavanPresentation(worldInstanceId: string, userId: string, locationId: string, reachableLocationIds: string[], sinceTick: number | null = null, now: () => string = defaultNow): Promise<VrindavanPresentationState> {
  const withCanonicalEvents = await getEmbodimentWithCanonicalEvents(worldInstanceId, userId, locationId, reachableLocationIds, sinceTick, now)
  const withSpatialEcology = withCanonicalEvents.embodimentWithSpatialEcology
  const withAdaptation = withSpatialEcology.embodimentWithAdaptation
  const withEncounterRealization = withAdaptation.embodimentWithEncounterRealization
  const withRhythms = withEncounterRealization.embodimentWithRhythms
  const withSocialEcology = withRhythms.embodimentWithSocialEcology
  const withHistory = withSocialEcology.embodimentWithHistory
  const base = withHistory.embodiment

  return {
    worldId: base.worldId,
    simulationTick: base.simulationTick,
    season: base.season,
    generatedAt: base.generatedAt,
    provenance: base.provenance,
    current: base.current,
    reachable: base.reachable,
    transitions: base.transitions,
    visitorContext: base.visitorContext,
    protectedNarrative: base.protectedNarrative,
    patchEcology: withSpatialEcology.spatialSnapshot.patchStates,
    rhythms: withRhythms.rhythms,
    adaptationEffects: withAdaptation.adaptationEffects,
    canonicalProjections: withCanonicalEvents.canonicalProjections,
  }
}
