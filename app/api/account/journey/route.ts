import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JourneyError, JourneyRuntime } from '@avatark/experience-runtime'
import { AVATARK_WELCOME_JOURNEY } from '@/lib/experienceRuntime/journeyDefinition'
import { SupabaseJourneyRepository } from '@/lib/experienceRuntime/supabaseJourneyRepository'

const ACTIONS = new Set([
  'start',
  'resume',
  'pause',
  'abandon',
  'advance',
  'completeEpisode',
  'enterWorld',
  'beginPractice',
  'finishPractice',
])

async function runtimeFor(supabase: Awaited<ReturnType<typeof createClient>>) {
  return new JourneyRuntime(AVATARK_WELCOME_JOURNEY, new SupabaseJourneyRepository(supabase))
}

async function toResponse(runtime: JourneyRuntime, subjectId: string) {
  const [progress, history] = await Promise.all([
    runtime.getProgress(subjectId),
    runtime.history(subjectId),
  ])
  return {
    journey: { id: AVATARK_WELCOME_JOURNEY.id, title: AVATARK_WELCOME_JOURNEY.title },
    progress,
    history: history.transitions,
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const runtime = await runtimeFor(supabase)
  return NextResponse.json(await toResponse(runtime, user.id))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const action = typeof body.action === 'string' ? body.action : null
  const nodeId = typeof body.nodeId === 'string' ? body.nodeId : null
  if (!action || !ACTIONS.has(action)) {
    return NextResponse.json({ error: `Invalid action "${action}"` }, { status: 400 })
  }
  if (['completeEpisode', 'enterWorld', 'beginPractice', 'finishPractice'].includes(action) && !nodeId) {
    return NextResponse.json({ error: `Action "${action}" requires a nodeId` }, { status: 400 })
  }

  const runtime = await runtimeFor(supabase)
  try {
    switch (action) {
      case 'start':
        await runtime.start(user.id)
        break
      case 'resume':
        await runtime.resume(user.id)
        break
      case 'pause':
        await runtime.pause(user.id)
        break
      case 'abandon':
        await runtime.abandon(user.id)
        break
      case 'advance':
        await runtime.advance(user.id)
        break
      case 'completeEpisode':
        await runtime.completeEpisode(user.id, nodeId!)
        break
      case 'enterWorld':
        await runtime.enterWorld(user.id, nodeId!)
        break
      case 'beginPractice':
        await runtime.beginPractice(user.id, nodeId!)
        break
      case 'finishPractice':
        await runtime.finishPractice(user.id, nodeId!)
        break
    }
  } catch (err) {
    if (err instanceof JourneyError) return NextResponse.json({ error: err.message }, { status: 400 })
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }

  return NextResponse.json(await toResponse(runtime, user.id))
}
