import type { CanonicalEventDefinition, MandatedFact, WorldInstanceCanonicalProjectionState } from "@avatark/canonical-event-contracts"
import { evaluateCanonicalEventEligibility, resolveCanonicalEventActivation } from "@avatark/canonical-event-runtime"
import type { CanonicalEventEligibilityContext } from "@avatark/canonical-event-runtime"
import type { CausalReference } from "@avatark/world-memory-contracts"
import { deriveWorldEvents } from "@avatark/world-memory-runtime"
import type { AdaptationEffect } from "@avatark/world-adaptation-contracts"
import { deriveAdaptationEffectId } from "@avatark/world-adaptation-runtime"
import { getEmbodimentWithSpatialEcology, wakeWorldWithSpatialEcology } from "../spatialEcology/hostService.ts"
import type { WakeWorldWithSpatialEcologyResult, WorldEmbodimentSnapshotWithSpatialEcology } from "../spatialEcology/hostService.ts"
import { protectedNarrativeStateRepository } from "../livingSystems/singleton.ts"
import { worldEventRepository } from "../worldMemory/singleton.ts"
import { VRINDAVAN_SIGNIFICANCE_CONFIG } from "../worldMemory/vrindavanMemoryDefinition.ts"
import { adaptationEffectRepository } from "../worldAdaptation/singleton.ts"
import { canonicalProjectionStateRepository, visitorCanonicalEventWitnessRepository } from "./singleton.ts"
import { VRINDAVAN_CANONICAL_EVENTS } from "./vrindavanCanonicalEventDefinition.ts"

const defaultNow = () => new Date().toISOString()

// Sprint 18: the ONE place a canonical event's own consequences are
// applied -- exactly the same "resolve (pure) -> derive consequences
// (pure) -> apply (Host only)" three-layer split every prior sprint's
// consequence pipeline already holds. Every write here goes through an
// EXISTING, already-proven write boundary:
//
//   - CANONICAL_EVENT_OCCURRED WorldEvent -> the SAME `deriveWorldEvents`
//     pipeline every other consequence-bearing event already uses
//     (Sprint 11, unmodified).
//   - a PLACE-domain AdaptationEffect (`ENCOUNTER_ELIGIBILITY`), one per
//     `LOCATION_ACTIVE` mandated fact -> `adaptationEffectRepository`
//     (Sprint 15, unmodified), the SAME repository/type
//     `getSpatialSnapshot` (Sprint 16, unmodified) already reads to
//     compute `PatchState.ecologicalPressure`.
//
// Deliberately NOT routed through Sprint 15's own `applyWorldAdaptation`/
// `runWorldAdaptation` signal-pressure-threshold pipeline: that pipeline
// exists to give BOUNDED weight to repeated EMERGENT signals ("one
// encounter should not automatically transform the world"). A canonical
// event is the opposite case -- an AUTHORED, already-legitimate fact
// that does not need repeated reinforcement to matter. Constructing the
// effect directly, once, deterministically, is the more honest
// mechanism for this domain, not a shortcut around the existing one.
async function applyCanonicalEventConsequences(worldInstanceId: string, definition: CanonicalEventDefinition, state: WorldInstanceCanonicalProjectionState, tick: number, now: () => string): Promise<WorldInstanceCanonicalProjectionState> {
  const activationId = state.activationId!
  const causalReferences: CausalReference[] = [
    { kind: "canonicalEvent", ref: definition.identity.canonicalEventId },
    { kind: "canonicalActivation", ref: activationId },
  ]

  const locationActiveFacts = definition.mandatedFacts.filter((fact): fact is Extract<MandatedFact, { kind: "LOCATION_ACTIVE" }> => fact.kind === "LOCATION_ACTIVE")
  const primaryLocationId = locationActiveFacts[0]?.locationId ?? null

  const worldEvents = deriveWorldEvents({
    worldId: worldInstanceId,
    now,
    seasonTransitions: [],
    environmentalBandChanges: [],
    locationConditionChanges: [],
    populationEvents: [],
    encounterAvailabilityChanges: [],
    canonicalEventOccurrences: [{ tick, canonicalEventId: definition.identity.canonicalEventId, activationId, locationId: primaryLocationId, causalReferences }],
    significanceConfig: VRINDAVAN_SIGNIFICANCE_CONFIG,
  })
  for (const event of worldEvents) await worldEventRepository.append(event)

  for (const fact of locationActiveFacts) {
    const effect: AdaptationEffect = {
      id: deriveAdaptationEffectId(worldInstanceId, `canonical:${definition.identity.canonicalEventId}`, fact.locationId, 1),
      worldId: worldInstanceId,
      ruleId: `canonical:${definition.identity.canonicalEventId}`,
      tier: 1,
      appliedTick: tick,
      reversible: false,
      causalReferences,
      domain: "PLACE",
      locationId: fact.locationId,
      kind: "ENCOUNTER_ELIGIBILITY",
    }
    await adaptationEffectRepository.append(effect)
  }

  return { ...state, status: "COMPLETED", completedAtTick: tick, worldEventId: worldEvents[0]?.id ?? null }
}

