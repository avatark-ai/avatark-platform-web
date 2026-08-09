import type { EncounterRecord } from "@avatark/encounter-realization-contracts"
import { deriveConsequences, deriveEncounterRecordId, resolveEncounterRealization } from "@avatark/encounter-realization-runtime"
import { deriveDeterministicVariation } from "@avatark/living-systems-contracts"
import { resolveResourceOpportunities } from "@avatark/living-rhythms-runtime"
import type { BehaviorType, GroupId } from "@avatark/living-population-contracts"
import type { RelationshipBand, RelationshipState } from "@avatark/social-ecology-contracts"
import { deriveEntityMemoryEntries, deriveWorldEvents, recordEncounterResolved } from "@avatark/world-memory-runtime"
import { getEmbodimentWithRhythms, wakeWorldWithRhythms } from "../livingRhythms/hostService.ts"
import type { WakeWorldWithRhythmsResult, WorldEmbodimentSnapshotWithRhythms } from "../livingRhythms/hostService.ts"
import { applyEncounterEvidence } from "../socialEcology/hostService.ts"
import { relationshipRepository } from "../socialEcology/singleton.ts"
import { protectedNarrativeStateRepository } from "../livingSystems/singleton.ts"
import { VRINDAVAN_RESOURCE_AFFORDANCES } from "../livingPopulation/vrindavanPopulationDefinition.ts"
import { entityMemoryRepository, encounterHistoryRepository, worldEventRepository } from "../worldMemory/singleton.ts"
import { VRINDAVAN_SIGNIFICANCE_CONFIG } from "../worldMemory/vrindavanMemoryDefinition.ts"
import { encounterRecordRepository } from "./singleton.ts"

const defaultNow = () => new Date().toISOString()

const RELATIONSHIP_TYPES: RelationshipState["relationshipType"][] = ["PARENT_OFFSPRING", "GROUP_MEMBER", "FAMILIAR", "PREFERRED_ASSOCIATE"]

// Sprint 14: the SAME small restatement of Sprint 12's own private
// `listAllRelationships` helper that Sprint 13's `lib/livingRhythms/hostService.ts`
// already uses -- reads the exported `relationshipRepository` singleton
// directly, never a modification to Social Ecology's own file.
async function listAllRelationships(worldInstanceId: string): Promise<RelationshipState[]> {
  const lists = await Promise.all(RELATIONSHIP_TYPES.map((type) => relationshipRepository.listByType(worldInstanceId, type)))
  return lists.flat()
}

// A restatement of `resolvePlaceOccupancy`'s own MOVEMENT_TYPES set
// (living-rhythms-runtime) -- see docs/SPRINT14_GROUND_TRUTH.md's
// realization-algorithm section for why this is a deliberate,
// documented duplication, not an oversight (encounter-realization-runtime
// cannot import a sibling runtime package).
const MOVEMENT_TYPES = new Set<BehaviorType>(["MOVE_TO_RESOURCE", "FOLLOW_GROUP", "RETURN_TO_GROUP", "APPROACH_RELATED_ENTITY", "RETURN_TO_HOME_RANGE"])

const BAND_STRENGTH: Record<RelationshipBand, number> = { WEAK: 0, ESTABLISHED: 1, STRONG: 2 }

function strongestBand(bands: RelationshipBand[]): RelationshipBand | null {
  if (bands.length === 0) return null
  return bands.reduce((strongest, band) => (BAND_STRENGTH[band] > BAND_STRENGTH[strongest] ? band : strongest))
}

export interface WakeWorldWithEncounterRealizationResult {
  rhythms: WakeWorldWithRhythmsResult
  // Every EncounterRecord touched THIS wake, in whatever terminal (or
  // already-existing, on a replay) state it reached -- REALIZED
  // opportunities are already at CONSEQUENCES_APPLIED by the time this
  // returns.
  encounterRecords: EncounterRecord[]
}

