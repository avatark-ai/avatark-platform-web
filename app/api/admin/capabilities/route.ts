import { NextRequest, NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/admin/authz'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { createCapabilityGrant, listGrantsForUser } from '@/lib/capabilities/adminGrants'
import type { CapabilityScopeType } from '@/lib/capabilities/types'

// GET ?userId=... — list every capability grant (active and historical)
// for one user. POST — create a new grant. Both gated on the same
// platform-admin authz every other admin route in this repo uses
// (lib/admin/authz.ts) -- there is no finer-grained "capability
// management" capability wired in yet (see the runbook's admin-mutation-
// boundary note for why: getAdminContext() itself only ever resolves
// non-null for platform_roles.role = 'admin' today, so gating on an
// explicit capability here would be unreachable dead code, not a real
// alternative path).
export async function GET(request: NextRequest) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userId = request.nextUrl.searchParams.get('userId')?.trim()
  if (!userId) return NextResponse.json({ error: 'userId query parameter is required' }, { status: 400 })

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { error: 'Listing capability grants requires SUPABASE_SERVICE_ROLE_KEY, which is not configured in this environment.' },
      { status: 503 }
    )
  }
  const admin = createAdminClient()!

  const result = await listGrantsForUser(admin, userId)
  if (result.status === 'error') return NextResponse.json({ error: result.message }, { status: 500 })
  return NextResponse.json({ grants: result.data })
}

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  const capability = typeof body.capability === 'string' ? body.capability.trim() : ''
  const scopeType: CapabilityScopeType | '' = body.scopeType === 'platform' || body.scopeType === 'product' || body.scopeType === 'organization' ? body.scopeType : ''
  const scopeId = typeof body.scopeId === 'string' ? body.scopeId : null
  const expiresAt = typeof body.expiresAt === 'string' ? body.expiresAt : null

  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  if (!capability) return NextResponse.json({ error: 'capability is required' }, { status: 400 })
  if (!scopeType) return NextResponse.json({ error: 'scopeType must be one of platform, product, organization' }, { status: 400 })

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { error: 'Creating a capability grant requires SUPABASE_SERVICE_ROLE_KEY, which is not configured in this environment.' },
      { status: 503 }
    )
  }
  const admin = createAdminClient()!

  const result = await createCapabilityGrant(admin, ctx.userId, { userId, capability, scopeType, scopeId, expiresAt })
  if (result.status === 'error') return NextResponse.json({ error: result.message }, { status: 400 })
  return NextResponse.json({ grant: result.data }, { status: 201 })
}
