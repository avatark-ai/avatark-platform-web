# Entry Engine — Journey Orchestrator Architecture

This is the umbrella doc for the Journey Orchestrator built on top of Phase 1's Entry Engine
(invitation preview/acceptance/metadata, guest context, journey diagram, StreamK/PrometheusK
routing prep — see `ECHO_RC1_COMPLETE.md` and the Phase 1 commits on
`feature/avatar-platform-rc3`). Phase 2 turns those one-off pages into a proper orchestration
layer: a manifest object, an explicit state machine, cross-product handoff contracts, a deep-link
builder, and a recovery design. Every module below lives under `lib/journey/`, is pure
(no network calls, no storage reads/writes of its own), and is unit-tested under this repo's plain
`node --test` runner.

## What this repository owns — and what it doesn't

**This repository owns orchestration**: deciding what step a participant is on, what a valid next
step looks like, what data should move to the next product, and how to recover when something's
missing. It does **not** own:

- **Practice runtime** — that's PrometheusK's (`prometheusk-web`).
- **Content publishing** — Echo's own `content/echo/` model, untouched by this phase.
- **The media player** — StreamK/CinemaK.
- **Arena** — ArenaK's competitive layer.
- **Studio** — StudioK's creation tools.

The handoff contracts (`HANDOFF_CONTRACTS.md`) describe the boundary at each of these edges; they
never cross it. No module added this phase calls `fetch`, issues a redirect, or talks to a
product's real API — that would be implementation, which every deliverable this phase is
explicitly scoped away from ("orchestration contracts only. No implementation").

## The journey, end to end

```
 Invitation           Echo               Watch First         Practice Intro
 (ArenaK-issued,   →  (/enter/[token]  →  (/watch-first,   →  (/witness/[slug],
  resolved locally     preview + guest     StreamK-powered,    PrometheusK handoff
  today — see          accept)             optional branch)    prepared)
  lib/invitations/)
                                                                      ↓
                                                          Prometheus Runtime
                                                          (prometheusk-web,
                                                           outside this repo)
                                                                      ↓
                                                             Reflection
                                                          (PrometheusK's own,
                                                           this repo only sees
                                                           a verified receipt —
                                                           see RC5_HANDOFF_CONTRACT.md)
                                                                      ↓
                                                            Living Echo
                                                       (PrometheusK's recorded
                                                        trace of practice —
                                                        not a separate product)
                                                                      ↓
                                                           Recommendation
                                                                      ↓
                                                               Arena
                                                          (ArenaK — no
                                                           implementation
                                                           anywhere yet)
```

Each arrow above corresponds to one `JourneyStepId` transition in `lib/journey/stateMachine.ts`
(see `STATE_MACHINE.md`) and, where a real cross-product handoff exists or is modeled, one
interface in `lib/journey/handoffContracts.ts` (see `HANDOFF_CONTRACTS.md`).

## Modules added this phase

| Module | Purpose | Detailed in |
|---|---|---|
| `lib/journey/manifest.ts` | `JourneyManifest` — the single object meant to move between products at each handoff; normalizes `JourneyContext` and `GuestJourneyContext` | `JOURNEY_MANIFEST.md` |
| `lib/journey/stateMachine.ts` | The nine-step graph and its legal transitions; a pure reducer over a manifest | `STATE_MACHINE.md` |
| `lib/journey/handoffContracts.ts` | Four typed interfaces + pure projections, one per product boundary | `HANDOFF_CONTRACTS.md` |
| `lib/journey/deepLinks.ts` | Consistent route metadata for `/enter/{token}`, `/watch-first(/{id})`, `/witness/{slug}`, `/practice/{id}`, `/journey/(today\|{id})` | `JOURNEY_MANIFEST.md` (deep links are how a manifest's steps become real hrefs) |
| `lib/journey/recovery.ts` | `recoverJourney` — a pure decision function for expired invitations, missing content, already-completed or resumable journeys | `STATE_MACHINE.md` |

## What this phase deliberately does not do

- **No page in `app/` was modified.** Every module above is new and additive under `lib/journey/`.
  Nothing currently rendered changes behavior — this is scaffolding for a future phase to consume,
  not a redesign of Phase 1's UI.
- **No persistence was added.** `JourneyManifest` is an in-memory projection; it is not a third
  storage layer alongside `JourneyContext` (Supabase) and `GuestJourneyContext` (localStorage).
  Serializing a manifest across an actual product boundary (a real URL param, a signed token, a
  shared table) is unscoped future work.
- **No real Echo→StreamK or Living Echo→Arena implementation exists.** Their contracts in
  `HANDOFF_CONTRACTS.md` are modeled only, stated as such.
- **`recoverJourney` is not wired into any page.** A future phase would call it from
  `/enter/[token]`, `/watch-first`, or `/witness/[slug]` with real inputs
  (`classifyInvitationStatus`, `isPracticeHandoffAvailable`, `isStreamHandoffAvailable`, a bridged
  manifest) — today it's tested in isolation only.
