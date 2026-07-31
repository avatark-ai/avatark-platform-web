import type { Invitation, InvitationDestination } from "@avatark/invitations";
import type { GuestJourneyContext } from "./guestContext.ts";
import { JOURNEY_STEP_ORDER, type JourneyStepId } from "./stateMachine.ts";

// ============================================================
// JourneyManifest -- the single object meant to be passed between
// products at each handoff (see handoffContracts.ts). It normalizes the
// two journey shapes that already exist in this repo rather than
// inventing a third field-naming convention:
//   - JourneyContext (lib/journey/state.ts)      -- Supabase-backed, signed-in only
//   - GuestJourneyContext (lib/journey/guestContext.ts) -- localStorage, signed-out only
// A manifest is a read-only, in-memory projection built FROM one of
// those two sources (see manifestFromInvitation/manifestFromGuestContext
// below) -- it is not a third persistence layer. Nothing in this file
// reads or writes storage.
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

export interface CreateJourneyManifestInput {
  /** Always supplied by the caller (e.g. crypto.randomUUID()) -- this
   *  module never generates its own ids, so it stays a pure, deterministic
   *  function of its inputs. */
  journeyId: string;
  source: JourneySource;
  entryPoint: JourneyEntryPoint;
  invitationId?: string | null;
  watchFirstId?: string | null;
  practiceId?: string | null;
  cohortId?: string | null;
  returnTo?: string | null;
  nextStep?: JourneyStepId;
  completedSteps?: JourneyStepId[];
  metadata?: Record<string, string | null>;
}

export function createJourneyManifest(input: CreateJourneyManifestInput): JourneyManifest {
  return {
    journeyId: input.journeyId,
    invitationId: input.invitationId ?? null,
    source: input.source,
    entryPoint: input.entryPoint,
    watchFirstId: input.watchFirstId ?? null,
    practiceId: input.practiceId ?? null,
    cohortId: input.cohortId ?? null,
    returnTo: input.returnTo ?? null,
    nextStep: input.nextStep ?? "invitation_received",
    completedSteps: input.completedSteps ?? [],
    metadata: input.metadata ?? {},
  };
}

// Every JourneyStepId that comes strictly before `step` in the canonical
// order -- used to back-fill completedSteps when a manifest is bridged
// from a partial, already-in-progress source (a resumed guest context),
// rather than leaving completedSteps empty and losing that history.
function stepsBefore(step: JourneyStepId): JourneyStepId[] {
  const index = JOURNEY_STEP_ORDER.indexOf(step);
  return JOURNEY_STEP_ORDER.slice(0, index);
}

// The same InvitationDestination union lib/invitations/destination.ts
// already switches over -- never a second, competing interpretation of it.
function destinationPracticeId(destination: InvitationDestination): string | null {
  if (destination.type === "practice" || destination.type === "echo_practice") {
    return destination.practiceSlug;
  }
  return null;
}

function destinationCohortId(destination: InvitationDestination): string | null {
  return destination.type === "cohort" ? destination.cohortId : null;
}

// Structural subset of lib/invitations/destination.ts's DestinationPreview
// (that file, and the app-specific Echo content it previews, stays out
// of this package) -- any real DestinationPreview satisfies this shape.
export interface DestinationAvailability {
  title: string;
  body: string;
  available: boolean;
}

/**
 * Bridges a freshly-resolved Invitation + its preview into a manifest, at
 * the moment it's shown on /enter/[token]. Deliberately does not decide
 * `nextStep` from `preview.available` -- whether a transition is
 * currently possible in the real world is lib/journey/recovery.ts's
 * concern, not this bridge's; `preview.available` is only recorded in
 * metadata for visibility.
 */
export function manifestFromInvitation(
  journeyId: string,
  invitation: Invitation,
  destination: InvitationDestination,
  preview: DestinationAvailability
): JourneyManifest {
  return createJourneyManifest({
    journeyId,
    source: "invitation",
    entryPoint: "enter",
    invitationId: invitation.token,
    practiceId: destinationPracticeId(destination),
    cohortId: destinationCohortId(destination),
    metadata: {
      destinationType: destination.type,
      destinationAvailable: String(preview.available),
    },
  });
}

// Where a guest's remembered step (lib/journey/guestContext.ts's
// GuestJourneyStep) resumes in the full nine-step graph, and which entry
// point that corresponds to. GuestJourneyTracker only ever advances
// `step` forward through exactly this order (accepted -> watch_first ->
// practice_intro), so the *last recorded* step names what's already
// happened; nextStep is simply the step immediately after it.
const GUEST_STEP_RESUME: Record<
  NonNullable<GuestJourneyContext["step"]> | "none",
  { nextStep: JourneyStepId; entryPoint: JourneyEntryPoint }
> = {
  none: { nextStep: "invitation_accepted", entryPoint: "enter" },
  accepted: { nextStep: "watch_first", entryPoint: "watch-first" },
  watch_first: { nextStep: "practice_intro", entryPoint: "witness" },
  practice_intro: { nextStep: "practice_runtime", entryPoint: "witness" },
};

/**
 * Bridges Phase 1's GuestJourneyContext (localStorage, provisional) into
 * a manifest -- the normalizer between its field spellings
 * (invitationToken/witness/watchFirstContentId/intendedReturnRoute) and
 * this manifest's (invitationId/practiceId/watchFirstId/returnTo), so a
 * future consumer never has to know both shapes at once.
 */
export function manifestFromGuestContext(journeyId: string, guest: GuestJourneyContext): JourneyManifest {
  const resume = GUEST_STEP_RESUME[guest.step ?? "none"];
  return createJourneyManifest({
    journeyId,
    source: "resume",
    entryPoint: resume.entryPoint,
    invitationId: guest.invitationToken,
    watchFirstId: guest.watchFirstContentId,
    practiceId: guest.intendedPracticeId,
    returnTo: guest.intendedReturnRoute,
    nextStep: resume.nextStep,
    completedSteps: stepsBefore(resume.nextStep),
  });
}

/** Additive metadata merge -- absence of a key in `patch` means
 *  "unchanged," same convention as recordIntentionContext. */
export function mergeManifestMetadata(
  manifest: JourneyManifest,
  patch: Record<string, string | null>
): JourneyManifest {
  return { ...manifest, metadata: { ...manifest.metadata, ...patch } };
}
