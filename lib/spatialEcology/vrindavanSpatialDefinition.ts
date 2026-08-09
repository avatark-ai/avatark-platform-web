import type { DomainDefinition, LocalPlaceDefinition, PatchDefinition, QuadrantDefinition, RouteDefinition, SectorDefinition, SpatialEdge, SpatialGrammar } from "@avatark/spatial-ecology-contracts"

// Sprint 16: world-specific spatial configuration for Living Vrindavan --
// a Host-layer, non-canonical, systems-config judgment call, the same
// category of decision Sprint 10's own vrindavanPopulationDefinition.ts
// and Sprint 15's own vrindavanAdaptationDefinition.ts already made.
// Every id here is DATA; @avatark/spatial-ecology-runtime's own
// functions never branch on any of it (see
// packages/spatial-ecology-runtime/src/livingForestSpatialEcologyPortability.test.ts
// for the same engine running a wholly different, larger grammar).
//
// Sprint 16 Phase 0 architecture, section 26/31: Vrindavan's own
// authored artifact (lib/livingWorldRuntime/vendor/livingVrindavan.world.json)
// names exactly 4 locations with no finer terrain grain. This grammar
// therefore does NOT invent Sector/Quadrant subdivision -- both levels
// are DEGENERATE (collapsed to exactly one implicit instance each), and
// Patch is 1:1 with each of the 4 already-Approved locations. No new
// geography is represented; only the standard hierarchy vocabulary is
// applied to what Canon already names.

const DOMAIN: DomainDefinition = { id: "vrindavan-domain", name: "Vrindavan Core", sectorIds: ["vrindavan-sector"] }

const SECTOR: SectorDefinition = {
  id: "vrindavan-sector",
  domainId: "vrindavan-domain",
  name: "Vrindavan Core Sector",
  // Degenerate (the whole current domain, single Sector) -- Canon
  // authorizes no finer subdivision at Vrindavan's current ~500m x 500m
  // scale. See Sprint 16 Phase 0 architecture, unresolved question #1.
  nominalExtentDescription: "~500 m x 500 m (unresolved: no Canon-authorized Sector/Quadrant subdivision exists at this scale)",
  quadrantIds: ["vrindavan-quadrant"],
}

const QUADRANT: QuadrantDefinition = { id: "vrindavan-quadrant", sectorId: "vrindavan-sector", label: "Core", patchIds: ["patch-vrindavan-entry", "patch-yamuna", "patch-kadamba-grove", "patch-govardhan-path"] }

const PATCHES: PatchDefinition[] = [
  { id: "patch-vrindavan-entry", quadrantId: "vrindavan-quadrant", habitatType: "threshold", containedLocationIds: ["vrindavan-entry"] },
  { id: "patch-yamuna", quadrantId: "vrindavan-quadrant", habitatType: "riverbank", containedLocationIds: ["yamuna"] },
  { id: "patch-kadamba-grove", quadrantId: "vrindavan-quadrant", habitatType: "grove", containedLocationIds: ["kadamba-grove"] },
  { id: "patch-govardhan-path", quadrantId: "vrindavan-quadrant", habitatType: "corridor-path", containedLocationIds: ["govardhan-path"] },
]

const LOCAL_PLACES: LocalPlaceDefinition[] = [
  { id: "place-vrindavan-entry", patchId: "patch-vrindavan-entry", locationId: "vrindavan-entry" },
  { id: "place-yamuna", patchId: "patch-yamuna", locationId: "yamuna" },
  { id: "place-kadamba-grove", patchId: "patch-kadamba-grove", locationId: "kadamba-grove" },
  { id: "place-govardhan-path", patchId: "patch-govardhan-path", locationId: "govardhan-path" },
]

export const VRINDAVAN_SPATIAL_GRAMMAR: SpatialGrammar = {
  domains: [DOMAIN],
  sectors: [SECTOR],
  quadrants: [QUADRANT],
  patches: PATCHES,
  localPlaces: LOCAL_PLACES,
}

// Mirrors the StudioK-vendored `connections[]` (lib/livingWorldRuntime/vendor/livingVrindavan.world.json)
// exactly -- entry<->yamuna, yamuna<->kadamba-grove, yamuna<->govardhan-path
// -- no new edge, no new location. `yamuna`'s two downstream connections
// are additionally tagged DOWNSTREAM_OF (Yamuna is the world's own
// hydrology hub; both other locations sit downstream of it) and
// govardhan-path's own connection is additionally represented as a
// Route below, since its StudioK-derived resourceTags already include
// "corridor" (lib/livingPopulation/vrindavanPopulationDefinition.ts).
export const VRINDAVAN_SPATIAL_EDGES: SpatialEdge[] = [
  { id: "edge-entry-yamuna", fromPatchId: "patch-vrindavan-entry", toPatchId: "patch-yamuna", relation: "CONNECTED_TO", traversable: true },
  { id: "edge-yamuna-kadamba-grove", fromPatchId: "patch-yamuna", toPatchId: "patch-kadamba-grove", relation: "DOWNSTREAM_OF", traversable: true },
  { id: "edge-yamuna-govardhan-path", fromPatchId: "patch-yamuna", toPatchId: "patch-govardhan-path", relation: "DOWNSTREAM_OF", traversable: true },
]

export const VRINDAVAN_GOVARDHAN_PATH_ROUTE: RouteDefinition = {
  id: "route-govardhan-path",
  name: "Govardhan Path corridor",
  edgeIds: ["edge-yamuna-govardhan-path"],
}

export const VRINDAVAN_ROUTES: RouteDefinition[] = [VRINDAVAN_GOVARDHAN_PATH_ROUTE]
