// Organization invitation acceptance (mission: "Integrate organization
// invitation acceptance... into the canonical AvatarK Account →
// Organizations section"). organization_invitations (migration 016) is
// default-deny for `authenticated` (service-role only), so every function
// here takes an already-authorized service-role client -- callers
// authenticate the caller via the normal session first (getUser()), then
// pass that user's id/email in, exactly as every other admin mutation in
// this repo does with getAdminContext(). The difference here is the
// authorization model: there is no "is this user allowed" role check
// (any signed-in user may attempt to accept/decline/leave), only a
// per-row "does this invitation actually belong to this user" check.
//
// Not a single atomic DB transaction: Supabase's PostgREST layer exposes
// no multi-statement transaction to application code, and this repo has
// no precedent for a plpgsql RPC function (grepped -- zero `.rpc(` calls
// anywhere). Safety instead comes from ordering + idempotent guards: the
// membership row is inserted (idempotent, ON CONFLICT DO NOTHING) *before*
// the invitation is marked accepted (guarded by `accepted_at IS NULL`), so
// a request interrupted between the two steps leaves the invitation
// re-acceptable (safe retry) rather than a membership silently lost. A
// true single-statement RPC transaction would be a stronger guarantee for
// a future pass -- see docs/ACCOUNT_ORGANIZATION_INVITATION_INTEGRATION.md.
import type { SupabaseClient } from '@supabase/supabase-js'
import { recordAuditEvent } from '../admin/audit.ts'

const VALID_ROLES = new Set(['owner', 'admin', 'member'])

export interface PendingInvitation {
  id: string
  token: string
  organizationId: string
  organizationName: string
  role: string
  invitedByEmail: string | null
  createdAt: string
  expiresAt: string
}

export type AcceptInvitationResult =
  | { status: 'accepted'; organizationId: string; organizationName: string; role: string }
  | { status: 'not_found' }
  | { status: 'revoked' }
  | { status: 'expired' }
  | { status: 'email_mismatch' }
  | { status: 'invalid_role'; role: string }
  | { status: 'error'; message: string }

export type DeclineInvitationResult =
  | { status: 'declined' }
  | { status: 'not_found' }
  | { status: 'already_accepted' }
  | { status: 'email_mismatch' }
  | { status: 'error'; message: string }

interface InvitationRow {
  id: string
  org_id: string
  email: string
  role: string
  invited_by: string | null
  created_at: string
  expires_at: string
  accepted_at: string | null
  accepted_by: string | null
  revoked_at: string | null
}

async function fetchInvitationByToken(admin: SupabaseClient, token: string): Promise<InvitationRow | null> {
  const { data } = await admin
    .from('organization_invitations')
    .select('id, org_id, email, role, invited_by, created_at, expires_at, accepted_at, accepted_by, revoked_at')
    .eq('token', token)
    .maybeSingle()
  return (data as InvitationRow | null) ?? null
}

// Lists every invitation pending for this signed-in user's own verified
// email -- never a client-supplied email, so one user can never enumerate
// or act on another user's invitations (mission: "ordinary user cannot
// accept for another user").
export async function listPendingInvitationsForEmail(admin: SupabaseClient, email: string): Promise<PendingInvitation[]> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return []

  const { data: rows } = await admin
    .from('organization_invitations')
    .select('id, token, org_id, email, role, invited_by, created_at, expires_at, accepted_at, revoked_at')
    .eq('email', normalizedEmail)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  const pending = (rows ?? []) as (Omit<InvitationRow, 'accepted_by'> & { token: string })[]
  if (pending.length === 0) return []

  const orgIds = [...new Set(pending.map((r) => r.org_id))]
  const { data: orgRows } = await admin.from('organizations').select('id, name').in('id', orgIds)
  const orgNameById = new Map((orgRows ?? []).map((o) => [o.id as string, o.name as string]))

  const inviterIds = [...new Set(pending.map((r) => r.invited_by).filter((v): v is string => Boolean(v)))]
  const inviterEmailById = new Map<string, string>()
  for (const inviterId of inviterIds) {
    // Best-effort: an inviter lookup failure must never break the
    // invitation listing itself -- degrades to "inviter unknown".
    const { data } = await admin.auth.admin.getUserById(inviterId)
    if (data?.user?.email) inviterEmailById.set(inviterId, data.user.email)
  }

  return pending.map((r) => ({
    id: r.id,
    token: r.token,
    organizationId: r.org_id,
    organizationName: orgNameById.get(r.org_id) ?? 'Unknown organization',
    role: r.role,
    invitedByEmail: r.invited_by ? inviterEmailById.get(r.invited_by) ?? null : null,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  }))
}

