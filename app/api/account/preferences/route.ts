import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data, error } = await supabase.from('account_preferences').select('*').eq('user_id', user.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    theme: data.theme, locale: data.language, timezone: null,
    notificationsEnabled: data.notifications_enabled, reducedMotion: false,
    defaultLandingPage: data.default_product ? `/${data.default_product}` : '/',
  })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}
  if (body.theme !== undefined) updates.theme = body.theme
  if (body.locale !== undefined) updates.language = body.locale
  if (body.notificationsEnabled !== undefined) updates.notifications_enabled = body.notificationsEnabled

  const { data, error } = await supabase.from('account_preferences').update(updates).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    theme: data.theme, locale: data.language, timezone: null,
    notificationsEnabled: data.notifications_enabled, reducedMotion: false,
    defaultLandingPage: data.default_product ? `/${data.default_product}` : '/',
  })
}
