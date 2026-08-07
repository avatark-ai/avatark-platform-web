import { NextRequest, NextResponse } from 'next/server'
import { devRouteGuard } from '@/lib/devOnlyGuard'
import { DEV_USER_ID, devJourneyRuntime } from '@/lib/experienceRuntime/devSingleton'
import { narrativeRuntime } from '@/lib/narrativeRuntime/singleton'
import { applyJourneyViewAction, JOURNEY_VIEW_ACTIONS, toJourneyViewResponse } from '@/lib/experienceRuntime/journeyView'
import { JourneyError } from '@avatark/experience-runtime'
import { NarrativeRuntimeError } from '@avatark/narrative-runtime'

// Dev-only, unauthenticated mirror of /api/account/journey -- same
// precedent as app/dev/account/page.tsx's createMockAdapters() preview,
// except backed by the REAL runtime (in-memory, not mocked) so this
// sprint's Playwright screenshots exercise actual runtime behavior. Fixed
// DEV_USER_ID instead of a Supabase session -- this environment has no
// Supabase project configured at all. Never reachable in production (see
// lib/devOnlyGuard.ts). Never imported by, or called from,
// app/api/account/journey/route.ts.
export async function GET() {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  return NextResponse.json(await toJourneyViewResponse(devJourneyRuntime, narrativeRuntime, DEV_USER_ID))
}

export async function POST(req: NextRequest) {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  const body = await req.json().catch(() => ({}))
  const action = typeof body.action === 'string' ? body.action : null
  const nodeId = typeof body.nodeId === 'string' ? body.nodeId : null
  if (!action || !JOURNEY_VIEW_ACTIONS.has(action)) {
    return NextResponse.json({ error: `Invalid action "${action}"` }, { status: 400 })
  }
  if (['completeEpisode', 'enterWorld', 'beginPractice', 'finishPractice'].includes(action) && !nodeId) {
    return NextResponse.json({ error: `Action "${action}" requires a nodeId` }, { status: 400 })
  }

  try {
    await applyJourneyViewAction(devJourneyRuntime, narrativeRuntime, DEV_USER_ID, action, nodeId)
  } catch (err) {
    if (err instanceof JourneyError || err instanceof NarrativeRuntimeError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }

  return NextResponse.json(await toJourneyViewResponse(devJourneyRuntime, narrativeRuntime, DEV_USER_ID))
}
