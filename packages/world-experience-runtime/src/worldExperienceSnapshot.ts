import type { WorldId } from "@avatark/runtime-contracts"
import type { WorldEmbodimentSnapshot } from "@avatark/world-embodiment-contracts"
import type { WorldEvent } from "@avatark/world-memory-contracts"
import type { ArrivalDecision, ExperienceStage, OrientationProjection, PlaceContinuityView, WorldExperienceSnapshot } from "@avatark/world-experience-contracts"

export interface ComposeWorldExperienceSnapshotInput {
  worldId: WorldId
  userId: string
  generatedAt: string
  arrival: ArrivalDecision
  orientation: OrientationProjection
  place: PlaceContinuityView
  nearbyPlaces: PlaceContinuityView[]
  recentWorldChanges: WorldEvent[]
  embodiment: WorldEmbodimentSnapshot
}

// A visitor's suggested next Experience Graph stage is a small, honest
// derivation -- never a scripted assignment. ARRIVAL itself always
// already happened by the time a snapshot exists (arrival resolution
// is a precondition of composing one); RECOGNITION_OF_CHANGE only when
// returning to a world that genuinely changed since last visit;
// otherwise ORIENTATION, the graph's own stage right after ARRIVAL --
// deliberately never guessing further ahead into DISCOVERY/ENCOUNTER/
// etc, since those are the visitor's own choice, not this snapshot's
// to assign.
function resolveSuggestedStage(arrival: ArrivalDecision): ExperienceStage {
  if (arrival.worldChangedSinceLastVisit) return "RECOGNITION_OF_CHANGE"
  return "ORIENTATION"
}

// Build 04, mission §K. `embodiment` is embedded verbatim -- the exact
// WorldEmbodimentSnapshot the existing, unmodified `translateToUnrealCommands`
// already accepts (Build 02 proof J) -- never a second, Unreal-specific
// world model.
export function composeWorldExperienceSnapshot(input: ComposeWorldExperienceSnapshotInput): WorldExperienceSnapshot {
  return {
    worldId: input.worldId,
    userId: input.userId,
    generatedAt: input.generatedAt,
    suggestedStage: resolveSuggestedStage(input.arrival),
    arrival: input.arrival,
    orientation: input.orientation,
    place: input.place,
    nearbyPlaces: input.nearbyPlaces,
    recentWorldChanges: input.recentWorldChanges,
    embodiment: input.embodiment,
  }
}
