# End-to-End Flow

The four scenarios `lib/integrations/simulate.ts`'s `simulateJourney` walks, each a real, legal
path through the frozen state machine (`STATE_MACHINE.md`). Try any of these live at
`/dev/integration/simulator`. Every stage table below always lists all 5 stages, in order — a
"skipped" stage means this scenario's path never visits it, not that it's missing.

## Invitation

Entry point: `/enter/[token]` (`source: "invitation"`, `entryPoint: "enter"`). The richest path —
visits every stage, including the optional Watch First branch.

| Stage | Visited | Steps | Incoming handoff |
|---|---|---|---|
| AvatarK | yes | `invitation_received`, `invitation_accepted`, `practice_intro` | n/a — origin |
| StreamK | yes | `watch_first` | `EchoToStreamKHandoff` |
| Prometheus | yes | `practice_runtime`, `reflection` | `StreamKToPrometheusHandoff` |
| Living Echo | yes | `living_echo`, `recommendation` | `PrometheusToLivingEchoHandoff` |
| Arena | yes | `arena` | `LivingEchoToArenaHandoff` |

## Practice

Entry point: `/witness/[slug]` directly (`source: "direct"`, `entryPoint: "witness"`) — no
invitation, no Watch First.

| Stage | Visited | Steps | Incoming handoff |
|---|---|---|---|
| AvatarK | yes | `practice_intro` | n/a — origin |
| StreamK | **no** | — | n/a — skipped in this scenario |
| Prometheus | yes | `practice_runtime`, `reflection` | `StreamKToPrometheusHandoff` |
| Living Echo | yes | `living_echo`, `recommendation` | `PrometheusToLivingEchoHandoff` |
| Arena | yes | `arena` | `LivingEchoToArenaHandoff` |

## Watch First

Entry point: `/watch-first` directly (`source: "direct"`, `entryPoint: "watch-first"`) — no
invitation, but still passes through the practice intro afterward (per the state machine, there is
no direct `watch_first → practice_runtime` edge).

| Stage | Visited | Steps | Incoming handoff |
|---|---|---|---|
| AvatarK | yes | `practice_intro` | n/a — no product boundary crossed on this transition (`watch_first → practice_intro` stays within Echo) |
| StreamK | yes | `watch_first` | n/a — origin |
| Prometheus | yes | `practice_runtime`, `reflection` | `StreamKToPrometheusHandoff` |
| Living Echo | yes | `living_echo`, `recommendation` | `PrometheusToLivingEchoHandoff` |
| Arena | yes | `arena` | `LivingEchoToArenaHandoff` |

## Journey (resume)

Entry point: an already-in-progress journey, resumed (`source: "resume"`, `entryPoint:
"journey"`) — represents "already practiced, resuming to reflect." AvatarK, StreamK, and
`practice_runtime` are all implicitly already-completed history, not part of this run.

| Stage | Visited | Steps | Incoming handoff |
|---|---|---|---|
| AvatarK | **no** | — | n/a — skipped in this scenario |
| StreamK | **no** | — | n/a — skipped in this scenario |
| Prometheus | yes | `reflection` | n/a — origin |
| Living Echo | yes | `living_echo`, `recommendation` | `PrometheusToLivingEchoHandoff` |
| Arena | yes | `arena` | `LivingEchoToArenaHandoff` |

## Guest vs. Signed In

Both auth states walk the identical path for a given scenario — `authState` only changes the
manifest's `metadata.authState` value (visible in the manifest JSON at each stage), reflecting the
Journey Orchestrator's own distinction between `GuestJourneyContext` (provisional) and
`JourneyContext` (durable, signed-in) established in `JOURNEY_MANIFEST.md`. This sprint doesn't
persist either — see `INTEGRATION_SPRINT.md`'s "no synchronization" boundary.
