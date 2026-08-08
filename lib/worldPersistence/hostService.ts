import type { WorldInstanceId, WorldLifecycleState, WorldOwnerId } from "@avatark/world-persistence-contracts"
import { LeaseConflictError, StaleWorldStateVersionError } from "@avatark/world-persistence-contracts"
import { computeDeterministicCatchUp, createCheckpoint, fixedRateTickPolicy, nextLifecycleState } from "@avatark/world-persistence-runtime"
import type { DurableWorldState } from "@avatark/world-persistence-contracts"
import { dispatchInteractionIntent } from "../worldEmbodiment/intentDispatcher.ts"
import type { RuntimeKernel } from "../runtimeKernel/orchestrator.ts"
import { LIVING_VRINDAVAN_ENTITY_ARCHETYPES, LIVING_VRINDAVAN_SEASONS } from "../livingSystems/systemsDefinition.ts"
import { ensureWorldInstance, loadOrSeedDurableWorldState } from "./durableState.ts"
import { durableWorldStateRepository, durableWorldSystemEventRepository, worldCheckpointRepository, worldLeaseRepository, worldLifecycleRepository } from "./singleton.ts"

// Sprint 9, Phase 10: the scale-neutral Host-level service boundary.
// Every operation here is exactly the set Phase 10 names --
// getWorldState/wakeWorld/advanceWorld/getWorldSnapshot/
// getEmbodimentSnapshot/interact -- backed by this environment's
// in-memory reference adapters (lib/worldPersistence/singleton.ts) today,
// swappable for a real distributed implementation later without any
// caller of this module changing (the whole point of depending on
// @avatark/world-persistence-contracts interfaces, never a concrete
// adapter, throughout). `getWorldSnapshot`/`getEmbodimentSnapshot` live
// in ./durableSnapshot.ts (re-exported below) since they need no lease
// or lifecycle -- a read never requires becoming the execution owner.
export { resolveDurableWorldSnapshot as getWorldSnapshot, resolveDurableWorldEmbodimentSnapshot as getEmbodimentSnapshot } from "./durableSnapshot.ts"

const DEFAULT_LEASE_TTL_MS = 60_000
const DEFAULT_TICK_POLICY = fixedRateTickPolicy(1) // reference rate: 1 logical tick per elapsed ms, tuned only for this environment's own tests -- product tick pacing is policy, not core (Phase 5)

export async function getWorldState(worldInstanceId: WorldInstanceId, now: () => string = () => new Date().toISOString()): Promise<DurableWorldState> {
  await ensureWorldInstance(worldInstanceId, now)
  return loadOrSeedDurableWorldState(worldInstanceId, now)
}

export interface WakeWorldResult {
  lifecycleState: WorldLifecycleState
  state: DurableWorldState
  ticksApplied: number
  catchUpDurationMs: number
}

