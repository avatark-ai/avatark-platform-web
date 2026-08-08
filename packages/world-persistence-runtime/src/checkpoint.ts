import type { EntityArchetype, LivingEntityState, SeasonDefinition, SharedWorldState } from "@avatark/living-systems-contracts"
import { CorruptCheckpointError } from "@avatark/world-persistence-contracts"
import type { CheckpointId, CheckpointReason, WorldCheckpoint, WorldInstanceId, WorldStateVersion, WorldSystemEventRecord } from "@avatark/world-persistence-contracts"
import { computeDeterministicCatchUp } from "./catchUp.ts"

export interface CreateCheckpointParams {
  id: CheckpointId
  worldInstanceId: WorldInstanceId
  checkpointVersion: number
  stateVersion: WorldStateVersion
  sharedState: SharedWorldState
  entities: LivingEntityState[]
  eventSequenceAsOf: number
  reason: CheckpointReason
  now: () => string
}

// Sprint 9, Phase 3: a pure builder. A checkpoint must contain enough
// authoritative state to resume without replaying from tick zero -- so
// it always carries the FULL sharedState + entities as of `tick`, never
// a delta.
export function createCheckpoint(params: CreateCheckpointParams): WorldCheckpoint {
  return {
    id: params.id,
    worldInstanceId: params.worldInstanceId,
    checkpointVersion: params.checkpointVersion,
    stateVersion: params.stateVersion,
    tick: params.sharedState.clock.tick,
    sharedState: params.sharedState,
    entities: params.entities,
    eventSequenceAsOf: params.eventSequenceAsOf,
    reason: params.reason,
    createdAt: params.now(),
  }
}

export interface RecoverAuthoritativeStateParams {
  checkpoint: WorldCheckpoint
  eventsAfterCheckpoint: WorldSystemEventRecord[]
  seasonDefinitions: SeasonDefinition[]
  entityArchetypes: EntityArchetype[]
  seed: string
  now: () => string
}

export interface RecoveredState {
  sharedState: SharedWorldState
  entities: LivingEntityState[]
  ticksReplayed: number
}

// Sprint 9, Phase 3/8: reconstructs authoritative state from
//
//   checkpoint N + world-system events after N -> recovered state
//
// The checkpoint already IS the full state as of its own tick -- what's
// missing is whatever advanced the world between the checkpoint and the
// moment the runtime was lost. That gap is recovered by summing the
// tick deltas recorded in every "clock.advanced" event after the
// checkpoint (each one records exactly how many ticks that call
// applied -- see @avatark/living-systems-runtime's simulation.ts) and
// re-running the SAME deterministic advanceWorldSimulation for that
// many ticks from the checkpoint's own state. Because the engine is a
// pure function of (state, ticks, seed), this reproduces the exact
// pre-loss state -- it does not need to interpret or "replay" each
// event individually (an event like season.transitioned is a RECORD of
// what happened, not itself sufficient to recompute weather/hydrology
// derivation, which is why recomputation, not event application, is the
// correct recovery mechanism here).
export function recoverAuthoritativeState(params: RecoverAuthoritativeStateParams): RecoveredState {
  const { checkpoint, eventsAfterCheckpoint } = params

  for (const event of eventsAfterCheckpoint) {
    if (event.worldInstanceId !== checkpoint.worldInstanceId) {
      throw new CorruptCheckpointError(checkpoint.worldInstanceId, checkpoint.id, `event ${event.eventId} belongs to world instance ${event.worldInstanceId}, not ${checkpoint.worldInstanceId}`)
    }
    if (event.sequence <= checkpoint.eventSequenceAsOf) {
      throw new CorruptCheckpointError(checkpoint.worldInstanceId, checkpoint.id, `event ${event.eventId} (sequence ${event.sequence}) is not after checkpoint's own eventSequenceAsOf (${checkpoint.eventSequenceAsOf})`)
    }
  }

  const ticksReplayed = eventsAfterCheckpoint.filter((event) => event.type === "clock.advanced").reduce((sum, event) => {
    const ticks = event.detail.ticks
    if (typeof ticks !== "number") throw new CorruptCheckpointError(checkpoint.worldInstanceId, checkpoint.id, `clock.advanced event ${event.eventId} has non-numeric detail.ticks`)
    return sum + ticks
  }, 0)

  if (ticksReplayed === 0) {
    return { sharedState: checkpoint.sharedState, entities: [...checkpoint.entities], ticksReplayed: 0 }
  }

  const caughtUp = computeDeterministicCatchUp({
    worldInstanceId: checkpoint.worldInstanceId,
    sharedState: checkpoint.sharedState,
    entities: [...checkpoint.entities],
    seasonDefinitions: params.seasonDefinitions,
    entityArchetypes: params.entityArchetypes,
    ticks: ticksReplayed,
    seed: params.seed,
    now: params.now,
  })

  return { sharedState: caughtUp.sharedState, entities: caughtUp.entities, ticksReplayed }
}
