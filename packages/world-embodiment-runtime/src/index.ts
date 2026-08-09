export { computeSpatialLayout } from "./spatialLayout.ts"

export { resolveEnvironmentPresentation } from "./environmentPresentationResolver.ts"

export { resolveEntityPresentation } from "./entityPresentationResolver.ts"

export { resolveEncounterPresentation } from "./encounterPresentationResolver.ts"

export type { ResolveWorldEmbodimentParams } from "./worldEmbodimentResolver.ts"
export { resolveWorldEmbodiment } from "./worldEmbodimentResolver.ts"

export { diffWorldEmbodiment } from "./embodimentDelta.ts"

export type { GroupIntentInput } from "./unrealCommandTranslator.ts"
export { translateEmbodimentDeltaToUnrealCommands, translateGroupIntentToUnrealCommands, translateToUnrealCommands } from "./unrealCommandTranslator.ts"

export { negotiateRegionForCapabilities } from "./capabilityNegotiation.ts"

export type { InteractionIntentValidationResult } from "./interactionIntentValidation.ts"
export { validateInteractionIntent } from "./interactionIntentValidation.ts"
