import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ContextRuntime } from '@avatark/context-runtime'
import { SupabaseContextRepository } from '@/lib/context/supabaseContextRepository'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) } as const
  return { supabase, userId: user.id } as const
}

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  const limitParam = req.nextUrl.searchParams.get('limit')
  const limit = limitParam ? Math.min(Math.max(Number.parseInt(limitParam, 10) || 20, 1), 100) : 20

  const runtime = new ContextRuntime(new SupabaseContextRepository(auth.supabase))
  const history = await runtime.getContextHistory(auth.userId, limit)
  return NextResponse.json({ history })
}

// Restoring a past snapshot back to being live -- an explicit,
// present-moment session action, so it always applies (see
// ContextRuntime.restoreContext).
export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => ({}))
  if (typeof body.entryId !== 'string' || body.entryId.trim() === '') {
    return NextResponse.json({ error: 'Restoring context requires an entryId' }, { status: 400 })
  }
  if (typeof body.productId !== 'string' || body.productId.trim() === '') {
    return NextResponse.json({ error: 'Restoring context requires a productId' }, { status: 400 })
  }

  const runtime = new ContextRuntime(new SupabaseContextRepository(auth.supabase))
  try {
    const outcome = await runtime.restoreContext(auth.userId, body.entryId, { productId: body.productId, reason: body.reason })
    return NextResponse.json(outcome)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Restore failed' }, { status: 404 })
  }
}