export interface WakeWorldWithCanonicalEventsResult {
  spatial: WakeWorldWithSpatialEcologyResult
  canonicalProjections: WorldInstanceCanonicalProjectionState[]
}

// Sprint 18, mission's own causal-order chain, closed: the one place
// Sprint 7's causal engine through Sprint 16's own spatial ecology are
// all driven by the SAME wake, now ALSO evaluating every authored
// canonical event's eligibility and, once eligible, activating it
// exactly once. Composes `wakeWorldWithSpatialEcology`, never modifies
// it -- this file adds a canonical-event pass ON TOP, the same layering
// discipline every prior sprint's own Host service holds.
//
// Reconciliation finding (see docs/SPRINT18_FINAL_REPORT.md): the
// implementation-prep document assumed `commitWakeCompletion`
// (Sprint 17) would need to move OUT of `wakeWorldWithSpatialEcology` so
// this file could become "the real outermost commit point," mirroring
// Sprint 17's own `wakeWorld` -> `catchUpCausalEnvironment` split. That
// turns out to be unnecessary: `lastActiveAt`/`lastCheckpointTick` exist
// to answer "how many MORE ticks are owed," a question that only
// matters for layers that consume a tick-elapsed BUDGET (population,
// memory, social ecology, rhythms, encounter realization, adaptation,
// spatial ecology all iterate per-tick work). Canonical-event
// eligibility/activation consumes no such budget -- it is a stateless,
// idempotent-by-`activationId` check re-evaluated fresh against
// whatever tick the environment has ALREADY, durably reached, exactly
// like `EncounterRecord`/`AdaptationEffect`/`TerritoryClaim` before it.
// A crash between `wakeWorldWithSpatialEcology`'s own commit and this
// file's own activation work therefore loses nothing: a retry simply
// re-evaluates eligibility at the identical (already-caught-up) tick
// and finds the identical answer. See
// `lib/canonicalEvents/crashRetryRegression.test.ts` for the concrete
// proof of this claim, not merely the assertion of it.
export async function wakeWorldWithCanonicalEvents(worldInstanceId: string, ownerId: string, now: () => string = defaultNow): Promise<WakeWorldWithCanonicalEventsResult> {
  const spatial = await wakeWorldWithSpatialEcology(worldInstanceId, ownerId, now)

  const afterMemory = spatial.adaptation.realization.rhythms.social.memory
  const afterShared = afterMemory.world.state.sharedState
  const tick = afterShared.clock.tick
  const seasonId = afterShared.season.currentSeasonId

  const protectedNarrative = await protectedNarrativeStateRepository.get(worldInstanceId)
  const alreadyCompleted = (await canonicalProjectionStateRepository.listByWorld(worldInstanceId)).filter((state) => state.status === "COMPLETED")

  const context: CanonicalEventEligibilityContext = {
    tick,
    seasonId,
    worldInstancePhase: null,
    completedCanonicalEventIds: new Set(alreadyCompleted.map((state) => state.canonicalEventId)),
    reachedLocationIds: new Set(afterMemory.population.populationEntities.map((entity) => entity.locationId)),
    narrativeGatesResolved: { default: protectedNarrative.resolved },
  }

  const canonicalProjections: WorldInstanceCanonicalProjectionState[] = []
  for (const definition of VRINDAVAN_CANONICAL_EVENTS) {
    const existing = await canonicalProjectionStateRepository.get(worldInstanceId, definition.identity.canonicalEventId)

    // Idempotency guard, checked BEFORE any consequence work runs
    // (Phase 0 §12's own explicit requirement) -- an already-activated
    // (or further-progressed) projection is returned completely
    // unchanged, never re-derived.
    if (existing?.activationId) {
      canonicalProjections.push(existing)
      continue
    }

    const eligibility = evaluateCanonicalEventEligibility(definition, worldInstanceId, context)
    let state = resolveCanonicalEventActivation({ worldInstanceId, definition, eligibility, currentState: existing, tick })
    await canonicalProjectionStateRepository.save(state)

    if (state.status === "ACTIVATED" && state.activationId) {
      state = await applyCanonicalEventConsequences(worldInstanceId, definition, state, tick, now)
      await canonicalProjectionStateRepository.save(state)
    }

    canonicalProjections.push(state)
  }

  return { spatial, canonicalProjections }
}

