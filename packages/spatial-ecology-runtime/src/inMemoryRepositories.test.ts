import assert from "node:assert/strict"
import { test } from "node:test"
import type { TerritoryClaim } from "@avatark/spatial-ecology-contracts"
import { InMemoryTerritoryClaimRepository } from "./inMemoryRepositories.ts"

function claim(overrides: Partial<TerritoryClaim> = {}): TerritoryClaim {
  return { id: "claim-1", worldId: "world-1", homeRangeId: "hr-1", ownerType: "GROUP", ownerId: "herd-1", patchId: "patch-a", strength: "PRIMARY", establishedTick: 0, ...overrides }
}

test("InMemoryTerritoryClaimRepository: append is idempotent by id", async () => {
  const repo = new InMemoryTerritoryClaimRepository()
  const first = await repo.append(claim())
  const second = await repo.append(claim())
  assert.equal(first.status, "appended")
  assert.equal(second.status, "duplicate_ignored")
  assert.equal((await repo.listByWorld("world-1")).length, 1)
})

test("InMemoryTerritoryClaimRepository: worldInstanceId isolation -- two worlds never see each other's claims", async () => {
  const repo = new InMemoryTerritoryClaimRepository()
  await repo.append(claim({ worldId: "world-a" }))
  await repo.append(claim({ worldId: "world-b", id: "claim-2" }))
  assert.equal((await repo.listByWorld("world-a")).length, 1)
  assert.equal((await repo.listByWorld("world-b")).length, 1)
  assert.equal((await repo.listByWorld("world-a"))[0].worldId, "world-a")
})

test("InMemoryTerritoryClaimRepository: listByPatch filters correctly", async () => {
  const repo = new InMemoryTerritoryClaimRepository()
  await repo.append(claim({ id: "claim-a", patchId: "patch-a" }))
  await repo.append(claim({ id: "claim-b", patchId: "patch-b" }))
  const byPatchA = await repo.listByPatch("world-1", "patch-a")
  assert.equal(byPatchA.length, 1)
  assert.equal(byPatchA[0].id, "claim-a")
})
