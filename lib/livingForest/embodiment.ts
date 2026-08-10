import { resolveWorldEmbodiment } from "@avatark/world-embodiment-runtime"
import type { WorldEmbodimentSnapshot } from "@avatark/world-embodiment-contracts"
import type { SpatialNode } from "@avatark/world-embodiment-contracts"
import type { LocationExperience } from "@avatark/renderer-contracts"
import type { WorldSnapshot } from "@avatark/living-systems-contracts"
import { LIVING_FOREST_ENTITY_ARCHETYPES } from "./definition.ts"

// The renderer-neutral presentation projection this mission's own
// pipeline names as its final step ("...consequence -> world/entity/
// place memory -> future behavior changes -> renderer-neutral
// presentation projection"). Calls the SAME generic
// `resolveWorldEmbodiment` (@avatark/world-embodiment-runtime, Sprint 8,
// unmodified, engine-dependency-free) that already backs Living
// Vrindavan's own `translateToUnrealCommands` pipeline and that
// package's own `alternateWorldEmbodiment.test.ts` Living Forest
// fixture -- this function only supplies Living Forest's OWN naming/
// spatial-layout/experience-description content, zero new engine logic.
//
// Deliberately does NOT build a `WorldExperienceSnapshot` (arrival/
// orientation/place-continuity, Build 04's own richer Vrindavan layer)
// -- this mission's own pipeline stops at "renderer-neutral presentation
// projection," and `@avatark/world-experience-runtime`'s own portability
// is already proven by its existing `livingForestExperiencePortability.test.ts`;
// building a second, Host-layer-wired copy of that richness for Forest
// would be an unrequested scope expansion (see the final report's
// "deliberately not implemented" section).
const LOCATION_NAMES: Record<string, string> = { "forest-clearing": "Forest Clearing", "forest-stream": "Forest Stream", "forest-pond": "Forest Pond" }

const SPATIAL_LAYOUT: Record<string, SpatialNode> = {
  "forest-clearing": { id: "forest-clearing", parentId: null, role: "entry", transform: { position: { x: 0, y: 0, z: 0 } }, bounds: { radius: 20 }, tags: ["clearing"] },
  "forest-stream": { id: "forest-stream", parentId: null, role: "resource", transform: { position: { x: 20, y: 0, z: 0 } }, bounds: { radius: 15 }, tags: ["riverbank", "water"] },
  "forest-pond": { id: "forest-pond", parentId: null, role: "resource", transform: { position: { x: -20, y: 0, z: 0 } }, bounds: { radius: 15 }, tags: ["wetland", "water"] },
}

const EXPERIENCE_BY_LOCATION: Record<string, LocationExperience> = {
  "forest-clearing": { id: "forest-clearing", environment: { biome: "clearing" }, atmosphere: { quality: "open" }, time: { preferredState: "unspecified" }, soundscape: { motifs: ["wind", "birdsong"] }, interaction: { reflectionAvailable: false }, presentation: { intensity: "restrained", pacing: "slow" } },
  "forest-stream": { id: "forest-stream", environment: { biome: "riverbank" }, atmosphere: { quality: "flowing" }, time: { preferredState: "unspecified" }, soundscape: { motifs: ["flowing-water"] }, interaction: { reflectionAvailable: false }, presentation: { intensity: "restrained", pacing: "slow" } },
  "forest-pond": { id: "forest-pond", environment: { biome: "wetland" }, atmosphere: { quality: "still" }, time: { preferredState: "unspecified" }, soundscape: { motifs: ["still-water"] }, interaction: { reflectionAvailable: false }, presentation: { intensity: "restrained", pacing: "slow" } },
}

const ARCHETYPES_BY_ID = Object.fromEntries(LIVING_FOREST_ENTITY_ARCHETYPES.map((a) => [a.id, a]))

export function buildForestEmbodimentSnapshot(currentSnapshot: WorldSnapshot, reachableSnapshots: WorldSnapshot[]): WorldEmbodimentSnapshot {
  return resolveWorldEmbodiment({
    currentSnapshot,
    reachableSnapshots,
    locationNames: LOCATION_NAMES,
    spatialLayout: SPATIAL_LAYOUT,
    experienceByLocation: EXPERIENCE_BY_LOCATION,
    archetypesById: ARCHETYPES_BY_ID,
    transitions: reachableSnapshots.map((s) => ({ toLocationId: s.locationId, affordance: "gradual-emergence" as const })),
    soundEnabled: true,
    provenance: { worldArtifactSpecId: "living-forest-vertical-slice", experienceArtifactSpecId: "living-forest-vertical-slice", systemsArtifactSpecId: "living-forest-vertical-slice", canonDocIds: [] },
  })
}
