import type { Timestamp, UserId } from "./ids.ts"

// The single-state persistence contract. Not a drop-in replacement for any
// existing Repository interface -- method names differ across all four
// state-holding examples today (getState/saveState vs get/save vs
// loadSnapshot/saveSnapshot). This is the target convention new
// repositories should follow; existing ones are never required to rename.
export interface Repository<TState, TKey = UserId> {
  get(key: TKey): Promise<TState | null>
  save(state: TState): Promise<void>
}

// Separated from Repository because the append-only half of persistence
// (history streams, event logs) has a genuinely different shape -- matches
// ExperienceEventRepository's insert/findByUser half, and the append/list
// half of JourneyRepository/WorldStateRepository/ContextRepository.
export interface HistoryQuery {
  limit?: number
  before?: Timestamp
  after?: Timestamp
}

export interface HistoryRepository<TEntry, TKey = UserId> {
  append(key: TKey, entry: TEntry): Promise<void>
  list(key: TKey, query?: HistoryQuery): Promise<TEntry[]>
}
