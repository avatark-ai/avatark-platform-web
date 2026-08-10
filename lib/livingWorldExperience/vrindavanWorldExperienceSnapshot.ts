import type { WorldExperienceSnapshot } from "@avatark/world-experience-contracts"
import { composeOrientation, composeWorldExperienceSnapshot } from "@avatark/world-experience-runtime"
import { resolveVrindavanArrivalDecision } from "./vrindavanArrival.ts"
import { composeVrindavanPlaceContinuity, computeVrindavanDirectNeighborLocationIds } from "./vrindavanPlaceContinuity.ts"
import { getReturnRecognition } from "../worldMemory/hostService.ts"
import { projectVrindavanPresentation } from "../livingWorldEmbodiment/vrindavanPresentationProjection.ts"

const defaultNow = () => new Date().toISOString()

// Build 04, mission §K. The full renderer-neutral World Experience
// Snapshot -- composes every prior Build 04 piece (arrival, place
// continuity for the arrival place AND each of its own direct
// neighbors, orientation) around the EXACT `WorldEmbodimentSnapshot`
// shape Build 02's own `translateToUnrealCommands` already accepts,
// never a second Unreal-specific world model.
export async function composeVrindavanWorldExperienceSnapshot(worldInstanceId: string, userId: string, sinceTick: number | null, now: () => string = defaultNow): Promise<WorldExperienceSnapshot> {
  const arrival = await resolveVrindavanArrivalDecision(worldInstanceId, userId, sinceTick, now)
  const place = await composeVrindavanPlaceContinuity(worldInstanceId, userId, arrival.locationId, sinceTick, now)
  const nearbyPlaces = await Promise.all(place.nearbyDestinations.map((destination) => composeVrindavanPlaceContinuity(worldInstanceId, userId, destination.locationId, sinceTick, now)))

  const changeFacts = arrival.worldChangedSinceLastVisit && sinceTick !== null ? (await getReturnRecognition(worldInstanceId, userId, sinceTick, now)).facts : []
  const orientation = composeOrientation({ worldId: place.worldId, userId, generatedAt: now(), place, arrival, changeFacts })

  const presentation = await projectVrindavanPresentation(worldInstanceId, userId, arrival.locationId, computeVrindavanDirectNeighborLocationIds(arrival.locationId), sinceTick, now)

  return composeWorldExperienceSnapshot({
    worldId: presentation.worldId,
    userId,
    generatedAt: now(),
    arrival,
    orientation,
    place,
    nearbyPlaces,
    recentWorldChanges: presentation.history.recentWorldChanges,
    embodiment: {
      worldId: presentation.worldId,
      worldVersion: presentation.worldVersion,
      simulationTick: presentation.simulationTick,
      season: presentation.season,
      current: presentation.current,
      reachable: presentation.reachable,
      transitions: presentation.transitions,
      visitorContext: presentation.visitorContext,
      protectedNarrative: presentation.protectedNarrative,
      generatedAt: presentation.generatedAt,
      provenance: presentation.provenance,
    },
  })
}
