import type { Timestamp } from "./ids.ts"

// The thin "something changed" shape -- modeled on JourneyTransition/
// WorldTransition/NarrativeHistoryEntry, which are structurally similar but
// not identical today. Deliberately kept separate from Event (below) -- see
// docs/RUNTIME_GLOSSARY.md for why both need to keep existing.
export interface Transition<TType extends string = string> {
  type: TType
  at: Timestamp
  nodeId?: string
  detail?: string
}
