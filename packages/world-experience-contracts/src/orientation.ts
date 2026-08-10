import type { LocationId, WorldId } from "@avatark/runtime-contracts"
import type { ReturnRecognitionFact } from "@avatark/world-memory-contracts"
import type { ArrivalDecision } from "./arrival.ts"
import type { NearbyDestination, PlaceCanonicalPresence, PresentationHint } from "./placeContinuity.ts"

// Build 04, mission §E: world-awareness, not a HUD spec -- five
// semantic questions a renderer (Web, Unreal, or otherwise) can answer
// however it likes: environmental cues, subtle labels, sound, lighting,
// diegetic navigation, a map, companion guidance, or minimal UI. This
// package only states the answers; it never prescribes the medium.
export interface OrientationProjection {
  worldId: WorldId
  userId: string
  generatedAt: string
  whereAmI: {
    locationId: LocationId
    name: string
    season: { id: string; name: string }
    dayPhase: string
  }
  whatIsAroundMe: {
    nearbyEntityCount: number
    occupancyLevel: string
    presentationHints: PresentationHint[]
  }
  whatIsHappening: {
    encounterOpportunityCount: number
    activeCanonicalPresence: PlaceCanonicalPresence[]
    groupRoutineIntentCount: number
  }
  whereCanIGo: NearbyDestination[]
  whatHasChanged: {
    sinceLastVisit: boolean
    facts: ReturnRecognitionFact[]
  }
  arrival: ArrivalDecision
}
