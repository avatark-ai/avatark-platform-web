# Journey State Machine

`lib/journey/stateMachine.ts` defines the nine steps a participant moves through, from receiving
an invitation to arriving at Arena, and the explicit legal edges between them. It is a pure
reducer over any `{ nextStep, completedSteps }`-shaped object (a `JourneyManifest`, see
`JOURNEY_MANIFEST.md`, or any future shape with the same two fields) — no timers, no storage, no
network calls.

## The graph

```
 invitation_received
         │
         ▼
 invitation_accepted
      │        │
      │        └──────────────┐
      ▼                       ▼
 watch_first  ─────────►  practice_intro
                               │
                               ▼
                       practice_runtime
                               │
                               ▼
                          reflection
                               │
                               ▼
                         living_echo
                               │
                               ▼
                        recommendation
                               │
                               ▼
                            arena   (terminal — no outgoing edges)
```

`invitation_accepted` is the graph's one branch: Watch First is optional, the same honesty as an
invitation that names a practice directly and skips straight to the practice intro today (Phase
1's `lib/invitations/destination.ts`). Every other edge is linear. `arena` is the graph's one
terminal step — consistent with `ENTRY_ENGINE_ARCHITECTURE.md`'s boundary statement that this
repository doesn't own Arena, there is nothing after it for this graph to model.

## Transition table

| From | Legal `to` |
|---|---|
| `invitation_received` | `invitation_accepted` |
| `invitation_accepted` | `watch_first`, `practice_intro` |
| `watch_first` | `practice_intro` |
| `practice_intro` | `practice_runtime` |
| `practice_runtime` | `reflection` |
| `reflection` | `living_echo` |
| `living_echo` | `recommendation` |
| `recommendation` | `arena` |
| `arena` | *(none)* |

## API

```ts
export type JourneyStepId =
  | "invitation_received" | "invitation_accepted" | "watch_first" | "practice_intro"
  | "practice_runtime" | "reflection" | "living_echo" | "recommendation" | "arena";

export const JOURNEY_STEP_ORDER: JourneyStepId[]; // the nine steps above, in order

export function canTransition(from: JourneyStepId, to: JourneyStepId): boolean;
export function isTerminalStep(step: JourneyStepId): boolean; // true only for "arena"

export interface TransitionResult<TManifest> {
  ok: boolean;
  manifest?: TManifest;   // set only when ok is true
  reason?: string;        // set only when ok is false
}

export function transition<TManifest extends { nextStep: JourneyStepId; completedSteps: JourneyStepId[] }>(
  manifest: TManifest,
  to: JourneyStepId
): TransitionResult<TManifest>;
```

`transition` marks `manifest.nextStep` (the step just finished) into `completedSteps` — idempotent,
re-completing an already-completed step is a no-op, the same convention
`recordInvitationAcceptance` already uses for `JourneyContext` — and moves `nextStep` to `to`.
An illegal edge is rejected (`ok: false`, `manifest` left `undefined`, a `reason` string
explaining which edge was attempted) rather than silently coerced or guessed.

## What this file deliberately does not decide

Whether a transition is legal **in the graph** (this file) is a different question from whether
it's currently **possible in the real world** — e.g. a named practice whose PrometheusK handoff
is unmapped (`lib/onboarding/practiceHandoff.ts`), or a Watch First story with no verified StreamK
mapping (`lib/onboarding/streamHandoff.ts`). That's `lib/journey/recovery.ts`'s job
(`recoverJourney`), which consumes `isTerminalStep` and this graph's shape but adds the
availability checks this file never performs.

## Not yet done

- No page calls `transition` yet. Phase 1's pages advance `GuestJourneyContext.step` directly
  (`components/echo/onboarding/GuestJourneyTracker.tsx`) rather than through this graph — wiring
  them together is future work.
- This graph models one canonical path. It does not yet represent alternate/parallel journeys
  (e.g. multiple concurrent practices, a cohort-wide journey) — out of scope for this phase.
