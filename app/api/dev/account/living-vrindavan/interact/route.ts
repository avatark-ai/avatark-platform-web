import { NextRequest, NextResponse } from 'next/server'
import { devRouteGuard, resolveDevUserId } from '@/lib/devOnlyGuard'
import { livingWorldRuntime } from '@/lib/livingWorldRuntime/singleton'
import { experienceRegistry } from '@/lib/experienceRegistry/singleton'
import { devContextRuntime } from '@/lib/context/devSingleton'
import { DEV_USER_ID, devJourneyRuntime } from '@/lib/experienceRuntime/devSingleton'
import type { RuntimeKernel } from '@/lib/runtimeKernel/orchestrator'
import { dispatchInteractionIntent } from '@/lib/worldEmbodiment/intentDispatcher'

// Dev-only, unauthenticated mirror of the real interact route (Sprint 8).
// Same devKernel shape app/api/dev/account/living-worlds/route.ts already
// builds -- this route exists specifically to exercise the NEW
// InteractionIntent boundary (renderer -> Host), not to duplicate that
// route's own enter/leave/visit/reflect actions (which remain the
// canonical way to drive those operations; this route proves the same
// operations are ALSO reachable through the typed intent front door).
const devKernel: RuntimeKernel = {
  livingWorld: livingWorldRuntime,
  context: devContextRuntime,
  experience: devJourneyRuntime,
  registry: experienceRegistry,
}

export async function POST(req: NextRequest) {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  const userId = resolveDevUserId(req, DEV_USER_ID)
  const body = await req.json().catch(() => ({}))
  if (typeof body.intent !== 'object' || body.intent === null) {
    return NextResponse.json({ error: 'body.intent is required' }, { status: 400 })
  }

  const intent = { ...body.intent, userId }
  const result = await dispatchInteractionIntent(intent, devKernel)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
