import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Cross-product session verification: a product holding an access token
// issued by *this* Supabase project can POST it here to get back verified
// IdentityClaims, instead of needing this project's anon key or any
// Supabase internals of its own.
//
// Real, honest limitation: this only verifies tokens issued by AvatarK
// Platform's own Supabase project. PrometheusK, GameK, and ArenaK each run
// their own separate Supabase project today (confirmed in the cross-repo
// integration audit) and issue their own tokens -- this endpoint cannot
// verify those. Making this the actual shared verification point for all
// products requires either centralizing on one Supabase project or a
// follow-up trust mechanism; that's an explicit next decision, not solved
// by this endpoint's existence.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const accessToken = body?.accessToken
  if (!accessToken || typeof accessToken !== 'string') {
    return NextResponse.json({ error: 'accessToken is required' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Identity verification is not configured in this environment' }, { status: 503 })
  }

  // A fresh, unauthenticated client is used to verify an arbitrary bearer
  // token -- never the caller's own cookie-backed session.
  const supabase = createSupabaseClient(url, anonKey)
  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data.user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  return NextResponse.json({
    subjectId: data.user.id,
    email: data.user.email ?? '',
    displayName: data.user.email?.split('@')[0] ?? 'Member',
    organizationIds: [],
    productAccess: [],
    roles: [],
  })
}
