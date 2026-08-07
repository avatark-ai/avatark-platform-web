import { NextRequest, NextResponse } from 'next/server'
import { devRouteGuard } from '@/lib/devOnlyGuard'
import { createLivingWorldsAccountAdapter } from '@/lib/livingWorldRuntime/accountAdapter'
import { livingWorldRuntime, SAMPLE_WORLD_DEFINITIONS } from '@/lib/livingWorldRuntime/singleton'
import { experienceRegistry } from '@/lib/experienceRegistry/singleton'
import { devContextRuntime } from '@/lib/context/devSingleton'
import { DEV_USER_ID, devJourneyRuntime } from '@/lib/experienceRuntime/devSingleton'
import { enterLivingWorld, leaveLivingWorld, type RuntimeKernel } from '@/lib/runtimeKernel/orchestrator'

const PRODUCT_ID = 'avatark'
const ACTIONS = new Set(['enter', 'leave'])

// Dev-only, unauthenticated mirror of /api/account/living-worlds -- see
// app/api/dev/account/journey/route.ts for the full rationale. Uses the
// SAME Living World Runtime and Experience Registry singletons the real
// route uses (both are already in-memory with no Supabase-backed variant
// to protect -- see lib/livingWorldRuntime/singleton.ts), keyed by the
// distinct DEV_USER_ID so dev traffic never touches a real user's state.
const devKernel: RuntimeKernel = {
  livingWorld: livingWorldRuntime,
  context: devContextRuntime,
  experience: devJourneyRuntime,
  registry: experienceRegistry,
}

async function listResponse() {
  const adapter = createLivingWorldsAccountAdapter(livingWorldRuntime, SAMPLE_WORLD_DEFINITIONS, DEV_USER_ID)
  const result = await adapter.list()
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ worlds: result.data })
}

export async function GET() {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  return listResponse()
}

export async function POST(req: NextRequest) {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  const body = await req.json().catch(() => ({}))
  const action = typeof body.action === 'string' ? body.action : null
  const worldId = typeof body.worldId === 'string' ? body.worldId : null
  if (!action || !ACTIONS.has(action)) {
    return NextResponse.json({ error: `Invalid action "${action}"` }, { status: 400 })
  }
  if (!worldId || !SAMPLE_WORLD_DEFINITIONS.some((w) => w.id === worldId)) {
    return NextResponse.json({ error: `Unknown Living World "${worldId}"` }, { status: 400 })
  }

  try {
    if (action === 'enter') {
      await enterLivingWorld(devKernel, { userId: DEV_USER_ID, productId: PRODUCT_ID, worldId })
    } else {
      await leaveLivingWorld(devKernel, { userId: DEV_USER_ID, productId: PRODUCT_ID, worldId })
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }

  return listResponse()
}
