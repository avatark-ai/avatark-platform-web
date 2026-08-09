import type { LocationId } from "@avatark/runtime-contracts"
import type { DomainId, LocalPlaceId, PatchId, QuadrantId, SectorId } from "./ids.ts"

// Sprint 16, Phase 0 -> implementation: the STANDARD renderer-neutral
// spatial hierarchy (World -> Domain -> Sector -> Quadrant -> Patch ->
// Local Place -> Entity). Every level below is a STATIC, StudioK/Host-
// authored DEFINITION -- versioned with the world's own grammar, never
// per-instance runtime state (the same "definition vs state" split
// EntityArchetype/SeasonDefinition already hold). A level's own
// cardinality and physical size is world-grammar DATA, never an engine
// constant -- see `nominalExtentDescription` below, which is descriptive
// metadata only and is NEVER consulted by causal/movement logic (Phase
// 0 architecture doc, geometry-vs-topology distinction).
//
// A level MAY legitimately collapse to exactly one implicit instance
// (Living Vrindavan's own current scale, see
// lib/spatialEcology/vrindavanSpatialDefinition.ts) -- nothing here
// requires a world to populate every level with more than one record.

export interface DomainDefinition {
  id: DomainId
  name: string
  sectorIds: SectorId[]
}

export interface SectorDefinition {
  id: SectorId
  domainId: DomainId
  name: string
  /** Descriptive only -- e.g. "1 mile x 1 mile (~640 acres / ~2.59 km2)".
   * Never consulted by runtime logic; a planning-grammar fact, not
   * live geometry. */
  nominalExtentDescription?: string
  quadrantIds: QuadrantId[]
}

export interface QuadrantDefinition {
  id: QuadrantId
  sectorId: SectorId
  /** World-authored label, e.g. Forest's "NW"/"NE"/"SW"/"SE" -- never a
   * fixed 4-way enum; some worlds may not use compass quadrants at all. */
  label: string
  nominalExtentDescription?: string
  patchIds: PatchId[]
}

// World-authored vocabulary, e.g. "riverbank" | "grove" | "threshold" --
// deliberately NOT a closed cross-world union (Sprint 16 mission: "do
// not encode forest ecology as universal world ontology").
export type HabitatType = string

export interface PatchDefinition {
  id: PatchId
  quadrantId: QuadrantId | null
  habitatType: HabitatType
  /** The bridge to today's addressable unit -- every existing LocationId
   * this Patch contains. Sprint 16 does not introduce sub-location
   * geometry finer than what Canon already names. */
  containedLocationIds: LocationId[]
  nominalExtentDescription?: string
}

export interface LocalPlaceDefinition {
  id: LocalPlaceId
  patchId: PatchId
  /** Today (1:1 for Living Vrindavan): a Local Place IS an existing
   * LocationId. */
  locationId: LocationId
  /** Experiential/narrative significance -- populated only where an
   * existing Approved artifact already names it; never invented to
   * fill the model. */
  experientialSignificance?: string
}

// The complete, static, world-authored spatial grammar -- passed
// directly by the Host layer to every spatial-ecology-runtime function,
// the same "just data, passed in" convention SeasonDefinition[]/
// EntityArchetype[]/AdaptationRule[] already use. Never looked up by a
// WorldDefinitionId at runtime -- the Host already knows which grammar
// belongs to which world instance, exactly as it already does for every
// other world-authored config.
export interface SpatialGrammar {
  domains: DomainDefinition[]
  sectors: SectorDefinition[]
  quadrants: QuadrantDefinition[]
  patches: PatchDefinition[]
  localPlaces: LocalPlaceDefinition[]
}

// A derived (never stored) lookup: which spatial units a given
// LocationId belongs to. Always computed from a SpatialGrammar, never
// carried on LivingEntityState itself -- LivingEntityState.locationId
// remains completely unmodified (Sprint 16 Phase 0 architecture,
// backward-compatibility section).
export interface SpatialMembership {
  locationId: LocationId
  localPlaceId: LocalPlaceId | null
  patchId: PatchId | null
  quadrantId: QuadrantId | null
  sectorId: SectorId | null
  domainId: DomainId | null
}
