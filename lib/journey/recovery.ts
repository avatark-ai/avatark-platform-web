import type { InvitationStatus } from "@avatark/invitations";
import type { JourneyManifest } from "./manifest.ts";
import { isTerminalStep } from "./stateMachine.ts";
import { enterInvitationLink, journeyLink, practiceIntroLink, watchFirstLink, type DeepLink } from "./deepLinks.ts";

// ============================================================
// Journey Recovery -- a pure decision function only. No storage read
// happens inside this file: a future caller supplies already-resolved
// facts (a freshly-computed classifyInvitationStatus result -- never
// cached, matching every other place in this repo that re-derives
// invitation validity on each visit; isPracticeHandoffAvailable/
// isStreamHandoffAvailable results; and a manifest bridged from
// whichever real source has one, per manifest.ts). This module only
// decides what should happen given those facts -- it never reads
// localStorage or Supabase itself, satisfying "design recovery... do not
// implement persistence, only architecture."
export type JourneyRecoveryReason =
  | "expired_invitation"
  | "invalid_invitation"
  | "missing_practice"
  | "missing_watch_first"
  | "already_completed"
  | "resumable";

export interface JourneyRecoveryAction {
  reason: JourneyRecoveryReason;
  redirectTo: DeepLink | null;
  message: string;
}

export interface RecoverJourneyInput {
  /** A freshly-computed classifyInvitationStatus result, or null when
   *  this journey isn't invitation-sourced. */
  invitationStatus: InvitationStatus | null;
  manifest: JourneyManifest | null;
  practiceAvailable: boolean;
  watchFirstAvailable: boolean;
}

function invitationStatusMessage(status: InvitationStatus): string {
  switch (status) {
    case "expired":
      return "This invitation has expired. Ask whoever sent it for a new one.";
    case "accepted":
      return "This invitation has already been used.";
    case "exhausted":
      return "This invitation is no longer available -- it's already been used the maximum number of times.";
    case "revoked":
      return "This invitation was withdrawn. It's no longer valid.";
    case "invalid":
    default:
      return "We couldn't recognize this invitation.";
  }
}

// Where to send someone to resume at manifest.nextStep -- this repo only
// owns routes up through the practice intro; practice_runtime/reflection/
// living_echo/recommendation/arena all belong to products this repo
// doesn't own (PrometheusK, Arena), so the only honest real route left to
// offer at those steps is the participant's own Journey.
function deepLinkForNextStep(manifest: JourneyManifest): DeepLink | null {
  switch (manifest.nextStep) {
    case "invitation_received":
    case "invitation_accepted":
      return manifest.invitationId ? enterInvitationLink(manifest.invitationId) : null;
    case "watch_first":
      return watchFirstLink(manifest.watchFirstId);
    case "practice_intro":
      return manifest.practiceId
        ? practiceIntroLink(manifest.practiceId, { invitation: manifest.invitationId ?? undefined })
        : null;
    case "practice_runtime":
    case "reflection":
    case "living_echo":
    case "recommendation":
    case "arena":
      return journeyLink();
  }
}

/**
 * Decides what recovery a participant needs, in priority order:
 * a bad invitation status always wins (nothing else matters if the
 * invitation itself can't be used), then a named-but-unavailable
 * practice, then a named-but-unavailable Watch First (degrades
 * gracefully to the practice intro, same non-blocking spirit as Watch
 * First already being optional in the state machine), then an already-
 * finished journey, then a resumable in-progress one. Returns null when
 * none of these apply -- proceed normally, nothing to recover.
 */
export function recoverJourney(input: RecoverJourneyInput): JourneyRecoveryAction | null {
  const { invitationStatus, manifest, practiceAvailable, watchFirstAvailable } = input;

  if (invitationStatus && invitationStatus !== "pending") {
    return {
      reason: invitationStatus === "expired" ? "expired_invitation" : "invalid_invitation",
      redirectTo: null,
      message: invitationStatusMessage(invitationStatus),
    };
  }

  if (!manifest) return null;

  if (manifest.practiceId && !practiceAvailable) {
    return {
      reason: "missing_practice",
      redirectTo: null,
      message: `The practice this journey named ("${manifest.practiceId}") isn't available to begin yet -- we won't hand off to a different one.`,
    };
  }

  if (manifest.watchFirstId && !watchFirstAvailable) {
    return {
      reason: "missing_watch_first",
      redirectTo: manifest.practiceId
        ? practiceIntroLink(manifest.practiceId, { invitation: manifest.invitationId ?? undefined })
        : null,
      message: "Watch First isn't available for this journey -- continuing straight to the practice intro.",
    };
  }

  if (isTerminalStep(manifest.nextStep)) {
    return {
      reason: "already_completed",
      redirectTo: journeyLink(),
      message: "This journey has already reached Arena -- nothing left to recover.",
    };
  }

  if (manifest.completedSteps.length > 0) {
    return {
      reason: "resumable",
      redirectTo: deepLinkForNextStep(manifest),
      message: `Resuming where you left off: ${manifest.nextStep.replace(/_/g, " ")}.`,
    };
  }

  return null;
}
