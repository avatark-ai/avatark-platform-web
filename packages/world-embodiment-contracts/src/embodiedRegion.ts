import type { LocationId } from "@avatark/runtime-contracts"
import type { EncounterPresentation } from "./encounterPresentation.ts"
import type { EntityPresentation } from "./entityPresentation.ts"
import type { EnvironmentPresentation } from "./environmentPresentation.ts"
import type { SpatialNode } from "./spatial.ts"

// Sprint 8, Phase 3: one location's full embodiment -- the "region" node
// in world -> region -> {environment, entities, encounters}. Terrain/
// water/vegetation are modeled as semantic fields on `environment`
// (Phase 7), not as separate spatial child nodes -- no Living World has
// authored distinct terrain/water/vegetation identities yet, and
// inventing sub-nodes for content that was never spatially authored
// would be exactly the over-building Phase 2's own instruction warns
// against ("do NOT create a generic game engine").
export interface EmbodiedRegion {
  readonly locationId: LocationId
  readonly name: string
  readonly spatialNode: Readonly<SpatialNode>
  readonly environment: Readonly<EnvironmentPresentation>
  readonly entities: readonly Readonly<EntityPresentation>[]
  readonly encounters: readonly Readonly<EncounterPresentation>[]
}
