import { NextRequest, NextResponse } from 'next/server'
import { devRouteGuard } from '@/lib/devOnlyGuard'
import { getWorldState } from '@/lib/worldPersistence/hostService'

// Dev/test-only: read-only view of a world instance's DURABLE state
// (Sprint 9) -- distinct from the existing
// /api/dev/account/living-vrindavan/world-snapshot route, which reads
// Sprint 7's in-memory singleton. `?world_instance_id=` lets Playwright
// address a second, independent instance without touching the default
// one, the same role `?dev_user=` already plays for visitor identity on
// every other dev route.
export async function GET(req: NextRequest) {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  const worldInstanceId = req.nextUrl.searchParams.get('world_instance_id') ?? 'living-vrindavan'
  const state = await getWorldState(worldInstanceId)
  return NextResponse.json(state)
}
