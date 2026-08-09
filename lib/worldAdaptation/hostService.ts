import type { AdaptationDomain, AdaptationEffect, AdaptationPressure, AdaptationSignal, AdaptationSignalKind, WorldAdaptationResult } from "@avatark/world-adaptation-contracts"
import { deriveAdaptationSignals, runWorldAdaptation } from "@avatark/world-adaptation-runtime"
import type { RealizedEncounterSignalInput, ResourceReadingSignalInput } from "@avatark/world-adaptation-runtime"
import { resolveResourceOpportunities } from "@avatark/living-rhythms-runtime"
import type { EntityMemoryEntry } from "@avatark/world-memory-contracts"
import { getEmbodimentWithEncounterRealization, wakeWorldWithEncounterRealization } from "../encounterRealization/hostService.ts"
import type { WakeWorldWithEncounterRealizationResult, WorldEmbodimentSnapshotWithEncounterRealization } from "../encounterRealization/hostService.ts"
import { applyEncounterEvidence } from "../socialEcology/hostService.ts"
import { entityMemoryRepository } from "../worldMemory/singleton.ts"
import { VRINDAVAN_RESOURCE_AFFORDANCES } from "../livingPopulation/vrindavanPopulationDefinition.ts"
import { findAlternateLocationForCategory, VRINDAVAN_ADAPTATION_RULES } from "./vrindavanAdaptationDefinition.ts"
import { adaptationEffectRepository, adaptationPressureRepository } from "./singleton.ts"

const defaultNow = () => new Date().toISOString()

interface SubjectKey {
  domain: AdaptationDomain
  subjectId: string
  kind: AdaptationSignalKind
}

function uniqueSubjectKeys(signals: AdaptationSignal[]): SubjectKey[] {
  const seen = new Map<string, SubjectKey>()
  for (const signal of signals) {
    const key = `${signal.domain}|${signal.subjectId}|${signal.kind}`
    if (!seen.has(key)) seen.set(key, { domain: signal.domain, subjectId: signal.subjectId, kind: signal.kind })
  }
  return [...seen.values()]
}

async function collectExistingPressures(worldInstanceId: string, signals: AdaptationSignal[]): Promise<AdaptationPressure[]> {
  const keys = uniqueSubjectKeys(signals)
  const found = await Promise.all(keys.map((key) => adaptationPressureRepository.get(worldInstanceId, key.domain, key.subjectId, key.kind)))
  return found.filter((pressure): pressure is AdaptationPressure => pressure !== null)
}

function buildAdaptationMemoryEntry(worldId: string, entityId: string, locationId: string, effect: AdaptationEffect): EntityMemoryEntry {
  return {
    id: `adaptation:${effect.id}:${entityId}`,
    worldId,
    entityId,
    type: "PREVIOUS_RESOURCE_LOCATION",
    tick: effect.appliedTick,
    detail: { locationId },
    significance: "MEANINGFUL",
    provenance: { derivedFromEventIds: [], derivationRule: `adaptation.${effect.ruleId}`, causalReferences: effect.causalReferences },
  }
}

