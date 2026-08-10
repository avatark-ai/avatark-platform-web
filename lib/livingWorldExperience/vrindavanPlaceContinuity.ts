import type { NearbyDestination, PlaceContinuityView, PresentationHint } from "@avatark/world-experience-contracts"
import { composePlaceContinuity, resolveCanonicalScopeLocationIds } from "@avatark/world-experience-runtime"
import type { SpatialEdge } from "@avatark/spatial-ecology-contracts"
import { livingWorldRuntime } from "../livingWorldRuntime/singleton.ts"
import { LIVING_VRINDAVAN_DEFINITION } from "../livingWorldRuntime/vrindavanDefinition.ts"
import { VRINDAVAN_SPATIAL_EDGES, VRINDAVAN_SPATIAL_GRAMMAR, VRINDAVAN_ROUTES } from "../spatialEcology/vrindavanSpatialDefinition.ts"
import { VRINDAVAN_MICROHABITATS } from "../livingWorldContent/vrindavanMicrohabitats.ts"
import { VRINDAVAN_VEGETATION_ARCHETYPES } from "../livingWorldContent/vrindavanVegetationArchetypes.ts"
import { projectVrindavanPresentation } from "../livingWorldEmbodiment/vrindavanPresentationProjection.ts"

const defaultNow = () => new Date().toISOString()

function patchIdForLocation(locationId: string): string | null {
  return VRINDAVAN_SPATIAL_GRAMMAR.localPlaces.find((localPlace) => localPlace.locationId === locationId)?.patchId ?? null
}

function locationForPatch(patchId: string): string | null {
  return VRINDAVAN_SPATIAL_GRAMMAR.localPlaces.find((localPlace) => localPlace.patchId === patchId)?.locationId ?? null
}

// Build 04, mission §F: DIRECT neighbors only (one topology hop), never
// the full transitive-reachability closure `reachablePatchIds` computes
// -- "nearby destinations" means "places reachable from HERE right
// now," matching Build 01's own real finding that entry only connects
// directly to Yamuna (not transitively to Kadamba Grove/Govardhan
// Path), a distinction that matters for what a visitor is told they
// can go to next.
function directNeighborPatchIds(edges: SpatialEdge[], fromPatchId: string): string[] {
  const neighbors = new Set<string>()
  for (const edge of edges) {
    if (!edge.traversable) continue
    if (edge.fromPatchId === fromPatchId) neighbors.add(edge.toPatchId)
    if (edge.toPatchId === fromPatchId) neighbors.add(edge.fromPatchId)
  }
  return [...neighbors]
}

function routeConnecting(fromPatchId: string, toPatchId: string) {
  return VRINDAVAN_ROUTES.find((route) =>
    route.edgeIds.some((edgeId) => {
      const edge = VRINDAVAN_SPATIAL_EDGES.find((candidate) => candidate.id === edgeId)
      if (!edge) return false
      return (edge.fromPatchId === fromPatchId && edge.toPatchId === toPatchId) || (edge.fromPatchId === toPatchId && edge.toPatchId === fromPatchId)
    }),
  )
}

export function computeVrindavanDirectNeighborLocationIds(locationId: string): string[] {
  const patchId = patchIdForLocation(locationId)
  if (!patchId) return []
  return directNeighborPatchIds(VRINDAVAN_SPATIAL_EDGES, patchId)
    .map(locationForPatch)
    .filter((id): id is string => id !== null)
}

function computeNearbyDestinations(locationId: string, routeStates: { routeId: string; traversable: boolean }[]): NearbyDestination[] {
  const patchId = patchIdForLocation(locationId)
  if (!patchId) return []
  return directNeighborPatchIds(VRINDAVAN_SPATIAL_EDGES, patchId).map((neighborPatchId) => {
    const destinationLocationId = locationForPatch(neighborPatchId) ?? neighborPatchId
    const route = routeConnecting(patchId, neighborPatchId)
    const routeState = route ? routeStates.find((state) => state.routeId === route.id) ?? null : null
    return { locationId: destinationLocationId, reachable: true, viaRouteId: route?.id ?? null, routeTraversable: routeState?.traversable ?? null }
  })
}

function computePresentationHints(locationId: string): PresentationHint[] {
  const localPlace = VRINDAVAN_SPATIAL_GRAMMAR.localPlaces.find((candidate) => candidate.locationId === locationId)
  if (!localPlace) return []

  const microhabitats = Object.values(VRINDAVAN_MICROHABITATS).filter((microhabitat) => microhabitat.parentLocalPlaceIds.includes(localPlace.id))
  const microhabitatHints: PresentationHint[] = microhabitats.map((microhabitat) => ({ kind: "microhabitat", id: microhabitat.id, label: microhabitat.label }))

  const microhabitatIds = new Set(microhabitats.map((microhabitat) => microhabitat.id))
  const vegetationArchetypes = VRINDAVAN_VEGETATION_ARCHETYPES.filter((archetype) => archetype.microhabitats.some((id) => microhabitatIds.has(id)))
  const vegetationHints: PresentationHint[] = vegetationArchetypes.map((archetype) => ({ kind: "vegetation-archetype", id: archetype.id, label: archetype.label }))

  return [...microhabitatHints, ...vegetationHints]
}

// Build 04, mission §C. One place, fully composed -- current place OR
// any nearby place, same function, since both are just
// `projectVrindavanPresentation` called with THAT place as its own
// `locationId`. Never a second world-state store: every field is read
// from the extended presentation projection (Build 02 + Build 04's own
// additive fields) or Sprint 16's own static spatial grammar.
export async function composeVrindavanPlaceContinuity(worldInstanceId: string, userId: string, locationId: string, sinceTick: number | null, now: () => string = defaultNow): Promise<PlaceContinuityView> {
  const reachableLocationIds = computeVrindavanDirectNeighborLocationIds(locationId)
  const presentation = await projectVrindavanPresentation(worldInstanceId, userId, locationId, reachableLocationIds, sinceTick, now)
  const worldState = await livingWorldRuntime.getState(userId, LIVING_VRINDAVAN_DEFINITION.id)

  const patchId = patchIdForLocation(locationId)
  const patchState = presentation.patchEcology.find((state) => state.patchId === patchId) ?? null
  const territoryPressure = presentation.territoryPressures.find((pressure) => pressure.patchId === patchId) ?? null
  const canonicalProjectionsAtThisPlace = presentation.canonicalProjections.filter((projection) =>
    resolveCanonicalScopeLocationIds(VRINDAVAN_SPATIAL_GRAMMAR, projection.scope).includes(locationId),
  )

  return composePlaceContinuity({
    worldId: presentation.worldId,
    locationId,
    tick: presentation.simulationTick,
    season: presentation.season,
    region: presentation.current,
    patchState,
    territoryPressure,
    dayPhase: presentation.rhythms.dayPhase,
    occupancy: presentation.rhythms.placeOccupancy,
    groupRoutineIntents: presentation.rhythms.groupRoutineIntents,
    resourceOpportunities: presentation.rhythms.resourceOpportunities,
    nearbyDestinations: computeNearbyDestinations(locationId, presentation.routeStates),
    routeStates: presentation.routeStates,
    canonicalProjectionsAtThisPlace,
    rememberedConsequences: presentation.history.historicalMarkers,
    presentationHints: computePresentationHints(locationId),
    visitor: {
      userId,
      hasVisitedBefore: worldState?.visitedLocationIds.includes(locationId) ?? false,
      meaningfulEncounterCount: presentation.visitorContext.meaningfulEncounterCount,
      reflectionCount: presentation.visitorContext.reflectionCount,
    },
  })
}
