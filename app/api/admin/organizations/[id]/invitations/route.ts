import { NextRequest, NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/admin/authz'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { recordAuditEvent } from '@/lib/admin/audit'

// Creates a pending invitation row only. There is no self-serve accept
// flow yet (see docs/IDENTITY_ACCOUNT_ADMIN_HANDOFF.md's known gaps) --
// deliberately not sending an email or generating an accept link that
// would point at a route that doesn't exist.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: orgId } = await params
  const body = await request.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const role = typeof body.role === 'string' && body.role.trim() ? body.role.trim() : 'member'
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { error: 'Inviting a member requires SUPABASE_SERVICE_ROLE_KEY, which is not configured in this environment.' },
      { status: 503 }
    )
  }
  const admin = createAdminClient()!

  const { data, error } = await admin
    .from('organization_invitations')
    .insert({ org_id: orgId, email, role, invited_by: ctx.userId })
    .select('id, email, role, token, created_at, expires_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditEvent(admin, {
    actorId: ctx.userId,
    action: 'admin.organization.invite',
    targetType: 'organization',
    targetId: orgId,
    metadata: { email, role, invitationId: data.id },
    result: 'success',
  })

  return NextResponse.json({ invitation: data }, { status: 201 })
}
