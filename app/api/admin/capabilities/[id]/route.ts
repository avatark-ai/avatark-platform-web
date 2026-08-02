import { NextRequest, NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/admin/authz'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { revokeCapabilityGrant } from '@/lib/capabilities/adminGrants'

// Revoke-only, matching app/api/admin/organizations/[id]/invitations/
// [invitationId]/route.ts's { action: 'revoke' } PATCH convention. There
// is deliberately no full "update a grant" operation (e.g. changing its
// scope) -- the mission's lifecycle model only calls for grant/revoke/
// (expire, which is time-based, not a mutation this route performs).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: grantId } = await params
  const body = await request.json().catch(() => ({}))
  if (body.action !== 'revoke') return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { error: 'Revoking a capability grant requires SUPABASE_SERVICE_ROLE_KEY, which is not configured in this environment.' },
      { status: 503 }
    )
  }
  const admin = createAdminClient()!

  const result = await revokeCapabilityGrant(admin, ctx.userId, grantId)
  if (result.status === 'error') return NextResponse.json({ error: result.message }, { status: 400 })
  return NextResponse.json({ grant: result.data })
}
