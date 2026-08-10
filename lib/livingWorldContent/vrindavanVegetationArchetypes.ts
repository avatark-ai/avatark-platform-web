// Living Vrindavan Build 03, Layer B/C (presentation-intent content,
// additive to StudioK's own already-Approved `riverbank-vegetation`
// systems archetype -- never merged with or duplicating it, per
// Phase0 §6). These three archetypes carry no queryable runtime
// state of their own: `PatchState.vegetationCondition` remains the one
// real, world-global band (Build 01's own confirmed finding); the
// table below is AUTHORING GUIDANCE for how that existing band should
// be presented per archetype, consumed only by content authoring and,
// downstream, by Build 02's placement logic -- never a new repository,
// never a new write path.
import type { MicrohabitatId } from "./vrindavanMicrohabitats.ts"

export type VegetationDensityBand = "sparse" | "moderate" | "dense"

export interface VegetationArchetypeDefinition {
  id: string
  label: string
  microhabitats: MicrohabitatId[]
  resourceTagsBacked: string[]
  // Maps the real, world-global `vegetationActivityBand` (Sprint 7/8)
  // to this archetype's own presentation density -- authoring guidance
  // only, never a second simulated value.
  densityByVegetationActivityBand: Record<"high" | "moderate" | "low", VegetationDensityBand>
  presentationIntent: string
}

export const GROVE_CANOPY_ARCHETYPE_ID = "vrindavan-vegetation-grove-canopy"
export const UNDERSTORY_ARCHETYPE_ID = "vrindavan-vegetation-understory"
export const GRASS_GROUND_COVER_ARCHETYPE_ID = "vrindavan-vegetation-grass-ground-cover"

export const VRINDAVAN_VEGETATION_ARCHETYPES: VegetationArchetypeDefinition[] = [
  {
    id: GROVE_CANOPY_ARCHETYPE_ID,
    label: "Grove Canopy",
    microhabitats: ["grove-interior", "grove-edge"],
    resourceTagsBacked: ["shelter", "rest"],
    densityByVegetationActivityBand: { high: "dense", moderate: "moderate", low: "sparse" },
    presentationIntent: "Overhead cover, filtered light, matching Kadamba Grove's own Approved 'intimate' atmosphere quality.",
  },
  {
    id: UNDERSTORY_ARCHETYPE_ID,
    label: "Understory",
    microhabitats: ["grove-interior"],
    resourceTagsBacked: [],
    densityByVegetationActivityBand: { high: "moderate", moderate: "sparse", low: "sparse" },
    presentationIntent: "Minor ground-level cover; texture/sound richness at close range, never a primary resource backer.",
  },
  {
    id: GRASS_GROUND_COVER_ARCHETYPE_ID,
    label: "Grass Ground Cover",
    microhabitats: ["open-grass", "dry-ground"],
    resourceTagsBacked: [],
    densityByVegetationActivityBand: { high: "dense", moderate: "moderate", low: "sparse" },
    presentationIntent: "Neutral open-ground presentation at Vrindavan Entry and Govardhan Path -- deliberately empty of resource affordance, matching both locations' own real content.",
  },
]

// Phase0 §28's own validation discipline: no archetype here may
// duplicate StudioK's own already-Approved `riverbank-vegetation` id,
// and every referenced microhabitat must be a real, known id (enforced
// by TypeScript's own MicrohabitatId union at compile time; re-checked
// here at module load for the same "fail loudly" posture every other
// vrindavan*Definition.ts file already applies).
function validate(): void {
  const ids = new Set<string>()
  for (const archetype of VRINDAVAN_VEGETATION_ARCHETYPES) {
    if (archetype.id === "riverbank-vegetation") throw new Error("Build 03 must not redefine the Approved riverbank-vegetation archetype")
    if (ids.has(archetype.id)) throw new Error(`Duplicate vegetation archetype id: ${archetype.id}`)
    ids.add(archetype.id)
    if (archetype.microhabitats.length === 0) throw new Error(`Vegetation archetype ${archetype.id} references no microhabitat`)
  }
}

validate()
