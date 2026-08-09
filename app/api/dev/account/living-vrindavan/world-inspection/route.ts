import { NextRequest, NextResponse } from 'next/server'
import { devRouteGuard } from '@/lib/devOnlyGuard'
import { getEmbodimentSnapshotForVisitor, queryHealth } from '@/lib/livingWorldHost/hostService'
import { worldCheckpointRepository } from '@/lib/worldPersistence/singleton'
import { getParticipationRecords } from '@/lib/participation/hostService'
import { presentSeason } from '@/lib/renderer/webWorldSystemsRenderer'
import { summarizeEntityBehavior, summarizeEnvironmentPresentation } from '@/lib/renderer/webEmbodimentRenderer'

// Living Vrindavan Build 01, Phase U: a restrained, dev-only diagnostic
// world-inspection view -- NOT an admin dashboard, and not this build's
// final consumer art direction. It exists to prove real world data can
// be SEEN, composing only already-real, already-existing pieces: the
// real Sprint 20 v1 facade (getEmbodimentSnapshotForVisitor/queryHealth),
// the real Sprint 7 web reference renderer's own summarize functions
// (webWorldSystemsRenderer/webEmbodimentRenderer, unchanged), and the
// real Sprint 19 participation history. No new presentation logic is
// introduced; this route only composes what already exists into one
// restrained JSON view, mirroring the existing
// /api/dev/account/living-vrindavan/persistence/state route's own
// `?world_instance_id=` convention.
export async function GET(req: NextRequest) {
  const blocked = devRouteGuard()
  if (blocked) return blocked

  const worldInstanceId = req.nextUrl.searchParams.get('world_instance_id') ?? 'living-vrindavan'
  const userId = req.nextUrl.searchParams.get('dev_user') ?? 'dev-inspector'
  const locationId = req.nextUrl.searchParams.get('location_id') ?? 'vrindavan-entry'

  const { snapshot } = await getEmbodimentSnapshotForVisitor({
    worldInstanceId,
    ownerId: 'world-inspection-route',
    userId,
    locationId,
    reachableLocationIds: [],
  })
  const health = await queryHealth(worldInstanceId)
  const checkpoint = await worldCheckpointRepository.loadLatest(worldInstanceId)
  const participationRecords = await getParticipationRecords(worldInstanceId, userId)

  return NextResponse.json({
    worldInstanceId,
    currentLocationId: snapshot.current.locationId,
    season: presentSeason(snapshot.season.id, snapshot.season.name),
    environment: summarizeEnvironmentPresentation(snapshot.current.environment),
    presentEntities: snapshot.current.entities.map((e) => ({ entityId: e.entityId, behavior: summarizeEntityBehavior(e) })),
    reachableLocationIds: snapshot.reachable.map((r) => r.locationId),
    checkpoint: checkpoint ? { tick: checkpoint.tick, checkpointVersion: checkpoint.checkpointVersion, createdAt: checkpoint.createdAt } : null,
    runtimeHealth: health.rollup,
    lifecycleState: health.lifecycleState,
    visitorParticipationCount: participationRecords.length,
  })
}
