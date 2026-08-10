import { NextRequest, NextResponse } from 'next/server'
import { devRouteGuard } from '@/lib/devOnlyGuard'
import { composeVrindavanWorldExperienceSnapshot } from '@/lib/livingWorldExperience/vrindavanWorldExperienceSnapshot'

// Build 04, mission §K/§N: a restrained, dev-only diagnostic exposing
// the FULL renderer-neutral World Experience Snapshot -- the exact
// payload a future Unreal (or any other renderer) translation layer
// will eventually consume, per the same
// `/api/dev/account/living-vrindavan/world-inspection` convention
// Build 01 already established. Composes only already-real/already-
// new-this-build pieces; introduces no new presentation logic here.
export async function GET(req: NextRequest) {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  const worldInstanceId = req.nextUrl.searchParams.get('world_instance_id') ?? 'living-vrindavan'
  const userId = req.nextUrl.searchParams.get('dev_user') ?? 'dev-inspector'
  const sinceTickParam = req.nextUrl.searchParams.get('since_tick')
  const sinceTick = sinceTickParam !== null ? Number.parseInt(sinceTickParam, 10) : null

  const snapshot = await composeVrindavanWorldExperienceSnapshot(worldInstanceId, userId, Number.isNaN(sinceTick) ? null : sinceTick)

  return NextResponse.json({ snapshot })
}
