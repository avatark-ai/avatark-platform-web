# Integration Sprint RC1

This sprint turns "AvatarK becomes the coordinator between repositories" into visualization
tooling: **Integration Adapters** (interfaces only), an **Integration Dashboard**, and an
**Integration Simulator** — all new code under `lib/integrations/` and an unlinked
`/dev/integration` route. It builds on top of the frozen Journey Orchestrator
(`lib/journey/*`, `ENTRY_ENGINE_ARCHITECTURE.md`) without modifying it, and does not touch any
Entry Engine page (`/enter/[token]`, `/watch-first`, `/witness/[slug]`, etc.).

## The boundary, restated

- **No networking. No HTTP.** Every adapter method (`IntegrationAdapter.describeHandoff`) is
  synchronous and returns a plain object — no `Promise`, no `fetch`.
- **No authentication.** `/dev/integration` and `/dev/integration/simulator` have no auth gate —
  there's nothing to gate; they read no user session, no cookie, no Supabase state.
- **No synchronization.** Nothing here writes anywhere. The simulator's manifests exist only for
  the duration of one render.
- **Only orchestration visualization.** Every field shown is derived from the frozen
  `lib/journey/{manifest,stateMachine,handoffContracts,recovery}.ts` — this sprint reads that
  layer, it doesn't extend it.

## Modules

| Module | Purpose |
|---|---|
| `lib/integrations/adapterTypes.ts` | The one shared `IntegrationAdapter<T>` interface + result shape. |
| `lib/integrations/{streamk,prometheus,livingEcho,arena}Adapter.ts` | One adapter instance per product named in the mission, honestly reflecting `HANDOFF_CONTRACTS.md`'s real-vs-modeled-only status for each. |
| `lib/integrations/stages.ts` | The 5-stage grouping of the 9 `JourneyStepId`s, and the 4 real boundary crossings — a pure, additive lookup over the frozen state machine. See `SYSTEM_SEQUENCE.md`. |
| `lib/integrations/dashboard.ts` | `describeDashboard` — current/next product/step/handoff/status for one manifest. |
| `lib/integrations/simulate.ts` | `simulateJourney` — walks one of 4 fixed scenarios through the real state machine, reporting the exact handoff at each stage. See `END_TO_END_FLOW.md`. |
| `components/dev/{IntegrationDashboardView,IntegrationSimulatorView}.tsx` + `app/dev/integration/*` | The developer-only UI. Not linked from any nav; excluded from Echo's shell chrome the same way `/admin` already is (`components/echo/shell/EchoShell.tsx`). |

## What this sprint deliberately does not do

- **No real adapter implementation.** Every `describeHandoff` is a pure, honest description of
  what *would* happen — none of them talk to StreamK, PrometheusK, or ArenaK.
- **No change to the Journey Orchestrator.** `lib/journey/*` is untouched; this sprint only reads
  its exported types and functions (`JOURNEY_STEP_ORDER`, `canTransition`, `transition`,
  `createJourneyManifest`, the four `handoffContracts.ts` builders, `recoverJourney`).
- **No change to any Entry Engine page.** `/enter/[token]`, `/watch-first`, `/witness/[slug]` are
  untouched.
- **The dashboard/simulator are not linked from any nav** — reachable only by direct URL, matching
  "this is a developer dashboard."
