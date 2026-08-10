import type { WorldId } from "@avatark/runtime-contracts"
import type { ReturnRecognitionFact } from "@avatark/world-memory-contracts"
import type { ArrivalDecision, OrientationProjection, PlaceContinuityView } from "@avatark/world-experience-contracts"

// Build 04, mission §E. Pure recombination over an already-composed
// PlaceContinuityView -- the five semantic questions are each a small,
// honest read of fields that view already carries, never a new query.
export interface ComposeOrientationInput {
  worldId: WorldId
  userId: string
  generatedAt: string
  place: PlaceContinuityView
  arrival: ArrivalDecision
  changeFacts: ReturnRecognitionFact[]
}

const LIVE_CANONICAL_STATUSES = new Set(["ACTIVATED", "PROJECTING", "COMPLETED"])

export function composeOrientation(input: ComposeOrientationInput): OrientationProjection {
  return {
    worldId: input.worldId,
    userId: input.userId,
    generatedAt: input.generatedAt,
    whereAmI: {
      locationId: input.place.locationId,
      name: input.place.region.name,
      season: input.place.season,
      dayPhase: input.place.dayPhase,
    },
    whatIsAroundMe: {
      nearbyEntityCount: input.place.nearbyEntities.length,
      occupancyLevel: input.place.occupancy.occupancyLevel,
      presentationHints: input.place.presentationHints,
    },
    whatIsHappening: {
      encounterOpportunityCount: input.place.encounterOpportunities.length,
      activeCanonicalPresence: input.place.canonicalPresence.filter((presence) => LIVE_CANONICAL_STATUSES.has(presence.status)),
      groupRoutineIntentCount: input.place.groupRoutineIntents.length,
    },
    whereCanIGo: input.place.nearbyDestinations,
    whatHasChanged: {
      sinceLastVisit: input.changeFacts.length > 0,
      facts: input.changeFacts,
    },
    arrival: input.arrival,
  }
}
