import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { livingWorldRuntime } from '@/lib/livingWorldRuntime/singleton'
import { LIVING_VRINDAVAN_DEFINITION } from '@/lib/livingWorldRuntime/vrindavanDefinition'
import { experienceRegistry } from '@/lib/experienceRegistry/singleton'
import { resolveLivingSystemsSnapshot } from '@/lib/livingSystems/orchestrator'

// Real, Supabase-authenticated read path for the Living Systems World
// Snapshot (Sprint 7). Deliberately read-only -- there is no POST here,
// and no action a signed-in visitor can take through this route ever
// advances the shared world's own simulation clock (that capability
// exists only for the dev/test reference renderer and Playwright; see
// app/api/dev/account/living-vrindavan/advance-clock/route.ts's own
// comment for why). A visitor's own world actions (enter/leave/visit/
// reflect) continue to flow entirely through the existing
// /api/account/living-worlds route and lib/runtimeKernel/orchestrator.ts
// -- this route only ever reads the resolved result.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const worldState = await livingWorldRuntime.getState(user.id, LIVING_VRINDAVAN_DEFINITION.id)
  const locationId = req.nextUrl.searchParams.get('locationId') ?? worldState?.currentLocationId ?? LIVING_VRINDAVAN_DEFINITION.entryLocationId

  const snapshot = await resolveLivingSystemsSnapshot({
    userId: user.id,
    locationId,
    livingWorldRuntime,
    experienceRegistry,
  })

  return NextResponse.json({ snapshot })
}
