import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    id: data.id, email: user.email ?? '', displayName: data.display_name,
    bio: data.bio, role: null, avatarUrl: data.avatar_url,
    organization: null, location: null, createdAt: data.created_at,
  })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}
  if (body.displayName !== undefined) updates.display_name = body.displayName
  if (body.bio !== undefined) updates.bio = body.bio
  if (body.avatarUrl !== undefined) updates.avatar_url = body.avatarUrl

  const { data, error } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    id: data.id, email: user.email ?? '', displayName: data.display_name,
    bio: data.bio, role: null, avatarUrl: data.avatar_url,
    organization: null, location: null, createdAt: data.created_at,
  })
}
