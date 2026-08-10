import type { OrientationProjection } from "@avatark/world-experience-contracts"
import { composeOrientation } from "@avatark/world-experience-runtime"
import { resolveVrindavanArrivalDecision } from "./vrindavanArrival.ts"
import { composeVrindavanPlaceContinuity } from "./vrindavanPlaceContinuity.ts"
import { getReturnRecognition } from "../worldMemory/hostService.ts"

const defaultNow = () => new Date().toISOString()

// Build 04, mission §E. Composes the real arrival decision (§D) with a
// real Place Continuity view (§C) for wherever that decision resolved
// to -- the five semantic questions are then a direct, honest read of
// those two, never a new query.
export async function composeVrindavanOrientation(worldInstanceId: string, userId: string, sinceTick: number | null, now: () => string = defaultNow): Promise<OrientationProjection> {
  const arrival = await resolveVrindavanArrivalDecision(worldInstanceId, userId, sinceTick, now)
  const place = await composeVrindavanPlaceContinuity(worldInstanceId, userId, arrival.locationId, sinceTick, now)

  const changeFacts = arrival.worldChangedSinceLastVisit && sinceTick !== null ? (await getReturnRecognition(worldInstanceId, userId, sinceTick, now)).facts : []

  return composeOrientation({
    worldId: place.worldId,
    userId,
    generatedAt: now(),
    place,
    arrival,
    changeFacts,
  })
}
