import { NextRequest, NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/admin/authz'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { recordAuditEvent } from '@/lib/admin/audit'

const SCAN_LIMIT = 1000

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const email = request.nextUrl.searchParams.get('email')?.trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { error: 'User lookup requires SUPABASE_SERVICE_ROLE_KEY, which is not configured in this environment.' },
      { status: 503 }
    )
  }
  const admin = createAdminClient()!

  // Best-effort scan: the installed supabase-js Admin API has no
  // server-side email-equality filter, so this searches the first
  // SCAN_LIMIT accounts by creation order. An honest, documented
  // limitation -- not silently truncated.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: SCAN_LIMIT })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const match = data.users.find((u) => u.email?.toLowerCase() === email)
  if (!match) {
    return NextResponse.json({ found: false, scanned: data.users.length })
  }

  const [{ data: orgRows }, { data: accessRows }, { data: auditRows }] = await Promise.all([
    admin.from('organization_members').select('org_id, role, organizations(name)').eq('user_id', match.id),
    admin.from('product_access').select('product_id, status, granted_at').eq('user_id', match.id),
    admin
      .from('platform_audit_events')
      .select('action, target_type, target_id, environment, result, created_at')
      .or(`actor_id.eq.${match.id},target_id.eq.${match.id}`)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  await recordAuditEvent(admin, {
    actorId: ctx.userId,
    action: 'admin.user.lookup',
    targetType: 'user',
    targetId: match.id,
    result: 'success',
  })

  return NextResponse.json({
    found: true,
    id: match.id,
    email: match.email,
    createdAt: match.created_at,
    lastSignInAt: match.last_sign_in_at,
    banned: Boolean((match as { banned_until?: string }).banned_until),
    organizations: orgRows ?? [],
    productAccess: accessRows ?? [],
    auditTrail: auditRows ?? [],
  })
}
