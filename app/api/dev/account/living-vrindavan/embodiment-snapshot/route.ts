import { NextRequest, NextResponse } from 'next/server'
import { devRouteGuard, resolveDevUserId } from '@/lib/devOnlyGuard'
import { livingWorldRuntime } from '@/lib/livingWorldRuntime/singleton'
import { LIVING_VRINDAVAN_DEFINITION } from '@/lib/livingWorldRuntime/vrindavanDefinition'
import { experienceRegistry } from '@/lib/experienceRegistry/singleton'
import { resolveWorldEmbodimentSnapshot } from '@/lib/worldEmbodiment/embodimentOrchestrator'
import { DEV_USER_ID } from '@/lib/experienceRuntime/devSingleton'

// Dev-only, unauthenticated reference-renderer feed for the World
// Embodiment Snapshot (Sprint 8) -- read-only, same rationale as every
// other app/api/dev/* route. This route never advances the shared
// world's own simulation; see ../../living-vrindavan/advance-clock (Sprint
// 7) for that, and ../interact for how a visitor's own actions flow
// through the Host instead of writing world truth directly.
export async function GET(req: NextRequest) {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  const userId = resolveDevUserId(req, DEV_USER_ID)
  const soundEnabled = req.nextUrl.searchParams.get('soundEnabled') === 'true'
  const worldState = await livingWorldRuntime.getState(userId, LIVING_VRINDAVAN_DEFINITION.id)
  const locationId = req.nextUrl.searchParams.get('locationId') ?? worldState?.currentLocationId ?? LIVING_VRINDAVAN_DEFINITION.entryLocationId

  const snapshot = await resolveWorldEmbodimentSnapshot({
    userId,
    locationId,
    livingWorldRuntime,
    experienceRegistry,
    soundEnabled,
  })

  return NextResponse.json({ snapshot })
}
