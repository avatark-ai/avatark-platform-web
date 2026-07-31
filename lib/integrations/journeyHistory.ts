import type { JourneyStepId, JourneyManifest } from "@avatark/journey";
import { boundaryCrossing, type BoundaryCrossing } from "./stages.ts";

// ============================================================
// The Cross-product Handoffs dashboard section needs both directions:
// the boundary crossings a journey has already traversed (this file) and
// the ones it could traverse next (dashboard.ts's existing
// DashboardView.nextOptions, unchanged). `manifest.completedSteps` is
// built by lib/journey/stateMachine.ts's transition() strictly in the
// order each step was left, and `manifest.nextStep` is the step the
// journey has already arrived at (the step it's currently on, not one
// still pending) -- so every consecutive pair in
// [...completedSteps, nextStep] is a transition that has already
// happened. This file only walks that pairing and asks the frozen
// boundaryCrossing() which pairs crossed a real product boundary; it
// adds no new transition rule of its own.
export interface CompletedHandoff {
  from: JourneyStepId;
  to: JourneyStepId;
  crossing: BoundaryCrossing;
}

/**
 * Rebuilds each already-crossed boundary's handoff from the manifest's
 * *current* field values (practiceId/watchFirstId/invitationId/returnTo)
 * rather than a per-step historical snapshot -- this repo's manifests
 * only ever set those fields once, at journey start (manifest.ts has no
 * "update mid-journey" path), so today that's not an approximation, just
 * a read of the same fields the original handoff would have used.
 */
export function completedBoundaryCrossings(manifest: JourneyManifest): CompletedHandoff[] {
  const traversed: JourneyStepId[] = [...manifest.completedSteps, manifest.nextStep];
  const crossings: CompletedHandoff[] = [];

  for (let i = 1; i < traversed.length; i++) {
    const from = traversed[i - 1];
    const to = traversed[i];
    const crossing = boundaryCrossing(from, to);
    if (crossing) crossings.push({ from, to, crossing });
  }

  return crossings;
}
