import type { EntityId } from "@avatark/living-systems-contracts"
import type { DomainId, LocalPlaceId, PatchId, QuadrantId, SectorId } from "@avatark/spatial-ecology-contracts"

// Sprint 18, Phase 0 §11/§18: left as an explicit "SUBJECT TO SPRINT 16
// RECONCILIATION" placeholder while Sprint 16 was itself still Phase 0.
// Sprint 16 has since landed (`feature/sprint16-spatial-ecology @
// 5d1c76d`) with a real, closed Domain -> Sector -> Quadrant -> Patch ->
// Local Place hierarchy -- these are the REAL ids from
// `@avatark/spatial-ecology-contracts`, not the Phase 0 sketch's
// placeholder `string` fields. A canonical event must not automatically
// affect every entity everywhere unless its authored scope says so;
// this closed union is how that requirement is expressed at whatever
// granularity Sprint 16's real hierarchy supports.
export type CanonicalEventProjectionScope =
  | { level: "WORLD" }
  | { level: "DOMAIN"; domainId: DomainId }
  | { level: "SECTOR"; sectorId: SectorId }
  | { level: "QUADRANT"; quadrantId: QuadrantId }
  | { level: "PATCH"; patchId: PatchId }
  | { level: "LOCAL_PLACE"; localPlaceId: LocalPlaceId }
  | { level: "ENTITY_SET"; entityIds: EntityId[] }
