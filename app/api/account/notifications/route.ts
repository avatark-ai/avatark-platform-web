import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { NOTIFICATION_PREFERENCE_CATEGORY_REGISTRY } from '@avatark/notifications'

// Real platform-wide fact (same flag lib/email/sendEmail.ts already gates
// real sends on) -- never a per-user claim. Categories are preference
// storage regardless of this value; this is the "can we actually deliver
// anything yet" half of Part 8's required distinction.
const DELIVERY_ACTIVE = process.env.EMAIL_SENDING_ENABLED === 'true'

function toResponse(storedPrefs: Record<string, boolean>) {
  return {
    deliveryActive: DELIVERY_ACTIVE,
    categories: NOTIFICATION_PREFERENCE_CATEGORY_REGISTRY.map((d) => ({
      category: d.category,
      label: d.label,
      mandatory: d.mandatory,
      // Mandatory categories are always on regardless of stored value --
      // server is the source of truth, never the client-supplied body.
      enabled: d.mandatory ? true : (storedPrefs[d.category] ?? true),
    })),
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data, error } = await supabase.from('account_preferences').select('notification_category_prefs').eq('user_id', user.id).single()
  // Migration 018 may not be applied in every environment yet -- degrade
  // to an honest all-defaults response rather than a 500.
  if (error) return NextResponse.json(toResponse({}))

  return NextResponse.json(toResponse((data?.notification_category_prefs as Record<string, boolean>) ?? {}))
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const category = typeof body.category === 'string' ? body.category : null
  const enabled = typeof body.enabled === 'boolean' ? body.enabled : null
  const descriptor = NOTIFICATION_PREFERENCE_CATEGORY_REGISTRY.find((d) => d.category === category)
  if (!category || enabled === null || !descriptor) {
    return NextResponse.json({ error: 'Invalid category or enabled value' }, { status: 400 })
  }
  if (descriptor.mandatory) {
    return NextResponse.json({ error: `Category "${category}" is mandatory and cannot be disabled` }, { status: 400 })
  }

  const { data: existing, error: readError } = await supabase.from('account_preferences').select('notification_category_prefs').eq('user_id', user.id).single()
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })

  const nextPrefs = { ...((existing?.notification_category_prefs as Record<string, boolean>) ?? {}), [category]: enabled }
  const { error: writeError } = await supabase.from('account_preferences').update({ notification_category_prefs: nextPrefs }).eq('user_id', user.id)
  if (writeError) return NextResponse.json({ error: writeError.message }, { status: 500 })

  return NextResponse.json(toResponse(nextPrefs))
}
