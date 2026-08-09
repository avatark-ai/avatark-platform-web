import type { EncounterCategory, EncounterRuleId, EntityId } from "@avatark/living-systems-contracts"
import type { LocationId, WorldId } from "@avatark/runtime-contracts"
import type { PopulationEvent } from "@avatark/living-population-contracts"
import type { WorldConsequence, WorldEvent } from "@avatark/world-memory-contracts"
import { deriveMemoryRecordId } from "./eventIdentity.ts"
import { evaluateSignificance } from "./significance.ts"
import type { SignificanceConfig, WorldEventCandidate } from "./significance.ts"
import { initialRetentionTier } from "./retentionPolicy.ts"

// Sprint 11, Phase 2/4: World Memory REACTS to structured deltas -- it
// never recomputes simulation facts itself. Every input field here is
// something the Host layer already knows from Living Systems (Sprint 7),
// Population (Sprint 10), or the embodiment/encounter layer (Sprint 8/10)
// -- this function's only job is filtering that raw truth through
// evaluateSignificance and, for what survives, attaching structured
// causal provenance and data-driven consequences.
export interface DeriveWorldEventsParams {
  worldId: WorldId
  now: () => string
  seasonTransitions: { tick: number; fromSeasonId: string; toSeasonId: string }[]
  environmentalBandChanges: { tick: number; band: string; fromBand: string; toBand: string }[]
  locationConditionChanges: { tick: number; locationId: LocationId; category: string; wasAvailable: boolean; isAvailable: boolean; entityIdsPresent: EntityId[] }[]
  populationEvents: PopulationEvent[]
  encounterAvailabilityChanges: { tick: number; ruleId: EncounterRuleId; locationId: LocationId; category: EncounterCategory; becameAvailable: boolean; contributingEntityIds: EntityId[] }[]
  // Sprint 12, Phase 12: separation/reunion candidates -- built by
  // @avatark/social-ecology-runtime's own co-location-based detection,
  // handed here as plain structured facts, same discipline as every
  // other input field. `subjectId` is a RelationshipId or
  // GroupMembershipId; this package never interprets it, only carries
  // it through as a causal reference.
  separationEvents?: { tick: number; entityId: EntityId; subjectType: "RELATIONSHIP" | "GROUP_MEMBERSHIP"; subjectId: string; locationId: LocationId }[]
  reunionEvents?: { tick: number; entityId: EntityId; subjectType: "RELATIONSHIP" | "GROUP_MEMBERSHIP"; subjectId: string; locationId: LocationId; separationDurationTicks: number }[]
  significanceConfig?: SignificanceConfig
}

interface Candidate {
  candidate: WorldEventCandidate
  consequences: WorldConsequence[]
}

