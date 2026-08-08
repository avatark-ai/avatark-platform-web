import type { Timestamp } from "@avatark/runtime-contracts"
import type { WorldInstanceId, WorldOwnerId } from "./ids.ts"

// Sprint 9, Phase 7: renderer/cloud-neutral execution-ownership contract.
// At any logical moment, one execution owner is responsible for
// authoritative advancement of a given world instance. This is the
// EXECUTION CONTRACT, not an infrastructure deployment -- no Kubernetes,
// no Redis, no distributed lock service; see
// @avatark/world-persistence-runtime's InMemoryWorldLeaseRepository for
// the reference adapter this sprint actually exercises.
export interface WorldLease {
  readonly worldInstanceId: WorldInstanceId
  readonly ownerId: WorldOwnerId
  readonly leaseVersion: number
  readonly acquiredAt: Timestamp
  readonly expiresAt: Timestamp
}

export type LeaseAcquireResult =
  | { readonly status: "acquired"; readonly lease: WorldLease }
  | { readonly status: "conflict"; readonly heldBy: WorldLease }

export interface WorldLeaseRepository {
  // Succeeds if no lease currently exists, or the existing lease has
  // expired (expiresAt <= now). Otherwise resolves to a `conflict`
  // result carrying the lease actually held -- never overwrites it.
  acquire(worldInstanceId: WorldInstanceId, ownerId: WorldOwnerId, ttlMs: number, now: () => Timestamp): Promise<LeaseAcquireResult>
  // Succeeds only if `leaseVersion` matches the current lease AND
  // `ownerId` matches -- otherwise `conflict`. Extends `expiresAt` and
  // bumps `leaseVersion`.
  renew(worldInstanceId: WorldInstanceId, ownerId: WorldOwnerId, leaseVersion: number, ttlMs: number, now: () => Timestamp): Promise<LeaseAcquireResult>
  // No-op if the lease was already released or expired. Never throws
  // for "already gone" -- release is idempotent by design (Phase 9).
  release(worldInstanceId: WorldInstanceId, ownerId: WorldOwnerId, leaseVersion: number): Promise<void>
  getCurrent(worldInstanceId: WorldInstanceId): Promise<WorldLease | null>
}
