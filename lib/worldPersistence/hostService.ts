import type { WakeCatchUpPlan, WorldInstanceId, WorldLifecycleState, WorldOwnerId } from "@avatark/world-persistence-contracts"
import { LeaseConflictError, StaleWorldStateVersionError } from "@avatark/world-persistence-contracts"
import { computeDeterministicCatchUp, createCheckpoint, describeWakeCatchUpPlan, fixedRateTickPolicy, nextLifecycleState, resolveTicksToApply } from "@avatark/world-persistence-runtime"
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

// Sprint 20, §10/§45 debt #2: a NEW, additive primitive -- deliberately
// NOT wired into `wakeWorld`/`wakeWorldWithSpatialEcology`/
// `wakeWorldWithCanonicalEvents` below or in any sibling Sprint 16/18
// file. An earlier version of this fix DID wrap those directly and was
// reverted after `npm test` caught a real regression: `advanceWorld`
// (Sprint 9's own explicit, owner-gated advancement) is designed to be
// called in a LATER, SEPARATE request after `wakeWorld`, while still
// relying on that same lease -- `hostService.test.ts`'s own "the lease
// holder can explicitly advance the world further after waking it" and
// two other existing tests depend on this exact multi-call-same-lease
// composition. Auto-releasing inside `wakeWorld` itself breaks that
// real, intentional, already-tested workflow -- releasing is a
// SESSION-boundary decision only the caller composing a chain can make,
// not something a shared primitive may impose underneath it.
//
// This function exists for the Sprint 20 `wakeLivingWorld` v1 facade
// (Phase 0 §3/§8, not yet built as of Part A) to use: THAT facade
// defines "one request = one session" and is the correct, and only,
// place to acquire-and-always-release within a single call, closing the
// verified "no Host code path ever releases a lease" production gap
// (§10/§45 debt #2) without touching any existing Sprint 9-19 function's
// observable behavior. "Is the CURRENT lease still mine?" (re-read
// fresh, by ownerId) is deliberately checked instead of releasing a
// captured version number: correct whether `fn` never got far enough to
// acquire anything (current is null or someone else's -- release is
// skipped, a safe no-op) or acquired then renewed internally (current's
// version has already moved past whatever was captured at entry).
//
// Deliberately does NOT retry `acquire` on a same-owner conflict (a
// genuinely concurrent second call from the SAME ownerId while the
// first is still mid-chain). That is NOT the bug this closes -- it is
// the single-writer invariant (§11) doing its job: two catch-up passes
// racing against the same worldInstanceId is exactly what the lease
// exists to prevent, even from a "trusted" caller.
export async function releasingWorldLeaseAfter<T>(worldInstanceId: WorldInstanceId, ownerId: WorldOwnerId, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } finally {
    const current = await worldLeaseRepository.getCurrent(worldInstanceId)
    if (current && current.ownerId === ownerId) {
      await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
    }
  }
}

export async function getWorldState(worldInstanceId: WorldInstanceId, now: () => string = () => new Date().toISOString()): Promise<DurableWorldState> {
  await ensureWorldInstance(worldInstanceId, now)
  return loadOrSeedDurableWorldState(worldInstanceId, now)
}

export interface WakeWorldResult {
  lifecycleState: WorldLifecycleState
  state: DurableWorldState
  ticksApplied: number
  catchUpDurationMs: number
  catchUpPlan: WakeCatchUpPlan
}

// Sprint 17: everything `wakeWorld()` used to return, MINUS the final
// lifecycle commit -- see `catchUpCausalEnvironment` below for why this
// split exists. `lifecycleStateBeforeCommit` is the value the eventual
// `commitWakeCompletion` call needs as its own `nextLifecycleState`
// input (either the just-written "WAKING" transition, or the world's
// prior state if no legal "visitor_arrived" transition applied).
export interface CausalEnvironmentCatchUpResult {
  lifecycleStateBeforeCommit: WorldLifecycleState
  state: DurableWorldState
  ticksApplied: number
  catchUpDurationMs: number
  // Sprint 17: a logging/test-assertion-only descriptor of what this
  // attempt's catch-up did -- see @avatark/world-persistence-runtime's
  // own `resolveTicksToApply`/`describeWakeCatchUpPlan` doc comments for
  // why the ticks-to-apply computation lives there (pure, world-neutral,
  // independently testable) rather than inline here.
  catchUpPlan: WakeCatchUpPlan
}

