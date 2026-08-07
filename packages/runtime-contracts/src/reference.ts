// Generalizes the opaque-pointer pattern found independently, near-identically,
// three times today: living-world-runtime's WorldPracticeRef/WorldReflectionRef,
// narrative-runtime's PracticeRef/ReflectionRef/WorldRef. See
// docs/RUNTIME_GLOSSARY.md Part 1 for why the underlying *definitions* these
// point at (e.g. an Experience Episode vs a Narrative Episode) are NOT
// collapsed by this shape -- a Reference only says "there is an id, of this
// kind, from this source," never which definition it resolves against.

export interface Reference<TKind extends string = string> {
  kind: TKind
  id: string
  source?: string
}

export type PracticeRef = Reference<"practice">
export type ReflectionRef = Reference<"reflection">
export type WorldRef = Reference<"world">
export type EpisodeRef = Reference<"episode">
export type NarrativeRef = Reference<"narrative">
export type SceneRef = Reference<"scene">
export type ChallengeRef = Reference<"challenge">
export type MilestoneRef = Reference<"milestone">
