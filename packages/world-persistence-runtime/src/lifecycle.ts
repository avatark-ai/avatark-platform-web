import type { ResourceTier, WorldLifecycleState, WorldLifecycleTrigger } from "@avatark/world-persistence-contracts"

// Sprint 9, Phase 5: a pure, closed transition table -- an illegal
// transition (e.g. "wake" while already ACTIVE) returns `null` rather
// than silently no-op-ing or throwing, so a caller can decide whether
// that's actually fine (e.g. a duplicate wake request, Phase 9) or a
// real bug, without this function guessing for them.
const TRANSITIONS: Record<WorldLifecycleState, Partial<Record<WorldLifecycleTrigger, WorldLifecycleState>>> = {
  DORMANT: { visitor_arrived: "WAKING", crash_detected: "WAKING" },
  WAKING: { catch_up_complete: "ACTIVE", crash_detected: "WAKING" },
  ACTIVE: { no_activity_deadline_reached: "QUIESCING", crash_detected: "WAKING" },
  QUIESCING: { checkpoint_complete: "DORMANT", visitor_arrived: "ACTIVE" },
}

export function nextLifecycleState(current: WorldLifecycleState, trigger: WorldLifecycleTrigger): WorldLifecycleState | null {
  return TRANSITIONS[current]?.[trigger] ?? null
}

// Sprint 9, Phase 11: HOT/WARM/COLD is a derived READ, never a second
// stored field -- a world's resource tier is always exactly what its
// lifecycle state implies, so the two can never drift out of sync with
// each other.
//
//   COLD  -> visitor arrives -> load checkpoint/history -> deterministic
//   catch-up -> WARM -> execution ownership -> HOT
//
// DORMANT world state IS durably persisted (COLD, not "gone") --
// dormancy never destroys world continuity (invariant #9).
export function resourceTier(state: WorldLifecycleState): ResourceTier {
  switch (state) {
    case "DORMANT":
      return "COLD"
    case "WAKING":
      return "WARM"
    case "ACTIVE":
      return "HOT"
    case "QUIESCING":
      return "WARM"
  }
}
