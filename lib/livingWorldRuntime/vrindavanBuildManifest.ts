import { LIVING_VRINDAVAN_DEFINITION, LIVING_VRINDAVAN_PROVENANCE } from "./vrindavanDefinition.ts"
import { LIVING_VRINDAVAN_SEASONS, LIVING_VRINDAVAN_SYSTEMS_PROVENANCE } from "../livingSystems/systemsDefinition.ts"
import { VRINDAVAN_SPATIAL_GRAMMAR } from "../spatialEcology/vrindavanSpatialDefinition.ts"
import manifest from "./vendor/manifest.json" with { type: "json" }

// Living Vrindavan Build 01, Phase A: the first product-level World
// Product Manifest -- a NEW, thin composition over already-existing
// provenance, never a second source of truth for anything it cites.
// Every field below is either read directly from an already-Approved
// StudioK artifact (via the same vendor/manifest.json + artifactIngestion.ts
// checksum-verification path every vrindavanXDefinition.ts file already
// uses) or is an honestly-labeled Host-layer/runtime-operational fact
// (world extent, runtime compatibility version) that Canon does not, and
// should not, own -- physical dimensions and runtime versioning are
// world-specific DATA, not spatial grammar, per Build 01's own framing.
//
// This file intentionally does NOT introduce a parallel manifest schema:
// `lib/livingWorldRuntime/vendor/manifest.json` (artifact pinning/
// checksums) and `LIVING_VRINDAVAN_PROVENANCE`/`LIVING_VRINDAVAN_SYSTEMS_PROVENANCE`
// (per-artifact canon/spec ids) already exist and are reused verbatim.

interface VendoredArtifactPin {
  artifactId: string
  specId: string
  specStatus: string
  specVersion: number
  pinnedTag: string
  pinnedCommit: string
  canonDocIds: string[]
  canonVersion: string
  checksum: string
}

function findPin(artifactId: string): VendoredArtifactPin {
  const pin = (manifest.artifacts as VendoredArtifactPin[]).find((a) => a.artifactId === artifactId)
  if (!pin) throw new Error(`vendor/manifest.json has no pinned entry for artifact "${artifactId}" -- vrindavanBuildManifest.ts is out of sync with the real vendor manifest`)
  return pin
}

export interface LivingWorldProductManifest {
  worldId: string
  worldDefinitionId: string
  displayName: string
  worldClass: string
  theme: string
  purpose: string
  // Sprint 9-20's own world-persistence family has no single exported
  // "runtime version" constant yet (Sprint 20 Part A/B's own reconciled
  // finding -- WorldRuntimeManifest/versioning fields remain unbuilt,
  // Phase 0 §5/§6). This is the honest, current substitute: the
  // product's own package.json version this world instance was
  // provisioned under, until a real runtime-version field exists.
  runtimeCompatibilityVersion: string
  studioKArtifactProvenance: {
    world: VendoredArtifactPin
    experience: VendoredArtifactPin
    systems: VendoredArtifactPin
  }
  canonProvenance: { docIds: string[]; version: string }
  experienceSpecProvenance: { specId: string; specVersion: number }
  spatialSpecProvenance: {
    // Honest, per Sprint 16 Phase 0's own unresolved question #1 and
    // vrindavanSpatialDefinition.ts's own comment: there is no separate
    // StudioK spatial-spec artifact yet. Domain/Sector/Quadrant are
    // Host-authored, degenerate (collapsed to one instance each)
    // because Canon authorizes no finer subdivision at this scale --
    // Patch is 1:1 with the 4 Approved locations, the one real spatial
    // fact StudioK's own world artifact (STK-SPEC-002) does establish.
    source: "host-authored, degenerate hierarchy over STK-SPEC-002's own 4 Approved locations"
    patchCount: number
  }
  initialSeason: { id: string; name: string; order: number }
  initialClock: { tick: number }
  initialSpatialRootId: string
  initialWorldStateSeedVersion: string
  worldExtent: { approximateWidthMeters: number; approximateHeightMeters: number; note: string }
  rendererCapabilityExpectations: {
    requiresRendererOwnedGeometry: boolean
    requiresRendererOwnedSimulationState: boolean
    acceptsSemanticSnapshotOnly: boolean
  }
}

export const LIVING_VRINDAVAN_BUILD_MANIFEST: LivingWorldProductManifest = {
  worldId: LIVING_VRINDAVAN_DEFINITION.id,
  worldDefinitionId: LIVING_VRINDAVAN_DEFINITION.id,
  displayName: LIVING_VRINDAVAN_DEFINITION.name,
  worldClass: "Living World",
  theme: "Joy & Love",
  purpose: LIVING_VRINDAVAN_DEFINITION.description ?? "",
  runtimeCompatibilityVersion: "0.1.0",
  studioKArtifactProvenance: {
    world: findPin("living-vrindavan.world"),
    experience: findPin("living-vrindavan.experience"),
    systems: findPin("living-vrindavan.systems"),
  },
  canonProvenance: { docIds: LIVING_VRINDAVAN_PROVENANCE.canonDocIds, version: LIVING_VRINDAVAN_PROVENANCE.canonVersion },
  experienceSpecProvenance: { specId: LIVING_VRINDAVAN_PROVENANCE.specId, specVersion: LIVING_VRINDAVAN_PROVENANCE.specVersion },
  spatialSpecProvenance: {
    source: "host-authored, degenerate hierarchy over STK-SPEC-002's own 4 Approved locations",
    patchCount: VRINDAVAN_SPATIAL_GRAMMAR.patches.length,
  },
  initialSeason: { id: LIVING_VRINDAVAN_SEASONS[0].id, name: LIVING_VRINDAVAN_SEASONS[0].name, order: LIVING_VRINDAVAN_SEASONS[0].order },
  initialClock: { tick: 0 },
  initialSpatialRootId: VRINDAVAN_SPATIAL_GRAMMAR.domains[0].id,
  initialWorldStateSeedVersion: LIVING_VRINDAVAN_SYSTEMS_PROVENANCE.specVersion.toString(),
  worldExtent: {
    approximateWidthMeters: 500,
    approximateHeightMeters: 500,
    note: "Build 01's own first practical implementation frame (see docs/LIVING_VRINDAVAN_BUILD_01_FINAL_REPORT.md) -- an operational/runtime fact, never a Canon claim. Do not import Living Forest's larger sector-size convention here.",
  },
  rendererCapabilityExpectations: {
    requiresRendererOwnedGeometry: false,
    requiresRendererOwnedSimulationState: false,
    acceptsSemanticSnapshotOnly: true,
  },
}
