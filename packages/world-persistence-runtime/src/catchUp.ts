import { advanceWorldSimulation } from "@avatark/living-systems-runtime"
import type { EntityArchetype, LivingEntityState, SeasonDefinition, SharedWorldState, WorldSystemEvent } from "@avatark/living-systems-contracts"
import { InvalidCatchUpRequestError } from "@avatark/world-persistence-contracts"
import type { WorldInstanceId } from "@avatark/world-persistence-contracts"
import { deriveWorldSystemEventId } from "./eventIdentity.ts"
import type { WorldSystemEventRecord } from "@avatark/world-persistence-contracts"

export interface CatchUpParams {
  worldInstanceId: WorldInstanceId
  sharedState: SharedWorldState
  entities: LivingEntityState[]
  seasonDefinitions: SeasonDefinition[]
  entityArchetypes: EntityArchetype[]
  ticks: number
  seed: string
  now: () => string
}

export interface CatchUpResult {
  sharedState: SharedWorldState
  entities: LivingEntityState[]
  // Not yet assigned a durable `sequence` -- that is stamped only once
  // a DurableWorldSystemEventRepository actually accepts the append
  // (see systemEventRecord.ts). A caller passes these straight into
  // `.append()`.
  eventRecords: Omit<WorldSystemEventRecord, "sequence">[]
  ticksApplied: number
}

// Sprint 9, Phase 4: THE deterministic catch-up mechanism.
//
// This function invents no new simulation engine -- it calls the exact
// same @avatark/living-systems-runtime advanceWorldSimulation that
// already advances an ACTIVE world one tick at a time, with the exact
// same causal pipeline (season -> weather -> hydrology -> ecology ->
// entity lifecycle -> encounter availability, all already enforced
// inside advanceWorldSimulation and its own callees). A dormant world
// that comes back after wall-clock time has passed and an active world
// ticking forward in real time reach IDENTICAL states for the same
// (starting state, ticks, seed) -- because both paths are the same
// function call. See catchUp.test.ts for the equivalence proof.
//
// The only things this function adds on top of advanceWorldSimulation:
//   - rejects a malformed request (negative ticks) with a named error
//     instead of silently clamping or throwing a generic RangeError.
//   - stamps each resulting WorldSystemEvent with a deterministic,
//     content-derived id (Phase 9), turning it into a durable,
//     idempotent WorldSystemEventRecord the caller can append.
export function computeDeterministicCatchUp(params: CatchUpParams): CatchUpResult {
  if (!Number.isInteger(params.ticks) || params.ticks < 0) {
    throw new InvalidCatchUpRequestError(params.worldInstanceId, `ticks must be a non-negative integer, got ${params.ticks}`)
  }

  const result = advanceWorldSimulation({
    sharedState: params.sharedState,
    seasonDefinitions: params.seasonDefinitions,
    entityArchetypes: params.entityArchetypes,
    entities: params.entities,
    ticks: params.ticks,
    seed: params.seed,
    now: params.now,
  })

  const eventRecords: Omit<WorldSystemEventRecord, "sequence">[] = result.events.map((event: WorldSystemEvent, index: number) => ({
    ...event,
    worldInstanceId: params.worldInstanceId,
    eventId: deriveWorldSystemEventId(params.worldInstanceId, event, index),
  }))

  return {
    sharedState: result.sharedState,
    entities: result.entities,
    eventRecords,
    ticksApplied: params.ticks,
  }
}
