// ============================================================
// The Journey Orchestrator's state machine -- the nine steps a
// participant moves through from receiving an invitation to arriving at
// Arena, and the explicit edges between them. A pure reducer over
// JourneyManifest (see manifest.ts): no timers, no storage, no network
// calls. Whether a given transition is *currently possible* in the real
// world (e.g. a practice's PrometheusK handoff being unmapped) is a
// question for lib/journey/recovery.ts, not this file -- this file only
// answers "is this edge legal in the graph."
export type JourneyStepId =
  | "invitation_received"
  | "invitation_accepted"
  | "watch_first"
  | "practice_intro"
  | "practice_runtime"
  | "reflection"
  | "living_echo"
  | "recommendation"
  | "arena";

export const JOURNEY_STEP_ORDER: JourneyStepId[] = [
  "invitation_received",
  "invitation_accepted",
  "watch_first",
  "practice_intro",
  "practice_runtime",
  "reflection",
  "living_echo",
  "recommendation",
  "arena",
];

// Explicit adjacency, never a derived "next index in JOURNEY_STEP_ORDER"
// -- so a branch (Watch First is optional, same as an invitation that
// names a practice directly and skips straight to the practice intro)
// is a real, named edge instead of an implicit skip. Every other edge is
// linear. `arena` has no outgoing edges: it's this graph's one terminal
// step, per the mission ("this repository... does not own Arena").
const JOURNEY_TRANSITIONS: Record<JourneyStepId, JourneyStepId[]> = {
  invitation_received: ["invitation_accepted"],
  invitation_accepted: ["watch_first", "practice_intro"],
  watch_first: ["practice_intro"],
  practice_intro: ["practice_runtime"],
  practice_runtime: ["reflection"],
  reflection: ["living_echo"],
  living_echo: ["recommendation"],
  recommendation: ["arena"],
  arena: [],
};

export function canTransition(from: JourneyStepId, to: JourneyStepId): boolean {
  return JOURNEY_TRANSITIONS[from].includes(to);
}

export function isTerminalStep(step: JourneyStepId): boolean {
  return JOURNEY_TRANSITIONS[step].length === 0;
}

export interface TransitionResult<TManifest> {
  ok: boolean;
  manifest?: TManifest;
  /** Set only when ok is false. */
  reason?: string;
}

/**
 * Moves a manifest-shaped object from its current `nextStep` to `to`,
 * marking the step just finished as completed (idempotent -- completing
 * an already-completed step again is a no-op, same convention as
 * recordInvitationAcceptance in lib/journey/state.ts never overwriting
 * an already-set fact). Generic over the manifest shape so this module
 * has no import-time dependency on manifest.ts -- manifest.ts depends on
 * this file, not the other way around.
 */
export function transition<TManifest extends { nextStep: JourneyStepId; completedSteps: JourneyStepId[] }>(
  manifest: TManifest,
  to: JourneyStepId
): TransitionResult<TManifest> {
  const from = manifest.nextStep;
  if (!canTransition(from, to)) {
    return { ok: false, reason: `Cannot transition from "${from}" to "${to}".` };
  }
  return {
    ok: true,
    manifest: {
      ...manifest,
      completedSteps: manifest.completedSteps.includes(from) ? manifest.completedSteps : [...manifest.completedSteps, from],
      nextStep: to,
    },
  };
}
