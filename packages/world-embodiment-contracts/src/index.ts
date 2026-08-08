export type { SpatialBounds, SpatialNode, SpatialTransform } from "./spatial.ts"

export type { SensoryChannel, SensoryCue } from "./sensoryCue.ts"

export type { AtmospherePresentation, EnvironmentPresentation, VegetationPresentation, WaterPresentation } from "./environmentPresentation.ts"

export type { EntityPresentation } from "./entityPresentation.ts"

export type { EncounterPresentation } from "./encounterPresentation.ts"

export type { EmbodiedRegion } from "./embodiedRegion.ts"

export type { EmbodiedTransition, WorldEmbodimentProvenance, WorldEmbodimentSnapshot } from "./snapshot.ts"
export { freezeWorldEmbodimentSnapshot } from "./snapshot.ts"

export type { EmbodimentRendererCapabilities } from "./capability.ts"
export { MINIMAL_EMBODIMENT_CAPABILITIES } from "./capability.ts"

export type {
  BeginReflectionIntent,
  EnterWorldIntent,
  InteractionIntent,
  LeaveWorldIntent,
  SelectEncounterIntent,
  VisitLocationIntent,
} from "./interactionIntent.ts"
export { isWellFormedInteractionIntent } from "./interactionIntent.ts"

export type { EmbodimentDeltaEntry, EmbodimentDeltaOp, WorldEmbodimentDelta } from "./delta.ts"
