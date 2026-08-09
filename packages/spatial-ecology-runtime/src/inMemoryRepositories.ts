import type { WorldId } from "@avatark/runtime-contracts"
import type { AppendTerritoryClaimResult, PatchId, TerritoryClaim, TerritoryClaimRepository } from "@avatark/spatial-ecology-contracts"

// A reference adapter only -- matching every existing In-Memory*
// Repository in this codebase (Sprint 7-15). worldId-scoped, per Sprint
// 9's own absolute worldInstanceId isolation requirement.
export class InMemoryTerritoryClaimRepository implements TerritoryClaimRepository {
  private readonly byWorld = new Map<WorldId, Map<string, TerritoryClaim>>()

  private worldMap(worldId: WorldId): Map<string, TerritoryClaim> {
    if (!this.byWorld.has(worldId)) this.byWorld.set(worldId, new Map())
    return this.byWorld.get(worldId)!
  }

  async append(claim: TerritoryClaim): Promise<AppendTerritoryClaimResult> {
    const map = this.worldMap(claim.worldId)
    if (map.has(claim.id)) return { status: "duplicate_ignored" }
    map.set(claim.id, claim)
    return { status: "appended" }
  }

  async listByPatch(worldId: WorldId, patchId: PatchId): Promise<TerritoryClaim[]> {
    return [...this.worldMap(worldId).values()].filter((claim) => claim.patchId === patchId)
  }

  async listByWorld(worldId: WorldId): Promise<TerritoryClaim[]> {
    return [...this.worldMap(worldId).values()]
  }
}