export async function acceptOrganizationInvitation(
  admin: SupabaseClient,
  params: { token: string; userId: string; userEmail: string }
): Promise<AcceptInvitationResult> {
  const token = params.token.trim()
  if (!token) return { status: 'not_found' }

  const invitation = await fetchInvitationByToken(admin, token)
  if (!invitation) return { status: 'not_found' }
  if (invitation.revoked_at) return { status: 'revoked' }
  if (new Date(invitation.expires_at).getTime() < Date.now()) return { status: 'expired' }

  // Idempotent repeat acceptance: the same user re-submitting the same
  // token (double click, retried request) succeeds without re-inserting.
  if (invitation.accepted_at) {
    if (invitation.accepted_by === params.userId) {
      const { data: org } = await admin.from('organizations').select('name').eq('id', invitation.org_id).maybeSingle()
      return { status: 'accepted', organizationId: invitation.org_id, organizationName: org?.name ?? 'Unknown organization', role: invitation.role }
    }
    // Accepted by a different account than the one asking -- refuse rather
    // than silently re-granting under a new identity.
    return { status: 'error', message: 'This invitation has already been accepted.' }
  }

  if (invitation.email.trim().toLowerCase() !== params.userEmail.trim().toLowerCase()) {
    return { status: 'email_mismatch' }
  }
  if (!VALID_ROLES.has(invitation.role)) {
    return { status: 'invalid_role', role: invitation.role }
  }

  const { data: org } = await admin.from('organizations').select('name').eq('id', invitation.org_id).maybeSingle()
  if (!org) return { status: 'not_found' }

  // Membership first, guarded by the (org_id, user_id) primary key --
  // 23505 means "already a member," which is fine, not an error.
  const { error: memberError } = await admin
    .from('organization_members')
    .insert({ org_id: invitation.org_id, user_id: params.userId, role: invitation.role })
  if (memberError && memberError.code !== '23505') {
    return { status: 'error', message: memberError.message }
  }

  // Then the invitation, guarded by accepted_at IS NULL so a concurrent
  // duplicate request never overwrites the first real acceptance time.
  await admin
    .from('organization_invitations')
    .update({ accepted_at: new Date().toISOString(), accepted_by: params.userId })
    .eq('id', invitation.id)
    .is('accepted_at', null)

  await recordAuditEvent(admin, {
    actorId: params.userId,
    action: 'organization_invitation.accept',
    targetType: 'organization_invitation',
    targetId: invitation.id,
    metadata: { organizationId: invitation.org_id, role: invitation.role },
    result: 'success',
  })

  return { status: 'accepted', organizationId: invitation.org_id, organizationName: org.name, role: invitation.role }
}

export async function declineOrganizationInvitation(
  admin: SupabaseClient,
  params: { token: string; userId: string; userEmail: string }
): Promise<DeclineInvitationResult> {
  const token = params.token.trim()
  if (!token) return { status: 'not_found' }

  const invitation = await fetchInvitationByToken(admin, token)
  if (!invitation) return { status: 'not_found' }
  if (invitation.accepted_at) return { status: 'already_accepted' }
  if (invitation.email.trim().toLowerCase() !== params.userEmail.trim().toLowerCase()) {
    return { status: 'email_mismatch' }
  }
  if (invitation.revoked_at) return { status: 'declined' } // already inactive; treat as done, not an error

  const { error } = await admin
    .from('organization_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', invitation.id)
    .is('revoked_at', null)
  if (error) return { status: 'error', message: error.message }

  await recordAuditEvent(admin, {
    actorId: params.userId,
    action: 'organization_invitation.decline',
    targetType: 'organization_invitation',
    targetId: invitation.id,
    metadata: { organizationId: invitation.org_id, reason: 'declined_by_invitee' },
    result: 'success',
  })

  return { status: 'declined' }
}
