import type { DayPhase, GroupRoutineIntent, PlaceOccupancy, ResourceOpportunity, SocialInteractionOpportunity } from "@avatark/living-rhythms-contracts"
import { resolveDayPhase, resolveGroupRoutineIntent, resolvePlaceOccupancy, resolveResourceOpportunities, resolveSocialInteractionOpportunities } from "@avatark/living-rhythms-runtime"
import type { RoutineWindowInput } from "@avatark/living-population-runtime"
import type { RelationshipState, RelationshipType } from "@avatark/social-ecology-contracts"
import { getWorldState } from "../worldPersistence/hostService.ts"
import { getPopulationSnapshot } from "../livingPopulation/hostService.ts"
import { VRINDAVAN_RESOURCE_AFFORDANCES } from "../livingPopulation/vrindavanPopulationDefinition.ts"
import { getEmbodimentWithSocialEcology, wakeWorldWithSocialEcology } from "../socialEcology/hostService.ts"
import type { WakeWorldWithSocialEcologyResult, WorldEmbodimentSnapshotWithSocialEcology } from "../socialEcology/hostService.ts"
import { relationshipRepository, separationRepository } from "../socialEcology/singleton.ts"
import { placeRhythmRepository } from "./singleton.ts"
import { VRINDAVAN_DAILY_RHYTHMS_BY_ARCHETYPE_ID, VRINDAVAN_DAY_PHASE_SCHEDULE } from "./vrindavanRhythmsDefinition.ts"

const defaultNow = () => new Date().toISOString()

const RELATIONSHIP_TYPES: RelationshipType[] = ["PARENT_OFFSPRING", "GROUP_MEMBER", "FAMILIAR", "PREFERRED_ASSOCIATE"]

// Sprint 13, Phase 11: a deliberate, small restatement of Sprint 12's
// own private `listAllRelationships` helper (lib/socialEcology/hostService.ts)
// -- reads `relationshipRepository` directly (an exported singleton),
// never a modification to Social Ecology's own file, matching the
// "additive, never edit a prior sprint's module" discipline this whole
// domain already holds.
async function listAllRelationships(worldInstanceId: string): Promise<RelationshipState[]> {
  const lists = await Promise.all(RELATIONSHIP_TYPES.map((type) => relationshipRepository.listByType(worldInstanceId, type)))
  return lists.flat()
}

const ROUTINE_ENTRIES_BY_ARCHETYPE_ID: ReadonlyMap<string, RoutineWindowInput[]> = new Map(
  [...VRINDAVAN_DAILY_RHYTHMS_BY_ARCHETYPE_ID.entries()].map(([archetypeId, definition]) => [archetypeId, definition.entries]),
)

function resolveDayPhaseForTick(tick: number): DayPhase {
  return resolveDayPhase(VRINDAVAN_DAY_PHASE_SCHEDULE, tick)
}

export interface WakeWorldWithRhythmsResult {
  social: WakeWorldWithSocialEcologyResult
  dayPhase: DayPhase
}

// Sprint 13, Phase 2/6/10: the one place Sprint 9's world catch-up
// through Sprint 12's own social-ecology wake are all driven by the
// SAME wake, now day-phase/routine-aware, PLUS records one bounded
// PlaceRhythmProfile observation per currently-occupied location (see
// docs/SPRINT13_GROUND_TRUTH.md's decision 4: a small counter, never an
// event log). Idempotent-replay guarded the same way every prior
// sprint's own evidence-accrual already is (`afterTick >
// lastUpdatedTick`) -- waking twice at the identical instant never
// double-counts an observation.
export async function wakeWorldWithRhythms(worldInstanceId: string, ownerId: string, now: () => string = defaultNow): Promise<WakeWorldWithRhythmsResult> {
  const social = await wakeWorldWithSocialEcology(worldInstanceId, ownerId, now, resolveDayPhaseForTick, ROUTINE_ENTRIES_BY_ARCHETYPE_ID)

  const afterTick = social.memory.world.state.sharedState.clock.tick
  const dayPhase = resolveDayPhaseForTick(afterTick)
  const populationEntities = social.memory.population.populationEntities
  const behaviorByEntityId = new Map(social.memory.population.behaviorStates.map((s) => [s.entityId, s]))
  const locationIds = [...new Set(populationEntities.map((e) => e.locationId))]

  for (const locationId of locationIds) {
    const existing = await placeRhythmRepository.get(worldInstanceId, locationId)
    if (existing && afterTick <= existing.lastUpdatedTick) continue

    const entitiesHere = populationEntities
      .filter((e) => e.locationId === locationId)
      .map((e) => ({ entityId: e.id, archetypeId: e.archetypeId, activity: behaviorByEntityId.get(e.id)?.activity ?? "REMAIN", groupId: behaviorByEntityId.get(e.id)?.groupId ?? null }))
    const occupancy = resolvePlaceOccupancy(locationId, entitiesHere, afterTick)
    await placeRhythmRepository.recordObservation(worldInstanceId, locationId, dayPhase, occupancy.occupancyLevel, afterTick)
  }

  return { social, dayPhase }
}