function buildCandidates(params: DeriveWorldEventsParams): Candidate[] {
  const candidates: Candidate[] = []

  for (const st of params.seasonTransitions) {
    candidates.push({
      candidate: { category: "SEASON_TRANSITION", tick: st.tick, locationId: null, participantEntityIds: [], causalReferences: [{ kind: "season", ref: st.toSeasonId }], detail: { from: st.fromSeasonId, to: st.toSeasonId } },
      consequences: [],
    })
  }

  for (const bc of params.environmentalBandChanges) {
    candidates.push({
      candidate: { category: "ENVIRONMENTAL_THRESHOLD", tick: bc.tick, locationId: null, participantEntityIds: [], causalReferences: [{ kind: "band", ref: `${bc.band}:${bc.toBand}` }], detail: { fromBand: bc.fromBand, toBand: bc.toBand } },
      consequences: [],
    })
  }

  for (const lc of params.locationConditionChanges) {
    candidates.push({
      candidate: {
        category: "LOCATION_CONDITION_CHANGED",
        tick: lc.tick,
        locationId: lc.locationId,
        participantEntityIds: lc.entityIdsPresent,
        causalReferences: [{ kind: "resource", ref: `${lc.category}:${lc.isAvailable ? "available" : "unavailable"}` }],
        detail: { wasAvailable: lc.wasAvailable, isAvailable: lc.isAvailable },
      },
      consequences: [{ type: "LOCATION_HISTORY_MARKER", targetEntityId: null, targetGroupId: null, targetLocationId: lc.locationId, detail: { category: lc.category, available: lc.isAvailable } }],
    })
  }

  const groupRelocations = params.populationEvents.filter((e) => e.type === "group.relocated")
  for (const relocation of groupRelocations) {
    const members = params.populationEvents.filter((e) => e.type === "entity.moved" && e.groupId === relocation.groupId && e.tick === relocation.tick).map((e) => e.entityId).filter((id): id is EntityId => id !== null)

    const consequences: WorldConsequence[] = [
      { type: "LOCATION_HISTORY_MARKER", targetEntityId: null, targetGroupId: relocation.groupId, targetLocationId: relocation.fromLocationId, detail: { reason: "group_departed" } },
      ...members.map((entityId) => ({ type: "RESOURCE_PREFERENCE" as const, targetEntityId: entityId, targetGroupId: null, targetLocationId: relocation.toLocationId, detail: {} })),
      ...members.map((entityId) => ({ type: "GROUP_HISTORY_RELATIONSHIP" as const, targetEntityId: entityId, targetGroupId: relocation.groupId, targetLocationId: null, detail: {} })),
    ]

    candidates.push({
      candidate: {
        category: "POPULATION_MOVEMENT",
        tick: relocation.tick,
        locationId: relocation.toLocationId,
        participantEntityIds: members.length > 0 ? members : relocation.entityId ? [relocation.entityId] : [],
        causalReferences: [{ kind: "group", ref: relocation.groupId ?? "" }],
        detail: { isGroupRelocation: true, from: relocation.fromLocationId ?? "", to: relocation.toLocationId ?? "" },
      },
      consequences,
    })
  }

  for (const ec of params.encounterAvailabilityChanges.filter((e) => e.becameAvailable)) {
    candidates.push({
      candidate: { category: "ENCOUNTER_BECAME_AVAILABLE", tick: ec.tick, locationId: ec.locationId, participantEntityIds: ec.contributingEntityIds, causalReferences: [{ kind: "encounterRule", ref: ec.ruleId }], detail: { ruleId: ec.ruleId } },
      consequences: [{ type: "ENCOUNTER_ELIGIBILITY_CHANGE", targetEntityId: null, targetGroupId: null, targetLocationId: ec.locationId, detail: { ruleId: ec.ruleId, eligible: true } }],
    })
  }

  for (const sep of params.separationEvents ?? []) {
    candidates.push({
      candidate: {
        category: "SEPARATION_OCCURRED",
        tick: sep.tick,
        locationId: sep.locationId,
        participantEntityIds: [sep.entityId],
        causalReferences: [{ kind: sep.subjectType.toLowerCase(), ref: sep.subjectId }],
        detail: { subjectType: sep.subjectType, subjectId: sep.subjectId },
      },
      consequences: [],
    })
  }

  for (const reunion of params.reunionEvents ?? []) {
    candidates.push({
      candidate: {
        category: "REUNION_OCCURRED",
        tick: reunion.tick,
        locationId: reunion.locationId,
        participantEntityIds: [reunion.entityId],
        causalReferences: [{ kind: reunion.subjectType.toLowerCase(), ref: reunion.subjectId }],
        detail: { subjectType: reunion.subjectType, subjectId: reunion.subjectId, separationDurationTicks: reunion.separationDurationTicks },
      },
      consequences: reunion.subjectType === "GROUP_MEMBERSHIP" ? [{ type: "GROUP_HISTORY_RELATIONSHIP", targetEntityId: reunion.entityId, targetGroupId: reunion.subjectId, targetLocationId: reunion.locationId, detail: { event: "reunion" } }] : [],
    })
  }

  return candidates
}

// Sprint 11, Phase 1/2/3: filters every candidate through the
// deterministic significance rule, discarding NOT_SIGNIFICANT ones, and
// stamps each survivor with a content-derived id (Phase 18 idempotency)
// and an initial retention tier (Phase 19).
export function deriveWorldEvents(params: DeriveWorldEventsParams): WorldEvent[] {
  const events: WorldEvent[] = []
  buildCandidates(params).forEach(({ candidate, consequences }, index) => {
    const significance = evaluateSignificance(candidate, params.significanceConfig)
    if (significance === "NOT_SIGNIFICANT") return

    const id = deriveMemoryRecordId(params.worldId, candidate.tick, candidate.category, candidate.causalReferences, candidate.participantEntityIds, index)
    events.push({
      id,
      worldId: params.worldId,
      tick: candidate.tick,
      category: candidate.category,
      locationId: candidate.locationId,
      participantEntityIds: candidate.participantEntityIds,
      causalReferences: candidate.causalReferences,
      consequences,
      significance,
      retentionTier: initialRetentionTier(significance),
      provenance: { derivedFromEventIds: [], derivationRule: candidate.category, causalReferences: candidate.causalReferences },
      occurredAt: params.now(),
    })
  })
  return events
}
