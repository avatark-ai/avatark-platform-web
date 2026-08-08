import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ContextRuntime } from '@avatark/context-runtime'
import { JourneyRuntime } from '@avatark/experience-runtime'
import { livingWorldRuntime } from '@/lib/livingWorldRuntime/singleton'
import { experienceRegistry } from '@/lib/experienceRegistry/singleton'
import { SupabaseContextRepository } from '@/lib/context/supabaseContextRepository'
import { SupabaseJourneyRepository } from '@/lib/experienceRuntime/supabaseJourneyRepository'
import { AVATARK_WELCOME_JOURNEY } from '@/lib/experienceRuntime/journeyDefinition'
import type { RuntimeKernel } from '@/lib/runtimeKernel/orchestrator'
import { dispatchInteractionIntent } from '@/lib/worldEmbodiment/intentDispatcher'

// Real, Supabase-authenticated InteractionIntent boundary (Sprint 8). The
// visitor's own client never calls enter/leave/visit/reflect directly on
// a runtime -- it submits an intent here, the Host validates and
// dispatches it through the existing Sprint 5 orchestrator, and the
// visitor receives whatever result that produces. Same
// kernelFor(supabase) shape /api/account/living-worlds already builds.
function kernelFor(supabase: Awaited<ReturnType<typeof createClient>>): RuntimeKernel {
  return {
    livingWorld: livingWorldRuntime,
    context: new ContextRuntime(new SupabaseContextRepository(supabase)),
    experience: new JourneyRuntime(AVATARK_WELCOME_JOURNEY, new SupabaseJourneyRepository(supabase)),
    registry: experienceRegistry,
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (typeof body.intent !== 'object' || body.intent === null) {
    return NextResponse.json({ error: 'body.intent is required' }, { status: 400 })
  }

  // userId is always the authenticated session's own id -- never taken
  // from the request body, so a visitor can only ever submit an intent
  // as themselves.
  const intent = { ...body.intent, userId: user.id }
  const result = await dispatchInteractionIntent(intent, kernelFor(supabase))
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
