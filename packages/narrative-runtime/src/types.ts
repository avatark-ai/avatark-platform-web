// The authored-definition vocabulary this runtime executes. StudioK (or
// any author) produces a NarrativeDefinition; nothing in this package
// names a franchise, character, or piece of real content -- every field
// here is generic structure. Deterministic branching only: a Choice or
// Trigger's Outcome names a Transition target by id, resolved and
// validated against the definition (see validation.ts / definitionIndex.ts),
// never evaluated as code.

export type FlagValue = boolean | string | number

// A flat bag of author-defined state a playthrough accumulates (set by
// Outcomes, read by Trigger conditions) -- the only mechanism triggers can
// branch on, so branching stays data-driven instead of opening a door to
// arbitrary eval.
export type NarrativeFlags = Record<string, FlagValue>

/** Opaque reference into a Living World -- that domain is not implemented here. */
export interface WorldRef {
  worldId: string
}

/** Opaque reference into a Practice -- that domain is not implemented here. */
export interface PracticeRef {
  practiceId: string
}

/** Opaque reference into a Reflection -- that domain is not implemented here. */
export interface ReflectionRef {
  reflectionId: string
}

/** Opaque reference to a narrative-facing asset (video, image, audio, text). No asset storage or CDN concern lives here. */
export interface NarrativeAssetRef {
  assetId: string
  kind?: string
}

/** Opaque reference into the Experience Runtime's own progression concept (e.g. its episode/world tracking). Referenced by id only -- this package has no dependency on that package. */
export interface ExperienceRuntimeRef {
  experienceId: string
}

/** Opaque reference into ambient platform Context (e.g. current product, current organization). */
export interface NarrativeContextRef {
  key: string
}

/** Opaque reference into the Experience Registry's catalog of experiences. */
export interface ExperienceRegistryRef {
  experienceRegistryId: string
}

/** Every reference a Beat may carry into domains this runtime does not implement. All optional -- most beats reference none of these. */
export interface NarrativeReferences {
  asset?: NarrativeAssetRef
  world?: WorldRef
  practice?: PracticeRef
  reflection?: ReflectionRef
  experienceRuntime?: ExperienceRuntimeRef
  context?: NarrativeContextRef
  experienceRegistry?: ExperienceRegistryRef
}

// A Transition names *where* a Choice/Trigger/narration beat leads.
// Resolved against the definition's own ids -- never a free-form path.
export type Transition =
  | { to: "beat"; beatId: string }
  | { to: "scene"; sceneId: string }
  | { to: "episode"; episodeId: string }
  | { to: "season"; seasonId: string }
  | { to: "end" }

// Structured, comparison-only conditions -- deliberately not an
// expression language. Adding a new comparison means adding a new `op`
// variant here, not exposing eval.
export type TriggerCondition =
  | { op: "always" }
  | { op: "flagSet"; flag: string }
  | { op: "flagEquals"; flag: string; value: FlagValue }

export interface Outcome {
  id: string
  /** Merged into NarrativeState.flags when this outcome fires. */
  setFlags?: NarrativeFlags
  transition: Transition
}

export interface Choice {
  id: string
  label: string
  outcome: Outcome
}

export interface Trigger {
  id: string
  when: TriggerCondition
  outcome: Outcome
}

// A Beat's kind determines which fields apply and which runtime
// operation can complete it: "narration" -> completeBeat()/advance(),
// "choice" -> choose(), "trigger" -> trigger()/advance().
export type BeatKind = "narration" | "choice" | "trigger"

interface BeatBase {
  id: string
  refs?: NarrativeReferences
}

export interface NarrationBeat extends BeatBase {
  kind: "narration"
  next: Transition
}

export interface ChoiceBeat extends BeatBase {
  kind: "choice"
  choices: Choice[]
}

export interface TriggerBeat extends BeatBase {
  kind: "trigger"
  triggers: Trigger[]
}

export type Beat = NarrationBeat | ChoiceBeat | TriggerBeat

export interface Scene {
  id: string
  title: string
  entryBeatId: string
  beats: Beat[]
}

export interface Episode {
  id: string
  title: string
  entrySceneId: string
  scenes: Scene[]
}

export interface Season {
  id: string
  title: string
  entryEpisodeId: string
  episodes: Episode[]
}

export interface NarrativeDefinition {
  id: string
  /** Bumped by the author whenever the structure changes; the runtime itself does not migrate between versions. */
  version: number
  title: string
  entrySeasonId: string
  seasons: Season[]
}
