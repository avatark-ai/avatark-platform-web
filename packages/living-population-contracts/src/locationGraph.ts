import type { LocationId } from "@avatark/runtime-contracts"

// Sprint 10, Phase 7: "the existing world graph," generically. A simple
// adjacency map -- no coordinates, no distances, just "which locations
// can an entity reach from here." The Host layer builds one from
// whatever graph its own world definition already has (for Living
// Vrindavan: the StudioK-vendored `connections[]`, read as undirected
// for entity movement -- see docs/SPRINT10_GROUND_TRUTH.md); the generic
// engine never assumes any particular world's shape.
export type WorldLocationGraph = Record<LocationId, LocationId[]>
