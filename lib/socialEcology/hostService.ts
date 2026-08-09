import type { RelationshipState, RelationshipType, FamiliarityState, SeparationState, SocialPerception } from "@avatark/social-ecology-contracts"
import { evaluateSeparationTransition, evolveFamiliarity, evolveRelationshipEvidence, deriveRelationshipBand, resolvePlaceAttachment, resolveSocialPerception } from "@avatark/social-ecology-runtime"
import type { EntityMemoryEntry, WorldEvent } from "@avatark/world-memory-contracts"
import { deriveEntityMemoryEntries, deriveWorldEvents } from "@avatark/world-memory-runtime"
import type { DayPhaseInput, RoutineWindowInput } from "@avatark/living-population-runtime"
import { getEmbodimentWithHistory, wakeWorldWithMemory } from "../worldMemory/hostService.ts"
import type { WakeWorldWithMemoryResult, WorldEmbodimentSnapshotWithHistory } from "../worldMemory/hostService.ts"
import { entityMemoryRepository, worldEventRepository } from "../worldMemory/singleton.ts"
import { VRINDAVAN_SIGNIFICANCE_CONFIG } from "../worldMemory/vrindavanMemoryDefinition.ts"
import { getPopulationSnapshot } from "../livingPopulation/hostService.ts"
import { familiarityRepository, groupMembershipRepository, homeRangeRepository, relationshipRepository, separationRepository } from "./singleton.ts"
import { initialVrindavanGroupMemberships, initialVrindavanHomeRanges, initialVrindavanRelationships } from "./vrindavanSocialDefinition.ts"

const defaultNow = () => new Date().toISOString()

const RELATIONSHIP_TYPES: RelationshipType[] = ["PARENT_OFFSPRING", "GROUP_MEMBER", "FAMILIAR", "PREFERRED_ASSOCIATE"]

// Sprint 12, Phase 4/5: idempotent, ensureSeeded-style seeding -- the
// exact same "seed once, no-op on every subsequent wake" discipline
// every prior sprint's own Host layer already uses.
async function ensureSeeded(worldInstanceId: string): Promise<void> {
  const existing = await relationshipRepository.listByType(worldInstanceId, "PARENT_OFFSPRING")
  if (existing.length > 0) return
  for (const relationship of initialVrindavanRelationships(worldInstanceId)) await relationshipRepository.save(relationship)
  for (const membership of initialVrindavanGroupMemberships(worldInstanceId)) await groupMembershipRepository.save(membership)
  for (const homeRange of initialVrindavanHomeRanges(worldInstanceId)) await homeRangeRepository.save(homeRange)
}

async function listAllRelationships(worldInstanceId: string): Promise<RelationshipState[]> {
  const lists = await Promise.all(RELATIONSHIP_TYPES.map((type) => relationshipRepository.listByType(worldInstanceId, type)))
  return lists.flat()
}

// Sprint 12, Phase 16: a STATIC map (which entity is related to which),
// resolved once before advancing -- the exact same "resolved before
// the tick range it informs" discipline Sprint 11's own memoryHint
// already established. The DYNAMIC part (where that related entity
// currently is) is recomputed fresh inside the population tick loop
// itself (see living-population-runtime's populationSimulation.ts),
// never precomputed here.
function buildRelatedEntityIdsByEntityId(relationships: RelationshipState[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const relationship of relationships) {
    map.set(relationship.entityAId, [...(map.get(relationship.entityAId) ?? []), relationship.entityBId])
    map.set(relationship.entityBId, [...(map.get(relationship.entityBId) ?? []), relationship.entityAId])
  }
  return map
}

async function buildHomeRangeLocationIdsByOwnerId(worldInstanceId: string, groupIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  for (const groupId of groupIds) {
    const range = await homeRangeRepository.get(worldInstanceId, "GROUP", groupId)
    if (range) map.set(groupId, range.preferredLocationIds)
  }
  return map
}

export interface WakeWorldWithSocialEcologyResult {
  memory: WakeWorldWithMemoryResult
  relationships: RelationshipState[]
  familiarityStates: FamiliarityState[]
  activeSeparations: SeparationState[]
  socialWorldEvents: WorldEvent[]
  socialEntityMemoryEntries: EntityMemoryEntry[]
}

