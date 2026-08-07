export type {
  ActivityId,
  LocationId,
  Timestamp,
  UserId,
  WorldActivity,
  WorldArtifact,
  WorldDefinition,
  WorldHistory,
  WorldId,
  WorldLocation,
  WorldPracticeRef,
  WorldProgress,
  WorldReflectionRef,
  WorldState,
  WorldTransition,
  WorldVisit,
} from "./types.ts";

export {
  InvalidWorldTransitionError,
  UnknownLocationError,
  UnknownWorldError,
  WorldNotEnteredError,
} from "./errors.ts";

export { findDefinition, findLocation } from "./definitions.ts";

export { calculateProgress } from "./progress.ts";

export type { WorldStateRepository } from "./repository.ts";
export { InMemoryWorldStateRepository } from "./repository.ts";

export type { CreateWorldRuntimeOptions, WorldRuntime } from "./runtime.ts";
export { createWorldRuntime, RECENT_VISITS_LIMIT } from "./runtime.ts";

// Account-surface adapter glue (createLivingWorldsAccountAdapter and
// friends) moved to lib/livingWorldRuntime/accountAdapter.ts during the
// Runtime Kernel integration (Sprint 3) -- a Presentation-role adapter
// belongs in the Host, not in this leaf package. See
// docs/RUNTIME_KERNEL_ARCHITECTURE.md Part 1.

export type { KnownWorldName } from "./fixtures/sampleWorlds.ts";
export {
  createSampleWorldDefinition,
  KNOWN_WORLD_NAMES,
  SAMPLE_WORLD_DEFINITIONS,
} from "./fixtures/sampleWorlds.ts";
