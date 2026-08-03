import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { declineOrganizationInvitation } from '@/lib/organizations/acceptInvitation'

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
      { error: 'Declining an invitation requires SUPABASE_SERVICE_ROLE_KEY, which is not configured in this environment.' },
      { status: 503 }
    )
  }
  const admin = createAdminClient()!

  const result = await declineOrganizationInvitation(admin, { token, userId: user.id, userEmail: user.email })

  switch (result.status) {
    case 'declined':
      return NextResponse.json({ ok: true })
    case 'not_found':
      return NextResponse.json({ error: 'This invitation does not exist.' }, { status: 404 })
    case 'already_accepted':
      return NextResponse.json({ error: 'This invitation has already been accepted and can no longer be declined.' }, { status: 409 })
    case 'email_mismatch':
      return NextResponse.json({ error: 'This invitation was sent to a different email address than your account.' }, { status: 403 })
    case 'error':
      return NextResponse.json({ error: result.message }, { status: 500 })
  }
}
