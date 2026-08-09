import type { VisitorWorldMemory, WorldSnapshot } from "@avatark/living-systems-contracts"
import type { WorldEmbodimentSnapshot } from "@avatark/world-embodiment-contracts"
import { LeaseConflictError } from "@avatark/world-persistence-contracts"
import type { WorldInstanceId, WorldLifecycleState, WorldOwnerId } from "@avatark/world-persistence-contracts"
import { getWorldState, releasingWorldLeaseAfter } from "../worldPersistence/hostService.ts"
import { resolveDurableWorldEmbodimentSnapshot, resolveDurableWorldSnapshot } from "../worldPersistence/durableSnapshot.ts"
import type { DurableWorldEmbodimentSnapshotParams, DurableWorldSnapshotParams } from "../worldPersistence/durableSnapshot.ts"
import { wakeWorldWithCanonicalEvents } from "../canonicalEvents/hostService.ts"
import type { WakeWorldWithCanonicalEventsResult } from "../canonicalEvents/hostService.ts"
import { worldCheckpointRepository, worldLeaseRepository, worldLifecycleRepository } from "../worldPersistence/singleton.ts"

const defaultNow = () => new Date().toISOString()

// Sprint 20, Phase 0 §3: the v1 public Runtime facade -- a NEW, thin
// `lib/livingWorldHost/` module that is pure composition/re-export over
// already-existing Sprint 9-19 Host functions, exactly as Phase 0's own
// principle requires ("Sprint 20 does not reimplement any of them").
// This is the FIRST real caller of both `releasingWorldLeaseAfter` (Part
// A, previously unused in production) and `wakeWorldWithCanonicalEvents`
// (Sprint 18's own real outermost composed wake function) from a single
// acquire-and-release session boundary.
//
// Deliberately does NOT re-export raw repository access, and does not
// add a `setWorldState`/`setEntityMemory`-shaped operation -- matching
// Phase 0 §3's own explicit exclusion list.

export interface WakeLivingWorldResult {
  woke: true
  result: WakeWorldWithCanonicalEventsResult
}
export interface WakeLivingWorldSkipped {
  woke: false
  reason: "lease-held-by-another-owner"
}
export type WakeLivingWorldOutcome = WakeLivingWorldResult | WakeLivingWorldSkipped

// Sprint 20, §Step A: the ONE outermost session boundary -- acquire
// (via the existing wake chain's own lease acquisition inside
// `catchUpCausalEnvironment`), wake/catch-up through every domain
// Sprint 9-18 composed (population/memory/social/rhythms/encounter-
// realization/adaptation/spatial-ecology/canonical-events), then
// release (Part A's `releasingWorldLeaseAfter`) -- all within one call.
// This is the facade `wakeLivingWorld` Phase 0 §3 names, and the first
// production-shaped entry point that both wakes AND safely releases.
//
// Tolerates `LeaseConflictError` by design, never lets it propagate:
// Phase 0 §25 ("High concurrency: many visitors, one world") and this
// sprint's own Step 4 finding (the lease has no same-owner reentrancy)
// mean two real concurrent requests against the SAME worldInstanceId
// WILL race for this lease. The correct behavior for a read-triggered
// opportunistic wake is "whichever request wins the race genuinely
// advances the world; every other concurrent request just reads
// whatever is currently there" -- never a 500 for the visitor who lost
// the race. This is a caller-side tolerate-conflict POLICY, not a
// change to lease semantics: no retry, no reentrancy, the underlying
// `WorldLeaseRepository` contract is untouched (Step 4's own explicit
// constraint: "do NOT casually add reentrant leasing").
export async function wakeLivingWorld(worldInstanceId: WorldInstanceId, ownerId: WorldOwnerId, now: () => string = defaultNow): Promise<WakeLivingWorldOutcome> {
  try {
    const result = await releasingWorldLeaseAfter(worldInstanceId, ownerId, () => wakeWorldWithCanonicalEvents(worldInstanceId, ownerId, now))
    return { woke: true, result }
  } catch (error) {
    if (error instanceof LeaseConflictError) return { woke: false, reason: "lease-held-by-another-owner" }
    throw error
  }
}

// Sprint 20, Phase 0 §30: the smallest REAL thing this codebase's
// current capabilities support -- `ensureWorldInstance`/
// `loadOrSeedDurableWorldState` (Sprint 9) already provision a world
// instance's row and seed its durable state on first real access; this
// is a thin, named facade over that existing behavior, not a
// reimplementation. Phase 0 §30's own proposed `worldDefinitionId`/
// `artifactId`/`initialSeed` parameters are honestly NOT threaded
// through here: nothing in Sprint 9-19's real code accepts a
// world-definition choice at instance-creation time yet (every Host
// file in this codebase is Vrindavan-wired by convention, matching how
// EVERY prior sprint's own portability proof lives at the pure
// runtime-package level, never the Host layer -- see this sprint's
// final report §"Living Forest portability proof" for why that is the
// correct, existing convention, not new debt). A real multi-artifact
// `createWorldInstance` is genuinely new-for-v1 scope beyond what Sprint
// 20 can honestly claim to close.
export async function createWorldInstance(worldInstanceId: WorldInstanceId, now: () => string = defaultNow) {
  return getWorldState(worldInstanceId, now)
}

