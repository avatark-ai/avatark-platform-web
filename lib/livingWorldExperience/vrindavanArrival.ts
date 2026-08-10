import type { ArrivalDecision } from "@avatark/world-experience-contracts"
import { resolveArrivalDecision, resolveCanonicalScopeLocationIds } from "@avatark/world-experience-runtime"
import { livingWorldRuntime } from "../livingWorldRuntime/singleton.ts"
import { LIVING_VRINDAVAN_DEFINITION } from "../livingWorldRuntime/vrindavanDefinition.ts"
import { VRINDAVAN_SPATIAL_GRAMMAR } from "../spatialEcology/vrindavanSpatialDefinition.ts"
import { getAllCanonicalEventProjectionStates } from "../canonicalEvents/hostService.ts"
import { getReturnRecognition } from "../worldMemory/hostService.ts"

const defaultNow = () => new Date().toISOString()

const KNOWN_VRINDAVAN_LOCATION_IDS = VRINDAVAN_SPATIAL_GRAMMAR.localPlaces.map((localPlace) => localPlace.locationId)

const LIVE_CANONICAL_STATUSES = new Set(["ACTIVATED", "PROJECTING"])

// Build 04, mission §D: "where should this visitor materialize" as a
// real, named decision -- not a bare fallback chain buried in a route
// handler. Composes ONLY existing/new mechanisms:
//   - the visitor's own prior position, from the real, generic,
//     per-visitor `WorldRuntime` (Sprint 1-7) `WorldState.currentLocationId`
//     -- null means this visitor has genuinely never entered before;
//   - Sprint 16's real spatial grammar, for which LocationIds are
//     currently addressable at all;
//   - Sprint 18's real canonical-event projections, whose own authored
//     `scope` (never invented here) may direct arrival to a specific
//     place while genuinely ACTIVATED/PROJECTING;
//   - Sprint 11's real ReturnRecognition, for the honest
//     worldChangedSinceLastVisit flag -- `sinceTick` is caller-supplied
//     (the same convention `projectVrindavanPresentation` already
//     established; no per-visitor "last known tick" persistence exists
//     yet in this codebase, a real, named limitation, not new debt).
export async function resolveVrindavanArrivalDecision(worldInstanceId: string, userId: string, sinceTick: number | null, now: () => string = defaultNow): Promise<ArrivalDecision> {
  const worldState = await livingWorldRuntime.getState(userId, LIVING_VRINDAVAN_DEFINITION.id)
  const priorLocationId = worldState?.currentLocationId ?? null

  const canonicalProjections = await getAllCanonicalEventProjectionStates(worldInstanceId)
  const canonDirectedLocationIds = canonicalProjections
    .filter((projection) => LIVE_CANONICAL_STATUSES.has(projection.status))
    .flatMap((projection) => resolveCanonicalScopeLocationIds(VRINDAVAN_SPATIAL_GRAMMAR, projection.scope))

  let worldChangedSinceLastVisit = false
  if (priorLocationId !== null && sinceTick !== null) {
    const returnRecognition = await getReturnRecognition(worldInstanceId, userId, sinceTick, now)
    worldChangedSinceLastVisit = returnRecognition.facts.length > 0
  }

  return resolveArrivalDecision({
    entryLocationId: LIVING_VRINDAVAN_DEFINITION.entryLocationId,
    priorLocationId,
    knownLocationIds: KNOWN_VRINDAVAN_LOCATION_IDS,
    canonDirectedLocationIds,
    worldChangedSinceLastVisit,
  })
}
