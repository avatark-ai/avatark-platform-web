// The status vocabulary every runtime's own status type should draw from.
// experience-runtime's JourneyStatus already matches all five values exactly
// -- a real convergence point, not a speculative one (see
// docs/RUNTIME_CONTRACTS.md §5). No existing runtime is required to rename
// its own status type to use this alias.
export type LifecyclePhase =
  | "not_started"
  | "active"
  | "paused"
  | "completed"
  | "abandoned"