// Sprint 12, Phase 9/10/12/16: the one place Sprint 9's world catch-up,
// Sprint 10's population catch-up (now social-context-aware), Sprint
// 11's memory derivation, AND Sprint 12's own relationship/familiarity/
// separation-reunion detection are all driven by the SAME wake --
// mirroring wakeWorldWithMemory's own composition posture one layer up
// (additive, never replacing).
//
// Familiarity/relationship evidence accumulates ONCE PER WAKE CALL (at
// most one tick of evidence per call, based on the end-of-catch-up
// state), not once per simulated tick within a multi-tick catch-up --
// the same before/after-only comparison discipline Sprint 11 already
// used for its own significance derivation, not a bug. A deliberate,
// documented Host-layer scope choice.
export async function wakeWorldWithSocialEcology(
  worldInstanceId: string,
  ownerId: string,
  now: () => string = defaultNow,
  resolveDayPhaseForTick?: (tick: number) => DayPhaseInput | null,
  routineEntriesByArchetypeId?: ReadonlyMap<string, RoutineWindowInput[]>,
): Promise<WakeWorldWithSocialEcologyResult> {
  await ensureSeeded(worldInstanceId)

  const beforePopulation = await getPopulationSnapshot(worldInstanceId, now)
  const relationships = await listAllRelationships(worldInstanceId)
  const relatedEntityIdsByEntityId = buildRelatedEntityIdsByEntityId(relationships)
  const groupIds = beforePopulation.groups.map((group) => group.id)
  const homeRangeLocationIdsByOwnerId = await buildHomeRangeLocationIdsByOwnerId(worldInstanceId, groupIds)

  // Sprint 13, Phase 6: an optional pass-through only -- living rhythms'
  // own day-phase/routine facts feed into the SAME population advance
  // call World Memory/Social Ecology already drive, never a second/
  // competing advance. Every existing caller that omits these two params
  // (this whole file's own pre-Sprint-13 behavior) is unaffected.
  const memory = await wakeWorldWithMemory(worldInstanceId, ownerId, now, relatedEntityIdsByEntityId, homeRangeLocationIdsByOwnerId, resolveDayPhaseForTick, routineEntriesByArchetypeId)

  const afterTick = memory.world.state.sharedState.clock.tick
  const afterPopulation = memory.population
  const locationByEntityId = new Map(afterPopulation.populationEntities.map((entity) => [entity.id, entity.locationId]))
  const groupByEntityId = new Map(afterPopulation.groups.flatMap((group) => group.memberEntityIds.map((entityId) => [entityId, group])))

  const separationEvents: { tick: number; entityId: string; subjectType: "RELATIONSHIP" | "GROUP_MEMBERSHIP"; subjectId: string; locationId: string }[] = []
  const reunionEvents: { tick: number; entityId: string; subjectType: "RELATIONSHIP" | "GROUP_MEMBERSHIP"; subjectId: string; locationId: string; separationDurationTicks: number }[] = []

  // Phase 6/9/10: relationship evidence + separation/reunion, one
  // SeparationState per relationship (subjectId = relationship.id).
  // Separation between exactly two entities is inherently symmetric --
  // `entityBId` is recorded as the stable representative side, losing
  // no information (see docs/SPRINT12_GROUND_TRUTH.md addendum).
  const updatedRelationships: RelationshipState[] = []
  for (const relationship of relationships) {
    const locationA = locationByEntityId.get(relationship.entityAId)
    const locationB = locationByEntityId.get(relationship.entityBId)
    if (locationA === undefined || locationB === undefined) {
      updatedRelationships.push(relationship)
      continue
    }

    const coPresentThisTick = locationA === locationB
    const groupA = groupByEntityId.get(relationship.entityAId)
    const groupB = groupByEntityId.get(relationship.entityBId)
    const sharedGroupThisTick = Boolean(groupA && groupB && groupA.id === groupB.id)

    const existingActiveSeparation = await separationRepository.getActive(worldInstanceId, "RELATIONSHIP", relationship.id)
    const transition = evaluateSeparationTransition({
      worldId: worldInstanceId,
      subjectType: "RELATIONSHIP",
      subjectId: relationship.id,
      entityId: relationship.entityBId,
      currentlySeparated: !coPresentThisTick,
      existingActiveSeparation,
      tick: afterTick,
    })
    if (transition.separationState) await separationRepository.save(transition.separationState)
    if (transition.separationState?.active && transition.separationState.separatedSinceTick === afterTick) {
      separationEvents.push({ tick: afterTick, entityId: relationship.entityBId, subjectType: "RELATIONSHIP", subjectId: relationship.id, locationId: locationB })
    }
    if (transition.reunionEvent) {
      reunionEvents.push({ tick: afterTick, entityId: relationship.entityBId, subjectType: "RELATIONSHIP", subjectId: relationship.id, locationId: locationB, separationDurationTicks: transition.reunionEvent.separationDurationTicks })
    }

    // Idempotent-replay guard (Sprint 11's own "waking twice at the
    // identical instant never duplicates" invariant, restated here for
    // evidence): only accrue evidence for a tick that has not already
    // been recorded -- otherwise a same-instant replay (zero elapsed
    // ticks) would double-count co-presence forever.
    if (afterTick <= relationship.lastRelevantTick) {
      updatedRelationships.push(relationship)
      continue
    }

    const evidence = evolveRelationshipEvidence(relationship.evidence, coPresentThisTick, sharedGroupThisTick, Boolean(transition.reunionEvent))
    const updated: RelationshipState = { ...relationship, evidence, band: deriveRelationshipBand(evidence), lastRelevantTick: afterTick }
    await relationshipRepository.save(updated)
    updatedRelationships.push(updated)
  }

  // Phase 9/10: a member separated from its OWN group's location --
  // subjectId disambiguates per (group, member) since multiple members
  // can be independently separated from the same group at once.
  for (const group of afterPopulation.groups) {
    for (const entityId of group.memberEntityIds) {
      const memberLocationId = locationByEntityId.get(entityId)
      if (memberLocationId === undefined) continue
      const subjectId = `${group.id}::${entityId}`
      const currentlySeparated = memberLocationId !== group.locationId
      const existingActiveSeparation = await separationRepository.getActive(worldInstanceId, "GROUP_MEMBERSHIP", subjectId)
      const transition = evaluateSeparationTransition({
        worldId: worldInstanceId,
        subjectType: "GROUP_MEMBERSHIP",
        subjectId,
        entityId,
        currentlySeparated,
        existingActiveSeparation,
        tick: afterTick,
      })
      if (transition.separationState) await separationRepository.save(transition.separationState)
      if (transition.separationState?.active && transition.separationState.separatedSinceTick === afterTick) {
        separationEvents.push({ tick: afterTick, entityId, subjectType: "GROUP_MEMBERSHIP", subjectId, locationId: memberLocationId })
      }
      if (transition.reunionEvent) {
        reunionEvents.push({ tick: afterTick, entityId, subjectType: "GROUP_MEMBERSHIP", subjectId, locationId: memberLocationId, separationDurationTicks: transition.reunionEvent.separationDurationTicks })
      }
    }
  }

  // Phase 3/6: familiarity is bounded to entities actually present in
  // this world's own live population roster, evolved only on a tick
  // that actually produced co-presence or shared-group evidence --
  // never a no-op save.
  const allEntityIds = afterPopulation.populationEntities.map((entity) => entity.id)
  const updatedFamiliarityStates: FamiliarityState[] = []
  for (let i = 0; i < allEntityIds.length; i++) {
    for (let j = i + 1; j < allEntityIds.length; j++) {
      const entityAId = allEntityIds[i]
      const entityBId = allEntityIds[j]
      const coPresentThisTick = locationByEntityId.get(entityAId) === locationByEntityId.get(entityBId)
      const groupA = groupByEntityId.get(entityAId)
      const groupB = groupByEntityId.get(entityBId)
      const sharedGroupThisTick = Boolean(groupA && groupB && groupA.id === groupB.id)
      if (!coPresentThisTick && !sharedGroupThisTick) continue

      const current = await familiarityRepository.get(worldInstanceId, entityAId, entityBId)
      // Same idempotent-replay guard as relationship evidence above.
      if (current && afterTick <= current.lastUpdatedTick) continue

      const updated = evolveFamiliarity(worldInstanceId, entityAId, entityBId, current, coPresentThisTick, sharedGroupThisTick, afterTick)
      await familiarityRepository.save(updated)
      updatedFamiliarityStates.push(updated)
    }
  }

  // Phase 12: reuse the SAME deriveWorldEvents/deriveEntityMemoryEntries
  // pipeline wakeWorldWithMemory already drove -- a second, targeted
  // pass over just this wake's own separation/reunion facts, appended
  // to the SAME repositories, never a competing derivation engine.
  const socialWorldEvents = deriveWorldEvents({
    worldId: worldInstanceId,
    now,
    seasonTransitions: [],
    environmentalBandChanges: [],
    locationConditionChanges: [],
    populationEvents: [],
    encounterAvailabilityChanges: [],
    separationEvents,
    reunionEvents,
    significanceConfig: VRINDAVAN_SIGNIFICANCE_CONFIG,
  })
  for (const event of socialWorldEvents) await worldEventRepository.append(event)
  const socialEntityMemoryEntries = deriveEntityMemoryEntries(worldInstanceId, socialWorldEvents)
  for (const entry of socialEntityMemoryEntries) await entityMemoryRepository.append(entry)

  const activeSeparationsNested = await Promise.all(allEntityIds.map((entityId) => separationRepository.listActiveByEntity(worldInstanceId, entityId)))
  const activeSeparations = activeSeparationsNested.flat()

  return { memory, relationships: updatedRelationships, familiarityStates: updatedFamiliarityStates, activeSeparations, socialWorldEvents, socialEntityMemoryEntries }
}

