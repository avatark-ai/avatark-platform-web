import type { JourneyContext } from "./state.ts";

// Pure duplicate-prevention check, extracted so it's testable under this
// repo's plain `node --test` runner without pulling in state.ts's own
// Supabase-client import (which needs the "@/" alias plain Node doesn't
// resolve -- same reason lib/journey/continuity.test.ts only ever
// imports JourneyContext as a type, never a runtime value, from state.ts).
// Re-accepting the SAME invitation must never overwrite the original
// invitationAcceptedAt with a later one.
export function shouldSkipInvitationAcceptance(current: JourneyContext, invitationId: string): boolean {
  return current.invitationId === invitationId && Boolean(current.invitationAcceptedAt);
}
