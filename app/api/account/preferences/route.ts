import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getConsumerFacingModes } from '@avatark/appearance'
import { getSelectableLocales, isLocaleSelectable } from '@avatark/locale'

// Safe, registered local destinations only (RC1.1, Part 9) -- never an
// arbitrary URL a user typed. '' means the app's own home route.
const LANDING_DESTINATIONS: { suffix: string; label: string }[] = [
  { suffix: '', label: 'Home' },
  { suffix: 'account', label: 'Account' },
  { suffix: 'journey', label: 'Journey' },
  { suffix: 'start', label: 'Start' },
]
const VALID_LANDING_SUFFIXES = new Set(LANDING_DESTINATIONS.map((d) => d.suffix))

function toLandingPath(suffix: string): string {
  return suffix ? `/${suffix}` : '/'
}

function optionLists() {
  return {
    availableAppearanceModes: getConsumerFacingModes().map((m) => ({ value: m.mode, label: m.label })),
    availableLocales: getSelectableLocales().map((l) => ({ value: l.code, label: l.englishName })),
    availableLandingDestinations: LANDING_DESTINATIONS.map((d) => ({ value: toLandingPath(d.suffix), label: d.label })),
  }
}

function toResponse(data: {
  theme: string; language: string; notifications_enabled: boolean
  reduced_motion: boolean; default_product: string | null
}) {
  return {
    theme: data.theme, locale: data.language, timezone: null,
    notificationsEnabled: data.notifications_enabled, reducedMotion: data.reduced_motion,
    defaultLandingPage: toLandingPath(data.default_product ?? ''),
    ...optionLists(),
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data, error } = await supabase.from('account_preferences').select('*').eq('user_id', user.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(toResponse(data))
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}

  if (body.theme !== undefined) {
    if (!getConsumerFacingModes().some((m) => m.mode === body.theme)) {
      return NextResponse.json({ error: `Appearance mode "${body.theme}" is not available to consumers` }, { status: 400 })
    }
    updates.theme = body.theme
  }
  if (body.locale !== undefined) {
    if (!isLocaleSelectable(body.locale)) {
      return NextResponse.json({ error: `Locale "${body.locale}" is not available` }, { status: 400 })
    }
    updates.language = body.locale
  }
  if (body.notificationsEnabled !== undefined) updates.notifications_enabled = body.notificationsEnabled
  if (body.reducedMotion !== undefined) updates.reduced_motion = body.reducedMotion
  if (body.defaultLandingPage !== undefined) {
    const suffix = typeof body.defaultLandingPage === 'string' ? body.defaultLandingPage.replace(/^\//, '') : ''
    if (!VALID_LANDING_SUFFIXES.has(suffix)) {
      return NextResponse.json({ error: `"${body.defaultLandingPage}" is not a registered landing destination` }, { status: 400 })
    }
    updates.default_product = suffix || null
  }

  const { data, error } = await supabase.from('account_preferences').update(updates).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(toResponse(data))
}