// Sprint 12, Phase 8: the live bounded-perception surface for one
// entity -- every fact resolved from already-authoritative
// relationship/group/familiarity/home-range state, never a second
// simulation.
export async function getSocialPerception(worldInstanceId: string, entityId: string, now: () => string = defaultNow): Promise<SocialPerception> {
  await ensureSeeded(worldInstanceId)

  const population = await getPopulationSnapshot(worldInstanceId, now)
  const entity = population.entities.find((e) => e.entityId === entityId)
  if (!entity) throw new Error(`Unknown population entity: ${entityId}`)

  const relationships = (await listAllRelationships(worldInstanceId)).filter((r) => r.entityAId === entityId || r.entityBId === entityId)
  const familiarityStates = await familiarityRepository.listByEntity(worldInstanceId, entityId)
  const entityLocationsById = new Map(population.entities.map((e) => [e.entityId, e.locationId]))

  const group = population.groups.find((g) => g.memberEntityIds.includes(entityId)) ?? null
  const homeRange = group ? await homeRangeRepository.get(worldInstanceId, "GROUP", group.id) : null
  const placeAttachment = resolvePlaceAttachment("GROUP", group?.id ?? entityId, entity.locationId, homeRange)

  const separationSubjectId = group ? `${group.id}::${entityId}` : null
  const activeSeparation = separationSubjectId ? await separationRepository.getActive(worldInstanceId, "GROUP_MEMBERSHIP", separationSubjectId) : null

  return resolveSocialPerception({
    entityId,
    currentLocationId: entity.locationId,
    entityLocationsById,
    relationships,
    familiarityStates,
    groupId: group?.id ?? null,
    groupMemberEntityIds: group?.memberEntityIds ?? [],
    groupLocationId: group?.locationId ?? null,
    withinHomeRange: placeAttachment.withinHomeRange,
    separationActive: Boolean(activeSeparation),
  })
}

