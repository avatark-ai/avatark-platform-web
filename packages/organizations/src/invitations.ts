// Pure classification of an organization_invitations row into a display
// status. `now` is a parameter (not read internally) so this stays
// unit-testable without mocking the clock.
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export interface InvitationRow {
  accepted_at: string | null
  revoked_at: string | null
  expires_at: string
}

export function classifyInvitationStatus(invitation: InvitationRow, now: Date): InvitationStatus {
  if (invitation.revoked_at) return 'revoked'
  if (invitation.accepted_at) return 'accepted'
  if (new Date(invitation.expires_at).getTime() < now.getTime()) return 'expired'
  return 'pending'
}
