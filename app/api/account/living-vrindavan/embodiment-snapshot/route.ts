import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { livingWorldRuntime } from '@/lib/livingWorldRuntime/singleton'
import { LIVING_VRINDAVAN_DEFINITION } from '@/lib/livingWorldRuntime/vrindavanDefinition'
import { experienceRegistry } from '@/lib/experienceRegistry/singleton'
import { resolveWorldEmbodimentSnapshot } from '@/lib/worldEmbodiment/embodimentOrchestrator'

// Real, Supabase-authenticated read path for the World Embodiment
// Snapshot (Sprint 8). Read-only -- no POST here; a visitor's own
// actions flow through ../interact instead, never directly through this
// route, and never advance the shared world's own simulation clock
// (that capability is dev/test-only, same Sprint 7 precedent).
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const soundEnabled = req.nextUrl.searchParams.get('soundEnabled') === 'true'
  const worldState = await livingWorldRuntime.getState(user.id, LIVING_VRINDAVAN_DEFINITION.id)
  const locationId = req.nextUrl.searchParams.get('locationId') ?? worldState?.currentLocationId ?? LIVING_VRINDAVAN_DEFINITION.entryLocationId

  const snapshot = await resolveWorldEmbodimentSnapshot({
    userId: user.id,
    locationId,
    livingWorldRuntime,
    experienceRegistry,
    soundEnabled,
  })

  return NextResponse.json({ snapshot })
}
