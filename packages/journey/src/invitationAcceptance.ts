// Structural subset of lib/journey/state.ts's JourneyContext (the
// concrete, Supabase-backed context stays app-side, not in this
// package) -- any real JourneyContext satisfies this shape, so the app
// passes one straight through with no adapter needed.
export interface InvitationAcceptanceContext {
  invitationId: string | null;
  invitationAcceptedAt: string | null;
}

// Pure duplicate-prevention check. Re-accepting the SAME invitation must
// never overwrite the original invitationAcceptedAt with a later one.
export function shouldSkipInvitationAcceptance(
  current: InvitationAcceptanceContext,
  invitationId: string
): boolean {
  return current.invitationId === invitationId && Boolean(current.invitationAcceptedAt);
}
