import type { EnvironmentalBand } from "@avatark/living-systems-contracts"
import type { EncounterCategory } from "@avatark/living-systems-contracts"
import type { AtmospherePresentation, VegetationPresentation, WaterPresentation } from "./environmentPresentation.ts"
import type { SpatialBounds, SpatialTransform } from "./spatial.ts"

// Sprint 8, Phase 12: an Unreal-COMPATIBLE instruction schema -- generic
// commands an Unreal (or any other spatial engine) adapter could realize,
// never an Unreal class/asset name. No UObject/Actor/Blueprint/Niagara/
// Landscape/PCG/Nanite/Lumen reference exists anywhere in this file or
// anything that produces values for it. These op names are illustrative,
// per the mission brief's own framing ("these are examples, not
// mandatory names") -- the point proven is that WorldEmbodimentSnapshot
// is translatable into SOME engine-facing instruction model at all, not
// that this exact vocabulary is final.
export type UnrealCommand =
  | { op: "CreateRegion"; regionId: string; name: string; transform: SpatialTransform; bounds: SpatialBounds }
  | { op: "UpdateEnvironment"; regionId: string; atmosphere: AtmospherePresentation; water: WaterPresentation; vegetation: VegetationPresentation }
  | { op: "SetAtmosphere"; regionId: string; semantic: string; illuminationSemantic: string }
  | { op: "SetWaterState"; regionId: string; semantic: string; levelBand: EnvironmentalBand }
  | { op: "SetVegetationIntent"; regionId: string; semantic: string; densityBand: EnvironmentalBand }
  | { op: "PlaceEntity"; entityId: string; regionId: string; presentationArchetype: string; animationSemantic: string }
  | { op: "UpdateEntity"; entityId: string; animationSemantic: string; activityHint: string }
  | { op: "RemoveEntity"; entityId: string }
  | { op: "CreateInteractionAnchor"; regionId: string; ruleId: string; category: EncounterCategory; interactionAffordance: string }
