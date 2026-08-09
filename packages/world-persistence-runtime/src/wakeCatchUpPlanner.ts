import type { SimulationTick, WakeCatchUpPlan, WorldSystemEventRecord } from "@avatark/world-persistence-contracts"
import type { TickPolicy } from "./tickPolicy.ts"

export interface ResolveTicksToApplyParams {
  // The last wake attempt's own confirmed anchor -- i.e. the
  // (lastActiveAt, lastCheckpointTick) pair as of the last time a
  // composed wake's OWN final commit succeeded (see
  // lib/worldPersistence/hostService.ts's own `commitWakeCompletion`).
  // Deliberately NOT "whatever the durable environment's current tick
  // happens to be" -- see the doc comment below for why that
  // distinction is the entire point of this function.
  lastActiveAt: string
  lastCheckpointTick: SimulationTick
  // The durable environment's ACTUAL current tick, read fresh at the
  // start of this wake attempt. May already be ahead of
  // `lastCheckpointTick` if a prior wake attempt crashed after its own
  // environment catch-up succeeded but before the composed chain's
  // final commit -- or, separately, if an explicit advanceWorld() call
  // advanced it outside any wake at all.
  currentTick: SimulationTick
  now: () => string
  tickPolicy: TickPolicy
}

// Sprint 17, crash-recovery fix (docs/SPRINT17_IMPLEMENTATION_PREP.md
// §4): the number of ticks ONE wake attempt owes the causal environment
// is the gap between two independently-derived numbers --
//
//   target  = lastCheckpointTick + ticksElapsed(lastActiveAt, now)
//             ("the tick the environment SHOULD be at right now, purely
//             as a function of wall-clock time since it was last
//             confirmed caught-up")
//
//   current = the environment's actual, freshly-read tick right now
//
// -- rather than always re-deriving the full `ticksElapsed(lastActiveAt,
// now)` window and applying it on top of whatever `current` already is.
// The two coincide (this reduces to the pre-Sprint-17 formula) whenever
// nothing touched the environment between wake attempts, which is the
// overwhelmingly common case. They diverge exactly when a previous wake
// attempt's own environment catch-up already succeeded but that
// attempt's composed final commit never happened (a crash, or any other
// reason) -- in which case `current` is already ahead of
// `lastCheckpointTick`, and subtracting it back out is what stops a
// retry from re-applying the already-applied window a second time. See
// packages/world-persistence-runtime/src/livingForestPortability.test.ts's
// own crash-recovery-retry test for the world-neutral proof, and
// lib/worldPersistence/crashRecoveryCatchUp.test.ts for the Vrindavan
// Host-layer one.
//
// Clamped at 0, never negative -- `current` can also be ahead of
// `target` for a reason THIS function has no way to distinguish from
// the crash case: an explicit advanceWorld() call (owner-gated,
// unrelated to wall-clock, and never touching the lifecycle record) can
// leave the environment ahead of what wall-clock-since-lastActiveAt
// alone would predict. That combination pre-dates Sprint 17 and is out
// of scope here; this function simply avoids throwing on it rather than
// trying to reconcile it.
export function resolveTicksToApply(params: ResolveTicksToApplyParams): number {
  const target = params.lastCheckpointTick + params.tickPolicy.ticksElapsed(new Date(params.lastActiveAt).getTime(), new Date(params.now()).getTime())
  return Math.max(0, target - params.currentTick)
}

// Sprint 17: a thin, logging/test-assertion-only descriptor of what a
// catch-up call actually did -- never a second causal mechanism, and
// never itself persisted (see @avatark/world-persistence-contracts'
// own WakeCatchUpPlan doc comment). `seasonCrossings` is read off the
// SAME `season.transitioned` WorldSystemEvent records
// computeDeterministicCatchUp already produces -- restated here, not
// recomputed by a second rule.
export function describeWakeCatchUpPlan(fromTick: SimulationTick, toTick: SimulationTick, ticksToApply: number, eventRecords: readonly Pick<WorldSystemEventRecord, "type">[]): WakeCatchUpPlan {
  const seasonCrossings = eventRecords.filter((event) => event.type === "season.transitioned").length
  return { fromTick, toTick, ticksToApply, seasonCrossings }
}
