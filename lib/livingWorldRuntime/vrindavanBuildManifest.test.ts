import { test } from "node:test"
import assert from "node:assert/strict"
import { LIVING_VRINDAVAN_BUILD_MANIFEST } from "./vrindavanBuildManifest.ts"

test("Living Vrindavan Build Manifest: worldId/worldDefinitionId match the real, Approved StudioK world artifact", () => {
  assert.equal(LIVING_VRINDAVAN_BUILD_MANIFEST.worldId, "living-vrindavan")
  assert.equal(LIVING_VRINDAVAN_BUILD_MANIFEST.worldDefinitionId, "living-vrindavan")
  assert.equal(LIVING_VRINDAVAN_BUILD_MANIFEST.displayName, "Living Vrindavan")
})

test("Living Vrindavan Build Manifest: StudioK artifact provenance is read from the real vendor manifest, not fabricated", () => {
  const { world, experience, systems } = LIVING_VRINDAVAN_BUILD_MANIFEST.studioKArtifactProvenance
  assert.equal(world.specId, "STK-SPEC-002")
  assert.equal(world.specStatus, "Approved")
  assert.equal(experience.specId, "STK-SPEC-004")
  assert.equal(systems.specId, "STK-SPEC-006")
  for (const pin of [world, experience, systems]) {
    assert.ok(pin.checksum.length > 0, `${pin.artifactId} must carry a real checksum`)
    assert.ok(pin.pinnedCommit.length > 0, `${pin.artifactId} must carry a real pinned commit`)
  }
})

test("Living Vrindavan Build Manifest: canon provenance cites only real STK-CAN ids", () => {
  for (const docId of LIVING_VRINDAVAN_BUILD_MANIFEST.canonProvenance.docIds) {
    assert.match(docId, /^STK-CAN-\d{3}$/)
  }
  assert.ok(LIVING_VRINDAVAN_BUILD_MANIFEST.canonProvenance.docIds.length > 0)
})

test("Living Vrindavan Build Manifest: initial season is Vasanta, not any of the five other Vrindavan seasons Canon eventually authors", () => {
  assert.equal(LIVING_VRINDAVAN_BUILD_MANIFEST.initialSeason.id, "vasanta")
  assert.equal(LIVING_VRINDAVAN_BUILD_MANIFEST.initialSeason.order, 1)
})

test("Living Vrindavan Build Manifest: spatial provenance patch count matches the real 4 Approved locations, no invented geography", () => {
  assert.equal(LIVING_VRINDAVAN_BUILD_MANIFEST.spatialSpecProvenance.patchCount, 4)
})

test("Living Vrindavan Build Manifest: world extent is the Build 01 500m x 500m frame, never Living Forest's larger sector scale", () => {
  assert.equal(LIVING_VRINDAVAN_BUILD_MANIFEST.worldExtent.approximateWidthMeters, 500)
  assert.equal(LIVING_VRINDAVAN_BUILD_MANIFEST.worldExtent.approximateHeightMeters, 500)
})

test("Living Vrindavan Build Manifest: renderer capability expectations never require a renderer to own simulation state", () => {
  assert.equal(LIVING_VRINDAVAN_BUILD_MANIFEST.rendererCapabilityExpectations.requiresRendererOwnedSimulationState, false)
  assert.equal(LIVING_VRINDAVAN_BUILD_MANIFEST.rendererCapabilityExpectations.acceptsSemanticSnapshotOnly, true)
})
