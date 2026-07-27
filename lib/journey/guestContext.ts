// Relative import so this file stays directly runnable under this
// repo's plain `node --test` runner, same as lib/invitations/*.ts.
import { safeReturnPath } from "../auth/safeReturnPath.ts";

// A signed-out participant's provisional progress through an invitation,
// remembered client-side only -- localStorage, never a backend identity.
// This is NOT the authoritative invitation claim (that's still whatever
// ArenaK/the resolver says server-side on each /enter/[token] visit);
// it's just enough breadcrumb so "continue as guest" survives a page
// navigation, and can hand off cleanly into the real, signed-in
// JourneyContext (lib/journey/state.ts) the moment the guest signs in.
//
// Deliberately carries only public slugs/ids/timestamps/a same-origin
// path -- never reflection content, evidence, or an auth token. See
// JourneySessionProvider (lib/journey/session.tsx) for where a stored
// context gets merged into the real record and marked claimed.
export const GUEST_CONTEXT_SCHEMA_VERSION = 1;
export const GUEST_CONTEXT_STORAGE_KEY = "echo_guest_journey_v1";

export type GuestJourneyStep = "accepted" | "watch_first" | "practice_intro";

export interface GuestJourneyContext {
  schemaVersion: number;
  invitationToken: string | null;
  witness: string | null;
  intendedPracticeId: string | null;
  watchFirstContentId: string | null;
  step: GuestJourneyStep | null;
  intendedReturnRoute: string | null;
  acceptedAt: string | null;
  claimed: boolean;
}

const EMPTY_GUEST_CONTEXT: GuestJourneyContext = {
  schemaVersion: GUEST_CONTEXT_SCHEMA_VERSION,
  invitationToken: null,
  witness: null,
  intendedPracticeId: null,
  watchFirstContentId: null,
  step: null,
  intendedReturnRoute: null,
  acceptedAt: null,
  claimed: false,
};

function isGuestJourneyStep(value: unknown): value is GuestJourneyStep {
  return value === "accepted" || value === "watch_first" || value === "practice_intro";
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

// Discards (returns null) on anything that isn't a well-formed,
// current-schema record -- missing key, malformed JSON, a stale
// schemaVersion from a future/past shape -- rather than ever throwing or
// guessing at a partial shape. Safe migration-by-discard: worst case a
// guest re-answers "continue as guest," nothing breaks.
export function readGuestContext(): GuestJourneyContext | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(GUEST_CONTEXT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.schemaVersion !== GUEST_CONTEXT_SCHEMA_VERSION) return null;
    return {
      schemaVersion: GUEST_CONTEXT_SCHEMA_VERSION,
      invitationToken: stringOrNull(parsed.invitationToken),
      witness: stringOrNull(parsed.witness),
      intendedPracticeId: stringOrNull(parsed.intendedPracticeId),
      watchFirstContentId: stringOrNull(parsed.watchFirstContentId),
      step: isGuestJourneyStep(parsed.step) ? parsed.step : null,
      intendedReturnRoute: stringOrNull(parsed.intendedReturnRoute),
      acceptedAt: stringOrNull(parsed.acceptedAt),
      claimed: parsed.claimed === true,
    };
  } catch {
    return null;
  }
}

// Merges onto whatever's already stored (or a fresh empty context if
// none/discarded) -- absence of a field in `patch` means "unchanged,"
// same convention as recordIntentionContext in lib/journey/state.ts.
// intendedReturnRoute is always re-validated through the shared
// same-origin allowlist guard before being persisted, since it's later
// read back and could otherwise become an open-redirect vector.
export function writeGuestContext(patch: Partial<GuestJourneyContext>): void {
  if (typeof localStorage === "undefined") return;
  try {
    const current = readGuestContext() ?? EMPTY_GUEST_CONTEXT;
    const merged: GuestJourneyContext = {
      ...current,
      ...patch,
      schemaVersion: GUEST_CONTEXT_SCHEMA_VERSION,
    };
    if (patch.intendedReturnRoute !== undefined) {
      const safe = patch.intendedReturnRoute ? safeReturnPath(patch.intendedReturnRoute, "") : "";
      merged.intendedReturnRoute = safe || null;
    }
    localStorage.setItem(GUEST_CONTEXT_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Storage unavailable (private mode, quota, disabled) -- fail open,
    // same as RevealOnView's sessionStorage use. Worst case the guest's
    // progress just isn't remembered across a navigation.
  }
}

export function markGuestContextClaimed(): void {
  writeGuestContext({ claimed: true });
}

export function clearGuestContext(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(GUEST_CONTEXT_STORAGE_KEY);
  } catch {
    // ignored -- see writeGuestContext
  }
}