// Sprint 14, Phase 6/7/8/9: the one place Sprint 7's causal engine
// through Sprint 13's own rhythms wake are all driven by the SAME wake,
// now also resolving every currently-AVAILABLE EncounterOpportunity to
// a terminal realization status and applying its consequences. Composes
// `wakeWorldWithRhythms` (Sprint 13's own top-of-stack), never bypasses
// it -- this file adds a realization pass ON TOP, the same layering
// discipline every prior sprint's own Host service already holds.
//
// Idempotency: each opportunity's own content-derived EncounterRecord
// id (see @avatark/encounter-realization-runtime's own
// `deriveEncounterRecordId`) is looked up BEFORE doing any work; if it
// already exists (a replayed wake recomputing the identical tick range),
// the existing record is returned unchanged and NOTHING is
// re-derived/re-applied -- see docs/SPRINT14_GROUND_TRUTH.md's
// replay/idempotency section.
export async function wakeWorldWithEncounterRealization(worldInstanceId: string, ownerId: string, now: () => string = defaultNow): Promise<WakeWorldWithEncounterRealizationResult> {
  const rhythms = await wakeWorldWithRhythms(worldInstanceId, ownerId, now)

  const afterShared = rhythms.social.memory.world.state.sharedState
  const afterTick = afterShared.clock.tick
  const afterPopulation = rhythms.social.memory.population

  const protectedNarrative = await protectedNarrativeStateRepository.get(worldInstanceId)
  const behaviorByEntityId = new Map(afterPopulation.behaviorStates.map((s) => [s.entityId, s]))
  const groupByEntityId = new Map<string, { id: GroupId; cohesion: number }>(afterPopulation.groups.flatMap((g) => g.memberEntityIds.map((entityId) => [entityId, { id: g.id, cohesion: g.cohesion }])))
  const relationships = await listAllRelationships(worldInstanceId)
  const resourceOpportunities = resolveResourceOpportunities(VRINDAVAN_RESOURCE_AFFORDANCES, afterShared.environment, afterTick)

  const records: EncounterRecord[] = []

  for (const opportunity of afterPopulation.encounterOpportunities) {
    const id = deriveEncounterRecordId(worldInstanceId, opportunity.ruleId, opportunity.locationId, opportunity.contributingEntityIds, opportunity.tick)

    const existing = await encounterRecordRepository.get(worldInstanceId, id)
    if (existing) {
      records.push(existing)
      continue
    }

    const presentEntityIds = afterPopulation.populationEntities.filter((e) => e.locationId === opportunity.locationId).map((e) => e.id)
    const routineCompatibleEntityIds = presentEntityIds.filter((entityId) => {
      const activity = behaviorByEntityId.get(entityId)?.activity
      return activity !== undefined && !MOVEMENT_TYPES.has(activity)
    })

    const groupsInvolved = [...new Set(opportunity.contributingEntityIds.map((entityId) => groupByEntityId.get(entityId)?.id).filter((groupId): groupId is GroupId => groupId !== undefined))]
    // Group cohesion is only meaningful when every contributing entity
    // shares the SAME one group -- a cross-group opportunity has no
    // single group's cohesion to consult.
    const groupCohesion = groupsInvolved.length === 1 ? groupByEntityId.get(opportunity.contributingEntityIds[0])?.cohesion ?? null : null

    const relevantRelationships = relationships.filter((r) => opportunity.contributingEntityIds.includes(r.entityAId) && opportunity.contributingEntityIds.includes(r.entityBId))
    const relationshipBand = strongestBand(relevantRelationships.map((r) => r.band))

    // A coarse, honest signal -- "does this place currently afford
    // anything at all" -- rather than a precise EncounterCategory ->
    // ResourceTag mapping, which no existing contract defines (see
    // docs/SPRINT14_GROUND_TRUTH.md's realization-algorithm section).
    const resourceOpportunityAvailable = resourceOpportunities.some((o) => o.locationId === opportunity.locationId && o.available)

    const variation = deriveDeterministicVariation({ worldId: worldInstanceId, worldVersion: afterShared.worldVersion, tick: afterTick, locationId: opportunity.locationId, seasonId: afterShared.season.currentSeasonId, seed: worldInstanceId })

    const result = resolveEncounterRealization({ opportunity, protectedNarrative, presentEntityIds, routineCompatibleEntityIds, groupCohesion, relationshipBand, resourceOpportunityAvailable, variation })

    let record: EncounterRecord = {
      id,
      worldId: worldInstanceId,
      ruleId: opportunity.ruleId,
      category: opportunity.category,
      locationId: opportunity.locationId,
      participantEntityIds: opportunity.contributingEntityIds,
      participantGroupIds: groupsInvolved,
      startTick: opportunity.tick,
      realizationTick: result.status === "REALIZED" ? afterTick : null,
      completionTick: null,
      status: result.status,
      causalReferences: result.causalReferences,
      relationshipContext: relevantRelationships.map((r) => ({ relationshipId: r.id, relationshipType: r.relationshipType, band: r.band })),
      protectedNarrativeGateOpen: opportunity.category !== "narrative-protected" || protectedNarrative.resolved,
      worldEventId: null,
      encounterHistoryEntryId: null,
      variationConsulted: result.variationConsulted,
    }
    await encounterRecordRepository.save(record)

    if (result.status === "REALIZED") {
      const consequences = deriveConsequences({ status: result.status, ruleId: opportunity.ruleId, locationId: opportunity.locationId, participantEntityIds: opportunity.contributingEntityIds, relationshipIdsInvolved: relevantRelationships.map((r) => r.id) })
      const worldMemoryConsequences = consequences.filter((c) => c.domain === "WORLD_MEMORY").map((c) => c.worldConsequence)
      const relationshipConsequences = consequences.filter((c) => c.domain === "RELATIONSHIP")

      const worldEvents = deriveWorldEvents({
        worldId: worldInstanceId,
        now,
        seasonTransitions: [],
        environmentalBandChanges: [],
        locationConditionChanges: [],
        populationEvents: [],
        encounterAvailabilityChanges: [],
        resolvedEncounters: [{ tick: afterTick, ruleId: opportunity.ruleId, locationId: opportunity.locationId, category: opportunity.category, participantEntityIds: opportunity.contributingEntityIds, causalReferences: result.causalReferences, consequences: worldMemoryConsequences }],
        significanceConfig: VRINDAVAN_SIGNIFICANCE_CONFIG,
      })
      for (const event of worldEvents) await worldEventRepository.append(event)
      const entityMemoryEntries = deriveEntityMemoryEntries(worldInstanceId, worldEvents)
      for (const entry of entityMemoryEntries) await entityMemoryRepository.append(entry)

      // Applies through Social Ecology's own sole write boundary --
      // never a second relationship-mutation authority (see
      // lib/socialEcology/hostService.ts's own applyEncounterEvidence
      // doc comment).
      for (const consequence of relationshipConsequences) await applyEncounterEvidence(worldInstanceId, consequence.relationshipId, afterTick)

      // Finally calls the two-sprint-dormant recordEncounterResolved --
      // Sprint 11's own EncounterHistoryEntry.RESOLVED status is
      // populated for the first time here.
      const historyEntry = recordEncounterResolved(worldInstanceId, { ruleId: opportunity.ruleId, locationId: opportunity.locationId, category: opportunity.category, contributingEntityIds: opportunity.contributingEntityIds, tick: afterTick }, afterTick)
      await encounterHistoryRepository.append(historyEntry)

      record = { ...record, status: "CONSEQUENCES_APPLIED", completionTick: afterTick, worldEventId: worldEvents[0]?.id ?? null, encounterHistoryEntryId: historyEntry.id }
      await encounterRecordRepository.save(record)
    }

    records.push(record)
  }

  return { rhythms, encounterRecords: records }
}

