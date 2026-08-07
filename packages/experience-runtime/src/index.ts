export type {
  JourneyNodeKind,
  JourneyNode,
  EpisodeDefinition,
  LivingWorldDefinition,
  PracticeDefinition,
  ReflectionDefinition,
  MilestoneCriteria,
  MilestoneDefinition,
  CompletionCriteria,
  JourneyDefinition,
  JourneyStatus,
  JourneyState,
  JourneyTransitionType,
  JourneyTransition,
  JourneyHistory,
  JourneyProgress,
} from "./types.ts";
export { JourneyError } from "./types.ts";

export {
  completedIds,
  isUnlocked,
  criteriaSatisfied,
  nextEpisode,
  nextLivingWorld,
  nextPractice,
  newlySatisfiedMilestoneIds,
  pendingReflectionIds,
  computeProgress,
} from "./progress.ts";

export type { JourneyRepository } from "./repository.ts";
export { InMemoryJourneyRepository } from "./repository.ts";

export type { JourneyAdapter, JourneyTransitionEvent } from "./adapter.ts";
export { noopJourneyAdapter } from "./adapter.ts";

export { JourneyRuntime } from "./runtime.ts";

// Compatibility aliases -- this repo has three unrelated things called
// "Journey" (see docs/RUNTIME_GLOSSARY.md Part 2): @avatark/journey's
// invitation-handoff funnel, this package's progression engine, and
// @avatark/context-runtime's currentNarrativeId-backed "journey" context
// field. Sprint 2's naming-cleanup recommendation is for this package's own
// vocabulary to converge on "Experience" (matching its own package name,
// @avatark/experience-runtime) rather than "Journey" -- but renaming the
// primary exports now would be a breaking change this sprint's rules
// forbid ("no breaking API changes," "preserve behavioral semantics").
// These aliases let new code (and the account page's user-facing copy, see
// app/account/page.tsx) start using the canonical future name today,
// side by side with the existing names, with zero behavior difference --
// both names refer to the exact same runtime, types, and values.
export type {
  JourneyDefinition as ExperienceDefinition,
  JourneyStatus as ExperienceStatus,
  JourneyState as ExperienceState,
  JourneyTransitionType as ExperienceTransitionType,
  JourneyTransition as ExperienceTransition,
  JourneyHistory as ExperienceHistory,
  JourneyProgress as ExperienceProgress,
} from "./types.ts";
export { JourneyError as ExperienceRuntimeError } from "./types.ts";
export type { JourneyRepository as ExperienceRepository } from "./repository.ts";
export type { JourneyAdapter as ExperienceRuntimeAdapter } from "./adapter.ts";
export { JourneyRuntime as ExperienceRuntime } from "./runtime.ts";
