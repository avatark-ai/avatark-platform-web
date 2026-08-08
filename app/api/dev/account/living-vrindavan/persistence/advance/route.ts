import { NextRequest, NextResponse } from 'next/server'
import { devRouteGuard } from '@/lib/devOnlyGuard'
import { LeaseConflictError, StaleWorldStateVersionError } from '@avatark/world-persistence-contracts'
import { advanceWorld } from '@/lib/worldPersistence/hostService'

// Dev/test-only: explicit, owner-gated tick advancement against the
// DURABLE world state -- requires the caller to already hold the
// world's execution lease (acquired via /persistence/wake first), unlike
// the pre-existing /advance-clock route, which advances Sprint 7's
// in-memory singleton with no ownership concept at all. Demonstrates
// Phase 6/7's conflict semantics are real, not just type-level.
export async function POST(req: NextRequest) {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  const body = await req.json().catch(() => ({}))
  const worldInstanceId = typeof body.worldInstanceId === 'string' ? body.worldInstanceId : 'living-vrindavan'
  const ownerId = typeof body.ownerId === 'string' ? body.ownerId : 'dev-owner'
  const ticks = typeof body.ticks === 'number' && body.ticks >= 0 ? body.ticks : null
  if (ticks === null) {
    return NextResponse.json({ error: 'ticks must be a non-negative number' }, { status: 400 })
  }

  try {
    const result = await advanceWorld(worldInstanceId, ticks, ownerId)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof LeaseConflictError) return NextResponse.json({ error: err.message }, { status: 409 })
    if (err instanceof StaleWorldStateVersionError) return NextResponse.json({ error: err.message }, { status: 409 })
    throw err
  }
}
