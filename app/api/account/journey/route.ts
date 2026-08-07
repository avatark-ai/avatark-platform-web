import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JourneyError, JourneyRuntime } from '@avatark/experience-runtime'
import { NarrativeRuntimeError } from '@avatark/narrative-runtime'
import { AVATARK_WELCOME_JOURNEY } from '@/lib/experienceRuntime/journeyDefinition'
import { SupabaseJourneyRepository } from '@/lib/experienceRuntime/supabaseJourneyRepository'
import { narrativeRuntime } from '@/lib/narrativeRuntime/singleton'
import { applyJourneyViewAction, JOURNEY_VIEW_ACTIONS, toJourneyViewResponse } from '@/lib/experienceRuntime/journeyView'

function runtimeFor(supabase: Awaited<ReturnType<typeof createClient>>) {
  return new JourneyRuntime(AVATARK_WELCOME_JOURNEY, new SupabaseJourneyRepository(supabase))
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const runtime = runtimeFor(supabase)
  return NextResponse.json(await toJourneyViewResponse(runtime, narrativeRuntime, user.id))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const action = typeof body.action === 'string' ? body.action : null
  const nodeId = typeof body.nodeId === 'string' ? body.nodeId : null
  if (!action || !JOURNEY_VIEW_ACTIONS.has(action)) {
    return NextResponse.json({ error: `Invalid action "${action}"` }, { status: 400 })
  }
  if (['completeEpisode', 'enterWorld', 'beginPractice', 'finishPractice'].includes(action) && !nodeId) {
    return NextResponse.json({ error: `Action "${action}" requires a nodeId` }, { status: 400 })
  }

  const runtime = runtimeFor(supabase)
  try {
    await applyJourneyViewAction(runtime, narrativeRuntime, user.id, action, nodeId)
  } catch (err) {
    if (err instanceof JourneyError || err instanceof NarrativeRuntimeError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }

  return NextResponse.json(await toJourneyViewResponse(runtime, narrativeRuntime, user.id))
}
