import { NextRequest, NextResponse } from 'next/server'
import { devRouteGuard, resolveDevUserId } from '@/lib/devOnlyGuard'
import { livingWorldRuntime } from '@/lib/livingWorldRuntime/singleton'
import { LIVING_VRINDAVAN_DEFINITION } from '@/lib/livingWorldRuntime/vrindavanDefinition'
import { experienceRegistry } from '@/lib/experienceRegistry/singleton'
import { resolveLivingSystemsSnapshot } from '@/lib/livingSystems/orchestrator'
import { DEV_USER_ID } from '@/lib/experienceRuntime/devSingleton'

// Dev-only, unauthenticated reference-renderer feed for the Living
// Systems World Snapshot (Sprint 7) -- same rationale as every other
// app/api/dev/* route: this environment has no Supabase project
// configured, so the real, authenticated route can't be exercised here
// regardless. Read-only: this route can never advance the world's own
// simulation (see ../advance-clock/route.ts for that, a genuinely
// separate, more clearly-labeled capability) -- a visitor, dev or real,
// never gets to write world truth through this endpoint.
export async function GET(req: NextRequest) {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  const userId = resolveDevUserId(req, DEV_USER_ID)
  const worldState = await livingWorldRuntime.getState(userId, LIVING_VRINDAVAN_DEFINITION.id)
  const locationId = req.nextUrl.searchParams.get('locationId') ?? worldState?.currentLocationId ?? LIVING_VRINDAVAN_DEFINITION.entryLocationId

  const snapshot = await resolveLivingSystemsSnapshot({
    userId,
    locationId,
    livingWorldRuntime,
    experienceRegistry,
  })

  return NextResponse.json({ snapshot })
}
