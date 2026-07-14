import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data, error } = await supabase.from('privacy_settings').select('*').eq('user_id', user.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Real fix: all three consent fields now read from actual persisted
  // columns (migration 008) -- no hardcoded values remain.
  return NextResponse.json({
    profileVisibility: data.profile_visibility,
    discoverable: data.discoverable_by_email,
    productCommunicationsEnabled: data.product_communications_enabled,
    personalizationEnabled: data.personalization_enabled,
    analyticsEnabled: data.analytics_enabled,
  })
}

const VALID_VISIBILITY = ['private', 'public', 'unlisted']

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}

  // Real, explicit validation -- reject malformed values rather than
  // silently writing them or letting a Postgres constraint error leak
  // through as an opaque 500.
  if (body.profileVisibility !== undefined) {
    if (!VALID_VISIBILITY.includes(body.profileVisibility)) {
      return NextResponse.json({ error: `Invalid profileVisibility: ${body.profileVisibility}` }, { status: 400 })
    }
    updates.profile_visibility = body.profileVisibility
  }
  if (body.discoverable !== undefined) {
    if (typeof body.discoverable !== 'boolean') return NextResponse.json({ error: 'discoverable must be a boolean' }, { status: 400 })
    updates.discoverable_by_email = body.discoverable
  }
  if (body.productCommunicationsEnabled !== undefined) {
    if (typeof body.productCommunicationsEnabled !== 'boolean') return NextResponse.json({ error: 'productCommunicationsEnabled must be a boolean' }, { status: 400 })
    updates.product_communications_enabled = body.productCommunicationsEnabled
  }
  if (body.personalizationEnabled !== undefined) {
    if (typeof body.personalizationEnabled !== 'boolean') return NextResponse.json({ error: 'personalizationEnabled must be a boolean' }, { status: 400 })
    updates.personalization_enabled = body.personalizationEnabled
  }
  if (body.analyticsEnabled !== undefined) {
    if (typeof body.analyticsEnabled !== 'boolean') return NextResponse.json({ error: 'analyticsEnabled must be a boolean' }, { status: 400 })
    updates.analytics_enabled = body.analyticsEnabled
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  const { data, error } = await supabase.from('privacy_settings').update(updates).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    profileVisibility: data.profile_visibility,
    discoverable: data.discoverable_by_email,
    productCommunicationsEnabled: data.product_communications_enabled,
    personalizationEnabled: data.personalization_enabled,
    analyticsEnabled: data.analytics_enabled,
  })
}
