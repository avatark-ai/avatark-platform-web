import type { WorldId } from "@avatark/runtime-contracts"
import type { WorldEmbodimentSnapshot } from "@avatark/world-embodiment-contracts"
import type { WorldEvent } from "@avatark/world-memory-contracts"
import type { ArrivalDecision } from "./arrival.ts"
import type { ExperienceStage } from "./experienceGraph.ts"
import type { OrientationProjection } from "./orientation.ts"
import type { PlaceContinuityView } from "./placeContinuity.ts"

// Build 04, mission §K: the renderer-neutral semantic payload Unreal
// (or any other renderer) will eventually consume. `embodiment` is the
// EXACT, unmodified `WorldEmbodimentSnapshot` Build 02's own
// `translateToUnrealCommands` already accepts -- this type composes
// around it, it never redefines or duplicates it. Everything else here
// is additive semantic context the existing translator does not yet
// visualize (Build 02's own named gap), but which a FUTURE translator
// extension can read from real repository types, not an invented
// Unreal-specific shape.
export interface WorldExperienceSnapshot {
  worldId: WorldId
  userId: string
  generatedAt: string
  suggestedStage: ExperienceStage
  arrival: ArrivalDecision
  orientation: OrientationProjection
  place: PlaceContinuityView
  nearbyPlaces: PlaceContinuityView[]
  recentWorldChanges: WorldEvent[]
  embodiment: Readonly<WorldEmbodimentSnapshot>
}
