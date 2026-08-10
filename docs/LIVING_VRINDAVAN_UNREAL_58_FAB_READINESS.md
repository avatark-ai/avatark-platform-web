---
status: DOCS-ONLY -- no Unreal project, no implementation, no purchase
base: feature/living-vrindavan-build-03 @ 155dfc6 (Build 01+02+03, all CLOSED)
depends-on: Living Vrindavan Build 04 (World Experience & Place Continuity), currently running in an isolated session -- NOT reconciled against here
---

# Living Vrindavan -- Unreal 5.8 / Fab Readiness Package

This document prepares Build 05 (first real Unreal implementation) so it can
start the moment Build 04 closes and a GPU workstation exists. It creates
nothing executable: no Unreal project, no repository beyond this doc, no
asset purchase, no migration. It is branched from Build 03's own closed,
pushed tip (`feature/living-vrindavan-build-03 @ 155dfc6`) -- deliberately
NOT from the active `feature/living-vrindavan-build-04` worktree, per this
mission's own instruction not to touch Build 04 or read its uncommitted
state.

Every fact below is either (a) cited to a real file/line in this repository,
(b) cited to `living-symphony`'s real, Accepted-ADR-governed Unreal
precedent, or (c) explicitly marked PROPOSAL where it is this document's own
new recommendation. Nothing here is invented Canon.

---

## A. Build 05 entry criteria