// Sprint 14: a Host-composed read -- no repository lookup happens
// outside this file's own `encounterRecordRepository` singleton; the
// renderer/embodiment layer receives records through this function or
// the embodiment wrapper below, never by importing the singleton
// itself.
export async function getEncounterRecords(worldInstanceId: string, locationId: string): Promise<EncounterRecord[]> {
  return encounterRecordRepository.listByLocation(worldInstanceId, locationId)
}

export interface WorldEmbodimentSnapshotWithEncounterRealization {
  embodimentWithRhythms: WorldEmbodimentSnapshotWithRhythms
  encounterRecords: EncounterRecord[]
}

// Sprint 14: Host-level composition ONLY, one layer above Sprint 13's
// own WorldEmbodimentSnapshotWithRhythms -- never a FOURTH widening of
// @avatark/world-embodiment-contracts (Sprint 10 widened it once;
// Sprint 11/12/13 each declined to widen it further; this sprint holds
// the same line a fourth time). The renderer receives this projection;
// it never queries encounterRecordRepository itself.
export async function getEmbodimentWithEncounterRealization(worldInstanceId: string, userId: string, locationId: string, reachableLocationIds: string[], sinceTick: number | null, now: () => string = defaultNow): Promise<WorldEmbodimentSnapshotWithEncounterRealization> {
  const embodimentWithRhythms = await getEmbodimentWithRhythms(worldInstanceId, userId, locationId, reachableLocationIds, sinceTick, now)
  const encounterRecords = await getEncounterRecords(worldInstanceId, locationId)
  return { embodimentWithRhythms, encounterRecords }
}
