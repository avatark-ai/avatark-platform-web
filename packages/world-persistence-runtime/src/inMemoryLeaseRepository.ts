import type { LeaseAcquireResult, WorldInstanceId, WorldLease, WorldLeaseRepository, WorldOwnerId } from "@avatark/world-persistence-contracts"

// Sprint 9, Phase 7: reference execution-ownership adapter. Deliberately
// NOT a distributed lock service -- one process-lifetime Map, proving
// the CONTRACT (single owner at a time, explicit conflict, expiry lets
// a dead owner's lease be reclaimed) without deploying Redis/Kubernetes/
// any vendor-specific coordination primitive. A real horizontally-
// scaled deployment swaps this class for one backed by a database row
// with the same interface -- nothing above this layer would need to
// change.
export class InMemoryWorldLeaseRepository implements WorldLeaseRepository {
  private readonly leases = new Map<WorldInstanceId, WorldLease>()

  private isExpired(lease: WorldLease, now: () => string): boolean {
    return new Date(lease.expiresAt).getTime() <= new Date(now()).getTime()
  }

  async acquire(worldInstanceId: WorldInstanceId, ownerId: WorldOwnerId, ttlMs: number, now: () => string): Promise<LeaseAcquireResult> {
    const existing = this.leases.get(worldInstanceId)
    if (existing && !this.isExpired(existing, now)) {
      return { status: "conflict", heldBy: existing }
    }

    const acquiredAt = now()
    const lease: WorldLease = {
      worldInstanceId,
      ownerId,
      leaseVersion: (existing?.leaseVersion ?? 0) + 1,
      acquiredAt,
      expiresAt: new Date(new Date(acquiredAt).getTime() + ttlMs).toISOString(),
    }
    this.leases.set(worldInstanceId, lease)
    return { status: "acquired", lease }
  }

  async renew(worldInstanceId: WorldInstanceId, ownerId: WorldOwnerId, leaseVersion: number, ttlMs: number, now: () => string): Promise<LeaseAcquireResult> {
    const existing = this.leases.get(worldInstanceId)
    if (!existing || existing.ownerId !== ownerId || existing.leaseVersion !== leaseVersion) {
      if (existing) return { status: "conflict", heldBy: existing }
      throw new RangeError(`cannot renew a lease that does not exist for ${worldInstanceId}`)
    }

    const acquiredAt = now()
    const renewed: WorldLease = { ...existing, leaseVersion: existing.leaseVersion + 1, acquiredAt, expiresAt: new Date(new Date(acquiredAt).getTime() + ttlMs).toISOString() }
    this.leases.set(worldInstanceId, renewed)
    return { status: "acquired", lease: renewed }
  }

  async release(worldInstanceId: WorldInstanceId, ownerId: WorldOwnerId, leaseVersion: number): Promise<void> {
    const existing = this.leases.get(worldInstanceId)
    // Idempotent (Phase 9): releasing an already-gone, already-released,
    // or already-superseded lease is a no-op, never an error.
    if (!existing || existing.ownerId !== ownerId || existing.leaseVersion !== leaseVersion) return
    this.leases.delete(worldInstanceId)
  }

  async getCurrent(worldInstanceId: WorldInstanceId): Promise<WorldLease | null> {
    return this.leases.get(worldInstanceId) ?? null
  }
}