// Sprint 15, mission's own "ADAPTATION EFFECT" step, applied: exactly
// the write boundaries that ALREADY exist and were ALREADY proven by
// Sprint 11/14 -- this function never mutates RelationshipState/
// EntityMemory itself, it only calls the SAME public functions those
// domains already expose for exactly this purpose
// (`applyEncounterEvidence`, `entityMemoryRepository.append`). PLACE
// and WORLD_POSSIBILITY effects are deliberately left as
// persisted-only this sprint (see vrindavanAdaptationDefinition.ts's
// own doc comments on rules C/E) -- EXCEPT rule D's own PLACE/
// RESOURCE_PRESSURE, which legitimately bridges into the SAME
// EntityMemory write boundary rule A already uses, just for a
// different reason (fleeing scarcity, not reinforcing a pattern).
async function applyAdaptationEffect(worldId: string, effect: AdaptationEffect, realizedEncounters: RealizedEncounterSignalInput[], presentEntityIdsByLocation: ReadonlyMap<string, string[]>): Promise<void> {
  if (effect.domain === "ENTITY" && effect.kind === "RESOURCE_PREFERENCE_BIAS") {
    const encounter = realizedEncounters.find((e) => e.participantEntityIds.includes(effect.entityId))
    if (!encounter) return
    await entityMemoryRepository.append(buildAdaptationMemoryEntry(worldId, effect.entityId, encounter.locationId, effect))
    return
  }

  if (effect.domain === "RELATIONSHIP" && effect.kind === "INTERACTION_LIKELIHOOD_BIAS") {
    await applyEncounterEvidence(worldId, effect.relationshipId, effect.appliedTick)
    return
  }

  if (effect.domain === "PLACE" && effect.kind === "RESOURCE_PRESSURE") {
    const [locationId, category] = effect.locationId.split(":")
    const alternateLocationId = findAlternateLocationForCategory(locationId, category)
    if (!alternateLocationId) return
    for (const entityId of presentEntityIdsByLocation.get(locationId) ?? []) {
      await entityMemoryRepository.append(buildAdaptationMemoryEntry(worldId, entityId, alternateLocationId, effect))
    }
    return
  }

  // PLACE/ENCOUNTER_ELIGIBILITY (rule C) and WORLD_POSSIBILITY/
  // ENCOUNTER_WEIGHT_BIAS (rule E): persisted (see the loop in
  // `applyWorldAdaptation` below, which already appended this effect
  // before calling here) but not yet wired into any further live
  // system -- an honest, documented deferral, not an oversight.
}

export interface ApplyWorldAdaptationParams {
  worldId: string
  tick: number
  realizedEncounters: RealizedEncounterSignalInput[]
  resourceReadings: ResourceReadingSignalInput[]
  presentEntityIdsByLocation?: ReadonlyMap<string, string[]>
}

// Sprint 15: the reusable Host-layer core -- signal derivation (pure,
// @avatark/world-adaptation-runtime) -> existing-pressure read -> pure
// orchestration (`runWorldAdaptation`) -> pressure persistence -> for
// every GENUINELY NEW effect (idempotent-append guarded), the one
// legitimate existing write boundary. Exported directly (not only
// reachable through `wakeWorldWithAdaptation`) so a test can prove the
// Host's own wiring with real Vrindavan ids across several
// deterministically-timed calls, the exact same "same functions, a
// constructed input" posture Sprint 14's own SCENARIO B/E tests already
// used for resolveEncounterRealization.
export async function applyWorldAdaptation(params: ApplyWorldAdaptationParams): Promise<WorldAdaptationResult> {
  const signals = deriveAdaptationSignals({ realizedEncounters: params.realizedEncounters, resourceReadings: params.resourceReadings })
  if (signals.length === 0) return { worldId: params.worldId, tick: params.tick, signals: [], pressures: [], decisions: [], effects: [] }

  const existingPressures = await collectExistingPressures(params.worldId, signals)
  const result = runWorldAdaptation({ worldId: params.worldId, tick: params.tick, signals, rules: VRINDAVAN_ADAPTATION_RULES, existingPressures })

  for (const pressure of result.pressures) await adaptationPressureRepository.save(pressure)

  const presentEntityIdsByLocation = params.presentEntityIdsByLocation ?? new Map()
  for (const effect of result.effects) {
    const appendResult = await adaptationEffectRepository.append(effect)
    if (appendResult.status !== "appended") continue // idempotent: a replayed/duplicate effect never re-triggers its write boundary
    await applyAdaptationEffect(params.worldId, effect, params.realizedEncounters, presentEntityIdsByLocation)
  }

  return result
}

export interface WakeWorldWithAdaptationResult {
  realization: WakeWorldWithEncounterRealizationResult
  adaptation: WorldAdaptationResult
}

