import { test } from "node:test"
import assert from "node:assert/strict"
import { computeSpatialLayout } from "./spatialLayout.ts"
import type { WorldLocation } from "@avatark/living-world-runtime"

const VRINDAVAN_LOCATIONS: WorldLocation[] = [
  { id: "vrindavan-entry", name: "Vrindavan Entry", order: 0 },
  { id: "yamuna", name: "Yamuna", order: 1, requiresLocationIds: ["vrindavan-entry"] },
  { id: "kadamba-grove", name: "Kadamba Grove", order: 2, requiresLocationIds: ["yamuna"] },
  { id: "govardhan-path", name: "Govardhan Path", order: 2, requiresLocationIds: ["yamuna"] },
]

test("every location gets a spatial node", () => {
  const layout = computeSpatialLayout(VRINDAVAN_LOCATIONS)
  for (const location of VRINDAVAN_LOCATIONS) assert.ok(layout[location.id], `expected a node for ${location.id}`)
})

test("depth (y) increases with order, entry sits at the root", () => {
  const layout = computeSpatialLayout(VRINDAVAN_LOCATIONS)
  assert.equal(layout["vrindavan-entry"].transform.position.y, 0)
  assert.equal(layout["vrindavan-entry"].role, "entry")
  assert.ok(layout.yamuna.transform.position.y > layout["vrindavan-entry"].transform.position.y)
  assert.equal(layout["kadamba-grove"].transform.position.y, layout["govardhan-path"].transform.position.y, "siblings share depth")
})

test("siblings at the same order are spread apart on x, not stacked", () => {
  const layout = computeSpatialLayout(VRINDAVAN_LOCATIONS)
  assert.notEqual(layout["kadamba-grove"].transform.position.x, layout["govardhan-path"].transform.position.x)
})

test("parentId is derived from requiresLocationIds, and the entry location has none", () => {
  const layout = computeSpatialLayout(VRINDAVAN_LOCATIONS)
  assert.equal(layout["vrindavan-entry"].parentId, null)
  assert.equal(layout.yamuna.parentId, "vrindavan-entry")
  assert.equal(layout["kadamba-grove"].parentId, "yamuna")
})

test("layout is deterministic -- identical input always produces identical output", () => {
  const a = computeSpatialLayout(VRINDAVAN_LOCATIONS)
  const b = computeSpatialLayout(VRINDAVAN_LOCATIONS)
  assert.deepEqual(a, b)
})

test("a wholly different world's location graph produces a sensible layout too -- no Vrindavan-specific branching", () => {
  const forestLocations: WorldLocation[] = [
    { id: "forest-clearing", name: "Forest Clearing", order: 0 },
    { id: "deep-canopy", name: "Deep Canopy", order: 1, requiresLocationIds: ["forest-clearing"] },
  ]
  const layout = computeSpatialLayout(forestLocations)
  assert.equal(layout["forest-clearing"].role, "entry")
  assert.equal(layout["deep-canopy"].parentId, "forest-clearing")
})
