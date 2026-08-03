// Leave-organization policy (mission: "Leave organization only where
// policy allows"). The only real policy this repo's schema can support
// honestly today: a member may always leave, *except* an organization's
// sole 'owner' may not leave while other members remain -- that would
// strand the organization with members but no one in the one role
// (packages/organizations/src/permissions.ts's ORG_ROLE_CAPABILITY_REFERENCE)
// that can manage it or its membership. An owner leaving an
// otherwise-empty organization is allowed (nothing left to strand).
import type { SupabaseClient } from '@supabase/supabase-js'
import { recordAuditEvent } from '../admin/audit.ts'

export type LeaveOrganizationResult =
  | { status: 'left' }
  | { status: 'not_a_member' }
  | { status: 'blocked_sole_owner' }
  | { status: 'error'; message: string }

export async function leaveOrganization(
  admin: SupabaseClient,
  params: { userId: string; organizationId: string }
): Promise<LeaveOrganizationResult> {
  const { data: membership, error: membershipError } = await admin
    .from('organization_members')
    .select('role')
    .eq('org_id', params.organizationId)
    .eq('user_id', params.userId)
    .maybeSingle()
  if (membershipError) return { status: 'error', message: membershipError.message }
  if (!membership) return { status: 'not_a_member' }

  if (membership.role === 'owner') {
    const { data: members, error: membersError } = await admin
      .from('organization_members')
      .select('user_id, role')
      .eq('org_id', params.organizationId)
    if (membersError) return { status: 'error', message: membersError.message }
    const owners = (members ?? []).filter((m) => m.role === 'owner')
    const total = (members ?? []).length
    if (owners.length <= 1 && total > 1) {
      return { status: 'blocked_sole_owner' }
    }
  }

  const { error } = await admin
    .from('organization_members')
    .delete()
    .eq('org_id', params.organizationId)
    .eq('user_id', params.userId)
  if (error) return { status: 'error', message: error.message }

  await recordAuditEvent(admin, {
    actorId: params.userId,
    action: 'organization.leave',
    targetType: 'organization',
    targetId: params.organizationId,
    metadata: {},
    result: 'success',
  })

  return { status: 'left' }
}
