import { NextRequest, NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/admin/authz'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { grantPlatformRole, revokePlatformRole } from '@/lib/admin/platformAccess'

// POST {role} grants, DELETE ?role=... revokes -- direct platform-role
// mutation, previously only possible as a side effect of the organization-
// invitation path (see lib/admin/platformAccess.ts's own header comment).
// Gated on the same platform-admin authz every admin route in this repo
// uses -- no finer-grained capability exists to gate on instead (same
// reasoning as app/api/admin/capabilities/route.ts).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: userId } = await params
  const body = await request.json().catch(() => ({}))
  const role = typeof body.role === 'string' ? body.role.trim() : ''
  if (!role) return NextResponse.json({ error: 'role is required' }, { status: 400 })

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { error: 'Granting a platform role requires SUPABASE_SERVICE_ROLE_KEY, which is not configured in this environment.' },
      { status: 503 }
    )
  }
  const admin = createAdminClient()!

  const result = await grantPlatformRole(admin, ctx.userId, userId, role)
  if (result.status === 'error') return NextResponse.json({ error: result.message }, { status: 400 })
  return NextResponse.json({ grant: result.data }, { status: 201 })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: userId } = await params
  const role = request.nextUrl.searchParams.get('role')?.trim()
  if (!role) return NextResponse.json({ error: 'role query parameter is required' }, { status: 400 })

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { error: 'Revoking a platform role requires SUPABASE_SERVICE_ROLE_KEY, which is not configured in this environment.' },
      { status: 503 }
    )
  }
  const admin = createAdminClient()!

  const result = await revokePlatformRole(admin, ctx.userId, userId, role)
  if (result.status === 'error') return NextResponse.json({ error: result.message }, { status: 400 })
  return NextResponse.json({ grant: result.data })
}
