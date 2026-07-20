import { NextRequest, NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/admin/authz'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { recordAuditEvent } from '@/lib/admin/audit'

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { error: 'Creating an organization requires SUPABASE_SERVICE_ROLE_KEY, which is not configured in this environment.' },
      { status: 503 }
    )
  }
  const admin = createAdminClient()!

  const { data, error } = await admin.from('organizations').insert({ name }).select('id, name, created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditEvent(admin, {
    actorId: ctx.userId,
    action: 'admin.organization.create',
    targetType: 'organization',
    targetId: data.id,
    metadata: { name },
    result: 'success',
  })

  return NextResponse.json({ organization: data }, { status: 201 })
}
