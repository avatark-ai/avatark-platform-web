import type { Timestamp, UserId } from "./ids.ts"

// The one genuinely new contract in this package -- every other contract
// here generalizes something that already exists two or more times across
// the five runtime branches. Checkpoint does not: no existing package has a
// named "Checkpoint" concept. context-runtime's pushContext/restoreContext
// (over ContextHistoryEntry) is the closest existing relative. This is
// anticipatory, not extracted from observed duplication -- see
// docs/RUNTIME_CONTRACTS.md §10. No runtime adopts this yet.
export interface Checkpoint<TState> {
  id: string
  subjectId: UserId
  state: TState
  label?: string
  createdAt: Timestamp
}
