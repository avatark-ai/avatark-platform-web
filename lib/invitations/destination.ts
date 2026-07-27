import type { InvitationDestination } from "@avatark/invitations";
// Relative imports so this file stays directly runnable under this
// repo's plain `node --test` runner, same as lib/invitations/tokenFormat.ts.
import { getEchoBySlug, getPracticeBySlug, getStoryBySlug } from "../content/echo.ts";
import { isPracticeHandoffAvailable } from "../onboarding/practiceHandoff.ts";

/**
 * True when a destination either doesn't name a specific practice at
 * all (nothing to enforce) or names exactly the practice slug being
 * launched. Used by /api/onboarding/begin to make sure an invitation for
 * one practice can never authorize a handoff to a different one -- the
 * "never substitute another practice" guarantee, enforced against the
 * invitation itself, not just against practice-existence.
 */
export function invitationMatchesWitness(destination: InvitationDestination, witness: string): boolean {
  if (destination.type === "practice" || destination.type === "echo_practice") {
    return destination.practiceSlug === witness;
  }
  return true;
}

export interface DestinationPreview {
  title: string;
  body: string;
  /** False when this destination type has no real, launchable Echo route yet -- an honest gap, never a fabricated one. */
  available: boolean;
}

/**
 * A short, honest preview of where an invitation leads -- Phase 4's
 * "Preview" step. Never invents content: an unavailable destination
 * says so plainly instead of rendering placeholder copy.
 */
export function previewInvitationDestination(destination: InvitationDestination): DestinationPreview {
  switch (destination.type) {
    case "echo": {
      const echo = getEchoBySlug(destination.echoSlug);
      return echo
        ? { title: echo.name, body: echo.mission, available: true }
        : { title: "Echo unavailable", body: "This Echo isn't available right now.", available: false };
    }
    case "practice": {
      const practice = getPracticeBySlug(destination.practiceSlug);
      if (!practice) {
        return { title: "Practice unavailable", body: "This practice isn't available right now.", available: false };
      }
      // Content existing isn't enough on its own -- Phase 6's "verify
      // destination configured" gate applies here too, not only at the
      // PrometheusK handoff route, so an invitation never reads as
      // "available" only to dead-end one click later.
      if (!isPracticeHandoffAvailable(practice.slug)) {
        return {
          title: practice.title,
          body: "This practice isn't available to begin on PrometheusK yet — we won't hand you off to a different practice than the one you were invited to.",
          available: false,
        };
      }
      return { title: practice.title, body: practice.purpose, available: true };
    }
    case "echo_practice": {
      const echo = getEchoBySlug(destination.echoSlug);
      const practice = getPracticeBySlug(destination.practiceSlug);
      if (!echo || !practice) {
        return { title: "Unavailable", body: "This invitation's Echo or practice isn't available right now.", available: false };
      }
      if (!isPracticeHandoffAvailable(practice.slug)) {
        return {
          title: practice.title,
          body: `From ${echo.name} — this practice isn't available to begin on PrometheusK yet. We won't hand you off to a different one.`,
          available: false,
        };
      }
      return { title: practice.title, body: `From ${echo.name} — ${practice.purpose}`, available: true };
    }
    case "cohort":
      return {
        title: "Cohort invitation",
        body: "Cohorts aren't open in Echo yet — you're invited, and this will connect the moment one is.",
        available: false,
      };
    case "event":
      return {
        title: "Event invitation",
        body: "Events aren't scheduled in Echo yet — you're invited, and this will connect the moment one is.",
        available: false,
      };
    case "story": {
      const story = getStoryBySlug(destination.storySlug);
      // Even a story that exists in content has no dedicated per-story
      // Echo route yet (see docs/ECHO_ROUTE_MAP.md's "/watch/[episode]:
      // Deferred") -- honest either way, not just when content is missing.
      return story
        ? { title: story.title, body: story.description, available: false }
        : { title: "Story unavailable", body: "This story isn't available right now.", available: false };
    }
    case "episode":
      return {
        title: "Episode invitation",
        body: "Episodes aren't available in Echo yet — you're invited, and this will connect the moment one is.",
        available: false,
      };
  }
}

/**
 * Where "Continue" in the invitation preview goes once the destination
 * is available -- always an existing, real Echo route; never a new one.
 * Returns null when the destination has no real Echo route to continue
 * to (previewInvitationDestination's `available: false` case).
 */
export function invitationContinueHref(destination: InvitationDestination, token: string): string | null {
  switch (destination.type) {
    case "echo": {
      if (!getEchoBySlug(destination.echoSlug)) return null;
      return `/guide/${destination.echoSlug}?invitation=${encodeURIComponent(token)}`;
    }
    case "practice": {
      if (!getPracticeBySlug(destination.practiceSlug) || !isPracticeHandoffAvailable(destination.practiceSlug)) return null;
      return `/witness/${destination.practiceSlug}?invitation=${encodeURIComponent(token)}`;
    }
    case "echo_practice": {
      if (!getEchoBySlug(destination.echoSlug) || !getPracticeBySlug(destination.practiceSlug)) return null;
      if (!isPracticeHandoffAvailable(destination.practiceSlug)) return null;
      return `/witness/${destination.practiceSlug}?invitation=${encodeURIComponent(token)}`;
    }
    case "cohort":
    case "event":
    case "story":
    case "episode":
      return null;
  }
}