// Sprint 18, Phase 0 §20: Fact B -- visitor-scoped, per-actor. Never
// called from `wakeWorldWithCanonicalEvents` itself (activation has no
// visitor precondition anywhere, Phase 0 §19's own explicit
// requirement) -- only from a visitor-facing read/interaction path. A
// visitor may only witness an event that has genuinely COMPLETED; there
// is no way to witness a DORMANT/ACTIVATED-but-not-yet-COMPLETED one,
// since Fact B always links to Fact A's own `activationId`.
export async function witnessCanonicalEvent(worldInstanceId: string, userId: string, canonicalEventId: string, tick: number): Promise<void> {
  const state = await canonicalProjectionStateRepository.get(worldInstanceId, canonicalEventId)
  if (!state?.activationId || state.status !== "COMPLETED") return
  await visitorCanonicalEventWitnessRepository.append({ userId, canonicalEventId, worldInstanceId, activationId: state.activationId, witnessedAtTick: tick })
}

// Sprint 18: Host-composed reads -- no repository lookup happens
// outside this file's own singletons; the renderer/embodiment layer
// receives projection state through these functions or the embodiment
// wrapper below, never by importing a singleton itself.
export async function getCanonicalEventProjectionState(worldInstanceId: string, canonicalEventId: string): Promise<WorldInstanceCanonicalProjectionState | null> {
  return canonicalProjectionStateRepository.get(worldInstanceId, canonicalEventId)
}

export async function getAllCanonicalEventProjectionStates(worldInstanceId: string): Promise<WorldInstanceCanonicalProjectionState[]> {
  return canonicalProjectionStateRepository.listByWorld(worldInstanceId)
}

export interface WorldEmbodimentSnapshotWithCanonicalEvents {
  embodimentWithSpatialEcology: WorldEmbodimentSnapshotWithSpatialEcology
  canonicalProjections: WorldInstanceCanonicalProjectionState[]
}

// Sprint 18: Host-level composition ONLY, one layer above Sprint 16's
// own WorldEmbodimentSnapshotWithSpatialEcology -- never a further
// widening of @avatark/world-embodiment-contracts itself (Sprint 10
// widened it once; every sprint since has declined to widen it
// further). The renderer receives this projection; it never queries
// canonicalProjectionStateRepository itself.
export async function getEmbodimentWithCanonicalEvents(worldInstanceId: string, userId: string, locationId: string, reachableLocationIds: string[], sinceTick: number | null, now: () => string = defaultNow): Promise<WorldEmbodimentSnapshotWithCanonicalEvents> {
  const embodimentWithSpatialEcology = await getEmbodimentWithSpatialEcology(worldInstanceId, userId, locationId, reachableLocationIds, sinceTick, now)
  const canonicalProjections = await canonicalProjectionStateRepository.listByWorld(worldInstanceId)
  return { embodimentWithSpatialEcology, canonicalProjections }
}
