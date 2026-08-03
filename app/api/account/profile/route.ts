import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { toProfileResponse, toProfileUpdates, type ProfileRow } from '@/lib/account/profileMapping'
import { ACCOUNT_ROLE_OPTIONS } from '@avatark/account'

const VALID_ROLES = new Set(ACCOUNT_ROLE_OPTIONS.map((r) => r.value))

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(toProfileResponse(data as ProfileRow, user.email ?? ''))
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  // Role is a real enum going forward (Platform RC, Phase 4), but a
  // pre-existing legacy free-text value must remain re-savable unchanged --
  // otherwise every unrelated field edit (bio, avatar, ...) for an account
  // with an old free-text role would start failing. Only reject a genuine
  // change to something outside the canonical list.
  if (body.role !== undefined && body.role !== null && !VALID_ROLES.has(body.role)) {
    const { data: existing } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (existing?.role !== body.role) {
      return NextResponse.json({ error: `Unrecognized role: ${body.role}` }, { status: 400 })
    }
  }

  const updates = toProfileUpdates(body)

  const { data, error } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(toProfileResponse(data as ProfileRow, user.email ?? ''))
}
