// Living Vrindavan Build 03, Layer B (Host-layer, non-canonical, systems-config
// judgment call -- the same category of decision every existing
// vrindavan*Definition.ts file already makes). Per
// docs/LIVING_VRINDAVAN_BUILD_03_PHASE0_LIVING_CONTENT_POPULATION_ARCHITECTURE.md
// §5: microhabitats are a DESCRIPTIVE, renderer-neutral labeling
// vocabulary for content placement within a real LocalPlace -- NOT a
// new simulated spatial tier. Build 01 already confirmed `PatchState`'s
// environmental fields are world-global, not per-Patch; a per-microhabitat
// SIMULATED state would require a new runtime engine (an explicit STOP
// gate, Phase0 §42). A microhabitat therefore carries no queryable
// runtime state of its own and is never read by any engine -- it is
// metadata a future presentation-intent entry or Build 02 placement
// pass can reference. `validate()` reuses the exact
// lib/livingWorldRuntime/vrindavanDefinition.ts discipline: fail loudly
// at module load, not silently at runtime.
import { VRINDAVAN_SPATIAL_GRAMMAR } from "../spatialEcology/vrindavanSpatialDefinition.ts"

export type MicrohabitatId =
  | "riverbank"
  | "shallow-water-edge"
  | "wet-ground"
  | "feeding-patch"
  | "grove-interior"
  | "grove-edge"
  | "shade-patch"
  | "resting-patch"
  | "path-corridor"
  | "open-grass"
  | "dry-ground"

export interface MicrohabitatDefinition {
  id: MicrohabitatId
  label: string
  parentLocalPlaceIds: string[]
  notes: string
}

export const VRINDAVAN_MICROHABITATS: Record<MicrohabitatId, MicrohabitatDefinition> = {
  riverbank: { id: "riverbank", label: "Riverbank", parentLocalPlaceIds: ["place-yamuna"], notes: "The vegetated edge zone bordering moving water." },
  "shallow-water-edge": { id: "shallow-water-edge", label: "Shallow Water Edge", parentLocalPlaceIds: ["place-yamuna"], notes: "Where land ecology meets water directly." },
  "wet-ground": { id: "wet-ground", label: "Wet Ground", parentLocalPlaceIds: ["place-yamuna"], notes: "Soil saturated by proximity to water." },
  "feeding-patch": { id: "feeding-patch", label: "Feeding Patch", parentLocalPlaceIds: ["place-yamuna", "place-kadamba-grove"], notes: "Where a resource affordance (water, vegetation) is locally concentrated." },
  "grove-interior": { id: "grove-interior", label: "Grove Interior", parentLocalPlaceIds: ["place-kadamba-grove"], notes: "Canopy-covered core, filtered light, quieter." },
  "grove-edge": { id: "grove-edge", label: "Grove Edge", parentLocalPlaceIds: ["place-kadamba-grove"], notes: "Transition zone between canopy and open ground." },
  "shade-patch": { id: "shade-patch", label: "Shade Patch", parentLocalPlaceIds: ["place-kadamba-grove"], notes: "Localized cover, relevant to the shelter resource tag." },
  "resting-patch": { id: "resting-patch", label: "Resting Patch", parentLocalPlaceIds: ["place-kadamba-grove"], notes: "Localized cover, relevant to the rest resource tag." },
  "path-corridor": { id: "path-corridor", label: "Path Corridor", parentLocalPlaceIds: ["place-govardhan-path"], notes: "Linear movement-oriented ground, matches the corridor resource tag." },
  "open-grass": { id: "open-grass", label: "Open Grass", parentLocalPlaceIds: ["place-vrindavan-entry", "place-govardhan-path"], notes: "Open, low ground cover, minimal ecological complexity." },
  "dry-ground": { id: "dry-ground", label: "Dry Ground", parentLocalPlaceIds: ["place-vrindavan-entry", "place-govardhan-path"], notes: "Ground without significant hydrology relationship; more pronounced in Grishma." },
}

// Phase0 §28's own validation discipline, extended: every microhabitat's
// parentLocalPlaceId must resolve to one of the four real LocalPlace
// IDs Sprint 16 already established -- never a 5th place, never a
// dangling reference.
function validate(): void {
  const realLocalPlaceIds = new Set(VRINDAVAN_SPATIAL_GRAMMAR.localPlaces.map((place) => place.id))
  for (const microhabitat of Object.values(VRINDAVAN_MICROHABITATS)) {
    if (microhabitat.parentLocalPlaceIds.length === 0) throw new Error(`Microhabitat ${microhabitat.id} has no parent LocalPlace`)
    for (const parentId of microhabitat.parentLocalPlaceIds) {
      if (!realLocalPlaceIds.has(parentId)) throw new Error(`Microhabitat ${microhabitat.id} references unknown LocalPlace ${parentId}`)
    }
  }
}

validate()
