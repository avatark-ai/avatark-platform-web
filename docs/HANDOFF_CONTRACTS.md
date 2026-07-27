# Product Handoff Contracts

`lib/journey/handoffContracts.ts` defines one typed interface + one pure projection function per
edge in the Entry Engine's journey (`ENTRY_ENGINE_ARCHITECTURE.md`). These are **orchestration
contracts only** — a payload shape and a data transform from a `JourneyManifest`
(`JOURNEY_MANIFEST.md`), never a network call, redirect, or `fetch`. This repository owns
orchestration; it does not own the products on either side of these edges, so no builder here
ever crosses the boundary it describes.

Each section below states plainly whether a real implementation of that edge exists in this repo
today — never claim more than what's actually built.

## Echo → StreamK

```
   Echo (/enter/[token], /witness/[slug])
              │
              ▼
   ┌─────────────────────┐
   │  EchoToStreamKHandoff │   ---- boundary this repo doesn't cross ----
   └─────────────────────┘
              │
              ▼
           StreamK (Watch First)
```

```ts
export interface EchoToStreamKHandoff {
  journeyId: string;
  invitationId: string | null;
  watchFirstId: string;
  returnTo: string;
}
export function buildEchoToStreamKHandoff(manifest: JourneyManifest): EchoToStreamKHandoff | null;
```

**Real today?** No. Watch First is a single static page (`app/watch-first/page.tsx`), and
`lib/onboarding/streamHandoff.ts`'s registry is deliberately empty (no story content ships, no
StreamK content id has ever been verified). This describes the intended shape for when a real
per-story StreamK handoff ships.

## StreamK → PrometheusK

```
           StreamK (Watch First finished)
                    │
                    ▼
   ┌───────────────────────────┐
   │ StreamKToPrometheusHandoff │
   └───────────────────────────┘
                    │
                    ▼
          PrometheusK (practice runtime)
```

```ts
export interface StreamKToPrometheusHandoff {
  journeyId: string;
  practiceId: string;
  witness: string;
  invitationId: string | null;
  cohortId: string | null;
  returnTo: string;
}
export function buildStreamKToPrometheusHandoff(manifest: JourneyManifest): StreamKToPrometheusHandoff | null;
```

**Real today?** Yes, for the practice-direct path (an invitation naming a practice skips Watch
First entirely, same as the state machine's branch — see `STATE_MACHINE.md`). The real mechanism
is `lib/onboarding/practiceHandoff.ts`'s `PracticeHandoffTarget` +
`lib/onboarding/prometheusk.ts`'s `OnboardingHandoffContext`/`buildBorrowUrl`. This contract names
the same fields (`practiceId`/`witness`/`invitationId`/`cohortId`/`returnTo`) as that real
implementation — it does not invent a second, competing shape for the same edge.

## PrometheusK → Living Echo

```
      PrometheusK (practice runtime → reflection)
                    │
                    ▼
   ┌────────────────────────────┐
   │ PrometheusToLivingEchoHandoff │
   └────────────────────────────┘
                    │
                    ▼
        Living Echo (PrometheusK's own recorded
                     trace of practice — not a
                     separate product)
```

```ts
export interface PrometheusToLivingEchoHandoff {
  journeyId: string;
  practiceId: string;
  completedAt: string;
}
export function buildPrometheusToLivingEchoHandoff(manifest: JourneyManifest, completedAt: string): PrometheusToLivingEchoHandoff | null;
```

**Real today?** Yes, narrowly: the RC5 signed-completion-receipt loop (`docs/RC5_HANDOFF_CONTRACT.md`,
`lib/onboarding/receipt.ts`, verified server-side in `app/continue/page.tsx`) is the one boundary
this platform actually observes — a verified completion fact, nothing about Living Echo's
contents. Living Echo itself is PrometheusK's own internal record
(`packages/product-registry`'s `"prometheusk"` entry description), never something this repo
reads or writes directly.

## Living Echo → Arena

```
        Living Echo
             │
             ▼
   ┌─────────────────────────┐
   │ LivingEchoToArenaHandoff │
   └─────────────────────────┘
             │
             ▼
          Arena (ArenaK)
```

```ts
export type LivingEchoToArenaRecommendationReason = "practice_completed" | "cohort_invite" | "manual";

export interface LivingEchoToArenaHandoff {
  journeyId: string;
  recommendationReason: LivingEchoToArenaRecommendationReason;
  returnTo: string | null;
}
export function buildLivingEchoToArenaHandoff(manifest: JourneyManifest, recommendationReason: LivingEchoToArenaRecommendationReason): LivingEchoToArenaHandoff;
```

**Real today?** No. No implementation of ArenaK integration exists anywhere in this repo — it's a
distinct, larger, unscoped effort (`docs/ecosystem/WAVE1_REGISTRY_INTEGRATION_REPORT.md`: "Return-
to-Platform flow is missing for GameK, ArenaK, and StreamK"). Contract only, describing the
intended recommendation handoff once one exists.

## Not yet done

- None of these builders are called from any page. A future phase would call them from wherever
  each edge's real transition happens (e.g. `buildStreamKToPrometheusHandoff` from
  `app/witness/[slug]/page.tsx`, alongside the real `buildBorrowUrl` call it already makes).
- The Echo→StreamK and Living Echo→Arena edges have no real product to hand off to yet — their
  contracts exist so the shape is agreed on in advance, not because there's a live integration to
  wire today.
