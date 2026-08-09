import type { WorldEmbodimentSnapshot } from "@avatark/world-embodiment-contracts"
import type { ExperienceRegistry } from "@avatark/experience-registry"
import type { WorldRuntime } from "@avatark/living-world-runtime"
import { LIVING_VRINDAVAN_DEFINITION } from "../livingWorldRuntime/vrindavanDefinition.ts"
import { WORLD_ID } from "../livingSystems/singleton.ts"
import { projectVisitorWorldMemory } from "../livingSystems/visitorMemoryProjection.ts"
import { getWorldState } from "../worldPersistence/hostService.ts"
import { getEmbodimentSnapshotForVisitor } from "../livingWorldHost/hostService.ts"

// Sprint 8, Phase 4: the Host's one read path from Living Systems'
// authoritative WorldSnapshot to the renderer-facing WorldEmbodimentSnapshot.
//
// Sprint 20, §Step B (singleton -> durable convergence): the SHARED
// simulation dimension (entities/season/clock/protected-narrative/
// spatial-ecology/adaptation/canonical-event projections) now resolves
// through `getEmbodimentSnapshotForVisitor` (the durable,
// `worldInstanceId`-scoped family, Sprint 9-19), never Sprint 7's
// ephemeral `resolveLivingSystemsSnapshot` singleton -- this was the
// second (and, per Part A's own investigation, the LARGER of the two)
// remaining call site named as Sprint 20 debt. `wakeLivingWorld`
// (called internally by `getEmbodimentSnapshotForVisitor`) also means
// this route now genuinely ADVANCES the durable world in response to
// real visitor traffic -- something the OLD singleton path never did in
// production either (only a dev-only `/advance-clock` route ever called
// `advanceLivingSystemsSimulation`; see this sprint's final report for
// why this makes the migration a net improvement, not a regression).
//
// The per-user WorldRuntime-derived `reachableLocationIds` (a distinct,
// legitimate per-visitor-progression concern, Sprint 19's own finding,
// reconfirmed) is UNCHANGED -- still computed from `@avatark/
// living-world-runtime`'s own state, never folded into world
// persistence. `visitorMemory` is ALSO deliberately unchanged: still
// `projectVisitorWorldMemory`, the same real, already-populated
// derivation every existing signed-in visitor's history already lives
// in -- passed to the durable snapshot function via its Sprint 20
// additive `visitorMemory` override, so switching the SHARED dimension
// to durable does not blank out any real visitor's meaningful-memory
// history (`visitorWorldMemoryRepository`, the durable family's OWN
// store for this, has never been written to by any real request and
// would otherwise read back empty for every existing visitor).

// Same legal-next-location filter lib/livingWorldRuntime/accountAdapter.ts's
// own findNextLocations already uses (Sprint 5/6) -- reimplemented here
// rather than imported, since that function is Sprint 6's UI-shaped
// account-summary adapter, not a general-purpose graph query this module
// should couple to.
function findReachableLocationIds(currentLocationId: string, visitedLocationIds: string[]): string[] {
  return LIVING_VRINDAVAN_DEFINITION.locations
    .filter((location) => {
      if (location.id === currentLocationId) return false
      const requires = location.requiresLocationIds ?? []
      return requires.length > 0 && requires.every((id) => visitedLocationIds.includes(id))
    })
    .map((location) => location.id)
}

export interface ResolveWorldEmbodimentSnapshotParams {
  userId: string
  locationId: string
  livingWorldRuntime: WorldRuntime
  experienceRegistry?: ExperienceRegistry
  soundEnabled?: boolean
  now?: () => string
  // Sprint 20, additive: defaults to this product's single shared
  // durable instance (`WORLD_ID`, the same constant Sprint 19's
  // `select-encounter` migration already uses as `worldInstanceId`) --
  // every existing caller that omits it is unaffected.
  worldInstanceId?: string
}

export async function resolveWorldEmbodimentSnapshot(params: ResolveWorldEmbodimentSnapshotParams): Promise<WorldEmbodimentSnapshot> {
  const worldInstanceId = params.worldInstanceId ?? WORLD_ID
  const now = params.now ?? (() => new Date().toISOString())

  const worldState = await params.livingWorldRuntime.getState(params.userId, WORLD_ID)
  const reachableLocationIds = worldState ? findReachableLocationIds(params.locationId, worldState.visitedLocationIds) : []

  const durableState = await getWorldState(worldInstanceId, now)
  const events = params.experienceRegistry ? await params.experienceRegistry.listEvents(params.userId, { limit: 200 }) : []
  const visitorMemory = projectVisitorWorldMemory(params.userId, LIVING_VRINDAVAN_DEFINITION, worldState, events, durableState.sharedState.clock.tick)

  const { snapshot } = await getEmbodimentSnapshotForVisitor({
    worldInstanceId,
    ownerId: "embodiment-orchestrator-read",
    userId: params.userId,
    locationId: params.locationId,
    reachableLocationIds,
    soundEnabled: params.soundEnabled ?? false,
    now,
    visitorMemory,
  })

  return snapshot
}
