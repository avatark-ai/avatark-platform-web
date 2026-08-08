import type { LocationId } from "@avatark/runtime-contracts"

// Sprint 8, Phase 3: the smallest renderer-neutral spatial vocabulary --
// deliberately not a scene graph. A SpatialNode's `id` is a location id
// 1:1 (no separate "region" identity has ever been authored for Living
// Vrindavan -- inventing one would be exactly the "parallel concept"
// Phase 0 says not to create). `position` is a normalized, abstract
// layout derived generically from any WorldDefinition's own graph shape
// (order + parent), never a real-world/Unreal-ready coordinate -- no
// Living World has authored real spatial geometry yet, and this sprint
// does not invent one on their behalf.
export interface SpatialTransform {
  position: { x: number; y: number; z: number }
}

// A trivial sphere bound -- enough to prove the contract shape without
// claiming real collision/occlusion geometry.
export interface SpatialBounds {
  radius: number
}

export interface SpatialNode {
  id: LocationId
  parentId: LocationId | null
  role: string
  transform: SpatialTransform
  bounds: SpatialBounds
  tags: string[]
}
