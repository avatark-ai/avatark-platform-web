import type { NarrativeState } from "./state.ts"

// Persistence contract only -- no concrete store lives here. A real
// implementation (Supabase, Postgres, whatever a consuming product
// already uses) would key rows on exactly (userId, narrativeId), the
// same composite this interface takes everywhere, so state for one user
// is never reachable through another's id.
export interface NarrativeRepository {
  getState(userId: string, narrativeId: string): Promise<NarrativeState | null>
  saveState(state: NarrativeState): Promise<void>
}