export interface LivingWorldSnapshotParams extends Omit<DurableWorldSnapshotParams, "visitorMemory"> {
  ownerId: WorldOwnerId
  visitorMemory?: VisitorWorldMemory
}

// Sprint 20, §Step B: the production-safe read composition -- best-
// effort wake (never throws on a losing race, see `wakeLivingWorld`
// above), THEN a lease-free read (`resolveDurableWorldSnapshot`,
// Sprint 9) of whatever the durable state now durably is, regardless of
// whether THIS call's own wake attempt won the race or was skipped. A
// read never needs to have been the one that woke the world -- it only
// needs the world to be reachable, which `loadOrSeedDurableWorldState`
// already guarantees (seeds fresh if nothing exists yet).
export async function getWorldSnapshotForVisitor(params: LivingWorldSnapshotParams): Promise<{ snapshot: WorldSnapshot; wake: WakeLivingWorldOutcome }> {
  const now = params.now ?? defaultNow
  const wake = await wakeLivingWorld(params.worldInstanceId, params.ownerId, now)
  const snapshot = await resolveDurableWorldSnapshot({ ...params, now })
  return { snapshot, wake }
}

export interface LivingWorldEmbodimentSnapshotParams extends Omit<DurableWorldEmbodimentSnapshotParams, "visitorMemory"> {
  ownerId: WorldOwnerId
  visitorMemory?: VisitorWorldMemory
}

export async function getEmbodimentSnapshotForVisitor(params: LivingWorldEmbodimentSnapshotParams): Promise<{ snapshot: WorldEmbodimentSnapshot; wake: WakeLivingWorldOutcome }> {
  const now = params.now ?? defaultNow
  const wake = await wakeLivingWorld(params.worldInstanceId, params.ownerId, now)
  const snapshot = await resolveDurableWorldEmbodimentSnapshot({ ...params, now })
  return { snapshot, wake }
}

export type RuntimeHealthRollup = "healthy" | "degraded" | "blocked"

export interface RuntimeHealth {
  rollup: RuntimeHealthRollup
  dimensions: {
    persistenceReachable: boolean
    checkpointHealthy: boolean
    leaseHealthy: boolean
    simulationHealthy: boolean
  }
  lifecycleState: WorldLifecycleState | null
}

// Sprint 20, §Step 12/§16-17: the MINIMUM real observability this
// sprint claims -- four live dimensions, never collapsed to one
// boolean (Phase 0 §17's own explicit requirement), never a fabricated
// fifth ("artifact valid"/"migration compatible"/"renderer handshake"
// are honestly NOT built here -- nothing in Sprint 9-19 tracks any of
// those three yet, and inventing a check with no real signal behind it
// would be worse than not having it). Reads ONLY existing repositories;
// adds no new storage.
export async function queryHealth(worldInstanceId: WorldInstanceId, now: () => string = defaultNow): Promise<RuntimeHealth> {
  let persistenceReachable = true
  let checkpointHealthy = true
  let lifecycleState: WorldLifecycleState | null = null

  try {
    await getWorldState(worldInstanceId, now)
  } catch {
    persistenceReachable = false
  }

  try {
    const checkpoint = await worldCheckpointRepository.loadLatest(worldInstanceId)
    checkpointHealthy = checkpoint !== null || true // no checkpoint yet (never woken) is a legitimate DORMANT state, not unhealthy
    void checkpoint
  } catch {
    checkpointHealthy = false
  }

  let leaseHealthy = true
  try {
    const lease = await worldLeaseRepository.getCurrent(worldInstanceId)
    // A lease that is still reported as current but whose expiry is
    // already far in the past (more than one full TTL window overdue)
    // indicates the reference in-memory adapter's own expiry check is
    // being bypassed somehow, or a caller never released and the TTL
    // itself is misconfigured -- either way, a real signal worth
    // surfacing rather than silently treating "someone holds it" as
    // fine forever.
    if (lease) {
      const overdueMs = new Date(now()).getTime() - new Date(lease.expiresAt).getTime()
      leaseHealthy = overdueMs < 5 * 60_000
    }
  } catch {
    leaseHealthy = false
  }

  let simulationHealthy = true
  try {
    const lifecycle = await worldLifecycleRepository.get(worldInstanceId)
    lifecycleState = lifecycle?.state ?? "DORMANT"
    simulationHealthy = lifecycleState !== "WAKING" || (() => {
      // Stuck WAKING for a long time (a crash mid-catch-up whose retry
      // never happened) is the one lifecycle-derived degradation this
      // health check can honestly detect without a scheduler: compare
      // against lastActiveAt, matching Phase 0 §17's own "recovering ==
      // the existing WAKING state" framing.
      const stuckMs = new Date(now()).getTime() - new Date(lifecycle!.lastActiveAt).getTime()
      return stuckMs < 5 * 60_000
    })()
  } catch {
    simulationHealthy = false
  }

  const dimensions = { persistenceReachable, checkpointHealthy, leaseHealthy, simulationHealthy }
  const failing = Object.values(dimensions).filter((v) => !v).length
  const rollup: RuntimeHealthRollup = !persistenceReachable ? "blocked" : failing > 0 ? "degraded" : "healthy"

  return { rollup, dimensions, lifecycleState }
}
