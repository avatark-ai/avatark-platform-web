import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { listPendingInvitationsForEmail } from '@/lib/organizations/acceptInvitation'

// Lists invitations pending for the signed-in user's own verified email.
// organization_invitations is service-role-only (migration 016's
// default-deny RLS), so this crosses that boundary the same way every
// admin route does -- the difference is the caller need not be a platform
// admin, only signed in, and the email used is always the session's own
// (never client-supplied), so one user can never see another's invites.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (!user.email) return NextResponse.json({ invitations: [] })

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { error: 'Listing invitations requires SUPABASE_SERVICE_ROLE_KEY, which is not configured in this environment.' },
      { status: 503 }
    )
  }
  const admin = createAdminClient()!

  const invitations = await listPendingInvitationsForEmail(admin, user.email)
  return NextResponse.json({ invitations })
}