// Sprint 17: the primitive `wakeWorld()` now wraps -- every step Sprint
// 9-16 already established (lease, WAKING transition, deterministic
// catch-up, checkpoint), stopping short of the one write that used to
// happen here: committing `lastActiveAt`/`lastCheckpointTick`. A caller
// that composes further downstream layers on top (lib/livingPopulation/
// hostService.ts's wakeWorldWithPopulation, and everything chained
// above it) calls THIS, not `wakeWorld`, so that commit only happens
// once every downstream layer has also persisted -- see
// `commitWakeCompletion` and wakeWorldWithSpatialEcology.
export async function catchUpCausalEnvironment(worldInstanceId: WorldInstanceId, ownerId: WorldOwnerId, now: () => string = () => new Date().toISOString()): Promise<CausalEnvironmentCatchUpResult> {
  await ensureWorldInstance(worldInstanceId, now)

  const leaseResult = await worldLeaseRepository.acquire(worldInstanceId, ownerId, DEFAULT_LEASE_TTL_MS, now)
  if (leaseResult.status === "conflict") {
    throw new LeaseConflictError(worldInstanceId, leaseResult.heldBy.ownerId)
  }

  const lifecycleBefore = await worldLifecycleRepository.get(worldInstanceId)
  const durableState = await loadOrSeedDurableWorldState(worldInstanceId, now)

  // Sprint 17: both the provisional WAKING write below AND the ticks
  // computation fall back to the SAME anchor (the world's own durable
  // `updatedAt`/tick) when there is no prior lifecycle record at all --
  // never to `now()`, which would stamp a fabricated "last active" time
  // for a world's first-ever wake and corrupt a retry's own
  // resolveTicksToApply computation if that first wake crashes before
  // its final commit (lifecycleBefore would then read back the
  // WAKING-write's own now(), not the world's true seed time).
  const lastActiveAt = lifecycleBefore?.lastActiveAt ?? durableState.updatedAt
  const lastCheckpointTick = lifecycleBefore?.lastCheckpointTick ?? durableState.sharedState.clock.tick

  const waking = nextLifecycleState(lifecycleBefore?.state ?? "DORMANT", "visitor_arrived")
  const currentState = lifecycleBefore?.state ?? "DORMANT"
  if (waking) await worldLifecycleRepository.save({ worldInstanceId, state: waking, lastActiveAt, lastCheckpointTick })

  const fromTick = durableState.sharedState.clock.tick
  const ticksElapsed = resolveTicksToApply({ lastActiveAt, lastCheckpointTick, currentTick: fromTick, now, tickPolicy: DEFAULT_TICK_POLICY })

  const catchUpStartedAt = Date.now()
  let finalState = durableState
  let thisAttemptsEventRecords: ReturnType<typeof computeDeterministicCatchUp>["eventRecords"] = []
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
    thisAttemptsEventRecords = caughtUp.eventRecords

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

  const catchUpPlan = describeWakeCatchUpPlan(fromTick, finalState.sharedState.clock.tick, ticksElapsed, thisAttemptsEventRecords)

  return { lifecycleStateBeforeCommit: waking ?? currentState, state: finalState, ticksApplied: ticksElapsed, catchUpDurationMs: Date.now() - catchUpStartedAt, catchUpPlan }
}

// Sprint 17: the ONE place `lastActiveAt`/`lastCheckpointTick` are
// committed -- moved here, out of `catchUpCausalEnvironment`, so a
// caller composing downstream layers on top only calls this once every
// one of those layers has ALSO persisted successfully (see
// wakeWorldWithSpatialEcology, the real outermost composed function).
// Until this call happens, `lastActiveAt`/`lastCheckpointTick` remain at
// whatever they were before this wake attempt started -- which is
// exactly what lets a crashed, retried attempt recompute the correct
// remaining catch-up window (`resolveTicksToApply`, above) instead of
// either losing it (if committed too early, the pre-Sprint-17 bug) or
// double-applying it (if the durable environment's own already-advanced
// tick weren't subtracted back out).
export async function commitWakeCompletion(worldInstanceId: WorldInstanceId, lifecycleStateBeforeCommit: WorldLifecycleState, tick: number, now: () => string = () => new Date().toISOString()): Promise<WorldLifecycleState> {
  const active = nextLifecycleState(lifecycleStateBeforeCommit, "catch_up_complete") ?? "ACTIVE"
  await worldLifecycleRepository.save({ worldInstanceId, state: active, lastActiveAt: now(), lastCheckpointTick: tick })
  return active
}

// Sprint 9, Phase 4/5/7: COLD -> load checkpoint/history is implicit here
// (loadOrSeedDurableWorldState already IS "the current authoritative
// state, whatever durable form it was left in") -> deterministic catch-up
// -> WARM -> execution ownership acquired up front -> HOT once caught up.
//
// Sprint 17: kept as a thin, backward-compatible wrapper around
// `catchUpCausalEnvironment` + `commitWakeCompletion`, still eager-
// committing exactly as before -- for the one existing caller that only
// ever wants environment-level wake (the dev route at
// app/api/dev/account/living-vrindavan/persistence/wake/route.ts).
// Every downstream-composing caller (lib/livingPopulation/hostService.ts
// and everything chained above it) calls `catchUpCausalEnvironment`
// directly instead, deferring the commit to the composed chain's own
// outermost layer.
export async function wakeWorld(worldInstanceId: WorldInstanceId, ownerId: WorldOwnerId, now: () => string = () => new Date().toISOString()): Promise<WakeWorldResult> {
  const caughtUp = await catchUpCausalEnvironment(worldInstanceId, ownerId, now)
  const lifecycleState = await commitWakeCompletion(worldInstanceId, caughtUp.lifecycleStateBeforeCommit, caughtUp.state.sharedState.clock.tick, now)
  return { lifecycleState, state: caughtUp.state, ticksApplied: caughtUp.ticksApplied, catchUpDurationMs: caughtUp.catchUpDurationMs, catchUpPlan: caughtUp.catchUpPlan }
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
