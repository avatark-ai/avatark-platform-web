import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { leaveOrganization } from '@/lib/organizations/leave'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const organizationId = typeof body.organizationId === 'string' ? body.organizationId.trim() : ''
  if (!organizationId) return NextResponse.json({ error: 'organizationId is required' }, { status: 400 })

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { error: 'Leaving an organization requires SUPABASE_SERVICE_ROLE_KEY, which is not configured in this environment.' },
      { status: 503 }
    )
  }
  const admin = createAdminClient()!

  const result = await leaveOrganization(admin, { userId: user.id, organizationId })

  switch (result.status) {
    case 'left': {
      // Clear current_organization_id if it pointed at the org just left --
      // the user's own row, safe to update with the normal session client
      // (same pattern as the switch endpoint's own write).
      await supabase
        .from('account_preferences')
        .update({ current_organization_id: null })
        .eq('user_id', user.id)
        .eq('current_organization_id', organizationId)
      return NextResponse.json({ ok: true })
    }
    case 'not_a_member':
      return NextResponse.json({ error: 'You are not a member of this organization.' }, { status: 404 })
    case 'blocked_sole_owner':
      return NextResponse.json(
        { error: 'You are the only owner of this organization. Assign another owner before leaving.' },
        { status: 409 }
      )
    case 'error':
      return NextResponse.json({ error: result.message }, { status: 500 })
  }
}
