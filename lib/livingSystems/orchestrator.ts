import { advanceWorldSimulation, resolveWorldSnapshot } from "@avatark/living-systems-runtime"
import type { WorldSnapshot } from "@avatark/living-systems-contracts"
import type { ExperienceRegistry } from "@avatark/experience-registry"
import type { WorldRuntime } from "@avatark/living-world-runtime"
import { LIVING_VRINDAVAN_DEFINITION } from "../livingWorldRuntime/vrindavanDefinition.ts"
import { LIVING_VRINDAVAN_ENCOUNTER_RULES, LIVING_VRINDAVAN_ENTITY_ARCHETYPES, LIVING_VRINDAVAN_SEASONS, LIVING_VRINDAVAN_SYSTEMS_PROVENANCE } from "./systemsDefinition.ts"
import { getOrInitSharedWorldState, livingEntityStateRepository, protectedNarrativeStateRepository, sharedWorldStateRepository, WORLD_ID, worldSystemEventRepository } from "./singleton.ts"
import { projectVisitorWorldMemory } from "./visitorMemoryProjection.ts"

export interface ResolveLivingSystemsSnapshotParams {
  userId: string
  locationId: string
  livingWorldRuntime: WorldRuntime
  experienceRegistry?: ExperienceRegistry
  now?: () => string
}

// Sprint 7, Phase 12/13: the Host's one read path from Living Systems to
// a renderer-facing WorldSnapshot. Combines SHARED WORLD STATE (the
// singleton), PERSISTENT ENTITY STATE (the singleton), VISITOR MEANINGFUL
// MEMORY (projected from the existing Living World Runtime + Experience
// Registry, never a new store), and PROTECTED NARRATIVE (honestly
// unresolved, never fabricated) -- all four state domains stay visibly
// separate all the way through this function's own parameter list.
export async function resolveLivingSystemsSnapshot(params: ResolveLivingSystemsSnapshotParams): Promise<WorldSnapshot> {
  const now = params.now ?? (() => new Date().toISOString())
  const sharedState = await getOrInitSharedWorldState()
  const entities = await livingEntityStateRepository.list(WORLD_ID)
  const protectedNarrative = await protectedNarrativeStateRepository.get(WORLD_ID)

  const worldState = await params.livingWorldRuntime.getState(params.userId, WORLD_ID)
  const events = params.experienceRegistry ? await params.experienceRegistry.listEvents(params.userId, { limit: 200 }) : []
  const visitorMemory = projectVisitorWorldMemory(params.userId, LIVING_VRINDAVAN_DEFINITION, worldState, events, sharedState.clock.tick)

  return resolveWorldSnapshot({
    sharedState,
    seasonDefinitions: LIVING_VRINDAVAN_SEASONS,
    entities,
    encounterRules: LIVING_VRINDAVAN_ENCOUNTER_RULES,
    locationId: params.locationId,
    visitorMemory,
    protectedNarrative,
    provenance: {
      worldArtifactSpecId: LIVING_VRINDAVAN_SYSTEMS_PROVENANCE.worldArtifactSpecId,
      systemsArtifactSpecId: LIVING_VRINDAVAN_SYSTEMS_PROVENANCE.specId,
      canonDocIds: LIVING_VRINDAVAN_SYSTEMS_PROVENANCE.canonDocIds,
    },
    now,
  })
}

// Sprint 7, Phase 15/22: advances the WORLD's own shared simulation,
// independent of any single visitor's action -- the mechanism that makes
// "leave -> world evolves -> return -> different shared state, same
// visitor continuity" true. Deliberately NOT reachable from the real,
// visitor-authenticated route (see app/api/dev/account/living-vrindavan/
// advance-clock/route.ts's own dev-only guard) -- a visitor does not get
// to fast-forward the shared world themselves. This is Living Systems'
// own simulation control, exposed here only for the reference renderer
// and Playwright to prove the behavior deterministically without waiting
// on real wall-clock time.
export async function advanceLivingSystemsSimulation(ticks: number, seed = "living-vrindavan-reference", now: () => string = () => new Date().toISOString()) {
  const sharedState = await getOrInitSharedWorldState()
  const entities = await livingEntityStateRepository.list(WORLD_ID)

  const result = advanceWorldSimulation({
    sharedState,
    seasonDefinitions: LIVING_VRINDAVAN_SEASONS,
    entityArchetypes: LIVING_VRINDAVAN_ENTITY_ARCHETYPES,
    entities,
    ticks,
    seed,
    now,
  })

  await sharedWorldStateRepository.save(result.sharedState)
  for (const entity of result.entities) {
    await livingEntityStateRepository.save(WORLD_ID, entity)
  }
  for (const event of result.events) {
    await worldSystemEventRepository.append(event)
  }

  return result
}
