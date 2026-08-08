import { NextRequest, NextResponse } from 'next/server'
import { devRouteGuard, resolveDevUserId } from '@/lib/devOnlyGuard'
import { InvalidWorldTransitionError } from '@avatark/living-world-runtime'
import { createLivingWorldsAccountAdapter } from '@/lib/livingWorldRuntime/accountAdapter'
import { livingWorldRuntime, WORLD_DEFINITIONS } from '@/lib/livingWorldRuntime/singleton'
import { experienceRegistry } from '@/lib/experienceRegistry/singleton'
import { devContextRuntime } from '@/lib/context/devSingleton'
import { DEV_USER_ID, devJourneyRuntime } from '@/lib/experienceRuntime/devSingleton'
import { enterLivingWorld, leaveLivingWorld, visitLivingWorldLocation, recordLivingWorldReflection, type RuntimeKernel } from '@/lib/runtimeKernel/orchestrator'

const PRODUCT_ID = 'avatark'
const ACTIONS = new Set(['enter', 'leave', 'visit', 'reflect'])

// Dev-only, unauthenticated mirror of /api/account/living-worlds -- see
// app/api/dev/account/journey/route.ts for the full rationale. Uses the
// SAME Living World Runtime and Experience Registry singletons the real
// route uses (both are already in-memory with no Supabase-backed variant
// to protect -- see lib/livingWorldRuntime/singleton.ts), keyed by
// whichever dev user id the caller resolves (defaulting to DEV_USER_ID)
// so dev traffic never touches a real user's state.
const devKernel: RuntimeKernel = {
  livingWorld: livingWorldRuntime,
  context: devContextRuntime,
  experience: devJourneyRuntime,
  registry: experienceRegistry,
}

async function listResponse(userId: string) {
  const adapter = createLivingWorldsAccountAdapter(livingWorldRuntime, WORLD_DEFINITIONS, userId)
  const result = await adapter.list()
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ worlds: result.data })
}

export async function GET(req: NextRequest) {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  return listResponse(resolveDevUserId(req, DEV_USER_ID))
}

export async function POST(req: NextRequest) {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  const userId = resolveDevUserId(req, DEV_USER_ID)
  const body = await req.json().catch(() => ({}))
  const action = typeof body.action === 'string' ? body.action : null
  const worldId = typeof body.worldId === 'string' ? body.worldId : null
  const locationId = typeof body.locationId === 'string' ? body.locationId : null
  if (!action || !ACTIONS.has(action)) {
    return NextResponse.json({ error: `Invalid action "${action}"` }, { status: 400 })
  }
  if (!worldId || !WORLD_DEFINITIONS.some((w) => w.id === worldId)) {
    return NextResponse.json({ error: `Unknown Living World "${worldId}"` }, { status: 400 })
  }
  if ((action === 'visit' || action === 'reflect') && !locationId) {
    return NextResponse.json({ error: `${action === 'visit' ? 'Visiting' : 'Reflecting at'} a location requires a locationId` }, { status: 400 })
  }
  const definition = WORLD_DEFINITIONS.find((w) => w.id === worldId)!
  if (action === 'reflect') {
    const activity = definition.activities.find((a) => a.locationId === locationId && a.reflectionRef != null)
    if (!activity?.reflectionRef) {
      return NextResponse.json({ error: `Location "${locationId}" has no reflection affordance` }, { status: 400 })
    }
  }

  try {
    if (action === 'enter') {
      await enterLivingWorld(devKernel, { userId, productId: PRODUCT_ID, worldId })
    } else if (action === 'leave') {
      await leaveLivingWorld(devKernel, { userId, productId: PRODUCT_ID, worldId })
    } else if (action === 'visit') {
      await visitLivingWorldLocation(devKernel, { userId, productId: PRODUCT_ID, worldId, locationId: locationId! })
    } else {
      const activity = definition.activities.find((a) => a.locationId === locationId && a.reflectionRef != null)!
      await recordLivingWorldReflection(devKernel, { userId, productId: PRODUCT_ID, locationId: locationId!, reflectionId: activity.reflectionRef!.reflectionId })
    }
  } catch (err) {
    if (err instanceof InvalidWorldTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }

  return listResponse(userId)
}
