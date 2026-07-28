# System Sequence

Which repository owns each of the 5 stages the Integration Dashboard/Simulator visualize, and the
4 real crossings between them. This is a display-layer grouping (`lib/integrations/stages.ts`) of
the Journey Orchestrator's existing 9-step graph (`STATE_MACHINE.md`) — it does not change that
graph.

## Stage ownership

| Stage | `JourneyStepId`s | Owning repo |
|---|---|---|
| AvatarK | `invitation_received`, `invitation_accepted`, `practice_intro` | `avatark-platform-web` (this repo) |
| StreamK | `watch_first` | StreamK (`streamk-web`) |
| Prometheus | `practice_runtime`, `reflection` | PrometheusK (`prometheusk-web`) |
| Living Echo | `living_echo`, `recommendation` | PrometheusK's own recorded trace — not a separate repo |
| Arena | `arena` | ArenaK |

`practice_intro` (the real `/witness/[slug]` route) stays AvatarK-owned: per
`HANDOFF_CONTRACTS.md`, `StreamKToPrometheusHandoff` is the thing that fires *from* that page, not
before it. `recommendation` groups with Living Echo, matching `buildLivingEchoToArenaHandoff`'s
naming — Living Echo, holding the full practice history, is what surfaces the recommendation.

## The four real crossings

Grounded in `STATE_MACHINE.md`'s transition table: `watch_first`'s only legal next step is
`practice_intro` (never straight to `practice_runtime`), so the Prometheus crossing always happens
at exactly `practice_intro → practice_runtime`, whether or not Watch First was visited.

```
 AvatarK                    StreamK                 Prometheus
 (invitation_received,      (watch_first)           (practice_runtime,
  invitation_accepted,                                reflection)
  practice_intro)
      │                         │                         │
      │  EchoToStreamKHandoff   │                         │
      ├────────────────────────►│                         │
      │  (invitation_accepted   │                         │
      │   -> watch_first)       │                         │
      │                         │                         │
      │  StreamKToPrometheusHandoff (real today)          │
      ├─────────────────────────────────────────────────►│
      │  (practice_intro -> practice_runtime,             │
      │   regardless of whether watch_first ran)          │
      │                                                    │
                                     Prometheus              Living Echo
                                     (reflection)            (living_echo,
                                          │                   recommendation)
                                          │ PrometheusToLivingEchoHandoff (real today)
                                          ├───────────────────────────────►│
                                          │ (reflection -> living_echo)    │
                                          │                                │
                                                                Living Echo    Arena
                                                                (recommendation) (arena)
                                                                     │
                                                                     │ LivingEchoToArenaHandoff
                                                                     ├──────────────────────────►
                                                                     │ (recommendation -> arena)
```

Every other legal transition (`invitation_received→invitation_accepted`,
`invitation_accepted→practice_intro`, `watch_first→practice_intro`,
`practice_runtime→reflection`, `living_echo→recommendation`) stays within one stage — no handoff
object exists for those, by design.

## Real vs. modeled-only (see `HANDOFF_CONTRACTS.md` for the full detail)

| Crossing | Real today? |
|---|---|
| AvatarK → StreamK | No — `lib/onboarding/streamHandoff.ts`'s registry is empty. |
| AvatarK/StreamK → Prometheus | Yes — `lib/onboarding/practiceHandoff.ts` + `prometheusk.ts`. |
| Prometheus → Living Echo | Yes, narrowly — the RC5 signed-completion-receipt loop. |
| Living Echo → Arena | No — no ArenaK integration exists anywhere in this repo. |
