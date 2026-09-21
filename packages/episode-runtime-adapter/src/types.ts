import type { NarrativeDefinition } from "@avatark/narrative-runtime"

export type { NarrativeDefinition }

export type EpisodeProjectionRefusalReason = "NOT_RUNTIME_PROJECTABLE" | "INVALID_CERTIFIED_EPISODE" | "RUNTIME_VALIDATION_FAILED"

export type EpisodeProjectionResult =
  | { readonly decision: "PROJECTED"; readonly definition: NarrativeDefinition }
  | { readonly decision: "REJECTED"; readonly reason: EpisodeProjectionRefusalReason; readonly detail: string }