export interface LocationSocialSummary {
  locationId: string
  relationshipsPresent: { relationshipId: string; entityAId: string; entityBId: string; relationshipType: RelationshipType; band: RelationshipState["band"] }[]
  activeSeparationsVisible: SeparationState[]
}

// Sprint 12, Phase 24/25: the visitor has no EntityId of their own in
// the population roster, so the embodiment-facing social projection is
// LOCATION-scoped, not entity-scoped -- "what social facts are
// observable here" rather than getSocialPerception's own
// entity-centric "what does THIS entity perceive."
async function getLocationSocialSummary(worldInstanceId: string, locationId: string, now: () => string = defaultNow): Promise<LocationSocialSummary> {
  await ensureSeeded(worldInstanceId)
  const population = await getPopulationSnapshot(worldInstanceId, now)
  const presentEntityIds = new Set(population.entities.filter((e) => e.locationId === locationId).map((e) => e.entityId))

  const relationships = await listAllRelationships(worldInstanceId)
  const relationshipsPresent = relationships
    .filter((r) => presentEntityIds.has(r.entityAId) && presentEntityIds.has(r.entityBId))
    .map((r) => ({ relationshipId: r.id, entityAId: r.entityAId, entityBId: r.entityBId, relationshipType: r.relationshipType, band: r.band }))

  const separationsNested = await Promise.all([...presentEntityIds].map((entityId) => separationRepository.listActiveByEntity(worldInstanceId, entityId)))
  const activeSeparationsVisible = separationsNested.flat()

  return { locationId, relationshipsPresent, activeSeparationsVisible }
}

export interface WorldEmbodimentSnapshotWithSocialEcology {
  embodimentWithHistory: WorldEmbodimentSnapshotWithHistory
  social: LocationSocialSummary
}

// Sprint 12, Phase 24/25: Host-level composition ONLY, one layer above
// Sprint 11's own WorldEmbodimentSnapshotWithHistory -- never a fourth
// widening of @avatark/world-embodiment-contracts (see
// docs/SPRINT12_GROUND_TRUTH.md's ownership map: "no third widening,"
// now held for a second sprint running). The renderer receives this
// projection; it never queries relationshipRepository/separationRepository
// itself.
export async function getEmbodimentWithSocialEcology(worldInstanceId: string, userId: string, locationId: string, reachableLocationIds: string[], sinceTick: number | null, now: () => string = defaultNow): Promise<WorldEmbodimentSnapshotWithSocialEcology> {
  const embodimentWithHistory = await getEmbodimentWithHistory(worldInstanceId, userId, locationId, reachableLocationIds, sinceTick, now)
  const social = await getLocationSocialSummary(worldInstanceId, locationId, now)
  return { embodimentWithHistory, social }
}
