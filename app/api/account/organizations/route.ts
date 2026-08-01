import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Real org context (Part 7): organization_members/organizations are the
// actual tables (migration 010), own-row RLS (confirmed in RC1's security
// review) means the signed-in user can read their own membership rows
// with the anon-key client -- no service-role client needed.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: memberRows, error: memberError } = await supabase
    .from('organization_members')
    .select('org_id, role, created_at')
    .eq('user_id', user.id)
  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })

  const orgIds = (memberRows ?? []).map((m) => m.org_id as string)
  const { data: orgRows, error: orgError } = orgIds.length > 0
    ? await supabase.from('organizations').select('id, name').in('id', orgIds)
    : { data: [], error: null }
  if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 })
  const orgById = new Map((orgRows ?? []).map((o) => [o.id as string, o.name as string]))

  // Migration 018 may not be applied everywhere yet -- a missing column
  // degrades to "no current selection" (Personal), never a 500.
  const { data: prefsRow } = await supabase.from('account_preferences').select('current_organization_id').eq('user_id', user.id).single()

  return NextResponse.json({
    memberships: (memberRows ?? []).map((m) => ({
      organizationId: m.org_id,
      organizationName: orgById.get(m.org_id as string) ?? 'Unknown organization',
      role: m.role,
      source: 'organization',
      validFrom: m.created_at,
    })),
    currentOrganizationId: prefsRow?.current_organization_id ?? null,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const targetOrgId: string | null = typeof body.organizationId === 'string' ? body.organizationId : null

  // Never trust the client-supplied org id: re-verify real membership
  // server-side before switching, same "safe organization switching" rule
  // as @avatark/organizations' switchOrganization().
  if (targetOrgId !== null) {
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('org_id', targetOrgId)
      .maybeSingle()
    if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 500 })
    if (!membership) return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
  }

  const { error: updateError } = await supabase
    .from('account_preferences')
    .update({ current_organization_id: targetOrgId })
    .eq('user_id', user.id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return GET()
}
