export type { DomainId, SectorId, QuadrantId, PatchId, LocalPlaceId, SpatialEdgeId, RouteId, TerritoryClaimId } from "./ids.ts"

export type { DomainDefinition, SectorDefinition, QuadrantDefinition, HabitatType, PatchDefinition, LocalPlaceDefinition, SpatialGrammar, SpatialMembership } from "./hierarchy.ts"

export type { SpatialRelation, SpatialEdge } from "./topology.ts"

export type { PatchState } from "./patchState.ts"

export type { TerritoryClaimStrength, TerritoryClaim, AppendTerritoryClaimResult, TerritoryClaimRepository, TerritoryPressure } from "./territory.ts"

export type { RouteDefinition, RouteState } from "./route.ts"

export type { SpatialMovementContext } from "./movement.ts"

export type { SpatialSnapshot, SpatialDeltaEntryKind, SpatialDeltaEntry, SpatialDelta } from "./snapshot.ts"
