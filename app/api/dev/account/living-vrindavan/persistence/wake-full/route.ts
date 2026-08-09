import { NextRequest, NextResponse } from 'next/server'
import { devRouteGuard } from '@/lib/devOnlyGuard'
import { LeaseConflictError } from '@avatark/world-persistence-contracts'
import { wakeWorldWithSpatialEcology } from '@/lib/spatialEcology/hostService'

// Dev/test-only: Sprint 17, §10 task 4 -- the REAL composed wake chain
// (Sprint 9's causal environment through Sprint 16's spatial ecology,
// crash-recovery-fixed per docs/SPRINT17_IMPLEMENTATION_PREP.md §4),
// wired into an actual app route for the first time. Before this route
// existed, `wakeWorldWithSpatialEcology` and everything it composes
// (population/memory/social ecology/rhythms/encounter realization/
// adaptation) were exercised only by each layer's own test suite --
// the existing /persistence/wake route (Sprint 9) deliberately calls
// the bare, environment-only `wakeWorld` and is left completely
// unmodified (Sprint 17's own backward-compatibility requirement, see
// lib/worldPersistence/hostService.ts's own `wakeWorld` doc comment) --
// this is a NEW, additive route, not a replacement.
export async function POST(req: NextRequest) {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  const body = await req.json().catch(() => ({}))
  const worldInstanceId = typeof body.worldInstanceId === 'string' ? body.worldInstanceId : 'living-vrindavan'
  const ownerId = typeof body.ownerId === 'string' ? body.ownerId : 'dev-owner'

  try {
    const result = await wakeWorldWithSpatialEcology(worldInstanceId, ownerId)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof LeaseConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    throw err
  }
}
