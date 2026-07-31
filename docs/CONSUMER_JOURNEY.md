# AvatarK Consumer Journey

**Date:** 2026-07-31. **Branch:** `feature/avatar-platform-rc3`. Companion to
`docs/PLATFORM_CONTRACTS.md` and `docs/PLATFORM_INTEGRATION_MATRIX.md`.

This documents the canonical consumer lifecycle across the ecosystem and the doors people actually
walk through to enter it. As with `PLATFORM_CONTRACTS.md`, every stage below is marked with what's
real in this repo today vs. what's target/aspirational — no stage is described as working unless a
file reference backs it.

## The lifecycle

```
Studio creates
      ↓
Stream publishes
      ↓
Viewer watches
      ↓
Avatar onboarding
      ↓
Identity
      ↓
Prometheus practice
      ↓
Reflection
      ↓
Living Echo
      ↓
Arena community
      ↓
Invitation
      ↓
Another viewer
      ↓
Repeat
```

| Stage | Status | Detail |
|---|---|---|
| Studio creates | Not in this workspace | StudioK has no confirmed local repository — a deployed Vercel project exists under a name that doesn't match this ecosystem's planning docs (`packages/product-registry`'s `studiok.repository: null`). Entirely outside this repo's ability to observe or affect. |
| Stream publishes | Not in this workspace / not integrated | StreamK has its own repo (`streamk-web`) but `integrationStatus: 'in-development'` — "scope (feature-level integration with Platform, beyond domain reachability) not yet confirmed" per the registry's own description. |
| Viewer watches | Partially real | `/watch-first` is a real, static route in this repo (`lib/journey/deepLinks.ts`'s `watchFirstLink`) — the entry point for the `watch_first` journey step. It is not StreamK-powered content today; `watch_first → practice_intro` is the only implemented edge, and `handoffContracts.ts`'s `EchoToStreamKHandoff` has no real implementation. |
| Avatar onboarding | Real | `/start`, `/start/choose` (`components/echo/onboarding/StartHere.tsx`) — the "Have an Invitation / Show Me an Example / Help Me Choose" triage, backed by real routes. |
| Identity | Real | See `PLATFORM_CONTRACTS.md`'s Identity section — `lib/identity/`, backed by real Supabase-authenticated sessions. |
| Prometheus practice | Real, cross-repo | `/witness/[slug]` (practice intro, this repo) hands off to PrometheusK's real practice runtime via `lib/onboarding/practiceHandoff.ts` + `prometheusk.ts`. Confirmed real today, subject to one content gap: this repo's one seed practice (`the-promise-to-myself`) is deliberately unmapped (`null`) in `PRACTICE_HANDOFF_REGISTRY`, so the loop is wired and tested but dormant for real usage until a second, PrometheusK-matched practice exists. |
| Reflection | Real, cross-repo (narrow) | This repo never sees PrometheusK's reflection UI directly — it sees a short-lived, HMAC-signed completion receipt PrometheusK issues (`lib/onboarding/receipt.ts`), verified at `/continue`. Confirms "practice completed," nothing more. |
| Living Echo | PrometheusK's own | See `PLATFORM_CONTRACTS.md`'s Living Echo section (and its Echo/Living-Echo disambiguation note). Not modeled or stored in this repo. |
| Arena community | Not implemented | No ArenaK integration exists anywhere in this repo. `arenaAdapter.ts`'s honest placeholder ("No recommendation prepared for this journey yet") and `LivingEchoToArenaHandoff`'s unimplemented contract are the clearest markers. |
| Invitation | Real (ArenaK-owned, locally-resolved) | See `PLATFORM_CONTRACTS.md`'s Invitations section — real contract, real local reference resolver, no reachable real ArenaK issuance from this repo. |
| Another viewer / Repeat | Modeled, not measured | The loop is architecturally closed (an invitation can lead back to `/enter/[token]` for a new person), but nothing in this repo tracks referral/repeat-viewer metrics — that would be a StreamK/ArenaK-side concern if it exists at all. |

### The AvatarK-owned middle section, in full (real, `lib/journey/stateMachine.ts`)

The lifecycle above, from "Avatar onboarding" through "Arena community," is backed end-to-end by one
real 9-step state machine — reused verbatim here, not re-derived:

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

Stage ownership (`docs/SYSTEM_SEQUENCE.md`):

| Stage | Steps | Owning repo |
|---|---|---|
| AvatarK | `invitation_received`, `invitation_accepted`, `practice_intro` | this repo |
| StreamK | `watch_first` | `streamk-web` |
| Prometheus | `practice_runtime`, `reflection` | `prometheusk-web` |
| Living Echo | `living_echo`, `recommendation` | PrometheusK's own recorded trace |
| Arena | `arena` | ArenaK |

Real vs. modeled-only crossings today: AvatarK → StreamK **no** (handoff registry empty); AvatarK/
StreamK → Prometheus **yes**; Prometheus → Living Echo **yes, narrowly** (signed receipt only); Living
Echo → Arena **no**.

---

## Entry doors

The mission names eleven entry doors. In this codebase, only some of these are distinct coded paths —
most funnel through the single `/enter/[token]` mechanism regardless of stated origin. Each is marked
honestly below.

| Entry door | Status | Detail |
|---|---|---|
| Invitation | **Real, coded** | `/enter`, `/enter/[token]` — the one real mechanism for any invitation-sourced entry. |
| Direct URL | **Real, coded** | Any route above can be hit directly — this is literally how the "Practice" and "Watch First" simulator scenarios work (`lib/integrations/simulate.ts`, entered with `source: "direct"`). |
| Practice | **Real, coded** | `/witness/[slug]` — direct practice entry, no invitation required. |
| Story | Typed, not backed | A real `InvitationDestination` variant (`{type:"story", storySlug}`) and token format exist, but every story destination renders an honest "not available yet" (`lib/invitations/destination.ts`) — no story content or route exists behind it. |
| Challenge | Typed, not backed | Same as Story — `cohort`/`event` types resolve without crashing but render "not available yet." No challenge content exists. |
| QR code | **Copy only** | Appears only as illustrative prose in `app/enter/page.tsx`'s `INVITATION_ORIGINS` array ("a QR code" is one of nine listed possible origins on the generic `/enter` form) — not a distinct route, param, or scanning mechanism. Arrives through the same `/enter/[token]` door as everything else. |
| Workshop | **Copy only** | Same `INVITATION_ORIGINS` array ("a workshop"). No workshop-specific logic anywhere. |
| Conference | **Copy only** | Same array ("a conference"). No conference-specific logic anywhere. |
| Friend | **Copy only** | Same array ("a friend"). No referral-tracking or friend-specific logic anywhere. |
| University | **Aspirational content example** | Mentioned only as a planned future Echo content example (`docs/ECHO_CONTENT_MODEL.md`: "Adding a new Echo — including BITS Pilani..."). No organization-category content type exists; only one real Echo (`the-returner`) exists in `content/echo/echoes/` today. |
| Search | **Not implemented** | Confirmed absent anywhere — `docs/ECHO_ROUTE_MAP.md`: "Search — not implemented anywhere (Discover, header). Per instruction, omitted rather than faked." No `/search` route exists. |

Two narratively-adjacent but structurally separate surfaces, worth naming so they aren't mistaken for
more entry doors:
- `app/community/page.tsx`'s `ARENAK_CREATIONS`/`HOW_COMMUNITIES_BEGIN` describe ArenaK's organizer-
  side model (event/workshop/challenge/group/cohort creation → invitation issuance → "a link, a QR
  code, a conference, a class" distribution) — explanatory copy about the ecosystem, not implemented
  logic in this repo.
- The home page's four intent-first activity cards (Explore/Practice/Together/Watch,
  `lib/activities/registry.ts`, per `docs/PLATFORM_ENTRY_EXPERIENCE_HANDOFF.md`) are top-of-funnel
  product-choice UI, not themselves an entry-door type — Together (ArenaK) and Watch (StreamK) are
  both still "Coming soon" pending those products' own status.
