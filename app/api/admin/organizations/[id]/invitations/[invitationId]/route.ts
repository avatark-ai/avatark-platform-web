import { NextRequest, NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/admin/authz'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { recordAuditEvent } from '@/lib/admin/audit'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; invitationId: string }> }) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: orgId, invitationId } = await params
  const body = await request.json().catch(() => ({}))
  if (body.action !== 'revoke') return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { error: 'Revoking an invitation requires SUPABASE_SERVICE_ROLE_KEY, which is not configured in this environment.' },
      { status: 503 }
    )
  }
  const admin = createAdminClient()!

  const { error } = await admin
    .from('organization_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('org_id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditEvent(admin, {
    actorId: ctx.userId,
    action: 'admin.organization.invitation.revoke',
    targetType: 'organization',
    targetId: orgId,
    metadata: { invitationId },
    result: 'success',
  })

  return NextResponse.json({ ok: true })
}
