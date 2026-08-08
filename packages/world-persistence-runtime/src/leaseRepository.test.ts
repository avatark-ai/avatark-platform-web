import { test } from "node:test"
import assert from "node:assert/strict"
import { InMemoryWorldLeaseRepository } from "./inMemoryLeaseRepository.ts"

const worldInstanceId = "living-vrindavan"

// Test matrix #9: execution ownership conflict rejected.
test("a second owner cannot acquire a lease already held by another owner", async () => {
  const repo = new InMemoryWorldLeaseRepository()
  const now = () => "2026-08-08T00:00:00.000Z"

  const first = await repo.acquire(worldInstanceId, "worker-a", 60_000, now)
  assert.equal(first.status, "acquired")

  const second = await repo.acquire(worldInstanceId, "worker-b", 60_000, now)
  assert.equal(second.status, "conflict")
  if (second.status === "conflict") assert.equal(second.heldBy.ownerId, "worker-a")
})

test("a lease can be acquired once it has expired, even by a different owner", async () => {
  const repo = new InMemoryWorldLeaseRepository()
  await repo.acquire(worldInstanceId, "worker-a", 1_000, () => "2026-08-08T00:00:00.000Z")

  const afterExpiry = await repo.acquire(worldInstanceId, "worker-b", 60_000, () => "2026-08-08T00:05:00.000Z")
  assert.equal(afterExpiry.status, "acquired")
  if (afterExpiry.status === "acquired") assert.equal(afterExpiry.lease.ownerId, "worker-b")
})

test("renew fails with a conflict when the lease was taken over by a different owner or version", async () => {
  const repo = new InMemoryWorldLeaseRepository()
  const now = () => "2026-08-08T00:00:00.000Z"
  const acquired = await repo.acquire(worldInstanceId, "worker-a", 60_000, now)
  assert.equal(acquired.status, "acquired")
  if (acquired.status !== "acquired") return

  const staleRenew = await repo.renew(worldInstanceId, "worker-a", acquired.lease.leaseVersion + 5, 60_000, now)
  assert.equal(staleRenew.status, "conflict")

  const wrongOwnerRenew = await repo.renew(worldInstanceId, "worker-z", acquired.lease.leaseVersion, 60_000, now)
  assert.equal(wrongOwnerRenew.status, "conflict")
})

test("renew succeeds for the current owner+version and extends expiry", async () => {
  const repo = new InMemoryWorldLeaseRepository()
  const acquired = await repo.acquire(worldInstanceId, "worker-a", 1_000, () => "2026-08-08T00:00:00.000Z")
  assert.equal(acquired.status, "acquired")
  if (acquired.status !== "acquired") return

  const renewed = await repo.renew(worldInstanceId, "worker-a", acquired.lease.leaseVersion, 60_000, () => "2026-08-08T00:00:00.500Z")
  assert.equal(renewed.status, "acquired")
  if (renewed.status === "acquired") {
    assert.ok(new Date(renewed.lease.expiresAt).getTime() > new Date(acquired.lease.expiresAt).getTime())
  }
})

// Test matrix #10 (idempotency): release is safe to retry.
test("release is idempotent -- releasing an already-released lease is a no-op, never an error", async () => {
  const repo = new InMemoryWorldLeaseRepository()
  const acquired = await repo.acquire(worldInstanceId, "worker-a", 60_000, () => "2026-08-08T00:00:00.000Z")
  assert.equal(acquired.status, "acquired")
  if (acquired.status !== "acquired") return

  await repo.release(worldInstanceId, "worker-a", acquired.lease.leaseVersion)
  await repo.release(worldInstanceId, "worker-a", acquired.lease.leaseVersion)
  assert.equal(await repo.getCurrent(worldInstanceId), null)
})

test("release from the wrong owner or stale version is a no-op -- it never revokes a still-valid lease held by someone else", async () => {
  const repo = new InMemoryWorldLeaseRepository()
  const acquired = await repo.acquire(worldInstanceId, "worker-a", 60_000, () => "2026-08-08T00:00:00.000Z")
  assert.equal(acquired.status, "acquired")
  if (acquired.status !== "acquired") return

  await repo.release(worldInstanceId, "worker-b", acquired.lease.leaseVersion)
  const stillHeld = await repo.getCurrent(worldInstanceId)
  assert.ok(stillHeld)
  assert.equal(stillHeld?.ownerId, "worker-a")
})
