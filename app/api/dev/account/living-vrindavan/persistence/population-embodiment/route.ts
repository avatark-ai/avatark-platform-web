import { NextRequest, NextResponse } from 'next/server'
import { devRouteGuard, resolveDevUserId } from '@/lib/devOnlyGuard'
import { DEV_USER_ID } from '@/lib/experienceRuntime/devSingleton'
import { getPopulationEmbodimentSnapshot } from '@/lib/livingPopulation/hostService'
import { reachableNeighbors } from '@avatark/living-population-runtime'
import { VRINDAVAN_LOCATION_GRAPH } from '@/lib/livingPopulation/vrindavanPopulationDefinition'

// Dev/test-only: the Sprint 10 population-aware embodiment snapshot --
// the SAME WorldEmbodimentSnapshot shape the existing embodiment-snapshot
// route already returns, now also carrying population entity/group
// presentations (Phase 15/16) sourced from the DURABLE path (Sprint 9),
// not Sprint 7/8's in-memory singleton. Deliberately a separate route
// rather than changing the existing one -- which durable/population
// backing the real, authenticated surface should use is a product
// decision this sprint does not make unilaterally (the same posture
// Sprint 9 took keeping its own durable routes dev-only and additive).
export async function GET(req: NextRequest) {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  const userId = resolveDevUserId(req, DEV_USER_ID)
  const worldInstanceId = req.nextUrl.searchParams.get('world_instance_id') ?? 'living-vrindavan'
  const locationId = req.nextUrl.searchParams.get('locationId') ?? 'yamuna'
  const reachableLocationIds = reachableNeighbors(VRINDAVAN_LOCATION_GRAPH, locationId)

  const snapshot = await getPopulationEmbodimentSnapshot(worldInstanceId, userId, locationId, reachableLocationIds)
  return NextResponse.json({ snapshot })
}