// Sprint 9, Phase 4/5/7: COLD -> load checkpoint/history is implicit here
// (loadOrSeedDurableWorldState already IS "the current authoritative
// state, whatever durable form it was left in") -> deterministic catch-up
// -> WARM -> execution ownership acquired up front -> HOT once caught up.
export async function wakeWorld(worldInstanceId: WorldInstanceId, ownerId: WorldOwnerId, now: () => string = () => new Date().toISOString()): Promise<WakeWorldResult> {
  await ensureWorldInstance(worldInstanceId, now)

  const leaseResult = await worldLeaseRepository.acquire(worldInstanceId, ownerId, DEFAULT_LEASE_TTL_MS, now)
  if (leaseResult.status === "conflict") {
    throw new LeaseConflictError(worldInstanceId, leaseResult.heldBy.ownerId)
  }

  const lifecycleBefore = await worldLifecycleRepository.get(worldInstanceId)
  const waking = nextLifecycleState(lifecycleBefore?.state ?? "DORMANT", "visitor_arrived")
  const currentState = lifecycleBefore?.state ?? "DORMANT"
  if (waking) await worldLifecycleRepository.save({ worldInstanceId, state: waking, lastActiveAt: lifecycleBefore?.lastActiveAt ?? now(), lastCheckpointTick: lifecycleBefore?.lastCheckpointTick ?? 0 })

  const durableState = await loadOrSeedDurableWorldState(worldInstanceId, now)
  const lastActiveMs = new Date(lifecycleBefore?.lastActiveAt ?? durableState.updatedAt).getTime()
  const nowMs = new Date(now()).getTime()
  const ticksElapsed = DEFAULT_TICK_POLICY.ticksElapsed(lastActiveMs, nowMs)

  const catchUpStartedAt = Date.now()
  let finalState = durableState
  if (ticksElapsed > 0) {
    const caughtUp = computeDeterministicCatchUp({
      worldInstanceId,
      sharedState: durableState.sharedState,
      entities: [...durableState.entities],
      seasonDefinitions: LIVING_VRINDAVAN_SEASONS,
      entityArchetypes: LIVING_VRINDAVAN_ENTITY_ARCHETYPES,
      ticks: ticksElapsed,
      seed: worldInstanceId,
      now,
    })

    const saveResult = await durableWorldStateRepository.conditionalSave(
      { worldInstanceId, sharedState: caughtUp.sharedState, entities: caughtUp.entities, updatedAt: now() },
      durableState.stateVersion,
    )
    if (saveResult.status === "conflict") {
      // Cannot happen while holding a valid lease against a single-owner
      // reference adapter -- surfaced as a named error rather than
      // silently discarding catch-up work if it ever does.
      throw new StaleWorldStateVersionError(worldInstanceId, durableState.stateVersion, saveResult.currentVersion)
    }

    for (const record of caughtUp.eventRecords) {
      await durableWorldSystemEventRepository.append(record)
    }

    finalState = { worldInstanceId, stateVersion: saveResult.stateVersion, sharedState: caughtUp.sharedState, entities: caughtUp.entities, updatedAt: now() }

    await worldCheckpointRepository.save(
      createCheckpoint({
        id: `${worldInstanceId}-wake-${finalState.sharedState.clock.tick}`,
        worldInstanceId,
        checkpointVersion: finalState.stateVersion,
        stateVersion: finalState.stateVersion,
        sharedState: finalState.sharedState,
        entities: [...finalState.entities],
        eventSequenceAsOf: (await durableWorldSystemEventRepository.listAfter(worldInstanceId, 0)).length,
        reason: "dormancy",
        now,
      }),
    )
  }

  const active = nextLifecycleState(waking ?? currentState, "catch_up_complete") ?? "ACTIVE"
  await worldLifecycleRepository.save({ worldInstanceId, state: active, lastActiveAt: now(), lastCheckpointTick: finalState.sharedState.clock.tick })

  return { lifecycleState: active, state: finalState, ticksApplied: ticksElapsed, catchUpDurationMs: Date.now() - catchUpStartedAt }
}

// Sprint 9, Phase 6/7: explicit, owner-gated advancement -- the durable
// equivalent of lib/livingSystems/orchestrator.ts's own
// advanceLivingSystemsSimulation, requiring the caller to already hold
// the world's execution lease (acquired via wakeWorld) rather than any
// caller being able to advance a world nobody currently owns.
export async function advanceWorld(worldInstanceId: WorldInstanceId, ticks: number, ownerId: WorldOwnerId, now: () => string = () => new Date().toISOString()): Promise<DurableWorldState> {
  const currentLease = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (!currentLease || currentLease.ownerId !== ownerId) {
    throw new LeaseConflictError(worldInstanceId, currentLease?.ownerId ?? "no current owner")
  }

  const durableState = await loadOrSeedDurableWorldState(worldInstanceId, now)
  const caughtUp = computeDeterministicCatchUp({
    worldInstanceId,
    sharedState: durableState.sharedState,
    entities: [...durableState.entities],
    seasonDefinitions: LIVING_VRINDAVAN_SEASONS,
    entityArchetypes: LIVING_VRINDAVAN_ENTITY_ARCHETYPES,
    ticks,
    seed: worldInstanceId,
    now,
  })

  const saveResult = await durableWorldStateRepository.conditionalSave(
    { worldInstanceId, sharedState: caughtUp.sharedState, entities: caughtUp.entities, updatedAt: now() },
    durableState.stateVersion,
  )
  if (saveResult.status === "conflict") {
    throw new StaleWorldStateVersionError(worldInstanceId, durableState.stateVersion, saveResult.currentVersion)
  }
  for (const record of caughtUp.eventRecords) {
    await durableWorldSystemEventRepository.append(record)
  }

  return { worldInstanceId, stateVersion: saveResult.stateVersion, sharedState: caughtUp.sharedState, entities: caughtUp.entities, updatedAt: now() }
}

// Sprint 9, Phase 10/14: the renderer's ONE mutation boundary -- an exact
// passthrough to Sprint 8's existing dispatchInteractionIntent, adding
// no new path. worldInstanceId is accepted for API symmetry with every
// other WorldHostService operation; the dispatch itself is unchanged
// from Sprint 8 (it already resolves Living Vrindavan internally).
export async function interact(_worldInstanceId: WorldInstanceId, intent: unknown, kernel: RuntimeKernel) {
  return dispatchInteractionIntent(intent, kernel)
}
