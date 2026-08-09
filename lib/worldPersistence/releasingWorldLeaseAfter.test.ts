import { test } from "node:test"
import assert from "node:assert/strict"
import { LeaseConflictError } from "@avatark/world-persistence-contracts"
import { catchUpCausalEnvironment, releasingWorldLeaseAfter, wakeWorld } from "./hostService.ts"
import { worldLeaseRepository } from "./singleton.ts"

// Sprint 20, §10/§45 debt #2: `releasingWorldLeaseAfter` is a NEW,
// additive primitive -- not yet wired into `wakeWorld` or any composed
// wakeWorldWith* function (see hostService.ts's own doc comment on why
// that would break the real, existing, tested "wake then explicitly
// advance in a later request, same lease" workflow). These tests prove
// the primitive itself is correct, ready for the Sprint 20 v1 facade
// (`wakeLivingWorld`, not yet built) to compose it as its OWN session
// boundary.

test("releases whatever the wrapped function acquired, once it returns successfully", async () => {
  const worldInstanceId = "lease-release-after-success"
  const now = () => "2026-08-08T00:00:00.000Z"

  await releasingWorldLeaseAfter(worldInstanceId, "owner-a", () => catchUpCausalEnvironment(worldInstanceId, "owner-a", now))

  assert.equal(await worldLeaseRepository.getCurrent(worldInstanceId), null)
})

test("releases whatever the wrapped function acquired even when it throws afterward", async () => {
  const worldInstanceId = "lease-release-after-throw"
  const now = () => "2026-08-08T00:00:00.000Z"

  await assert.rejects(
    () =>
      releasingWorldLeaseAfter(worldInstanceId, "owner-a", async () => {
        await catchUpCausalEnvironment(worldInstanceId, "owner-a", now)
        throw new Error("simulated failure after the lease was acquired but before this call finished")
      }),
    /simulated failure/,
  )

  assert.equal(await worldLeaseRepository.getCurrent(worldInstanceId), null, "the lease must not be left dangling just because the caller threw")
})

test("is a safe no-op when the wrapped function never acquired anything", async () => {
  const worldInstanceId = "lease-release-noop-never-acquired"

  const result = await releasingWorldLeaseAfter(worldInstanceId, "owner-a", async () => "no lease touched here")
  assert.equal(result, "no lease touched here")
  assert.equal(await worldLeaseRepository.getCurrent(worldInstanceId), null)
})

test("never releases a lease actually held by a different owner -- rejects the caller's own attempt, leaves the real holder untouched", async () => {
  const worldInstanceId = "lease-release-never-touches-other-owner"
  const now = () => "2026-08-08T00:00:00.000Z"

  const otherOwnersLease = await worldLeaseRepository.acquire(worldInstanceId, "owner-other", 60_000, now)
  assert.equal(otherOwnersLease.status, "acquired")

  await assert.rejects(() => releasingWorldLeaseAfter(worldInstanceId, "owner-a", () => catchUpCausalEnvironment(worldInstanceId, "owner-a", now)), LeaseConflictError)

  const stillHeld = await worldLeaseRepository.getCurrent(worldInstanceId)
  assert.ok(stillHeld)
  assert.equal(stillHeld?.ownerId, "owner-other", "owner-a's failed, rejected attempt must never release owner-other's real lease")
})

test("a competing owner is rejected while the lease is genuinely still held, independent of this wrapper", async () => {
  const worldInstanceId = "lease-release-competing-owner-still-live"
  const now = () => "2026-08-08T00:00:00.000Z"

  const held = await worldLeaseRepository.acquire(worldInstanceId, "owner-a", 60_000, now)
  assert.equal(held.status, "acquired")

  await assert.rejects(() => wakeWorld(worldInstanceId, "owner-b", now), LeaseConflictError)

  if (held.status === "acquired") await worldLeaseRepository.release(worldInstanceId, "owner-a", held.lease.leaseVersion)
})

test("after a successful release, the SAME owner can re-acquire immediately -- no need to wait out the TTL", async () => {
  const worldInstanceId = "lease-release-reacquire-same-owner"
  const now = () => "2026-08-08T00:00:00.000Z"

  await releasingWorldLeaseAfter(worldInstanceId, "owner-a", () => catchUpCausalEnvironment(worldInstanceId, "owner-a", now))
  const second = await worldLeaseRepository.acquire(worldInstanceId, "owner-a", 60_000, now)
  assert.equal(second.status, "acquired", "same owner should not have to wait out the 60s TTL once the prior lease was actually released")
})

test("after a successful release, a DIFFERENT owner can also acquire immediately", async () => {
  const worldInstanceId = "lease-release-reacquire-different-owner"
  const now = () => "2026-08-08T00:00:00.000Z"

  await releasingWorldLeaseAfter(worldInstanceId, "owner-a", () => catchUpCausalEnvironment(worldInstanceId, "owner-a", now))
  const second = await worldLeaseRepository.acquire(worldInstanceId, "owner-b", 60_000, now)
  assert.equal(second.status, "acquired")
})

test("multi-world isolation: releasing one world's lease never touches a different world's lease held by the same owner", async () => {
  const worldA = "lease-release-multi-world-a"
  const worldB = "lease-release-multi-world-b"
  const now = () => "2026-08-08T00:00:00.000Z"

  await worldLeaseRepository.acquire(worldB, "owner-a", 60_000, now)
  await releasingWorldLeaseAfter(worldA, "owner-a", () => catchUpCausalEnvironment(worldA, "owner-a", now))

  assert.equal(await worldLeaseRepository.getCurrent(worldA), null, "world A's own lease is released")
  const worldBLease = await worldLeaseRepository.getCurrent(worldB)
  assert.ok(worldBLease, "world B's lease, held by the same ownerId, must be completely unaffected by world A's release")
  assert.equal(worldBLease?.ownerId, "owner-a")

  await worldLeaseRepository.release(worldB, "owner-a", worldBLease!.leaseVersion)
})
