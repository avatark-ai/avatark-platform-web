export { buildSpatialMembershipIndex, membershipFor } from "./membershipIndex.ts"

export { resolvePlaceEffectLocationId } from "./adaptationEffectLocation.ts"

export { reachablePatchIds, resolveMovementPermeability } from "./topologyResolution.ts"

export type { ResolvePatchStateParams } from "./patchStateResolution.ts"
export { resolvePatchState } from "./patchStateResolution.ts"

export type { PatchOccupancyRollup } from "./occupancyRollup.ts"
export { rollupPatchOccupancy } from "./occupancyRollup.ts"

export { deriveTerritoryClaimId, resolveTerritoryClaims, resolveTerritoryPressure } from "./territoryResolution.ts"

export { resolveRouteState } from "./routeResolution.ts"

export type { BuildSpatialMovementContextParams } from "./movementContext.ts"
export { buildSpatialMovementContext } from "./movementContext.ts"

export { diffSpatialSnapshot } from "./snapshotDiff.ts"

export { InMemoryTerritoryClaimRepository } from "./inMemoryRepositories.ts"