Classification legend: **READY** (real, tested, cited) / **PARTIALLY READY**
(real mechanism exists, a real named gap remains) / **WAITING FOR BUILD 04**
(depends on Build 04's still-uncommitted scope) / **BLOCKED** (no path
forward without a decision outside this document's authority).

| Axis | Status | Evidence |
|---|---|---|
| Authoritative world snapshot | **READY** | `getWorldSnapshotForVisitor`/`getEmbodimentSnapshotForVisitor` (`lib/livingWorldHost/hostService.ts`, Sprint 9/20) are real, tested, proven against a real Vrindavan instance (`vrindavanRendererNeutral.test.ts`, Build 01 Phase T). |
| World delta | **READY** | `WorldEmbodimentDelta`/`EmbodimentDeltaEntry` (`packages/world-embodiment-contracts/src/delta.ts`, Sprint 8) + `SpatialDelta` (Sprint 16) are real, tested, and already drive `translateEmbodimentDeltaToUnrealCommands`. |
| Place/spatial projection | **PARTIALLY READY** | `EmbodiedRegion` (`embodiedRegion.ts`) is real and tested, but maps 1:1 to a Location today, one layer ABOVE the real `PatchId`/`LocalPlaceId` Sprint 16 established (Build 01 final report, limitation #4; Build 02 Phase 0 §21 item 1 -- confirmed still true, no `UnrealCommand` op names a Patch or Route directly). |
| Entity presentation | **READY** | `EntityPresentation` (`entityPresentation.ts`) real, tested; `PlaceEntity`/`UpdateEntity`/`RemoveEntity`/`MoveEntityToRegion` all real ops in `unrealCommand.ts`. |
| Population/group presentation | **PARTIALLY READY** | `EntityPresentation.groupId` + `SetGroupIntent` are real (Sprint 10). But Build 02 Phase 0 §2's own finding -- confirmed unresolved as of Build 03 (Build 03 final report §7.3, §12.2) -- is that the BASE `WorldEmbodimentSnapshot` translator (`translateToUnrealCommands`) consumes Sprint 8-level richness only; the richer composed chain (`getEmbodimentWithCanonicalEvents`, carrying population/social/rhythm/adaptation/spatial/canonical detail) is fully built and tested but not called by any production route. Unreal can receive herd/flock identity and movement today; it cannot yet receive cohesion/relationship/rhythm detail through the production path. |
| Environment presentation | **READY** | `EnvironmentPresentation`/`AtmospherePresentation`/`WaterPresentation`/`VegetationPresentation` real, tested; `UpdateEnvironment`/`SetAtmosphere`/`SetWaterState`/`SetVegetationIntent` all real ops. |
| Visitor intent return path | **READY** | `InteractionIntent` (5-variant closed union, Sprint 6/19) -> `dispatchInteractionIntent` (`lib/worldEmbodiment/intentDispatcher.ts`, Sprint 8, unchanged through Sprint 20) is the single, verified renderer-to-Host crossing point; zero write path exists elsewhere (Sprint 20 acceptance proof L). |
| Stable semantic IDs | **READY** | `entityId`/`locationId`/`PatchId` are plain strings, stable across snapshots by construction (Sprint 8's documented invariant, re-verified every build since). Never depends on an Unreal Actor GUID. |
| Canon projection boundary | **READY, with one named caveat** | `WorldInstanceCanonicalProjectionState` (Sprint 18) is real and Canon-safe by construction (`canonDocIds: []` never presented as Approved). The one existing fixture (`canonical-event-govardhan-lifting`) is Host-authored, not Approved Canon -- carry the caveat forward into any Unreal presentation of it (Build 02 Phase 0 §24). |
| Runtime API/transport | **WAITING FOR BUILD 04** | No transport is mandated by any existing contract (Build 02 Phase 0 §35, deliberately transport-agnostic). Build 04's own scope name -- "World Experience & Place Continuity" -- is the first build with a plausible reason to settle a real dev/production endpoint shape; this document does not guess one. |
| Renderer capability negotiation | **READY** | `EmbodimentRendererCapabilities` + `negotiateRegionForCapabilities` (`packages/world-embodiment-runtime/src/capabilityNegotiation.ts`) already exist and already model the exact Unreal-vs-Web axes needed (`spatial3D`, `ambientAudio`, `spatialAudio`, `animation`, `particles`, `dynamicLighting`, `haptics`, `vegetationInstances`, `waterSurface`, `largeWorldStreaming`). |

**Net read**: the semantic-truth side (snapshot, delta, entity, environment,
intent, IDs, capability negotiation) is READY today and has been since
Build 01/02. The two real open items are (1) production richness -- whether
Build 04 (or a future build) retires the "two embodiment paths" finding by
wiring the richer composed chain onto a production route, and (2) transport
-- no dev/production Runtime endpoint has ever been named for a real network
client to connect to, because nothing outside this repository has needed
one yet. Both are genuinely Build 04's to resolve or explicitly defer, not
this document's to invent.

---

## B. Unreal repository plan

**Recommendation: a dedicated `living-vrindavan-unreal` repository**, not
`.uasset` binaries inside `avatark-platform-web`, and not a folder inside
this repository's own `docs/` tree beyond this document.

Rationale, weighed against the one real precedent that exists
(`living-symphony`, LS-ADR-001, single monorepo covering
`docs/canon/specifications/unreal/` for ONE StudioK world with zero finished
art):

- Living Vrindavan already has substantial content (`STK-CAN-001..006`,
  `STK-SPEC-002/004/006`, Approved) and a real, closed Runtime with three
  finished builds -- the "no finished art yet, nothing benefits from
  splitting" condition LS-ADR-001 used to justify a monorepo does NOT hold
  here to the same degree; Vrindavan's Unreal work is starting later, against
  a more mature Runtime, and is expected to accumulate real binary asset
  weight (cattle/bird skeletal meshes, terrain textures, Water System
  content) sooner than Living Symphony's own Q1 state did.
- `avatark-platform-web` is a Next.js/TypeScript monorepo (`pnpm`
  workspaces, `packages/*`) with its own CI, lint, and test posture tuned for
  that stack. Introducing Git LFS binaries, a `.uproject`, and Unreal build
  artifacts into it would burden every existing contributor's clone/CI with
  Unreal-specific weight for zero benefit to them.
- A dedicated repository keeps the renderer-neutral boundary
  (`packages/world-embodiment-*`, `packages/renderer-contracts`) as the ONLY
  contract surface between the two repos -- exactly the boundary Build
  01/02/03 already built and verified by construction (§1 of Build 02 Phase
  0's architecture diagram). Two repos enforces this discipline structurally
  more easily than one.

**Name: `living-vrindavan-unreal`** (not `studiok-unreal-worlds`) --
proposed, not yet created. Reasoning: `living-symphony`'s own ADR-002
explicitly anticipates a SHARED `StudioKWorldCore` plugin being extracted to
a shared location once "a second StudioK world begins integrating Living
Symphony plugins or assets" (LS-ADR-001's own named revisit trigger) -- which
is exactly what a Vrindavan Unreal project starting now WOULD be. But that
extraction is a StudioK-platform-governance decision (`studiok-platform`),
outside this repository's or `avatark-platform-web`'s authority, and Build 02
Phase 0 §37/§40 already flagged it as an unresolved coordination point, not
something Build 02 (or this document) can resolve unilaterally. A
world-scoped `living-vrindavan-unreal` name:

- Ships today without waiting on that governance decision (mirrors Build 02
  Phase 0's own "self-contained fallback" posture, §37).
- Does not preclude the shared-plugin future -- if/when
  `StudioKWorldCore`/`StudioKWorldEvents`/`StudioKRhythmRuntime` are
  extracted to a shared repo, `living-vrindavan-unreal`'s own
  `StudioKVrindavanRuntime` plugin becomes a consumer of them, exactly as
  Living Symphony's sibling plugins already are of `StudioKWorldCore`
  within one monorepo today.
- A `studiok-unreal-worlds` NAME implies the multi-world split has already
  happened; it has not, and naming it that now would misrepresent governance
  state that only `studiok-platform` can actually decide.

**Do not create this repository in this session** -- proposal only, per the
mission's explicit instruction.

### Proposed topology (mirrors Build 02 Phase 0 §37, itself modeled on
Living Symphony's real, Accepted `folder-standards.md`)

```
living-vrindavan-unreal/
  docs/                            -- this class of architecture doc, mirrored/adapted from avatark-platform-web
  canon/                           -- reference-only mirrors of Approved STK-CAN-* (read-only, never authored here)
  specifications/                  -- reference-only mirrors of Approved STK-SPEC-* (read-only, never authored here)
  unreal/
    LivingVrindavan.uproject
    Config/
      DefaultEngine.ini
      DefaultGame.ini
    Content/LivingVrindavan/
      Regions/
        VrindavanEntry/
        Yamuna/
        KadambaGrove/
        GovardhanPath/
      PCG/<RegionName>/
      Niagara/<RegionName>/
      MetaSounds/<RegionName>/
    Plugins/
      StudioKVrindavanRuntime/      -- depends only on StudioKWorldCore once/if extracted; self-contained until then
      StudioKVrindavanDeveloperTools/  -- Editor-only, mirrors StudioKDeveloperTools
    Source/LivingVrindavan/
      Public/  Private/
        RuntimeBridge/              -- §D below
        Environment/                -- water/vegetation/atmosphere realization
        Entities/                   -- entity/group actor binding
        Canonical/                  -- canonical-projection staging
        Interactions/               -- InteractionIntent construction
        Debug/                      -- development/diagnostic modes
  scripts/                          -- developer setup, LFS bootstrap, CI helpers (docs-only proposal; none written yet)
```

Content organized BY REGION, Source organized BY SYSTEM -- the identical
split Build 02 Phase 0 §37 already justified against Living Symphony's own
real convention. Asset naming follows Living Symphony's real precedent
(`DA_Region_<Name>`, `PCG_<Name>_<Purpose>`, `NS_<Name>_<Effect>`,
`MSS_<Name>_<Concept>`), extended for Vrindavan's per-semantic registries
(§K below): `DA_Vegetation_<Semantic>`, `DA_Atmosphere_<Semantic>`.

### Exclusions / policy (defined in §C, applied here)

- Git LFS for binary asset types (below).
- `.gitignore` for generated/intermediate/build output.
- No `Binaries/`, `Intermediate/`, `Saved/`, `DerivedDataCache/` ever
  committed.

---

## C. Git LFS / source control policy

Concrete policy, modeled directly on `living-symphony`'s real, exercised
`.gitattributes`/`.gitignore` (Accepted `LS-ADR-003`) -- adopted here as a
PROPOSAL for `living-vrindavan-unreal`, not applied to any existing repo.

### Proposed `.gitattributes` (LFS-tracked, by extension, not by path)

```gitattributes
# Git LFS — Unreal binary formats.
*.uasset filter=lfs diff=lfs merge=lfs -text
*.umap   filter=lfs diff=lfs merge=lfs -text
*.fbx    filter=lfs diff=lfs merge=lfs -text
*.wav    filter=lfs diff=lfs merge=lfs -text
*.flac   filter=lfs diff=lfs merge=lfs -text
*.png    filter=lfs diff=lfs merge=lfs -text
*.tga    filter=lfs diff=lfs merge=lfs -text
*.exr    filter=lfs diff=lfs merge=lfs -text
*.psd    filter=lfs diff=lfs merge=lfs -text
*.ttf    filter=lfs diff=lfs merge=lfs -text
*.otf    filter=lfs diff=lfs merge=lfs -text
*.mp4    filter=lfs diff=lfs merge=lfs -text
*.mov    filter=lfs diff=lfs merge=lfs -text
```

Likely additions beyond Living Symphony's own set, given Vrindavan's real
content needs named in Build 02 Phase 0 (cattle/bird skeletal meshes, Water
System content, riverine vegetation): no new extension is actually needed --
`.fbx` covers imported source meshes, `.uasset` covers everything Unreal
persists (skeletal meshes, animations, materials, Niagara systems, Water
bodies, PCG graphs all serialize as `.uasset`/`.umap`). Verify at
implementation time whether any DCC-specific interchange format (e.g.
`.abc` Alembic for complex vegetation animation) is actually adopted before
adding it speculatively.

### Proposed `.gitignore`

```gitignore
# Unreal Engine — never commit generated/derived output
unreal/Binaries/
unreal/Intermediate/
unreal/Saved/
unreal/DerivedDataCache/
unreal/**/Binaries/
unreal/**/Intermediate/
*.VC.db
*.opensdf
*.sdf
*.opendb
*.sln
.vs/
```

### Binary asset policy

- Every `.uasset`/`.umap` is LFS-tracked, no exceptions, regardless of
  whether it originates from Fab, a custom DCC pipeline, or in-Editor
  authoring.
- Large source textures/audio (pre-import DCC files) are LFS-tracked at the
  SAME granularity as the imported `.uasset` -- do not commit an
  un-LFS-tracked "raw" copy alongside an LFS-tracked imported one.
- No binary asset is ever committed without LFS tracking already active for
  its extension -- verify `git lfs track` output before the FIRST commit of
  any new binary type, not after.

### Build artifact policy

- `Binaries/`, `Intermediate/`, `Saved/`, `DerivedDataCache/` are NEVER
  committed, matching Living Symphony's own real, exercised convention.
- Packaged builds/cooked content live in a separate build-artifact store
  (CI-attached, e.g. a release bucket) -- never in the source repository at
  all, LFS or not.

**Not applied anywhere yet** -- this is documentation for the future
`living-vrindavan-unreal` repository; no existing repository's
`.gitattributes`/`.gitignore` is modified by this document.

---

## D. Runtime Bridge plan

Using Build 02's own real ground truth (`packages/world-embodiment-runtime/src/unrealCommandTranslator.ts`,
real, tested, headless, engine-dependency-free) as the concrete backing
mechanism.

### Responsibilities (conceptual modules, not yet implemented)

| Module (conceptual) | Responsibility | Real backing contract |
|---|---|---|
| `ConnectionManager` | Establish/maintain connection to Runtime; **transport TBD, WAITING FOR BUILD 04** (§A) | none named yet -- deliberately, per Build 02 Phase 0 §35's "transport-agnostic" posture |
| `WorldInstanceBinder` | Request/receive initial snapshot; bind local session to a `worldInstanceId` | `getWorldSnapshotForVisitor`/`getEmbodimentSnapshotForVisitor` |
| `TickVersionTracker` | Maintain last-seen tick/version; detect staleness | `WorldClock`/`tick` (Sprint 7/9), `sinceTick`-style delta parameters (Build 02 Phase 0 §35) |
| `DeltaIngestor` | Ingest `WorldEmbodimentDelta`/`SpatialDelta`; apply targeted updates, never a full rebuild | `translateEmbodimentDeltaToUnrealCommands`, real, tested, proven to emit NO command for `UNCHANGED` entries |
| `SemanticBindingTable` | Bind `entityId`/`PatchId`/`LocationId` (stable strings) to renderer actor instances; renderer-local, never round-tripped to Runtime | `EntityActorBinding` concept, Build 02 Phase 0 §12 |
| `IntentEmitter` | Construct and submit `InteractionIntent` (5 real variants) from player input | `dispatchInteractionIntent` (`lib/worldEmbodiment/intentDispatcher.ts`) -- the ONLY write crossing point |
| `ReconnectResync` | On stale/lost connection, request a fresh full snapshot rather than attempting delta replay from an unknown point | Existing embodiment getters already support a full-snapshot request; no new mechanism required |
| `FailSafeGuard` | On any Runtime-side failure or malformed payload, degrade to "no update this tick," never fabricate a semantic fact | Structural: `UnrealCommand`'s closed union has no "guess" op; the bridge must reject unknown ops rather than improvise one |

### Non-negotiable invariant (repeated because it is the single most
important property of this whole plan)

**The bridge never becomes authoritative world truth.** Concretely, by
construction, matching every existing build's own verified posture:

- No Unreal object (Actor GUID, World Partition cell, PCG seed, save game)
  is ever written back into Runtime state.
- Entity position is never reported back centimeter-by-centimeter; Runtime
  only ever learns "did the entity reach `movementTargetLocationId`" via the
  NEXT snapshot's own `locationId`, never continuous telemetry (Build 02
  Phase 0 §14 -- a hard architectural boundary, not a performance
  optimization: Runtime has no contract field to receive it at all).
- If the Unreal client's local NavMesh routing detours around an obstacle,
  the semantic destination remains Runtime-owned; the detour is never
  reported.
- Streaming visibility is never semantic presence: an unloaded World
  Partition cell does not make Runtime's own `PatchState.presentEntityIds`
  drop that entity (Build 02 Phase 0 §15).

### What is deliberately NOT designed here

`unrealCommand.ts`'s real, closed union (11 ops today: `CreateRegion`,
`UpdateEnvironment`, `SetAtmosphere`, `SetWaterState`, `SetVegetationIntent`,
`PlaceEntity`, `UpdateEntity`, `RemoveEntity`, `MoveEntityToRegion`,
`SetGroupIntent`, `CreateInteractionAnchor`) is NOT extended here, and no
Patch/Route-level op is added here. Build 02 Phase 0 §21 already named the
three real gaps (`UpdatePatchEcology`, `StageCanonicalProjection`,
`UpdateGroupCohesion`, all additive, never a competing bridge) as work for
"once Build 01 closes and reconciliation confirms the shapes" -- that
reconciliation is Build 04's territory, not this document's. **Do not
hardcode against these until Build 04 stabilizes any experience-snapshot
change**, per this mission's own explicit instruction.

---

## E. First Unreal greybox plan

Smallest useful Build 05/06 visual proof, ~500m x 500m, primitive geometry
only, honoring Sprint 16's real, immutable spatial grammar (`VRINDAVAN_SPATIAL_GRAMMAR`) --
zero invented topology:

| Element | Representation | Real backing |
|---|---|---|
| Spatial root/domain (`vrindavan-domain`) | The one Unreal Level | Degenerate, 1 instance |
| Operational sector (`vrindavan-sector`) | The one World Partition grid extent, ~500m x 500m | Degenerate, 1 instance |
| Quadrants/patches | No separate Quadrant geometry (collapses entirely, §F below); 4 Patch volumes as simple bounding boxes | `patch-vrindavan-entry`/`patch-yamuna`/`patch-kadamba-grove`/`patch-govardhan-path` |
| Authorized local places | 4 flat ground planes/blockout pads, one per Patch, at the real hub-and-spoke layout (`yamuna` central; `vrindavan-entry`/`kadamba-grove`/`govardhan-path` each reachable only via `yamuna`; Kadamba Grove and Govardhan Path have NO direct edge) | Sprint 16 topology, Canon-confirmed |
| Yamuna alignment | A simple spline or flat blue-material plane along the real riverbank orientation (+X = downstream, per Build 02 Phase 0 §3) | `hydrologyCondition` band, real |
| Paths/connectivity | Simple corridor meshes/markers along the 3 real edges (`entry<->yamuna`, `yamuna<->kadamba-grove`, `yamuna<->govardhan-path`) -- no 4th edge, ever | Canon-confirmed, immutable |
| Current visitor entry point | A single spawn marker at `vrindavan-entry` (`entryLocationId`) | Real, confirmed by `vrindavanVisitorEntryNavigation.test.ts` |
| One or more living entities | 2 primitive cubes/capsules at `yamuna` (the real seeded cow herd), 1-2 at `kadamba-grove` (the real seeded bird-flock members) | Real seeded population, Build 01/03 |
| One environmental state difference | A visible parameter change between Vasanta and Grishma at `yamuna` (e.g. plane color/material shift keyed to `hydrologyCondition: moderate` vs `low`) -- the one real season pair Canon authorizes today | STK-CAN-006, Approved |

No production art. This proves: coordinate frame, topology fidelity,
snapshot ingestion, one delta, one intent round-trip -- nothing more. See §M
for the exact checklist this greybox belongs to.

---

## F. World Partition / Data Layer plan

Conservative posture for 500m x 500m, per Build 02 Phase 0 §5 (unchanged,
re-confirmed still applicable -- no Build 04 finding contradicts world
extent):

- Unreal's default World Partition grid cell (256m, configurable) means the
  entire Sector fits inside 2x2 to 4x4 cells. **Do not pre-subdivide beyond
  this without a real profiling reason.**
- **Always-loaded core**: one HLOD-0 cell covering `patch-yamuna` (the
  topological hub; every path routes through it) so the river is never a
  pop-in moment.
- **Streamed local detail**: `patch-vrindavan-entry`, `patch-kadamba-grove`,
  `patch-govardhan-path` each get their own streaming cell(s) on proximity --
  likely one cell each, given each Patch is a fraction of 500m.
- **Data Layers**: one per Local Place, for CONTENT variation (season
  overrides, encounter-staging dressing, canonical-projection dressing) --
  orthogonal to the streaming-cell grid, not a duplicate of it.

### Semantic-to-technical mapping (NOT 1:1, by explicit design)

| Semantic level | Cardinality | World Partition / Data Layer mapping |
|---|---|---|
| Domain | 1 | The one Level/World Partition world |
| Sector | 1 (degenerate) | The one grid extent |
| Quadrant | 1 (degenerate, "Core") | **No renderer unit at all** -- collapses entirely; contributes nothing a Patch mapping doesn't already provide |
| Patch (4) | 4 | Many-to-one candidate: each Patch -> ONE OR MORE World Partition cells, by physical footprint, never forced to exactly one |
| Local Place (4, 1:1 with Patch today) | 4 | One Data Layer (or Data Layer instance) per Local Place, for selective streaming/visibility -- one-to-one today, but the mechanism supports one-to-many if a future Approved artifact ever subdivides a Patch |
| Entity | dynamic | Individual actors/group proxies -- NEVER a World Partition cell or Data Layer; entities stream independently of the spatial grammar's own cells |

**Preserved invariant**: `semantic place identity != renderer streaming
unit`. A `PatchId` string never becomes a World Partition cell name, Data
Layer asset name, or Level name directly -- a renderer-side JOIN table
(`VrindavanPatchLayout`, proposed) does the mapping, never an identity
alias. Patch boundaries must never render as a visible seam, fence, or
loading-trigger volume (§E's continuity requirement).

---

## G. PCG entry plan

First PCG use cases, per Build 02 Phase 0 §8-9 (re-confirmed, unchanged):

- Vegetation density (riverbank reeds at `yamuna`, dense canopy/understory at
  `kadamba-grove`, moderate corridor-appropriate cover at `govardhan-path`,
  sparse threshold cover at `vrindavan-entry`).
- Riverbank foliage specifically (the one Patch with a `water` resource
  affordance).
- Ground cover (all 4 Patches).
- Rocks/ambient props (nice-to-have, not a v1 blocker).

**Runtime semantic state remains authoritative** -- a PCG seed change must
never alter `PatchState.ecologicalPressure` or any Runtime fact (the causal
arrow is Runtime -> PCG, never PCG -> Runtime). PCG must never decide
canonical place identity, gate legal transitions, create/remove an
`EncounterOpportunity`, or react to `CanonicalEventProjection` state directly
(Build 02 Phase 0 §9's own exhaustive exclusion list, unchanged).

### Minimum semantic parameters PCG needs from the renderer adapter

- `VegetationPresentation.semantic` (free string, already exists --
  `"dense-riverbank"`, `"sparse"`, `"flowering-forward"`, etc.) -> selects
  which PCG graph/preset runs.
- `VegetationPresentation.densityBand` (`EnvironmentalBand`, already exists)
  -> selects the density multiplier within that preset.
- Patch/region identity (`regionId`/`locationId`, already exists) -> selects
  WHICH region's PCG volume/graph instance receives the update.

No other Runtime field is needed. **Runtime never knows a PCG graph
reference, foliage-type asset path, or seed value** -- the Vegetation Preset
Registry (§K) is the only place that mapping exists, entirely content-layer.

---

## H. Yamuna realization plan

Per Build 02 Phase 0 §7 (re-confirmed, unchanged) -- no full fluid
simulation, no Canon invention (Canon authorizes hydrology BAND, never a
specific flow rate, bank shape, or elevation claim):

| Dimension | Option | Runtime-driven parameter |
|---|---|---|
| Landscape relation | Landscape sculpted with a riverbank channel; Water System sits within it | none (authored, one-time blockout) |
| Spline/water representation | Unreal Water System (spline-based body), centered at `patch-yamuna` | `hydrologyCondition` selects flow-rate/width preset |
| Bank shape | Authored blockout, honoring `riverbank` habitat silhouette -- a person decides this, not PCG | Canon-immutable topology; never Runtime-derived |
| Flow/material response | Water material flow-rate/foam/turbidity parameters | `hydrologyCondition: moderate` (Vasanta) vs `low` (Grishma) -- the one real season pair |
| Hydrology-driven visual parameters | Exposed-bank material blend increases as flow drops | same `hydrologyCondition` band |
| Vegetation masks | PCG bank-vegetation density preset shifts with `vegetationCondition` | `PatchState.vegetationCondition` |
| Navigation implications | NavMesh must route around the Water System body; riverbank paths remain walkable | none Runtime-side -- pure Unreal navmesh authoring |

**Flat baseline elevation (`z=0`) for all four Local Places in v1** -- Canon
authorizes no elevation claim; terrain sculpting may vary height WITHIN a
Patch for visual naturalism but must never encode a semantic claim ("this
Patch is higher than that one" is not a Canon fact).

**The same Runtime water state must be renderable on Web** -- enforced by
construction: both the Unreal Semantic Bridge and the Web reference adapter
consume the IDENTICAL `PatchState`/`EnvironmentPresentation` fields; neither
ever reads an Unreal Water System parameter back into anything the other
renderer needs.

---

## I. Asset category matrix

No specific products named or purchased (per instruction). Categories,
purpose, prototype alternative, semantic mapping requirement, performance
risk, cultural/canonical sensitivity, and customization likelihood --
consolidated from Build 02 Phase 0 §29's own real matrix and expanded per
this mission's fuller category list:

| Category | REQUIRED FOR GREYBOX | REQUIRED FOR FIRST BEAUTY PASS | OPTIONAL | CUSTOM LIKELY | DO NOT BUY YET | Semantic mapping requirement | Performance risk | Cultural/canonical sensitivity | Customization likelihood |
|---|---|---|---|---|---|---|---|---|---|
| Terrain materials (riverbank mud/grove soil/path dirt/threshold ground) | | X | | | X (wait for blockout) | `EnvironmentPresentation` region binding | Low | Low | Medium (habitat-type specific blends) |
| River/water (Water System content) | | X | | | X (wait for blockout+hydrology proof) | `WaterPresentation.semantic`/`levelBand` | Medium (simulation cost, measure per §32-equivalent) | Low | Low (stock Water System likely sufficient) |
| Riverbank vegetation (reeds, riverside grasses) | | X | | X (eventually, for authenticity) | X | `VegetationPresentation.semantic="dense-riverbank"` | Medium (PCG instance count) | Low | High (Indian riverine specificity) |
| Grove trees (kadamba canopy) | | X | | X (kadamba is a named species -- authenticity pass) | X | `VegetationPresentation.semantic` + habitat=`grove` | Medium | **Medium** (named Canon plant reference) | High |
| Grass/ground cover | | X | | | X | `VegetationPresentation.densityBand` | Medium (PCG scatter density) | Low | Low (generic acceptable) |
| Flowers | | | X | X (Vasanta's "flowering-forward" register is Approved content) | X | `VegetationPresentation.semantic="flowering-forward"` | Low | Low | Medium |
| Rocks | X (greybox placeholder) | | X | | X | none (no `EntityId`, no semantic gate) | Low | Low | Low |
| Paths | X (greybox placeholder) | X | | | X | Patch/edge topology binding only (never a semantic gate on legality) | Low | Low | Low |
| Cattle (skeletal mesh + idle/graze/drink/walk anim) | X (primitive placeholder) | X (real, load-bearing) | | X (highest-priority custom given real seeded presence) | X | `EntityPresentation.animationSemantic`, real seeded `cow` archetype | Low (2 seeded today) | Low | **High** -- flagged in Build 02 Phase 0 §40 as the most likely genuine schedule risk |
| Bird/flock (impostor/particle-viable) | X (primitive placeholder) | X | | | X | `EntityPresentation.groupId`, real seeded `bird-flock` archetype | Low at current scale (2 members) | Low | Medium |
| Animal animations (idle/graze/drink/rest/gather/disperse/observe) | | X | | X (cattle-specific gestures eventually) | X | `animationSemantic` free-string vocabulary (Build 02 Phase 0 §16, already named) | Low | Low | Medium |
| Ambient props (rural dressing) | | | X | | X | none | Low | Low | Low |
| Atmospheric VFX (mist, dust, light shafts) | | | X | | X | `AtmospherePresentation.semantic` | Low-Medium (Niagara particle count) | Low | Low |
| Environment audio (river/grove/wind/pastoral motifs) | | X | | X (motif-specific authoring) | X | `SensoryCue{channel, semantic}` (already exists) | Low | Low | Medium |

**Highest genuine risk, named consistently across two builds now**: cattle
assets. A real, load-bearing, always-visible entity with no adequate
long-term placeholder path (unlike birds, which remain impostor/particle-
viable even in a finished product per Build 02 Phase 0 §13). Flag this to
whoever owns asset procurement FIRST, not last.

---

## J. Marketplace decision framework

Buy / Trial / Reject, scored per candidate asset once shopping actually
begins (§L) -- no candidate scored here, framework only:

| Axis | What to check | Reject if |
|---|---|---|
| UE 5.8 compatibility | Vendor-stated engine version support; test-import before buying if a demo/trial exists | Last verified against UE <5.3 with no update history |
| Visual fit | Matches the "restrained," "contemplative"/"intimate"/"purposeful" register STK-SPEC-004 already authors for 3-of-4 Local Places (§30-equivalent style guidance, Build 02 Phase 0) | Theme-park sacredness, excessive gold/glow, fantasy VFX -- explicitly the wrong register per Approved content direction |
| Technical quality | Clean topology, reasonable poly budget, no baked-in lighting artifacts | Visible seams/artifacts in trial screenshots |
| Source-file availability | FBX/source mesh included, not only a locked `.uasset` | No source files -- blocks any customization |
| LOD/Nanite readiness | Pre-built LOD chain or clean Nanite-enabled topology | Single-LOD-only mesh with no reasonable Nanite candidacy for a hero asset (terrain, cattle) |
| Material complexity | Reasonable shader instruction count/texture sample count for the target hardware tier (§N-equivalent) | Master material with excessive layers for a background/ambient asset |
| PCG suitability | Compatible with instanced-foliage/PCG scatter workflows (for vegetation/rocks/ground cover categories) | Only usable as a single hand-placed static mesh when the category needs scatter |
| Animation quality | Clean root motion or in-place cycles matching the free-string `animationSemantic` vocabulary already named (§16-equivalent: idle/travel/graze/drink/rest/gather/disperse/observe) | Missing the specific poses Vrindavan's real behavior vocabulary needs (e.g. no drink/graze cycle for cattle) |
| Performance | Trial-tested draw call/instance cost at the measurement checkpoints already defined (§32-equivalent) | Measured cost blows the "developer workstation" baseline before any content-density increase |
| Licensing | Confirms redistribution/commercial terms match the product's actual distribution model | Any restriction incompatible with the product's real distribution plan |
| Vendor maintenance | Recent update history, responsive to engine-version bumps | Abandoned listing, no update since a much older engine version |
| Ease of replacement | Semantic mapping (§K) means swapping the underlying asset later requires only a registry update, never a code change -- verify this is genuinely true for the candidate, not assumed | An asset that leaks its own path/reference into anything beyond the Vegetation/Animation/Atmosphere Preset Registry |
| Canon/cultural sensitivity | Especially for grove/riverine vegetation (kadamba species specificity, Build 02 Phase 0 §29) and any named-plant/animal reference | Any depiction that would require inventing a Canon claim to justify (a STOP gate, §O) |

No purchase recommendations are made here or elsewhere in this document.

---

## K. Asset registry design

A NEW, Unreal-content-layer-only mapping (Data Assets), never touching
Runtime -- the exact mechanism Build 02 Phase 0 §28 already specified,
restated here as the canonical design for Build 05:

```
semantic concept (Runtime-emitted, already real)
        |
        v
Unreal-side registry (NEW, content-layer only, proposed)
        |
        v
renderer asset(s)
```

| Example | Semantic input (real, Runtime-emitted) | Registry entry | Renderer realization |
|---|---|---|---|
| Dense riverbank | `VegetationPresentation.semantic = "dense-riverbank"` | `DA_Vegetation_DenseRiverbank` -> `{ pcgGraph, foliageSet[], materialInstances[] }` | PCG scatter at `patch-yamuna` |
| Bovine herd | `EntityPresentation.presentationArchetype` (real seeded `cow` archetype) + `groupId` | `DA_EntityArchetype_Cow` -> `{ skeletalMesh, animBlueprint, groupProxyConfig }` | Individual actors (near tier) / group proxy (far tier), §13-equivalent LOD tiers |
| Grazing | `EntityPresentation.animationSemantic = "graze"` | Animation Semantic Registry entry -> `{ animBlueprint state / motion-matching entry }` | Animation state selection |

**Runtime must never know a `.uasset` path, Niagara system path, material
instance, or skeletal mesh reference** -- already independently verified true
today (Build 02 Phase 0 §28: zero such reference exists anywhere in
`packages/world-embodiment-contracts`/`-runtime`, `packages/spatial-ecology-*`,
or any `lib/*Definition.ts` file). This registry lives entirely in
`living-vrindavan-unreal`'s own `Source`/`Content`, as `UDataAsset`
subclasses keyed by the semantic string, following Living Symphony's real
naming convention. The data-driven mapping layer is the ONLY place an asset
path exists; swapping a Fab asset for another later is a registry edit, not
a code change and never a Runtime contract change.

---

## L. First shopping pass plan

**Recommended trigger, exactly as this mission's own instruction states**:

```
Unreal project boots
    -> Runtime Bridge connects (real transport, once Build 04 settles one)
    -> 500m x 500m greybox exists (§E)
    -> Yamuna/place alignment proven (§H)
    -> PCG parameter path proven (§G)
    -> exact gaps visible
    -> THEN shop
```

**Why not earlier**: shopping before the greybox exists risks buying assets
scaled/styled for the wrong silhouette (habitat character is only real once
blocked out, per §6-equivalent authored-vs-procedural discipline) or for a
PCG workflow that turns out not to fit the actual parameter path (§G) once
proven against real data.

**What CAN be investigated (not purchased) earlier**, since research has no
commitment cost:

- Cattle/bird category browsing (§I's flagged highest-risk category) --
  START LOOKING EARLY given the named schedule risk, but do not buy until
  the animation-semantic vocabulary (§16-equivalent) is confirmed against a
  real Unreal Animation Blueprint prototype, so the candidate's actual pose
  set can be checked against it.
- Water System technique research (stock vs. plugin-based) -- informational,
  no commitment.
- UE 5.8-specific Nanite/PCG capability research (what changed since 5.4,
  which Living Symphony's own hand-authored `.Build.cs` files target,
  per §37's precedent and this document's own STOP gate §O item 3).

**What should WAIT**: terrain materials, vegetation, atmospheric VFX,
ambient props -- all style- and scale-dependent on the greybox's own
silhouette; buying before that exists risks a mismatch discovered only after
purchase.

---

## M. Build 05 implementation checklist

Ordered, for the first real Unreal session once Build 04 closes and a GPU
workstation exists:

1. Provision/start the GPU workstation (§N).
2. Install/verify Unreal Engine 5.8.
3. Create/clone the `living-vrindavan-unreal` repository (§B) -- create it
   at this step, not before.
4. Enable Git LFS; verify `.gitattributes`/`.gitignore` (§C) are in place
   BEFORE the first binary commit.
5. Create the Unreal project (`LivingVrindavan.uproject`, per §B's
   topology).
6. Create the `StudioKVrindavanRuntime` plugin skeleton (self-contained
   unless StudioK governance has by then extracted `StudioKWorldCore`, §B).
7. Connect to a dev Runtime endpoint or a local fixture -- reconcile the
   real transport against whatever Build 04 settles (§A, §D); if
   unresolved, build against a local static-fixture snapshot first rather
   than blocking on transport.
8. Ingest one real snapshot (`getWorldSnapshotForVisitor`/
   `getEmbodimentSnapshotForVisitor`-shaped payload).
9. Create the 500m x 500m coordinate frame (§E, §F -- origin at
   `vrindavan-domain`'s Sector, +X downstream, +Y bank-to-shore, +Z up,
   float precision).
10. Visualize the semantic spatial nodes (4 Patch volumes, real topology,
    §E).
11. Visualize the Yamuna placeholder (§H, primitive geometry acceptable).
12. Visualize entity placeholders (§E, primitive geometry acceptable, real
    seeded population counts).
13. Process one real `WorldEmbodimentDelta` end to end (ingest -> targeted
    Unreal update -> visible change, no full rebuild).
14. Send one real `InteractionIntent` back (e.g. `VisitLocationIntent`) and
    confirm it reaches `dispatchInteractionIntent` unchanged.
15. Verify deterministic semantic mapping -- the SAME snapshot produces the
    IDENTICAL Unreal-space transform on a second run (§3-equivalent
    invariant, no per-session randomization of placement).
16. Save/commit/push -- the FIRST real commit to `living-vrindavan-unreal`,
    LFS already active.

This is the smallest real end-to-end proof, not a full Build 05 scope --
matching every prior build's own "prove the mechanism, not exhaust the
design space" discipline.

---

## N. GPU workstation handoff

Setup checklist for the future Windows/NVIDIA workstation -- checklist only,
nothing provisioned by this document:

- [ ] Windows (version matching Unreal 5.8's own stated minimum support)
- [ ] NVIDIA RTX vWS/display driver (version matching Unreal 5.8's release
      notes at install time -- verify against the actual current driver
      requirement, not assumed here)
- [ ] Unreal Engine 5.8 (Epic Games Launcher or source build, per whichever
      Fab/marketplace access model is chosen)
- [ ] Visual Studio toolchain (version Unreal 5.8 itself requires -- verify
      at install time)
- [ ] Git
- [ ] Git LFS (`git lfs install`, verified BEFORE first clone of
      `living-vrindavan-unreal`)
- [ ] Epic/Fab account access provisioned for whoever will be shopping
      (§L) or authoring content
- [ ] Disk layout: a dedicated volume/path for the Unreal project +
      `DerivedDataCache` (large, regenerable, never backed up as source)
- [ ] Project workspace location decided (mirrors this repository family's
      own worktree convention where practical, e.g. a sibling path to other
      `living-vrindavan-*` working directories, adapted for Windows)
- [ ] Repo credentials (SSH key or PAT) provisioned for
      `living-vrindavan-unreal` once it exists
- [ ] Runtime/API connectivity test: confirm the workstation can reach
      whatever dev Runtime endpoint Build 04 (or later) settles on, BEFORE
      the first real implementation session begins

Nothing above is provisioned, purchased, or installed by this session.

---

## O. Build 04 dependencies

Named explicitly, so Build 05 does not start against a stale assumption:

1. **Production embodiment richness** (§A) -- whether Build 04 (or a later
   build) retires the "two embodiment paths" finding (Build 02 Phase 0 §2,
   still open per Build 03 final report §12.2) by wiring the richer
   `getEmbodimentWithCanonicalEvents` chain onto a production route. Until
   resolved, Unreal can receive Sprint 7/8-level richness (entity identity,
   movement, environment) but not population/social/rhythm/adaptation/
   canonical detail through the production path.
2. **Transport** (§A, §D) -- no dev/production Runtime network endpoint has
   ever been named. Build 04's own scope ("World Experience & Place
   Continuity") is the first plausible place this gets settled; this
   document does not guess a shape.
3. **`worldInstanceId` convention for a real dev fixture** -- Build 01/02
   used ad hoc per-test instance IDs (`living-vrindavan-build-01-*`,
   `living-vrindavan-dev-001`); whether Build 04 establishes a stable,
   documented dev-fixture convention affects step 7 of §M.
4. **Any experience-snapshot shape change** -- if Build 04 changes what a
   snapshot/delta carries, §A's table and §D's module list need
   re-verification, not necessarily re-architecture (the mapping mechanism
   is shape-independent by design, per every prior build's own posture).
5. **Patch/Route-level `UnrealCommand` extension** (§D's "deliberately not
   designed here" section) -- explicitly deferred until Build 04 stabilizes
   any shape it might affect.

None of these block writing THIS document; all of them block actual Build 05
CODE, which is why this package is documentation-only and ends in a WAITING
state.

---

## P. STOP gates

Explicit STOP conditions -- if any of these become true, halt Build 05
planning/implementation and escalate rather than working around it:

1. **STOP** if Build 04 materially changes the experience-snapshot contract
   (`WorldEmbodimentSnapshot`/`WorldEmbodimentDelta` shape) in a way this
   document's §A/§D tables do not already anticipate as shape-independent.
2. **STOP** if `worldInstanceId` semantics become unclear (e.g. multi-
   instance addressing lands in a way that conflicts with Build 01's own
   named limitation #1 -- the production dispatcher's single-shared-instance
   lock -- without a clear resolution).
3. **STOP** if multiple competing embodiment truths reappear (a THIRD
   visitor-facing read path, beyond the two Build 02 Phase 0 §2 already
   named) rather than the existing two converging toward one.
4. **STOP** if Unreal integration would require core-Runtime Unreal types
   (any `UObject`/`AActor`/Blueprint-specific reference leaking into
   `packages/world-embodiment-*`, `packages/renderer-contracts`, or any
   `lib/*` Host file) -- none is proposed anywhere in this document; if
   implementation discovers a need for one, that IS the stop, not a
   workaround to build.
5. **STOP** if approved place IDs cannot be reconciled -- i.e. Build 04 (or
   any future build) introduces a 5th Local Place, a new edge between
   Kadamba Grove and Govardhan Path, or any topology fact contradicting
   STK-CAN-001's real, Approved graph.
6. **STOP** if Canon fixture provenance is ambiguous -- specifically, if the
   `canonical-event-govardhan-lifting` fixture's Host-authored (not
   Approved) status changes without a real StudioK Work Order authorizing
   it, or if any NEW canonical-event fixture is introduced without the same
   honest caveat this document (and every prior build) has carried.
7. **STOP** if Build 02's real translator
   (`unrealCommandTranslator.ts`/`unrealCommand.ts`) is insufficient for
   Build 05's actual needs AND the fix would require Runtime redesign
   (rather than an additive `UnrealCommand` variant, following the exact
   precedent Sprint 10 already set adding `MoveEntityToRegion`/
   `SetGroupIntent` to Sprint 8's original four ops).
8. **STOP** (coordination, not blocking) if `living-vrindavan-unreal` is
   created before the `StudioKWorldCore` extraction question (§B) is either
   resolved by StudioK platform governance OR explicitly deferred with the
   self-contained fallback consciously chosen -- do not silently pick one
   without naming the choice in the new repository's own first commit.

---

## Q. Summary of what this package does and does not establish

**Established (real, cited, verified against current repository state)**:
the semantic-truth contracts Build 05 will consume already exist, are
tested, and have survived three closed builds without a breaking change;
the repo topology, LFS policy, and asset registry design all have a real,
Accepted precedent (`living-symphony`) to mirror rather than invent from
scratch; the highest genuine schedule risk (cattle assets) has been named
consistently across two prior builds, not discovered new here.

**Not established (honestly deferred, not silently assumed)**: a real
network transport, a converged single production embodiment path, and a
stable dev-fixture `worldInstanceId` convention. All three are Build 04's
to resolve. This document deliberately does not guess any of them.

**Nothing executable was created**: no Unreal project, no repository, no
migration, no asset purchase, no implementation agent. This is a docs-only
artifact, on a docs-only branch, based on the latest CLOSED Build 03 state,
never touching Build 04's active worktree.

---

LIVING VRINDAVAN UNREAL 5.8 / FAB READINESS PACKAGE READY — WAITING FOR BUILD 04 CLOSURE
