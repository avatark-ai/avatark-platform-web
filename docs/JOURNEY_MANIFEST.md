# Journey Manifest

`lib/journey/manifest.ts`'s `JourneyManifest` is the single object meant to be passed between
products at each handoff in the Entry Engine's journey (see `ENTRY_ENGINE_ARCHITECTURE.md`). It is
an **in-memory projection**, built fresh from whichever real source has one — it is not a third
storage layer, and this module never reads or writes `localStorage` or Supabase itself.

## Why a third shape, when two already exist

Two journey shapes already exist in this repo and are unaffected by this phase:

- `JourneyContext` (`lib/journey/state.ts`) — Supabase-backed (`user_metadata.journey`), only
  ever populated for a signed-in visitor.
- `GuestJourneyContext` (`lib/journey/guestContext.ts`) — localStorage-backed, only ever
  populated for a signed-out guest (Phase 1).

Neither is replaced. `JourneyManifest` normalizes both into one set of field names so a future
consumer (a handoff contract, a deep link, a recovery decision) never has to know both shapes at
once:

| Concept | `JourneyContext` | `GuestJourneyContext` | `JourneyManifest` |
|---|---|---|---|
| Which invitation | `invitationId` | `invitationToken` | `invitationId` |
| Which practice | `witness` | `witness` / `intendedPracticeId` | `practiceId` |
| Which Watch First story | — | `watchFirstContentId` | `watchFirstId` |
| Where to return to | — | `intendedReturnRoute` | `returnTo` |
| Progress marker | `practiceCompletedAt` (a fact, not a step) | `step` (`accepted`\|`watch_first`\|`practice_intro`) | `nextStep` / `completedSteps` (the full nine-step graph, see `STATE_MACHINE.md`) |

## Shape

```ts
export type JourneySource = "invitation" | "start" | "direct" | "resume";
export type JourneyEntryPoint = "enter" | "watch-first" | "witness" | "guide" | "journey";

export interface JourneyManifest {
  journeyId: string;
  invitationId: string | null;
  source: JourneySource;
  entryPoint: JourneyEntryPoint;
  watchFirstId: string | null;
  practiceId: string | null;
  cohortId: string | null;
  returnTo: string | null;
  nextStep: JourneyStepId;
  completedSteps: JourneyStepId[];
  metadata: Record<string, string | null>;
}
```

`journeyId` is always supplied by the caller (e.g. `crypto.randomUUID()`) — this module never
generates its own ids, the same deliberate split as `createLocalInvitationResolver` never picking
its own invitation ids. This keeps every function in `manifest.ts` a pure, deterministic function
of its inputs, and easy to unit test without mocking randomness.

## Building a manifest

- `createJourneyManifest(input)` — the base constructor. Defaults `nextStep` to
  `"invitation_received"` and `completedSteps` to `[]` when not specified.
- `manifestFromInvitation(journeyId, invitation, destination, preview)` — bridges a freshly
  resolved `Invitation` + `InvitationDestination` + `DestinationPreview` (from
  `lib/invitations/`) at the moment it's previewed on `/enter/[token]`. Extracts `practiceId`/
  `cohortId` from the destination's discriminated union — the same union
  `lib/invitations/destination.ts` already switches over, never a second interpretation of it.
  Records `preview.available` in `metadata` for visibility only; it deliberately does **not**
  decide `nextStep` from it — whether a transition is currently possible in the real world is
  `recovery.ts`'s job, not this bridge's.
- `manifestFromGuestContext(journeyId, guest)` — bridges Phase 1's `GuestJourneyContext` when
  resuming a guest's provisional progress. `GuestJourneyTracker` only ever advances `guest.step`
  forward through exactly `accepted → watch_first → practice_intro`, so the *last recorded* step
  names what's already happened; `nextStep` is simply the step immediately after it, and
  `completedSteps` is back-filled from the state machine's canonical order
  (`JOURNEY_STEP_ORDER`) so resuming doesn't silently lose history.
- `mergeManifestMetadata(manifest, patch)` — additive metadata merge. Absence of a key in `patch`
  means "unchanged," the same convention `recordIntentionContext` already uses for
  `JourneyContext`.

## How a manifest becomes a real URL

`lib/journey/deepLinks.ts`'s `DeepLink` builders (`enterInvitationLink`, `watchFirstLink`,
`practiceIntroLink`, `practiceDetailLink`, `journeyLink`) are the intended way to turn a
manifest's `invitationId`/`watchFirstId`/`practiceId`/`journeyId` into an actual href. Each
`DeepLink` carries an honest `available: boolean` — `true` only when a real Next.js route
resolves that href **today**; `/watch-first/{id}` and `/journey/{id}` are both prepared, not real,
since no per-story Watch First route or dynamic `/journey/[id]` page exists yet.

## Not yet done

- No manifest is ever serialized across an actual product boundary (a signed token, a query
  param, a shared table) — that transport layer is unscoped future work, deliberately left out of
  "orchestration contracts only."
- No page constructs or consumes a `JourneyManifest` yet. Phase 1's pages still read/write
  `JourneyContext`/`GuestJourneyContext` directly; wiring them through a manifest is a future
  phase's work.