// Sprint 13, Phase 9: reconstructed FRESH from the live population
// snapshot every call -- no repository, no `save` (see
// docs/SPRINT13_GROUND_TRUTH.md's decision 3).
export async function getPlaceOccupancy(worldInstanceId: string, locationId: string, now: () => string = defaultNow): Promise<PlaceOccupancy> {
  const population = await getPopulationSnapshot(worldInstanceId, now)
  const entitiesHere = population.entities.filter((e) => e.locationId === locationId).map((e) => ({ entityId: e.entityId, archetypeId: e.archetypeId, activity: e.activity, groupId: e.groupId }))
  return resolvePlaceOccupancy(locationId, entitiesHere, population.tick)
}

// Sprint 13, Phase 7: a Host-COMPOSED READ over the group's own
// members' current activities -- never a write back into GroupState
// (see docs/SPRINT13_GROUND_TRUTH.md's decision 6).
export async function getGroupRoutineIntent(worldInstanceId: string, groupId: string, now: () => string = defaultNow): Promise<GroupRoutineIntent> {
  const population = await getPopulationSnapshot(worldInstanceId, now)
  const group = population.groups.find((g) => g.id === groupId)
  if (!group) throw new Error(`Unknown group: ${groupId}`)
  const memberActivities = group.memberEntityIds.map((entityId) => population.entities.find((e) => e.entityId === entityId)?.activity).filter((activity): activity is NonNullable<typeof activity> => Boolean(activity))
  return resolveGroupRoutineIntent(group, memberActivities, population.tick)
}

// Sprint 13, Phase 4: resolved fresh from current environment state --
// no repository, no `save` (see docs/SPRINT13_GROUND_TRUTH.md's decision
// 2 -- this is a deliberate restatement of perception.ts's own gating
// rule, extended with "rest"/"corridor").
export async function getResourceOpportunities(worldInstanceId: string, now: () => string = defaultNow): Promise<ResourceOpportunity[]> {
  const state = await getWorldState(worldInstanceId, now)
  return resolveResourceOpportunities(VRINDAVAN_RESOURCE_AFFORDANCES, state.sharedState.environment, state.sharedState.clock.tick)
}

// Sprint 13, Phase 11: reuses Sprint 12's own relationship/separation
// facts directly -- no new relationship mechanic (see
// docs/SPRINT13_GROUND_TRUTH.md's decision 5).
export async function getSocialInteractionOpportunities(worldInstanceId: string, now: () => string = defaultNow): Promise<SocialInteractionOpportunity[]> {
  const population = await getPopulationSnapshot(worldInstanceId, now)
  const relationships = await listAllRelationships(worldInstanceId)
  const entityLocationsById = new Map(population.entities.map((e) => [e.entityId, e.locationId]))

  const separatedRelationshipIds = new Set<string>()
  for (const relationship of relationships) {
    const active = await separationRepository.getActive(worldInstanceId, "RELATIONSHIP", relationship.id)
    if (active) separatedRelationshipIds.add(relationship.id)
  }

  return resolveSocialInteractionOpportunities({ relationships, entityLocationsById, separatedRelationshipIds, tick: population.tick })
}

export interface LocationRhythmSummary {
  dayPhase: DayPhase
  placeOccupancy: PlaceOccupancy
  groupRoutineIntents: GroupRoutineIntent[]
  resourceOpportunities: ResourceOpportunity[]
}

export interface WorldEmbodimentSnapshotWithRhythms {
  embodimentWithSocialEcology: WorldEmbodimentSnapshotWithSocialEcology
  rhythms: LocationRhythmSummary
}

// Sprint 13, Phase 5: Host-level composition ONLY, one layer above
// Sprint 12's own WorldEmbodimentSnapshotWithSocialEcology -- never a
// fourth widening of @avatark/world-embodiment-contracts (Sprint 10
// widened it once; Sprint 11 and 12 both declined to widen it further;
// this sprint holds the same line a third time). The renderer receives
// this projection; it never queries placeRhythmRepository/
// relationshipRepository/etc itself.
export async function getEmbodimentWithRhythms(worldInstanceId: string, userId: string, locationId: string, reachableLocationIds: string[], sinceTick: number | null, now: () => string = defaultNow): Promise<WorldEmbodimentSnapshotWithRhythms> {
  const embodimentWithSocialEcology = await getEmbodimentWithSocialEcology(worldInstanceId, userId, locationId, reachableLocationIds, sinceTick, now)
  const state = await getWorldState(worldInstanceId, now)
  const dayPhase = resolveDayPhaseForTick(state.sharedState.clock.tick)

  const placeOccupancy = await getPlaceOccupancy(worldInstanceId, locationId, now)
  const population = await getPopulationSnapshot(worldInstanceId, now)
  const groupsHere = population.groups.filter((g) => g.locationId === locationId)
  const groupRoutineIntents = await Promise.all(groupsHere.map((g) => getGroupRoutineIntent(worldInstanceId, g.id, now)))
  const resourceOpportunities = (await getResourceOpportunities(worldInstanceId, now)).filter((o) => o.locationId === locationId)

  return { embodimentWithSocialEcology, rhythms: { dayPhase, placeOccupancy, groupRoutineIntents, resourceOpportunities } }
}
