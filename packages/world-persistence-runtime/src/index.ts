export type { CatchUpParams, CatchUpResult } from "./catchUp.ts"
export { computeDeterministicCatchUp } from "./catchUp.ts"

export type { CreateCheckpointParams, RecoverAuthoritativeStateParams, RecoveredState } from "./checkpoint.ts"
export { createCheckpoint, recoverAuthoritativeState } from "./checkpoint.ts"

export { deriveWorldSystemEventId } from "./eventIdentity.ts"

export { nextLifecycleState, resourceTier } from "./lifecycle.ts"

export type { TickPolicy } from "./tickPolicy.ts"
export { fixedRateTickPolicy } from "./tickPolicy.ts"

export {
  InMemoryDurableWorldStateRepository,
  InMemoryDurableWorldSystemEventRepository,
  InMemoryWorldCheckpointRepository,
  InMemoryWorldInstanceRepository,
  InMemoryWorldLifecycleRepository,
} from "./inMemoryDurableRepositories.ts"

export { InMemoryWorldLeaseRepository } from "./inMemoryLeaseRepository.ts"

export type { ResolveTicksToApplyParams } from "./wakeCatchUpPlanner.ts"
export { describeWakeCatchUpPlan, resolveTicksToApply } from "./wakeCatchUpPlanner.ts"