// Sprint 15, mission's own causal-order chain, closed: the one place
// Sprint 7's causal engine through Sprint 14's own encounter realization
// are all driven by the SAME wake, now ALSO deriving and applying bounded
// adaptation from this wake's freshly-realized encounters and current
// resource readings. Composes `wakeWorldWithEncounterRealization`,
// never modifies it -- this file adds an adaptation pass ON TOP, the
// same layering discipline every prior sprint's own Host service holds.
//
// Idempotency: only encounter records that reached CONSEQUENCES_APPLIED
// AT THIS EXACT WAKE'S OWN completion tick are treated as "fresh" --
// pre-existing records from an earlier wake (completionTick from a past
// tick) are excluded, so a replayed wake naturally recomputes the SAME
// signal set, which `runWorldAdaptation`'s own replay guard (pressure
// `lastUpdatedTick >= tick`) then reduces to a no-op -- see
// docs/SPRINT15_FINAL_REPORT.md's replay/idempotency section.
export async function wakeWorldWithAdaptation(worldInstanceId: string, ownerId: string, now: () => string = defaultNow): Promise<WakeWorldWithAdaptationResult> {
  const realization = await wakeWorldWithEncounterRealization(worldInstanceId, ownerId, now)
  const afterShared = realization.rhythms.social.memory.world.state.sharedState
  const afterTick = afterShared.clock.tick
  const afterPopulation = realization.rhythms.social.memory.population

  const freshRecords = realization.encounterRecords.filter((record) => record.status === "CONSEQUENCES_APPLIED" && record.completionTick === afterTick)
  const realizedEncounters: RealizedEncounterSignalInput[] = freshRecords.map((record) => ({
    ruleId: record.ruleId,
    locationId: record.locationId,
    participantEntityIds: record.participantEntityIds,
    relationshipIdsInvolved: record.relationshipContext.map((context) => context.relationshipId),
    tick: afterTick,
    causalReferences: record.causalReferences,
  }))

  const resourceOpportunities = resolveResourceOpportunities(VRINDAVAN_RESOURCE_AFFORDANCES, afterShared.environment, afterTick)
  const resourceReadings: ResourceReadingSignalInput[] = resourceOpportunities.map((opportunity) => ({ locationId: opportunity.locationId, category: opportunity.category, available: opportunity.available, tick: afterTick }))

  const presentEntityIdsByLocation = new Map<string, string[]>()
  for (const entity of afterPopulation.populationEntities) {
    if (!presentEntityIdsByLocation.has(entity.locationId)) presentEntityIdsByLocation.set(entity.locationId, [])
    presentEntityIdsByLocation.get(entity.locationId)!.push(entity.id)
  }

  const adaptation = await applyWorldAdaptation({ worldId: worldInstanceId, tick: afterTick, realizedEncounters, resourceReadings, presentEntityIdsByLocation })

  return { realization, adaptation }
}

// Sprint 15: a Host-composed read -- no repository lookup happens
// outside this file's own `adaptationEffectRepository` singleton; the
// renderer/embodiment layer receives effects through this function or
// the embodiment wrapper below, never by importing the singleton
// itself.
export async function getWorldAdaptationEffects(worldInstanceId: string): Promise<AdaptationEffect[]> {
  return adaptationEffectRepository.listByWorld(worldInstanceId)
}

export interface WorldEmbodimentSnapshotWithAdaptation {
  embodimentWithEncounterRealization: WorldEmbodimentSnapshotWithEncounterRealization
  adaptationEffects: AdaptationEffect[]
}

// Sprint 15: Host-level composition ONLY, one layer above Sprint 14's
// own WorldEmbodimentSnapshotWithEncounterRealization -- never a FIFTH
// widening of @avatark/world-embodiment-contracts (Sprint 10 widened it
// once; Sprints 11, 12, 13, 14, and now 15 all decline to widen it
// further). The renderer receives this projection; it never queries
// adaptationEffectRepository itself.
export async function getEmbodimentWithAdaptation(worldInstanceId: string, userId: string, locationId: string, reachableLocationIds: string[], sinceTick: number | null, now: () => string = defaultNow): Promise<WorldEmbodimentSnapshotWithAdaptation> {
  const embodimentWithEncounterRealization = await getEmbodimentWithEncounterRealization(worldInstanceId, userId, locationId, reachableLocationIds, sinceTick, now)
  const adaptationEffects = await adaptationEffectRepository.listBySubject(worldInstanceId, "PLACE", locationId)
  return { embodimentWithEncounterRealization, adaptationEffects }
}
