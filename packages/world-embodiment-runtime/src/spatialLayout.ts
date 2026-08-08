import type { SpatialNode } from "@avatark/world-embodiment-contracts"
import type { WorldLocation } from "@avatark/living-world-runtime"

// Sprint 8, Phase 3: a generic, deterministic layout derived from any
// WorldDefinition's own graph shape -- `order` (breadth-first depth,
// already computed by whichever Host adapter built the WorldDefinition,
// e.g. vrindavanDefinition.ts) becomes the y-axis; siblings at the same
// order are spread evenly on the x-axis; `requiresLocationIds[0]`
// becomes the spatial parent. No world-specific branching -- this
// function has no knowledge Living Vrindavan exists, and produces a
// layout for ANY WorldLocation[] passed to it (proven by this package's
// own alternate-world-fixture test).
const DEPTH_SPACING = 4
const SIBLING_SPACING = 4
const DEFAULT_RADIUS = 2

export function computeSpatialLayout(locations: WorldLocation[]): Record<string, SpatialNode> {
  const byOrder = new Map<number, WorldLocation[]>()
  for (const location of locations) {
    if (!byOrder.has(location.order)) byOrder.set(location.order, [])
    byOrder.get(location.order)!.push(location)
  }

  const nodes: Record<string, SpatialNode> = {}
  for (const [order, siblings] of byOrder) {
    const count = siblings.length
    siblings.forEach((location, index) => {
      const x = (index - (count - 1) / 2) * SIBLING_SPACING
      nodes[location.id] = {
        id: location.id,
        parentId: location.requiresLocationIds?.[0] ?? null,
        role: order === 0 ? "entry" : "location",
        transform: { position: { x, y: order * DEPTH_SPACING, z: 0 } },
        bounds: { radius: DEFAULT_RADIUS },
        tags: [],
      }
    })
  }
  return nodes
}
