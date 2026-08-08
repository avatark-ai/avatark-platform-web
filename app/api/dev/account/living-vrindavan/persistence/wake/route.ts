import { NextRequest, NextResponse } from 'next/server'
import { devRouteGuard } from '@/lib/devOnlyGuard'
import { LeaseConflictError } from '@avatark/world-persistence-contracts'
import { wakeWorld } from '@/lib/worldPersistence/hostService'

// Dev/test-only: exercises Sprint 9's DORMANT -> WAKING -> ACTIVE
// lifecycle and deterministic catch-up against a world instance's
// durable state -- the mechanism Phase 4/5 asks for, proven here without
// needing real wall-clock time to pass (a caller can pass any `now`
// indirectly by first seeding via /persistence/state and letting real
// process time elapse, or by exercising the same functions directly in
// this package's own test suite, which is where the byte-for-byte
// equivalence proof actually lives). This route exists so Playwright/a
// developer can observe the transition, not to be the primary proof.
export async function POST(req: NextRequest) {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  const body = await req.json().catch(() => ({}))
  const worldInstanceId = typeof body.worldInstanceId === 'string' ? body.worldInstanceId : 'living-vrindavan'
  const ownerId = typeof body.ownerId === 'string' ? body.ownerId : 'dev-owner'

  try {
    const result = await wakeWorld(worldInstanceId, ownerId)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof LeaseConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    throw err
  }
}
