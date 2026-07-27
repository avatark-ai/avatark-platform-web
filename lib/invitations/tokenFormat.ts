// Echo's own token DECODER for @avatark/invitations' local reference
// resolver -- this is Echo-specific glue, not part of the shared
// package (the package never imports Echo's content model; this file
// is the other side of that boundary).
//
// There is no real ArenaK token format to mirror (ArenaK's actual
// invitation service lives outside this workspace -- see
// packages/invitations/src/localResolver.ts). Until this app can reach
// that service directly, tokens use a simple, explicit local scheme so
// every destination type the contract defines is actually reachable in
// this repo today:
//
//   echo:<echoSlug>
//   practice:<practiceSlug>
//   echo_practice:<echoSlug>:<practiceSlug>
//   cohort:<cohortId>[:<practiceSlug>]
//   event:<eventId>
//   story:<storySlug>
//   episode:<episodeSlug>
//
// Any token that doesn't match this scheme (every invitation link
// issued before this pass -- see docs/INVITATION_MIGRATION.md) falls
// back to the exact same destination `/enter/[token]` already redirected
// to: the first Echo in the content registry. This is the ONLY
// fallback; an unrecognized *structured* token (e.g. `practice:` with a
// slug that doesn't exist) is never silently redirected anywhere -- it
// resolves to `null`, which the consumer renders as an honest
// unavailable state, never a substituted destination.
// Relative imports (not the "@/" alias) so this file -- like
// lib/content/echo.ts itself -- stays directly runnable under this
// repo's plain `node --test` runner, not just under Next's bundler.
import { getEchoBySlug, getPracticeBySlug, getStoryBySlug, listEchoes } from "../content/echo.ts";
import type { LocalInvitationTokenPayload } from "@avatark/invitations";

// The same first-Echo-in-the-registry fallback lib/onboarding/guide.ts's
// GUIDE_SLUG resolves to -- computed directly here rather than importing
// that module, so this file has no further "@/"-aliased dependency.
function legacyFallback(): LocalInvitationTokenPayload | null {
  const echo = listEchoes()[0];
  if (!echo) return null;
  return { destination: { type: "echo", echoSlug: echo.slug } };
}

export function decodeEchoInvitationToken(token: string): LocalInvitationTokenPayload | null {
  // Defensive: this app's Next.js version (see AGENTS.md -- breaking
  // changes vs. the Next.js you may already know) has been observed to
  // hand `[token]` dynamic-segment params back with `:` still
  // percent-encoded as `%3A` rather than decoded, even though the raw
  // incoming request path contained a literal `:`. Decoding first makes
  // the `type:id` scheme below work regardless of which form arrives.
  // A no-op for any token that was never encoded in the first place.
  let normalized = token;
  try {
    normalized = decodeURIComponent(token);
  } catch {
    // Malformed percent-encoding -- fall back to the raw token as-is.
  }
  const parts = normalized.split(":");
  const [kind, ...rest] = parts;

  switch (kind) {
    case "echo": {
      const [echoSlug] = rest;
      if (!echoSlug || !getEchoBySlug(echoSlug)) return null;
      return { destination: { type: "echo", echoSlug } };
    }
    case "practice": {
      const [practiceSlug] = rest;
      if (!practiceSlug || !getPracticeBySlug(practiceSlug)) return null;
      return { destination: { type: "practice", practiceSlug } };
    }
    case "echo_practice": {
      const [echoSlug, practiceSlug] = rest;
      if (!echoSlug || !practiceSlug) return null;
      if (!getEchoBySlug(echoSlug) || !getPracticeBySlug(practiceSlug)) return null;
      return { destination: { type: "echo_practice", echoSlug, practiceSlug } };
    }
    case "cohort": {
      const [cohortId, practiceSlug] = rest;
      if (!cohortId) return null;
      // Cohorts themselves have no real content model in this repo yet
      // (see /community/cohorts' honest empty state) -- the destination
      // is still a real, well-typed value; whether it's *launchable*
      // today is decided by the consumer (lib/invitations/destination.ts),
      // not fabricated here.
      if (practiceSlug && !getPracticeBySlug(practiceSlug)) return null;
      return { destination: practiceSlug ? { type: "cohort", cohortId, practiceSlug } : { type: "cohort", cohortId } };
    }
    case "event": {
      const [eventId] = rest;
      if (!eventId) return null;
      return { destination: { type: "event", eventId } };
    }
    case "story": {
      const [storySlug] = rest;
      if (!storySlug || !getStoryBySlug(storySlug)) return null;
      return { destination: { type: "story", storySlug } };
    }
    case "episode": {
      const [episodeSlug] = rest;
      if (!episodeSlug) return null;
      return { destination: { type: "episode", episodeSlug } };
    }
    default:
      // Not our structured scheme at all -- an existing/legacy bare
      // token (e.g. `revathi`, or any already-circulating QR code).
      return legacyFallback();
  }
}
