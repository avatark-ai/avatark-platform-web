import { NextRequest, NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/admin/authz'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { recordAuditEvent } from '@/lib/admin/audit'

const SCAN_LIMIT = 1000
const SEARCH_RESULTS_LIMIT = 20

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { error: 'User search requires SUPABASE_SERVICE_ROLE_KEY, which is not configured in this environment.' },
      { status: 503 }
    )
  }
  const admin = createAdminClient()!

  const id = request.nextUrl.searchParams.get('id')?.trim()
  const email = request.nextUrl.searchParams.get('email')?.trim().toLowerCase()
  const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase()

  // Mode 1: search by substring, return a bounded list of candidates.
  if (q) {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: SCAN_LIMIT })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const matches = data.users
      .filter((u) => u.email?.toLowerCase().includes(q))
      .slice(0, SEARCH_RESULTS_LIMIT)
      .map((u) => ({ id: u.id, email: u.email, createdAt: u.created_at, lastSignInAt: u.last_sign_in_at }))
    return NextResponse.json({ matches, scanned: data.users.length })
  }

  // Mode 2: full detail lookup, by exact email or by id.
  let matchId: string | null = null
  let matchEmail: string | null = null
  let matchCreatedAt: string | null = null
  let matchLastSignInAt: string | null = null
  let matchBanned = false
  let scanned: number | undefined

  if (id) {
    const { data, error } = await admin.auth.admin.getUserById(id)
    if (error || !data.user) return NextResponse.json({ found: false })
    matchId = data.user.id
    matchEmail = data.user.email ?? null
    matchCreatedAt = data.user.created_at
    matchLastSignInAt = data.user.last_sign_in_at ?? null
    matchBanned = Boolean((data.user as { banned_until?: string }).banned_until)
  } else if (email) {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: SCAN_LIMIT })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    scanned = data.users.length
    const match = data.users.find((u) => u.email?.toLowerCase() === email)
    if (!match) return NextResponse.json({ found: false, scanned })
    matchId = match.id
    matchEmail = match.email ?? null
    matchCreatedAt = match.created_at
    matchLastSignInAt = match.last_sign_in_at ?? null
    matchBanned = Boolean((match as { banned_until?: string }).banned_until)
  } else {
    return NextResponse.json({ error: 'email, id, or q is required' }, { status: 400 })
  }

  const [{ data: orgRows }, { data: accessRows }, { data: roleRows }, { data: recentActivity }, { data: auditHistory }] =
    await Promise.all([
      admin.from('organization_members').select('org_id, role, organizations(name)').eq('user_id', matchId),
      admin.from('product_access').select('product_id, status, granted_at').eq('user_id', matchId),
      admin.from('platform_roles').select('role, granted_at').eq('user_id', matchId),
      admin
        .from('platform_audit_events')
        .select('action, target_type, target_id, environment, result, created_at')
        .eq('actor_id', matchId)
        .order('created_at', { ascending: false })
        .limit(20),
      admin
        .from('platform_audit_events')
        .select('actor_id, action, target_type, environment, result, created_at')
        .eq('target_id', matchId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

  await recordAuditEvent(admin, {
    actorId: ctx.userId,
    action: 'admin.user.lookup',
    targetType: 'user',
    targetId: matchId,
    result: 'success',
  })

  return NextResponse.json({
    found: true,
    id: matchId,
    email: matchEmail,
    createdAt: matchCreatedAt,
    lastSignInAt: matchLastSignInAt,
    banned: matchBanned,
    organizations: orgRows ?? [],
    productAccess: accessRows ?? [],
    platformRoles: roleRows ?? [],
    recentActivity: recentActivity ?? [],
    auditHistory: auditHistory ?? [],
    scanned,
  })
}
