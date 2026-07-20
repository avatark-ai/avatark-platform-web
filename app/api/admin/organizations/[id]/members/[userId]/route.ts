import { NextRequest, NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/admin/authz'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { recordAuditEvent } from '@/lib/admin/audit'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: orgId, userId } = await params
  const body = await request.json().catch(() => ({}))
  const role = typeof body.role === 'string' ? body.role.trim() : ''
  if (!role) return NextResponse.json({ error: 'role is required' }, { status: 400 })

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { error: 'Changing a member role requires SUPABASE_SERVICE_ROLE_KEY, which is not configured in this environment.' },
      { status: 503 }
    )
  }
  const admin = createAdminClient()!

  const { error } = await admin
    .from('organization_members')
    .update({ role })
    .eq('org_id', orgId)
    .eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditEvent(admin, {
    actorId: ctx.userId,
    action: 'admin.organization.member.role_change',
    targetType: 'organization',
    targetId: orgId,
    metadata: { userId, role },
    result: 'success',
  })

  return NextResponse.json({ ok: true })
}
