export type {
  Beat,
  BeatKind,
  Choice,
  ChoiceBeat,
  ExperienceRegistryRef,
  ExperienceRuntimeRef,
  Episode,
  FlagValue,
  NarrationBeat,
  NarrativeAssetRef,
  NarrativeContextRef,
  NarrativeDefinition,
  NarrativeFlags,
  NarrativeReferences,
  Outcome,
  PracticeRef,
  ReflectionRef,
  Scene,
  Season,
  Transition,
  Trigger,
  TriggerBeat,
  TriggerCondition,
  WorldRef,
} from "./types.ts"

export type {
  NarrativeHistory,
  NarrativeHistoryEntry,
  NarrativeHistoryEventKind,
  NarrativePosition,
  NarrativeProgress,
  NarrativeState,
  NarrativeStatus,
} from "./state.ts"

export {
  NarrativeAlreadyStartedError,
  NarrativeDefinitionError,
  NarrativeInvalidChoiceError,
  NarrativeInvalidTriggerError,
  NarrativeRuntimeError,
  NarrativeStateNotFoundError,
} from "./errors.ts"

export type { IndexedBeat, IndexedEpisode, IndexedScene, NarrativeIndex } from "./definitionIndex.ts"
export { buildNarrativeIndex, resolveEntryOfEpisode, resolveEntryOfScene, resolveEntryOfSeason, resolveTransition } from "./definitionIndex.ts"

export type { NarrativeDefinitionValidationResult } from "./validation.ts"
export { validateNarrativeDefinition } from "./validation.ts"

export type { NarrativeRepository } from "./repository.ts"
export { createInMemoryNarrativeRepository } from "./inMemoryRepository.ts"

export type { NarrativeNextView, NarrativeRuntime, NarrativeRuntimeOptions } from "./runtime.ts"
export { createNarrativeRuntime } from "./runtime.ts"

export type { NarrativeViewerLine, NarrativeViewerLineKind } from "./viewer.ts"
export { renderNarrativeView } from "./viewer.ts"
