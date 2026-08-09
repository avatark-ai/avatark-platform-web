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
// Sprint 10, Phase 17: two additive ops for the living-population domain
// -- `MoveEntityToRegion` (semantic movement, no coordinates: a region
// id, never a path) and `SetGroupIntent` (herd/flock-level direction,
// never an individual trajectory). `PlaceEntity`/`UpdateEntity` gain
// optional movement/group fields for the same reason EntityPresentation
// did -- absent for any entity that doesn't carry that state.
export type UnrealCommand =
  | { op: "CreateRegion"; regionId: string; name: string; transform: SpatialTransform; bounds: SpatialBounds }
  | { op: "UpdateEnvironment"; regionId: string; atmosphere: AtmospherePresentation; water: WaterPresentation; vegetation: VegetationPresentation }
  | { op: "SetAtmosphere"; regionId: string; semantic: string; illuminationSemantic: string }
  | { op: "SetWaterState"; regionId: string; semantic: string; levelBand: EnvironmentalBand }
  | { op: "SetVegetationIntent"; regionId: string; semantic: string; densityBand: EnvironmentalBand }
  | { op: "PlaceEntity"; entityId: string; regionId: string; presentationArchetype: string; animationSemantic: string; groupId?: string | null }
  | { op: "UpdateEntity"; entityId: string; animationSemantic: string; activityHint: string; groupId?: string | null }
  | { op: "RemoveEntity"; entityId: string }
  | { op: "MoveEntityToRegion"; entityId: string; fromRegionId: string; toRegionId: string; movementSemantic: string }
  | { op: "SetGroupIntent"; groupId: string; regionId: string; targetRegionId: string | null; cohesion: number }
  | { op: "CreateInteractionAnchor"; regionId: string; ruleId: string; category: EncounterCategory; interactionAffordance: string }
