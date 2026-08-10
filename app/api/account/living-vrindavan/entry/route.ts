import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WORLD_ID } from '@/lib/livingSystems/singleton'
import { composeVrindavanOrientation } from '@/lib/livingWorldExperience/vrindavanOrientation'

// Build 04, mission §D/§E: a real Living Vrindavan entry contract --
// "where should this visitor materialize" plus the world-awareness
// Orientation answer for wherever that resolves to. Read-only from
// this route's own perspective (the same "viewing the world can
// advance it opportunistically" posture every other GET route here
// already holds, via the same underlying best-effort wake); a client
// calls this FIRST, then requests `../embodiment-snapshot`/
// `../world-snapshot` with the returned `arrival.locationId`.
//
// `sinceTick` is caller-supplied (optional) -- no per-visitor "last
// known tick" persistence exists yet in this codebase (a real, named
// limitation, not new debt; see docs/LIVING_VRINDAVAN_BUILD_04_RECONCILIATION.md).
// A client that tracks its own last-seen tick can pass it back here to
// receive an honest `worldChangedSinceLastVisit` signal.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const sinceTickParam = req.nextUrl.searchParams.get('sinceTick')
  const sinceTick = sinceTickParam !== null ? Number.parseInt(sinceTickParam, 10) : null

  const orientation = await composeVrindavanOrientation(WORLD_ID, user.id, Number.isNaN(sinceTick) ? null : sinceTick)

  return NextResponse.json({ orientation })
}
