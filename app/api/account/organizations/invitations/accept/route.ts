import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { acceptOrganizationInvitation } from '@/lib/organizations/acceptInvitation'

// Accepting always uses the signed-in session's own userId/email -- a
// token in the request body identifies *which invitation*, never *whose
// account* accepts it (mission: "ordinary user cannot accept for another
// user"). Membership creation and role assignment only; this never
// creates a capability grant (mission Part 6 -- capability_grants is a
// structurally separate concept, never referenced by this route or
// lib/organizations/acceptInvitation.ts).
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (!user.email) return NextResponse.json({ error: 'Your account has no verified email to match against an invitation.' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { error: 'Accepting an invitation requires SUPABASE_SERVICE_ROLE_KEY, which is not configured in this environment.' },
      { status: 503 }
    )
  }
  const admin = createAdminClient()!

  const result = await acceptOrganizationInvitation(admin, { token, userId: user.id, userEmail: user.email })

  switch (result.status) {
    case 'accepted':
      return NextResponse.json({ organizationId: result.organizationId, organizationName: result.organizationName, role: result.role })
    case 'not_found':
      return NextResponse.json({ error: 'This invitation does not exist.' }, { status: 404 })
    case 'revoked':
      return NextResponse.json({ error: 'This invitation has been revoked.' }, { status: 410 })
    case 'expired':
      return NextResponse.json({ error: 'This invitation has expired.' }, { status: 410 })
    case 'email_mismatch':
      return NextResponse.json({ error: 'This invitation was sent to a different email address than your account.' }, { status: 403 })
    case 'invalid_role':
      return NextResponse.json({ error: `Invitation has an unrecognized role (${result.role}); an administrator must correct it before it can be accepted.` }, { status: 422 })
    case 'error':
      return NextResponse.json({ error: result.message }, { status: 500 })
  }
}
