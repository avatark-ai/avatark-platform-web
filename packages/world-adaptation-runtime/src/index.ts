export { deriveAdaptationEffectId } from "./adaptationIdentity.ts"

export type { RealizedEncounterSignalInput, ResourceReadingSignalInput, DeriveAdaptationSignalsParams } from "./adaptationSignals.ts"
export { deriveAdaptationSignals } from "./adaptationSignals.ts"

export type { AccumulateAdaptationPressureParams } from "./adaptationPressure.ts"
export { accumulateAdaptationPressure } from "./adaptationPressure.ts"

export { evaluateAdaptationRule } from "./adaptationDecision.ts"

export { deriveAdaptationEffect } from "./adaptationEffectDerivation.ts"

export type { RunWorldAdaptationParams } from "./worldAdaptation.ts"
export { runWorldAdaptation } from "./worldAdaptation.ts"

export { InMemoryAdaptationPressureRepository, InMemoryAdaptationEffectRepository, effectSubjectId } from "./inMemoryRepositories.ts"
