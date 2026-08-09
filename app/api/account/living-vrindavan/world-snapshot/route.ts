import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { livingWorldRuntime } from '@/lib/livingWorldRuntime/singleton'
import { LIVING_VRINDAVAN_DEFINITION } from '@/lib/livingWorldRuntime/vrindavanDefinition'
import { experienceRegistry } from '@/lib/experienceRegistry/singleton'
import { WORLD_ID } from '@/lib/livingSystems/singleton'
import { projectVisitorWorldMemory } from '@/lib/livingSystems/visitorMemoryProjection'
import { getWorldState } from '@/lib/worldPersistence/hostService'
import { getWorldSnapshotForVisitor } from '@/lib/livingWorldHost/hostService'

// Real, Supabase-authenticated read path for the World Snapshot.
//
// Sprint 20, §Step B (singleton -> durable convergence): reads the
// durable, worldInstanceId-scoped family (Sprint 9-19) instead of
// Sprint 7's ephemeral singleton (`resolveLivingSystemsSnapshot`) --
// converging this route with the same authoritative world truth
// `/interact`'s `select-encounter` branch already converged onto in
// Sprint 19, and now genuinely ADVANCING the durable world on real
// visitor traffic via `getWorldSnapshotForVisitor`'s internal
// best-effort wake (see lib/livingWorldHost/hostService.ts's own doc
// comment for why a losing race never surfaces as an error to this
// route). Still deliberately read-only from THIS route's own
// perspective -- there is no POST here, and no request body this route
// accepts ever supplies an intent; the wake this route triggers is an
// opportunistic side effect of viewing the world, the same "leave ->
// world evolves independently -> return" semantics Sprint 7 always
// had, not a new visitor-controlled mutation surface.
//
// `visitorMemory` is computed the SAME way it always was
// (`projectVisitorWorldMemory`, from `@avatark/living-world-runtime` +
// Experience Registry events) and passed through explicitly -- the
// durable family's own `visitorWorldMemoryRepository` has never been
// written to by any real request and would otherwise read back empty
// for every existing signed-in visitor.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const worldState = await livingWorldRuntime.getState(user.id, LIVING_VRINDAVAN_DEFINITION.id)
  const locationId = req.nextUrl.searchParams.get('locationId') ?? worldState?.currentLocationId ?? LIVING_VRINDAVAN_DEFINITION.entryLocationId

  const durableState = await getWorldState(WORLD_ID)
  const events = await experienceRegistry.listEvents(user.id, { limit: 200 })
  const visitorMemory = projectVisitorWorldMemory(user.id, LIVING_VRINDAVAN_DEFINITION, worldState, events, durableState.sharedState.clock.tick)

  const { snapshot } = await getWorldSnapshotForVisitor({
    worldInstanceId: WORLD_ID,
    ownerId: 'world-snapshot-route-read',
    userId: user.id,
    locationId,
    visitorMemory,
  })

  return NextResponse.json({ snapshot })
}
