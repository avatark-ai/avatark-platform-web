// One-time Platform Admin bootstrap. Deliberately NOT gated by
// getAdminContext() -- the entire point is granting the *first* admin, who
// by definition has no platform_roles row yet. See lib/admin/bootstrap.ts
// for the actual safety logic (env-var account match + self-disabling once
// any admin exists). Does not touch capability_grants (020) in any way:
// platform admin and capability grants are kept structurally separate.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { bootstrapPlatformAdmin } from '@/lib/admin/bootstrap'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { error: 'Bootstrap requires SUPABASE_SERVICE_ROLE_KEY, which is not configured in this environment.' },
      { status: 503 }
    )
  }
  const admin = createAdminClient()!

  const result = await bootstrapPlatformAdmin(admin, {
    userId: user.id,
    userEmail: user.email ?? null,
    bootstrapEmail: process.env.PLATFORM_ADMIN_BOOTSTRAP_EMAIL,
  })

  switch (result.status) {
    case 'granted':
      return NextResponse.json({ ok: true })
    case 'not_configured':
      return NextResponse.json(
        { error: 'Platform admin bootstrap is not configured (PLATFORM_ADMIN_BOOTSTRAP_EMAIL is unset).' },
        { status: 404 }
      )
    case 'wrong_account':
      return NextResponse.json({ error: 'This account is not the configured bootstrap admin.' }, { status: 403 })
    case 'already_bootstrapped':
      return NextResponse.json(
        { error: 'A platform admin already exists. Bootstrap is permanently disabled.' },
        { status: 409 }
      )
    case 'error':
      return NextResponse.json({ error: 'Failed to grant platform admin role.' }, { status: 500 })
  }
}
