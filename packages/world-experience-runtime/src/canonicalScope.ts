import type { LocationId } from "@avatark/runtime-contracts"
import type { SpatialGrammar } from "@avatark/spatial-ecology-contracts"
import type { CanonicalEventProjectionScope } from "@avatark/canonical-event-contracts"

// Build 04: a canonical event's own authored `scope` (Sprint 18) names
// a spatial unit at any level of Sprint 16's real hierarchy -- this
// resolves that scope down to the concrete LocationIds a visitor could
// actually be directed to, using ONLY the static SpatialGrammar already
// passed in (no membership-index import from a sibling runtime
// package -- this traversal is small enough to state directly, and
// pulling in @avatark/spatial-ecology-runtime here would violate the
// same "no sibling runtime dependency" discipline every peer contracts-
// derived runtime package in this repo already holds).
export function resolveCanonicalScopeLocationIds(grammar: SpatialGrammar, scope: CanonicalEventProjectionScope): LocationId[] {
  const locationIdsForPatchIds = (patchIds: Set<string>): LocationId[] =>
    grammar.localPlaces.filter((localPlace) => patchIds.has(localPlace.patchId)).map((localPlace) => localPlace.locationId)

  switch (scope.level) {
    case "WORLD":
      return grammar.localPlaces.map((localPlace) => localPlace.locationId)

    case "LOCAL_PLACE": {
      const localPlace = grammar.localPlaces.find((candidate) => candidate.id === scope.localPlaceId)
      return localPlace ? [localPlace.locationId] : []
    }

    case "PATCH":
      return locationIdsForPatchIds(new Set([scope.patchId]))

    case "QUADRANT": {
      const patchIds = new Set(grammar.patches.filter((patch) => patch.quadrantId === scope.quadrantId).map((patch) => patch.id))
      return locationIdsForPatchIds(patchIds)
    }

    case "SECTOR": {
      const quadrantIds = new Set(grammar.quadrants.filter((quadrant) => quadrant.sectorId === scope.sectorId).map((quadrant) => quadrant.id))
      const patchIds = new Set(grammar.patches.filter((patch) => patch.quadrantId !== null && quadrantIds.has(patch.quadrantId)).map((patch) => patch.id))
      return locationIdsForPatchIds(patchIds)
    }

    case "DOMAIN": {
      const sectorIds = new Set(grammar.sectors.filter((sector) => sector.domainId === scope.domainId).map((sector) => sector.id))
      const quadrantIds = new Set(grammar.quadrants.filter((quadrant) => sectorIds.has(quadrant.sectorId)).map((quadrant) => quadrant.id))
      const patchIds = new Set(grammar.patches.filter((patch) => patch.quadrantId !== null && quadrantIds.has(patch.quadrantId)).map((patch) => patch.id))
      return locationIdsForPatchIds(patchIds)
    }

    case "ENTITY_SET":
      // An entity-scoped canonical event names participants, not a
      // place -- it has no location-directed arrival meaning, so it
      // honestly resolves to no locations rather than guessing one.
      return []

    default:
      return []
  }
}
