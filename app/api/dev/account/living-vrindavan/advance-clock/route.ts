import { NextRequest, NextResponse } from 'next/server'
import { devRouteGuard } from '@/lib/devOnlyGuard'
import { advanceLivingSystemsSimulation } from '@/lib/livingSystems/orchestrator'

// Dev/test-only: advances Living Vrindavan's own SHARED world simulation
// by N ticks, independent of any visitor. This is Living Systems' own
// simulation control (Sprint 7, Phase 15/22), never a visitor action --
// there is deliberately no equivalent on the real, authenticated
// living-vrindavan surface. Guarded the same way every other
// app/api/dev/* route already is (404s in production).
export async function POST(req: NextRequest) {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  const body = await req.json().catch(() => ({}))
  const ticks = typeof body.ticks === 'number' && body.ticks >= 0 ? body.ticks : null
  if (ticks === null) {
    return NextResponse.json({ error: 'ticks must be a non-negative number' }, { status: 400 })
  }

  const result = await advanceLivingSystemsSimulation(ticks)
  return NextResponse.json({
    tick: result.sharedState.clock.tick,
    seasonId: result.sharedState.season.currentSeasonId,
    events: result.events,
  })
}
