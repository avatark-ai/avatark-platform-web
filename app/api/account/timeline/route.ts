import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { experienceRegistry } from '@/lib/experienceRegistry/singleton'

// Real user history only, per this sprint's explicit "no analytics" rule
// -- this route lists events, it never aggregates/counts/segments them.
// Experience Registry is a module-scoped, in-memory singleton (see
// lib/experienceRegistry/singleton.ts) -- see
// docs/RUNTIME_HOST_INTEGRATION.md's "remaining gaps before GameK
// integration" for the real-persistence follow-up this implies.
async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) } as const
  return { userId: user.id } as const
}

export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  const limitParam = req.nextUrl.searchParams.get('limit')
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 20
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 20

  // listRecentEvents already returns most-recent-first (see
  // @avatark/experience-registry's InMemoryExperienceEventRepository).
  const events = await experienceRegistry.listRecentEvents(auth.userId, limit)
  return NextResponse.json({ events })
}
