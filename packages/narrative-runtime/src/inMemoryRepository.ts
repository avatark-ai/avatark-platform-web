import type { NarrativeRepository } from "./repository.ts"
import type { NarrativeState } from "./state.ts"

function stateKey(userId: string, narrativeId: string): string {
  return `${userId}::${narrativeId}`
}

/**
 * Reference adapter for tests and for products that have not wired a
 * real store yet. Clones on both read and write so a caller mutating a
 * returned state (or its own state object after saveState()) can never
 * corrupt what's stored -- the same isolation a real row-per-user store
 * would give for free.
 */
export function createInMemoryNarrativeRepository(): NarrativeRepository {
  const store = new Map<string, NarrativeState>()

  return {
    async getState(userId, narrativeId) {
      const found = store.get(stateKey(userId, narrativeId))
      return found ? structuredClone(found) : null
    },
    async saveState(state) {
      store.set(stateKey(state.userId, state.narrativeId), structuredClone(state))
    },
  }
}
