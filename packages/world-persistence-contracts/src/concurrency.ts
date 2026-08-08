import type { WorldStateVersion } from "./ids.ts"

// Sprint 9, Phase 6: optimistic concurrency as a clear conflict RESULT,
// never a silently-overwriting last-write-wins save. Every conditional
// write is:
//
//   expected version N -> advance -> write version N+1
//
// If another writer already produced N+1 (or later), the stale writer's
// call resolves to a `conflict` result -- it never throws for this case
// (a conflict is an expected, first-class outcome a caller must branch
// on, not an exceptional one) and it never overwrites what the other
// writer produced.
export type ConditionalSaveResult<TState> =
  | { readonly status: "saved"; readonly stateVersion: WorldStateVersion }
  | { readonly status: "conflict"; readonly currentVersion: WorldStateVersion; readonly currentState: TState }

export function isSaveConflict<TState>(result: ConditionalSaveResult<TState>): result is { status: "conflict"; currentVersion: WorldStateVersion; currentState: TState } {
  return result.status === "conflict"
}
