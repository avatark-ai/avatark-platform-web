# Living Vrindavan Build 06, Phase 0
## PCG, Landscape, Yamuna & Environmental Embodiment Architecture

Status: **docs-only, preparation for a Windows/NVIDIA GPU workstation session.** No Unreal project
created, no `.uasset`/`.umap` files, no Fab purchases, no Runtime code changed, no migrations
applied, no Build 01–05 worktree modified. Branched from `feature/living-vrindavan-build-05-gpu-handoff
@ 643fda7` (itself branched from the closed `feature/living-vrindavan-build-04 @ 20abf24`) —
Build 05 closed and pushed before this branch was cut, so this document treats Build 05's
proposals as the direct, stable predecessor rather than re-deriving them.

---

## 0. Reading order

This document assumes the reader has `docs/LIVING_VRINDAVAN_BUILD_05_UNREAL_HANDOFF.md` and
`docs/LIVING_VRINDAVAN_ARCHITECTURE_BOUNDARY.md` open. It does not repeat Build 05's Runtime
Bridge/transport design or GPU runbook in full — it extends them into landscape/PCG/ecological
rendering, which Build 05 explicitly left unscoped (Build 05 §7 covers *entities and regions*, not
terrain, water bodies, or vegetation realization).

---

## 1. Ground-truth reconciliation

### 1.1 Canon (StudioK) — what actually exists, verbatim facts only

| Fact | Source | Value |
|---|---|---|
| Named places (exactly 4, no more without a new Work Order) | `STK-CAN-001` | `vrindavan-entry`, `yamuna`, `kadamba-grove`, `govardhan-path` |
| Yamuna's canonical identity | `STK-CAN-001` | "River / reflection threshold"; symbolic quality **Flow**; the *only* `reflectionCapable: true` location |
| Yamuna geometry | `STK-CAN-001`, `living-vrindavan.world.json` | **None.** No course, banks, direction, or size. Topology only: `vrindavan-entry → yamuna → {kadamba-grove, govardhan-path}` |
| Seasons (exactly 2, no more without a new Work Order) | `STK-CAN-006` | `vasanta` (order 1, "mild, warming, flowering-forward") → `grishma` (order 2, "warmer, drier"). Only authorized transition is `vasanta → grishma`. No numeric parameters in Canon. |
| Renderer principle | `STK-CAN-005` | *"Canon must not assume any specific rendering or embodiment technology... canon ≠ renderer. The renderer interprets the world. It does not define the world."* This is the license for everything in this document. |
| Privacy principle | `STK-CAN-004` | Location/visit/transition state may be rendered. Inferring emotional, spiritual, or psychological state from navigation is forbidden — binds §28 (debug visualization). |
| World scale | — | **Not in Canon.** No acreage/meter figure anywhere in Canon or spec JSON. |
| Yamuna soundscape | `STK-SPEC-004` | Motif `["flowing-water"]` only. An illustrative `distant-birds` motif was explicitly **rejected** as uncanonical for Yamuna (birds belong to `kadamba-grove`'s `ambient-bird-flock` archetype). Time-of-day at Yamuna is `unspecified` — a twilight default was also explicitly rejected. |
| Non-canonical spec-level content at Yamuna | `STK-SPEC-006`/`living-vrindavan.systems.json` | `riverbank-vegetation` entity archetype, phases `dormant → budding → flowering → seeding`; encounter rules `yamuna-flowering-reflection`, `yamuna-narrative-gate`. Host-authored, explicitly not Canon geography. |

**Consequence for this document:** Canon supplies identity, symbolism, and a hard boundary ("canon ≠
renderer"). It supplies **zero** geometry. Every meter, spline, mesh, and material this document
proposes is renderer-layer interpretation under `STK-CAN-005`, never a Canon claim, and must never be
written back into `studiok-canon`/`studiok-specifications`.

### 1.2 Host/Runtime (Build 01–04) — real contracts, exact identifiers

- **World extent**: `~500m x 500m` — a Host-operational fact in `vrindavanBuildManifest.ts`
  (`worldExtent`) and `lib/spatialEcology/vrindavanSpatialDefinition.ts:30`
  (`nominalExtentDescription: "~500 m x 500 m (unresolved...)"`), never a Canon number. Confirms
  the mission's instruction to use ~500m×500m, not Living Forest's 1-mile sectors.
- **Spatial hierarchy**: `World → Domain → Sector → Quadrant → Patch → LocalPlace → Entity`
  (`packages/spatial-ecology-contracts/src/hierarchy.ts`). Vrindavan is deliberately **degenerate**
  at Sector and Quadrant (exactly 1 each: `vrindavan-sector` → `vrindavan-quadrant` labeled
  `"Core"`) — the hierarchy exists for portability, not because Vrindavan needs 4 tiers of real
  subdivision.
- **4 Patches, 1:1 with the 4 Canon locations**: `patch-vrindavan-entry` (`habitatType: "threshold"`),
  `patch-yamuna` (`"riverbank"`), `patch-kadamba-grove` (`"grove"`), `patch-govardhan-path`
  (`"corridor-path"`). `habitatType` is an open string vocabulary, not a closed enum.
- **Topology**: exactly 3 `SpatialEdge`s (`entry↔yamuna`, `yamuna↔kadamba-grove`,
  `yamuna↔govardhan-path`) and exactly **1** `RouteDefinition`. `kadamba-grove` and
  `govardhan-path` are **not** directly connected — Yamuna is the only hub.
- **PatchState** (`packages/spatial-ecology-contracts/src/patchState.ts`): `{ patchId, tick,
  vegetationCondition: EnvironmentalBand, hydrologyCondition: EnvironmentalBand,
  resourceAvailability: ResourceTag[], occupancyLevel: OccupancyLevel, presentEntityIds,
  presentGroupIds, movementPermeability: number(0..1), ecologicalPressure: number(0..1) }`.
  `EnvironmentalBand = "low"|"moderate"|"high"`. No per-Patch season or day-phase field — those
  live one level up.
- **Season** (`packages/living-systems-contracts/src/season.ts`): `SeasonDefinition {id, name,
  order, canonId, environmentalEnvelope, minDurationTicks, allowedNextSeasonIds}`.
  `SeasonEnvironmentalEnvelope = {temperatureBand, precipitationBand, humidityBand,
  hydrologyBaselineBand, vegetationActivityBand, animalActivityBand}` — all `EnvironmentalBand`.
  Only `vasanta`/`grishma` are instantiated; `hydrologyCondition`/`vegetationCondition` are **one
  shared world-global band by Sprint 16's own design** (Build 01 §11) — not owned per-Patch yet.
- **Day phase** (`packages/living-rhythms-contracts/src/dayPhase.ts`): `DAWN|MORNING|MIDDAY|
  AFTERNOON|DUSK|EVENING|NIGHT` (7 values). Vrindavan's schedule: `ticksPerCycle: 14`, even
  fractions.
- **Microhabitats** (`lib/livingWorldContent/vrindavanMicrohabitats.ts`, Build 03, 11 values):
  `riverbank, shallow-water-edge, wet-ground, feeding-patch, grove-interior, grove-edge,
  shade-patch, resting-patch, path-corridor, open-grass, dry-ground`. Each carries
  `parentLocalPlaceIds` mapping to 1–2 of the 4 real Places. Pure descriptive metadata — no
  runtime state, never queried by any engine.
- **Vegetation archetypes** (`lib/livingWorldContent/vrindavanVegetationArchetypes.ts`, Build 03,
  3 values, plus 1 pre-existing Approved archetype):
  - `vrindavan-vegetation-grove-canopy` — microhabitats `[grove-interior, grove-edge]`,
    `resourceTagsBacked: [shelter, rest]`, density `high→dense / moderate→moderate / low→sparse`.
  - `vrindavan-vegetation-understory` — microhabitats `[grove-interior]`,
    `resourceTagsBacked: []`, density `high→moderate / moderate→sparse / low→sparse`.
  - `vrindavan-vegetation-grass-ground-cover` — microhabitats `[open-grass, dry-ground]`,
    `resourceTagsBacked: []`, density `high→dense / moderate→moderate / low→sparse`.
  - `riverbank-vegetation` (pre-existing, StudioK-Approved, **must not be redefined** by this
    document) — phases `dormant → budding → flowering → seeding`, lives at `yamuna`.
  All three Build-03 archetypes key density purely off the **global** `vegetationActivityBand`
  (§1.2 above) — there is no per-archetype LOD/performance field in the contract today; that's a
  renderer-layer addition this document must define (§15).
- **Resource tags per place** (`lib/livingPopulation/vrindavanPopulationDefinition.ts`):
  `yamuna→[water]`, `kadamba-grove→[vegetation, shelter, rest]`, `govardhan-path→[gathering,
  corridor]`, `vrindavan-entry→[]`.
- **Population**: exactly 2 cows + 2 `ambient-bird-flock` members (canon-authorized at
  `kadamba-grove`). No other archetypes exist.
- **Coordinates**: **none exist anywhere in Runtime.** `SpatialTransform{position:{x,y,z}}` /
  `SpatialBounds{radius}` (`packages/world-embodiment-contracts/src/spatial.ts`) are explicitly
  documented as "a normalized, abstract layout... never a real-world/Unreal-ready coordinate." No
  units. This is the single most important fact for §3/§9: **any geometry this document proposes is
  authored fresh against topological adjacency + `habitatType`/microhabitat labels, never derived
  from existing coordinate data.**
- **Determinism primitive**: `deriveDeterministicVariation({worldId, worldVersion, tick,
  locationId, seasonId, seed})` in `packages/living-systems-contracts/src/variation.ts` — FNV-1a
  hash normalized to `[0,1)`. This is the *only* randomness-substitute in the codebase and the
  correct seed source for §20.
- **Two embodiment paths** (open since Build 02, still open through Build 04): production route
  (`app/api/account/living-vrindavan/embodiment-snapshot`) reads the poorer
  `getEmbodimentSnapshotForVisitor` via `embodimentOrchestrator.ts`. All Build 02–04 code, and the
  dev route Build 05 targets (`experience-snapshot`), reads the richer `getEmbodimentWithCanonicalEvents`
  chain via `vrindavanPresentationProjection.ts`. **Not this document's problem to fix** — Build 05
  §13 already points the Unreal connectivity test at the dev route, so Build 06 inherits the richer
  path by construction. Flagged again in §35 only as a standing risk if a future build ever needs
  the production route.

### 1.3 Build 05 (closed, `643fda7`) — what is already decided vs. still proposal

Build 05 is docs-only; nothing below has executed on real Unreal yet, but three documents
(`LIVING_VRINDAVAN_UNREAL_58_FAB_READINESS.md` → `LIVING_VRINDAVAN_UNREAL_58_READINESS_RECONCILIATION.md`
→ `LIVING_VRINDAVAN_BUILD_05_UNREAL_HANDOFF.md`) converge on the same design across three passes, so
it is treated here as **stable enough to build on**, not re-litigated:

- **Coordinate convention (adopted as-is, §3)**: origin = Domain root at Unreal `(0,0,0)`; 1 Unreal
  unit = 1cm; `+X` = downstream Yamuna, `+Y` = bank-to-shore, `+Z` = up; flat `z=0` for all 4
  Places; `float` precision (no LWC needed at 500m). A renderer-side constant table,
  `VrindavanPatchLayout`, maps `PatchId`/`LocationId` strings to Unreal transforms — Runtime never
  carries a coordinate.
- **World Partition posture (adopted, refined in §3)**: default grid, ~256m cells, no
  pre-subdivision; always-loaded HLOD-0 cell over `patch-yamuna` (the hub); 3 streamed cells for
  the other Patches.
- **UnrealCommand — 11 ops, confirmed zero-diff since Sprint 8/Build 02**
  (`packages/world-embodiment-contracts/src/unrealCommand.ts`): `CreateRegion, UpdateEnvironment,
  SetAtmosphere, SetWaterState, SetVegetationIntent, PlaceEntity, UpdateEntity, RemoveEntity,
  MoveEntityToRegion, SetGroupIntent, CreateInteractionAnchor`. **4 named, unimplemented candidate
  ops**: `UpdatePatchEcology`, `SetRouteState`, `StageCanonicalProjection`, `UpdateGroupCohesion`.
  This document treats the 11 as stable and the 4 candidates as genuinely open (§16, §22, §35).
- **Asset registry pattern (adopted, extended in §19)**: semantic concept (Runtime-emitted) →
  Unreal-side Data Asset registry (content-layer only, never Runtime) → renderer asset. Naming
  already established: `DA_Vegetation_<Semantic>`, `DA_Atmosphere_<Semantic>`,
  `DA_EntityArchetype_Cow`.
- **Transport**: real dev-only `GET /api/dev/account/living-vrindavan/experience-snapshot`
  (unauthenticated, query params `world_instance_id`/`dev_user`/`since_tick`). No push transport
  anywhere (no WebSocket/SSE). No production non-browser auth. This document's regeneration policy
  (§17) is written to tolerate poll-cadence latency, not assume push delivery.
- **23-step GPU-workstation sequence** and **18-item acceptance matrix** exist (Build 05 §4/§10) —
  this document's §33 acceptance scene and §33 implementation order in §33/§34 pick up exactly
  where Build 05's step 23 ends.
- **Fab readiness categories, all marked STILL VALID** by the reconciliation pass: terrain
  materials, river/Water System, riverbank vegetation, grove vegetation, grass/ground cover,
  flowers, rocks, paths, cattle+animation (flagged **P0 risk**), bird/flock, ambient props,
  atmospheric VFX, environment audio. Priority order Build 05 already set: P0 cattle; P1
  terrain/riverbank-veg/grove-veg/ground-cover/bird-flock; P2 atmosphere/audio; P3 props. This
  document does not re-derive priority — it adds the *technical/PCG* requirement detail Build 05
  didn't need (§21).
- **What Build 05 explicitly did NOT cover** (the actual gap this document fills): landscape
  sculpting, terrain materials, Yamuna's water body/geometry, PCG graphs, vegetation LOD/Nanite
  posture, foliage-vs-navigation constraints, and the regeneration-policy classification for visual
  deltas. Build 05's scope was regions-and-entities structural bring-up; Build 06 is everything a
  visitor would actually *see* on the ground.

---

## 2. Build 06 ownership boundary

Restating `LIVING_VRINDAVAN_ARCHITECTURE_BOUNDARY.md`'s core rule (*"StudioK authors worlds.
AvatarK runs worlds"*) one layer deeper, specifically for rendering:

**Runtime decides WHAT IS TRUE. Unreal decides HOW THAT TRUTH LOOKS.**

| Owned by Runtime (unchanged) | Owned by Build 06 (this document) |
|---|---|
| Season identity/order/transition (`SeasonDefinition`) | Terrain mesh, materials, landscape sculpting |
| Hydrology/vegetation *condition* (`EnvironmentalBand`) | Yamuna's water body, flow VFX, bank presentation |
| Entity identity, population count, group membership | PCG-placed foliage, rocks, ground cover, debris |
| `PatchState` (occupancy, permeability, pressure) | Terrain materials responding to `PatchState` |
| Route/edge topology, `RouteState.traversable` | Path mesh/spline/NavMesh realizing that traversability |
| Encounter availability, canonical presence, provenance | Visual cues *hinting* at encounter zones (never gating them) |
| Visitor memory, world memory, `ReturnRecognition` | Nothing — Build 06 has no memory concept at all |
| Canon geography (4 Places, topology) | All literal geometry, all meters, all splines |

**Non-negotiables carried forward from every prior build and restated for PCG specifically:**
- PCG never invents a 5th Local Place, a 4th Patch, or a 4th edge (canon-closed at 4 places / 1
  Route).
- PCG never becomes the source of truth for `vegetationCondition`/`hydrologyCondition` — it *reads*
  those bands and *realizes* density/material, never writes them back.
- No second hydrology simulation and no second season clock inside Unreal, ever (§8, §17).
- Runtime contracts (`packages/*-contracts`) never gain an Unreal type, asset path, or PCG graph
  reference (verified zero-leakage twice already — Build 02 and Build 05 reconciliation both
  checked this; §19 keeps it that way).

---

## 3. Spatial / World Partition mapping

Adopting Build 05's coordinate convention and grid choice (§1.3) as fixed, this section adds the
landscape/PCG-specific consequence Build 05 didn't need: **how the semantic hierarchy informs
region boundaries without becoming a 1:1 mapping.**

```
Living World (living-vrindavan)
  → Domain (vrindavan-domain)                     — Unreal origin (0,0,0), never streamed/partitioned itself
    → Sector (vrindavan-sector, degenerate: 1)     — informs the OUTER landscape bounds (~500m x 500m)
      → Quadrant (vrindavan-quadrant "Core", degenerate: 1) — no separate spatial meaning yet; future
                                                       Sectors/Quadrants (Living Forest, other worlds)
                                                       would each get their own grid, not subdivide this one
        → Patch (4: entry / yamuna / kadamba-grove / govardhan-path) — informs WHICH World Partition
                                                       cell(s) a region's content lives in, via
                                                       VrindavanPatchLayout, NOT via a PatchId-named cell
          → Microhabitat / LocalPlace (11 microhabitats over 4 LocalPlaces) — informs PCG PARTITION
                                                       ACTOR boundaries and Data Layer content, never
                                                       a streaming-grid boundary of their own
            → Entity (cows, bird-flock, riverbank-vegetation phases) — placed via UnrealCommand
                                                       PlaceEntity/UpdateEntity, positioned by
                                                       VrindavanPatchLayout + a small in-region offset,
                                                       never a raw semantic coordinate (none exists)
```

**World Partition grid**: default grid, ~256m cells → a 2×2 cell layout comfortably covers 500m×500m
with margin. `patch-yamuna` (the hub, connected to all 3 other Patches) sits centered, spanning the
cell boundary; treat its cell as always-loaded (HLOD-0, per Build 05). The other 3 Patches each land
in one streamed cell. **No sub-256m partitioning is justified for this world** — mission guidance
("the first 500m×500m world does not require MMO-scale partition complexity") is satisfied by the
2×2 default grid alone; a 500m world with a 4th-of-cell-size Patch grain would create streaming
churn with no payoff (foliage/instance count at this scale is a PCG partition-actor concern, §11,
not a World Partition cell-count concern).

**Invariant, restated because it is the single easiest thing to violate under deadline pressure**:
`PatchId`/`LocationId`/microhabitat id are semantic strings that live in `VrindavanPatchLayout` and
in Actor tags/metadata (a `SemanticBindingTable`, per Build 05 §7's bridge module list) — never as
the literal name of a World Partition cell, a Data Layer, or a sublevel. Renaming or resizing a
streaming cell must never require a Runtime contract change, and vice versa.

**Growth path (not built now, just proven not to require rework)**: adjacent Sectors (a future
`vrindavan-sector-2`, or an entirely different world like Living Forest, §32) each get their own
Domain-relative origin offset and their own grid — World Partition's per-cell streaming already
scales to this without touching Vrindavan's own cells.

---

## 4. Data Layer plan

Build 05 §7 proposed "1 Data Layer per Local Place" for content variation. This document
**refines that**: a per-Place Data Layer axis would combinatorially explode once crossed with
season/debug/FX variation (4 Places × N categories), and Place-level toggling is already available
for free via the `CreateRegion`/`PlaceEntity` region-actor structure World Partition already gives
us. Instead, use **category-based Data Layers**, cross-cutting all 4 Patches, matching the
mission's illustrative list:

| Data Layer | Contents | Default state | Driven by |
|---|---|---|---|
| `DL_BaseTerrain` | Landscape actor, base terrain material layers | Always active | Authored (§6, §7) |
| `DL_Yamuna` | River spline/water body, bank meshes, flow VFX | Always active | `SetWaterState`, `UpdateEnvironment` |
| `DL_Vegetation` | All PCG-placed grove canopy / understory / ground cover / riverbank vegetation | Always active | `SetVegetationIntent`, PCG (§8–§15) |
| `DL_Paths` | Route spline/mesh, NavMesh modifiers, path exclusion volumes | Always active | Authored + `SetRouteState` (once implemented, §22) |
| `DL_AmbientProps` | Rocks, natural debris, non-PCG hero dressing | Always active | Mostly authored/static (§17.D) |
| `DL_EnvironmentalFX` | Niagara systems (§26), atmosphere/fog/wind actors | Always active, systems gated internally by season/microhabitat | `SetAtmosphere`, season delta (§15) |
| `DL_DebugSpatial` | Patch/microhabitat boundary wireframes, PCG mask visualization, route-graph overlay | **Off by default**, dev-toggle only | Static + live Runtime read, never shipped to consumer builds |
| `DL_CanonicalPresentation` | Any content gated by `canonicalPresence`/`StageCanonicalProjection` (candidate op) | Off unless active | Runtime `canonicalPresence` field |

This is renderer organization only — no Data Layer name, and no Data Layer membership, is ever
derived from or written into a Runtime contract. `DL_DebugSpatial` additionally respects
`STK-CAN-004`: it renders spatial/operational facts only (§28), never an emotional-state overlay.

---

## 5. Landscape pipeline

Priority order, per mission:

1. **Correct 500m scale** — Landscape actor sized to the `VrindavanPatchLayout` bounding box with
   margin, honoring Build 05's 1cm-per-unit convention.
2. **Correct relative place positioning** — the 4 Patch anchors placed per `VrindavanPatchLayout`,
   respecting the real topology (Yamuna central/hub; entry, grove, path each adjacent to Yamuna
   only, never directly to each other — `kadamba-grove` and `govardhan-path` must end up on
   opposite or non-adjacent sides of Yamuna, since no path connects them).
3. **Yamuna corridor** — a traversable, non-canonical channel authored along `+X` (downstream)
   through the Yamuna Patch anchor (§9).
4. **Traversable terrain** — no landscape feature blocks the 1 real Route's 3 edges; slope stays
   within NavMesh-walkable tolerance along path corridors (§23).
5. **Grove/path silhouettes** — macro massing for `kadamba-grove` (canopy silhouette) and
   `govardhan-path` (corridor massing), enough to read the 4 Patches apart from a distance.
6. **Ecological gradients** — smooth blend zones between `habitatType`s at Patch boundaries (no
   hard visual seams at a Patch edge that isn't backed by any Runtime discontinuity — Patches are a
   Host organizational concept, not a licensed visual wall).

Only after 1–6: high-detail sculpting, complex materials, cinematic dressing (explicitly deferred,
§23 defer-buy list).

**AUTHORED**: macro terrain heightmap; the 4 Patch anchor compositions (their relative massing and
silhouette, since Canon assigns real identity to each); Yamuna's channel centerline and bank
envelope (§9) — Canon supplies no geometry, so once Build 06 picks *a* channel shape it becomes the
stable authored baseline, not something PCG reshapes per session.

**PROCEDURAL**: microvariation, ground cover, rocks, ecological dressing, riverbank vegetation
scatter (§10–§13).

**RUNTIME-DRIVEN**: environmental condition *parameters* only — material wetness/tint, vegetation
density band, water level band, atmosphere semantic (§16–§17). Never macro shape.

**Hard rule**: PCG/runtime deltas never relocate a canonical Local Place's anchor. A `Patch`'s
`VrindavanPatchLayout` transform is authored once, versioned, and only changes via an explicit,
reviewed content update — never as a side effect of a `WorldDelta`.

---

## 6. Terrain material system

Data-driven Landscape Layer Blend material, semantic inputs → material parameters, **no Unreal
material name ever appears in a Runtime contract**:

| Semantic input (Runtime, real fields) | Material parameter (Unreal-side only) |
|---|---|
| `PatchState.hydrologyCondition` (`EnvironmentalBand`) | Ground wetness / mud blend |
| `PatchState.vegetationCondition` (`EnvironmentalBand`) | Grass blend weight, ground tint (greener/drier) |
| `SeasonEnvironmentalEnvelope.temperatureBand`/`humidityBand` | Dryness/cracking, roughness |
| Microhabitat mask (`riverbank`, `shallow-water-edge`, `wet-ground`, `dry-ground`, `open-grass`, ...) | Riverbank blend, path-adjacency blend, base layer selection |
| `PatchState.movementPermeability` (0..1) | Ground compaction/wear texture along high-permeability zones (implies frequent traffic) |

Mechanism: a small Unreal-side lookup (part of the asset registry, §19) maps
`(hydrologyCondition, vegetationCondition, season.id)` → a Material Parameter Collection (MPC)
update. `UpdateEnvironment`/`SetWaterState`/`SetVegetationIntent` (all 3 already exist, §1.3) are
sufficient to drive this — **no new UnrealCommand op is required for terrain material response**.
Microhabitat masks are static per-Patch PCG-authored masks (baked once, §17.D), not runtime-updated.

---

## 7. Yamuna architecture

Runtime side (real, already exists): `hydrologyCondition`/`vegetationCondition` on
`patch-yamuna`'s `PatchState`; `hydrologyBaselineBand` on the active season's envelope;
`riverbank-vegetation`'s phase (`dormant/budding/flowering/seeding`, StudioK-Approved, not
redefinable).

Unreal side (this document, all renderer-layer):
- River spline/water body (Unreal Water System) along the authored channel (§9).
- Surface material responding to `hydrologyCondition`/season via `SetWaterState{regionId,
  semantic, levelBand}` (already exists — no new op needed).
- Flow presentation (visual current strength/direction) — a renderer-only cosmetic tied to
  `levelBand`, never a second flow *simulation*.
- Bank wetness — part of the terrain material system (§6), keyed off the `riverbank` and
  `shallow-water-edge`/`wet-ground` microhabitat masks.
- Reflection response — legitimate emphasis, since Yamuna is Canon's *only* `reflectionCapable`
  location (§1.1); a literal water-reflection render feature is a tasteful, non-arbitrary choice
  here specifically.
- Vegetation masks — riverbank vegetation PCG scatter along the bank envelope, phase-driven
  material/mesh swap keyed off `riverbank-vegetation`'s 4 phases (dormant/budding/flowering/seeding)
  via `SetVegetationIntent` (existing op).
- Ambient VFX — bounded candidates in §29 (mist, spray), gated by `hydrologyBaselineBand`.
- Audio hooks — **must** be `["flowing-water"]` only at Yamuna per `STK-SPEC-004` (§1.1); no bird
  ambience here even though birds exist in the world (they belong to `kadamba-grove`).

**No second hydrology simulation, no full CFD.** One authored channel shape + a small number of
material/VFX parameters driven by the existing 3 ops is sufficient for the acceptance scene (§33).

---

## 8. Yamuna geometry

Since Canon and Runtime supply zero geometry (§1.1, §1.2), Build 06 defines the first spatial
representation as a **fresh authored baseline**, versioned as content, not derived from any
existing coordinate:

- **Channel centerline**: a spline running along `+X` (the already-adopted downstream convention,
  §1.3) through the `patch-yamuna` anchor, long enough to visually span the world's ~500m extent
  with margin at both ends (so the river reads as passing through, not terminating at, Vrindavan).
- **Bank envelope**: a parameterized width (authored, not canonical) either side of the centerline,
  wide enough to host the `riverbank`/`shallow-water-edge`/`wet-ground` microhabitat scatter (§13)
  without crowding the adjacent `grove-interior`/`open-grass` zones.
- **Elevation relationship**: channel bed below the surrounding terrain's baseline, banks sloping
  up to meet the grove/path/entry Patch massing — enough relief to read as a river valley without
  inventing canonical topography (no hills/valleys are Canon facts either; this is purely
  legibility).
- **Water-body extent**: bounded by the bank envelope; no floodplain simulation.
- **Riverbank microhabitat zones**: `riverbank` immediately adjacent to the water edge,
  `shallow-water-edge` at the literal waterline, `wet-ground` in the transition band toward
  `grove-interior`/`open-grass` — these three microhabitats are inherently riverbank-adjacent by
  the real `parentLocalPlaceIds` data (§1.2) and should be authored as concentric bands outward
  from the channel.
- **Crossing/path relationship**: the 2 real edges leaving Yamuna (to `kadamba-grove`, to
  `govardhan-path`) each cross the bank envelope once; author a simple ford/crossing point per edge
  rather than a bridge (no canonical or spec basis for built infrastructure) — flagged as an
  authored choice, revisit once real content direction exists (§23 defer-buy: "final path/settlement
  kits").

No canonical geography is invented — this is explicitly a renderer-layer authoring decision under
`STK-CAN-005`, recorded here so it doesn't get re-derived differently by whoever executes it on the
GPU workstation.

---

## 9. PCG responsibility

PCG realizes: grove canopy trees (via `grove-canopy` archetype), understory shrubs, ground cover
grasses/flowers (via `grass-ground-cover` archetype), rocks, natural debris, riverbank vegetation
scatter (via the Approved `riverbank-vegetation` archetype), ambient ecological dressing.

PCG never decides: Canon, place identity, encounter availability, population identity, world
consequences, legal transitions (`RouteState.traversable`), sacred geography. All of these remain
exactly where §2's table puts them — Runtime-owned, PCG-consumed, never PCG-produced.

---

## 10. PCG generation mode

Recommendation, per mission's instruction not to default to Runtime Generation just because it
exists:

- **Baseline composition: editor-time generated (baked), Partitioned PCG integrated with World
  Partition.** At 500m/2×2-cell scale, this is more than sufficient — authored/generated-at-editor-
  time content satisfies §5's priority list (1–6) entirely, and baking avoids paying PCG generation
  cost every session for content that changes rarely (§17.A/D).
- **Runtime Generation: reserved, narrow, and explicitly justified per use** — only for the bounded,
  targeted local regeneration a real `WorldDelta` triggers (§17.B), e.g. a `vegetationCondition` band
  crossing a threshold that changes instance density enough to be visible. Not used for baseline
  world composition, not used continuously, not used world-wide.
- **Hierarchical generation** (Unreal 5.8's hierarchical PCG mode) is the right fit for §11's
  large/medium/small tiers — each tier is its own graph with its own regeneration cadence, rather
  than one monolithic graph regenerating everything together.
- **Non-partitioned PCG** is acceptable as a fallback for the very first greybox pass (single graph,
  no World-Partition integration) if Partitioned PCG proves to add setup friction before step 7 of
  Build 05's sequence — but Partitioned should be the target once landscape and World Partition are
  both real (Build 05 step 11), since HLOD/Data-Layer compatibility (mission requirement) comes
  largely for free with Partitioned PCG and has to be retrofitted otherwise.

---

## 11. Hierarchical detail strategy

| Tier | Content | PCG graph scope | Regeneration budget |
|---|---|---|---|
| Large | `grove-canopy` trees (major grove massing) | Per-Patch (bounded to `kadamba-grove`'s microhabitats) | Rare — only on major `vegetationCondition` band change (§17.B/C) |
| Medium | `understory` shrubs, rocks, riverbank vegetation scatter | Per-microhabitat-zone within a Patch | Occasional — season transition (§14–§16) |
| Small | `grass-ground-cover`, flowers, ground debris/stones | Per-microhabitat-zone, finest grain | Should almost never regenerate from a semantic-state change alone (§17.A covers density via material/instance-count parameter, not graph rerun) |

Rationale directly addresses the mission's stated failure mode: a high-level semantic change (one
`vegetationCondition` band flip) must not force a full re-scatter of every grass blade. Density
*within* an already-placed small-tier scatter should be expressed as an instance-visibility/opacity
parameter sourced from the density band (§6-style material-parameter response) wherever Unreal 5.8's
PCG tooling supports it, reserving true re-generation for tier changes that are visually
unmistakable (large tier, rare) or explicitly required (medium tier, occasional).

---

## 12. Patch → PCG semantic mapping

Using the real `PatchState` fields (§1.2) and the real archetype density table (§1.2, already
defined in `vrindavanVegetationArchetypes.ts` — this document does not invent a new mapping, it
*reuses* the exact `high/moderate/low → dense/moderate/sparse` table each archetype already
carries):

```
PatchState:
  vegetationCondition = "high"          // global EnvironmentalBand, shared across all Patches today
  hydrologyCondition  = "high"
  ecologicalPressure  = 0.2
  movementPermeability = 0.8
  occupancyLevel = "ACTIVE"

  →  (per archetype present at this Patch's microhabitats, via each archetype's OWN
      densityByVegetationActivityBand table, e.g. grove-canopy.high → "dense")

Unreal renderer (this document's realization, not a new Runtime contract):
  grove-canopy tree density profile      = "dense"   (from archetype table directly)
  understory density profile             = "moderate"
  riverbank-vegetation phase presentation = driven separately by its own phase field, not by
                                            vegetationCondition (it's a StudioK-Approved archetype
                                            with its own dormant/budding/flowering/seeding cycle)
  ground wetness (terrain material, §6)  = driven by hydrologyCondition directly
  ecological-pressure visual cue          = subtle only (§17.A) — e.g. slightly trampled ground
                                            texture at high movementPermeability + ecologicalPressure,
                                            never a dramatic effect since Runtime doesn't distinguish
                                            "why" pressure is elevated
```

**Important honesty note carried from §1.2**: because `vegetationCondition`/`hydrologyCondition`
are currently one *shared, world-global* band (a named Sprint-16 limitation, not a bug), Build 06's
first real pass will show visually uniform vegetation/water condition across all 4 Patches
simultaneously. This is correct behavior given current Runtime truth, not a Build-06 defect — do
not "fix" it by inventing per-Patch bands in the renderer; that would make PCG a second source of
truth. If per-Patch bands become real in a future Runtime build, this mapping table needs no
change — it already reads per-Patch `PatchState`, it will just start seeing per-Patch variation.

---

## 13. Microhabitat profiles

All 11 real microhabitats (§1.2), realization profile for each:

| Microhabitat | Parent Place(s) | PCG suitability | Typical content |
|---|---|---|---|
| `riverbank` | `yamuna` | High — dense scatter band | `riverbank-vegetation` (Approved archetype) |
| `shallow-water-edge` | `yamuna` | Medium — sparse, waterline-adjacent | Reeds/wet grasses, wading-bird habitat cue (§24) |
| `wet-ground` | `yamuna` | Medium — transition band | Moisture-tolerant ground cover, mud material blend |
| `feeding-patch` | `kadamba-grove` (grazing) | Low PCG, high habitat-cue relevance | Open ground within grove edge, grass wear texture (§24 grazing affordance) |
| `grove-interior` | `kadamba-grove` | High — canopy + understory layering | `grove-canopy`, `understory` |
| `grove-edge` | `kadamba-grove` | High — canopy thinning gradient | `grove-canopy` at lower density, transition to `open-grass` |
| `shade-patch` | `kadamba-grove` | Low PCG, habitat-cue relevance | Beneath canopy, shade-seeking affordance (§24) |
| `resting-patch` | `kadamba-grove` (implied) | Low PCG, habitat-cue relevance | Flat clearing, resting affordance (§24) |
| `path-corridor` | `govardhan-path` | **Exclusion zone** | Path mesh/NavMesh only — foliage PCG must exclude this mask entirely (§23) |
| `open-grass` | `vrindavan-entry`/`govardhan-path` (implied) | High — `grass-ground-cover` | Ground cover, flowers |
| `dry-ground` | `govardhan-path`/`vrindavan-entry` (implied) | High — sparse ground cover | Drier material blend, sparse `grass-ground-cover` |

Profiles marked "Low PCG, habitat-cue relevance" are intentionally light on procedural density —
their job is legibility for future entity behavior (Build 08 animals seeking shade/rest/feeding),
not visual density (§24).

---

## 14. Vegetation archetype realization profiles

| Archetype | Canopy/size class | Density behavior | Hydrology relationship | Seasonal presentation | PCG suitability | LOD/Nanite posture | Wind | Asset requirement (see §21) |
|---|---|---|---|---|---|---|---|---|
| `grove-canopy` | Large canopy trees | `dense/moderate/sparse` per global `vegetationActivityBand` (existing table) | Indirect — grove sits inland from Yamuna, no direct bank relationship | Vasanta fuller canopy; Grīṣma slightly thinner/drier presentation (§15–§16) | High — large-tier PCG scatter, hero placement mixed with procedural fill | Nanite-suitable (high instance count, static geometry); aggressive HLOD beyond mid-distance | Full wind response (canopy sway) — highest visual payoff of any category | Grove/canopy tree meshes, wind-enabled material |
| `understory` | Shrub/mid-height | `moderate/sparse/sparse` | Indirect | Slightly reduced Grīṣma lushness | High — medium-tier PCG | Nanite-suitable, moderate LOD falloff | Moderate wind | Shrub mesh variety |
| `grass-ground-cover` | Ground-height | `dense/moderate/sparse` | Indirect (dry-ground vs open-grass masks differ, §6) | Visibly drier/sparser in Grīṣma (§16) | High — small-tier, highest instance count | Instanced foliage, not Nanite (too small/numerous — use standard foliage LOD) | Strong wind response (grass sway reads well) | Grass/flower variety, wind-enabled |
| `riverbank-vegetation` (Approved, not redefined here) | Reed/bank-height | Not condition-driven — phase-driven (`dormant/budding/flowering/seeding`) | **Direct** — the entire point of this archetype | Phase swap is its own seasonal-equivalent cycle, independent of Vasanta/Grīṣma (§7) | Medium — medium-tier PCG along bank envelope only | Standard foliage LOD | Moderate wind | Reed/bank-vegetation mesh set per phase, or single mesh + material phase swap |

---

## 15. Vasanta state

Parameterized presentation, not a hardcoded map variant — driven entirely by
`SeasonEnvironmentalEnvelope` bands (§1.2) for `vasanta` (`order 1`, canon: "mild, warming,
flowering-forward"):

- **Vegetation**: higher end of each archetype's density table response (assuming Vasanta maps to
  `vegetationActivityBand: high` or `moderate`, whichever the Runtime content author sets —
  this document does not fabricate the exact band value, only the *response*, per §16.2 of the
  mission's own instruction that season content stays Runtime-owned).
- **Water**: full presentation via `hydrologyBaselineBand` → `SetWaterState`.
- **Ground cover**: fuller, flowering-forward — `grass-ground-cover` at its denser response tier;
  this is also where a flowering visual cue for the *canon-authorized* Yamuna encounter
  (`yamuna-flowering-reflection`, §1.1) would naturally live, tied to `riverbank-vegetation`'s own
  `flowering` phase rather than to the Vasanta/Grīṣma season directly (they are separate state
  machines, §14).
- **Atmosphere**: mild/warming lighting intent via `SetAtmosphere{semantic: "vasanta-mild-warming",
  illuminationSemantic: ...}` — the exact semantic string is a renderer-side content decision, not
  a Runtime contract change (the field already accepts an open string).
- **Lighting intent**: soft, warm-neutral — a baseline reference, not final cinematic lighting
  (§27).
- **Animal habitat cues**: grazing/feeding-patch content at normal presentation (§24), no
  drought-stress cues.

---

## 16. Grīṣma transition

The first visible state transition (`vasanta → grishma`, the *only* Canon-authorized transition,
§1.1). Runtime remains fully authoritative for *when* and *whether* this happens — this section
defines only the visual consequence, delivered as a targeted `WorldDelta`, never a level rebuild
(§17):

- **Vegetation density/condition**: if `vegetationActivityBand` drops for Grīṣma, each archetype's
  own density table already produces the drier response (`dense→moderate`, `moderate→sparse`, etc.)
  — no new mapping logic needed, §12's table already covers this.
- **Drier ground**: terrain material wetness/tint parameter shifts per `hydrologyCondition`/
  `humidityBand` (§6) — same mechanism, new input values.
- **Water presentation change**: `SetWaterState` level-band update if `hydrologyBaselineBand`
  changes for Grīṣma.
- **Less lush understory**: covered by `understory`'s own density table response.
- **Increased heat haze**: bounded Niagara candidate (§26), gated on Grīṣma's `temperatureBand`.
- **Changed atmospheric intent**: `SetAtmosphere` semantic swap to a "grishma-warm-dry" content
  variant.

All of the above are achievable with the **existing 3 ops** (`UpdateEnvironment`, `SetWaterState`,
`SetVegetationIntent`) plus `SetAtmosphere` — Build 06's Grīṣma proof does not depend on any of the
4 unimplemented candidate ops. This is a deliberately load-bearing finding for §33/§35: the flagship
acceptance scene's season transition is achievable today, contract-wise.

---

## 17. WorldDelta → ecological visual change processing

Targeted, field-scoped handlers — never "destroy level, regenerate world":

| WorldDelta source | Handler | UnrealCommand(s) used |
|---|---|---|
| Hydrology change | Update Yamuna water level/material + bank wetness | `SetWaterState`, terrain material param (§6) |
| Vegetation condition change | Update density/profile per archetype table | `SetVegetationIntent` |
| Season change | Bundle atmosphere + water + vegetation update | `UpdateEnvironment`, `SetAtmosphere` |
| Patch resource state change (`resourceAvailability`, `ecologicalPressure`) | Subtle presentation difference only | **Blocked on `UpdatePatchEcology`** (candidate, unimplemented, §1.3/§35) — until it lands, this delta category has no dedicated realization; do not simulate it via a workaround that invents Runtime-side state |

The last row is an honest gap, not a design choice to paper over: Build 06 cannot fully realize
Patch-level ecological-pressure deltas until `UpdatePatchEcology` (or an equivalent) exists. This is
flagged again in §35/§36 rather than solved by inventing a substitute contract.

---

## 18. PCG regeneration policy

| Class | Trigger | Example | PCG action |
|---|---|---|---|
| **A. Material/parameter only** | Band change within existing instance layout | `hydrologyCondition` shift, season atmosphere swap, `SetWaterState`/`SetVegetationIntent` semantic update | None — material parameter or per-instance visibility/opacity update only |
| **B. Local PCG update** | Density-table response crosses a visually meaningful threshold (e.g. `dense→sparse`) at one archetype in one microhabitat zone | Grīṣma transition dropping `grass-ground-cover` from dense to sparse at `open-grass` | Rerun the affected small/medium-tier PCG partition actor(s) only — scoped to the affected microhabitat zone within one Patch |
| **C. Major content regeneration** | A Patch's authored microhabitat composition itself changes (new StudioK Work Order content, not a routine tick) | A new microhabitat authorized at an existing Patch | Rare, explicitly bounded, human-reviewed — never triggered automatically by simulation ticks |
| **D. Static/authored, never regenerated** | N/A | Macro terrain heightmap, Yamuna channel centerline/bank envelope, canonical Local Place massing, hero grove silhouette | Never touched by runtime state |

Criteria for A vs. B: if the visual change can be expressed as a parameter on already-placed
instances (opacity, material tint, per-instance LOD bias) without changing *which* instances exist
or *where*, it's A. If instance count/placement must visibly change, it's B, and B is always scoped
to the smallest PCG partition actor that covers the affected microhabitat zone — never the whole
Patch, never the whole world.

---

## 19. Determinism

Reuse the real primitive (`deriveDeterministicVariation`, §1.2) rather than inventing a second
seeding scheme:

- **Baseline composition seed** (large/medium-tier placement, §11): derived from
  `{worldId, worldVersion (fixed, not tick), locationId (=Patch/microhabitat id), seasonId,
  seed: contentProfileVersion}` — deliberately **excludes `tick`**, so baseline scatter composition
  stays stable across a play session and across restarts. Same `worldInstanceId` + Patch + content
  profile + version ⇒ identical baseline realization, matching the mission's stated requirement.
- **Phase-driven variation** (e.g. `riverbank-vegetation`'s dormant/budding/flowering/seeding, or
  small-tier per-instance micro-variation like slight rotation/scale jitter): may legitimately
  include `tick`/`seasonId` in the hash *when the represented state itself is tick/season-dependent*
  — this does not violate determinism, since the same tick+season always reproduces the same
  variation.
- **What must never happen**: Runtime replay is not required to reproduce every blade of grass
  identically unless representation depends on it (mission's own carve-out) — but large spatial
  composition (which trees exist where, the Yamuna channel shape) must never randomly reshuffle
  session to session. The seed design above guarantees this by keying baseline composition to
  stable identity fields only.
- Version bump discipline: `contentProfileVersion` is a Build-06-owned content constant (not a
  Runtime field) — bump it deliberately when a PCG graph or archetype realization changes enough
  that old seeds would no longer produce comparable output; this is the sanctioned way to
  intentionally change baseline composition without breaking the "same inputs → same output" rule.

---

## 20. Asset registry

Extends Build 05's pattern (§1.3) with the concrete key composition Build 06 needs:

```
Semantic key = (archetypeId | microhabitatId | densityBand | seasonId)
    e.g. ("vrindavan-vegetation-grove-canopy", "grove-interior", "dense", "vasanta")

  → renderer profile ID (Unreal-side lookup table, content-layer only)

  → PCG graph/configuration reference (which graph, which per-archetype settings)

  → asset set (mesh/material variants, e.g. via DA_Vegetation_<Semantic>)
```

Naming, extending Build 05's established convention: `DA_Vegetation_<Semantic>`,
`DA_Terrain_<Semantic>`, `DA_Atmosphere_<Semantic>` (existing), `DA_Water_<Semantic>` (new, for
Yamuna's semantic water states), `DA_PCG_<Tier>_<Semantic>` (new, for §11's tiered graphs).

**Invariant, re-verified**: Runtime never receives a `.uasset` path, material instance path, PCG
graph path, or Niagara path. This has now been independently checked twice (Build 02, Build 05
reconciliation) and remains true — Build 06 adds no new field to any `packages/*-contracts` package
that could carry one.

---

## 21. Fab shopping requirements (not purchases)

Per category, building on Build 05's priority order (P0 cattle — out of scope here, animal-specific;
P1 terrain/riverbank-veg/grove-veg/ground-cover/bird-flock; P2 atmosphere/audio; P3 props):

| Category | Technical req | Visual req | Performance req | PCG req | Customization req | Cultural sensitivity | Placeholder strategy |
|---|---|---|---|---|---|---|---|
| Landscape materials | Landscape Layer Blend compatible, tileable | Reads as riverine North-Indian floodplain terrain, not generic grassland | Low shader complexity (base layer touched every frame) | N/A (terrain, not PCG) | Wetness/dryness parameters exposed | Avoid generic "temperate meadow" presets that erase regional character | Engine default landscape material with basic layer blend |
| River materials | Unreal Water System-compatible | Reads as a real, moving, sacred river — not a decorative pond | Water System's own perf envelope; test on GPU workstation (§31) | N/A | Level-band-driven parameters (§7) | **High** — Yamuna is Canon's flagship reflection-capable location; avoid generic "fantasy river" shaders that flatten its symbolic weight | Water System default material |
| Riverbank vegetation | PCG-scatter compatible, phase-swappable (4 phases) | Reeds/bank grasses reading as real riverine flora, not decorative | Foliage-instance LOD, not Nanite | Medium-tier PCG, bank-envelope scatter | Phase-swap material or mesh variants | Moderate — avoid assets coded as a specific non-Indian biome (e.g. temperate marsh kit reskins) | Standard foliage LOD instanced meshes |
| Grove canopy trees | Nanite-suitable, wind-enabled material | Reads as Kadamba-adjacent grove character (broad canopy, not conifer) | High instance count tolerant, aggressive HLOD | Large-tier PCG hero + fill mix | Canopy density/color variants for Vasanta/Grīṣma | **High** — Kadamba Grove is named Canon geography; avoid generic "forest pack" trees with no canopy-character match | Engine default foliage or basic tree mesh |
| Understory | Nanite-suitable, wind-enabled | Shrub variety, grove-interior appropriate | Moderate instance count | Medium-tier PCG | Density variants | Moderate | Basic shrub mesh |
| Grass/ground cover | Instanced foliage (not Nanite), wind-enabled | Dense-to-sparse range matching §14's density table | Highest instance count of any category — must be cheap per-instance | Small-tier PCG, highest density | Dense/moderate/sparse variant meshes | Low | Engine default grass |
| Flowering ground cover | Same as grass, phase/season-swappable | Flowering-forward Vasanta read | Same as grass | Small-tier PCG | Season-variant color/bloom state | Moderate — avoid generic "wildflower" packs with non-regional species silhouettes | Static color-tinted grass variant |
| Rocks | PCG-scatter compatible | Riverbank + grove-adjacent natural rock, not stylized fantasy rock | Low instance count, static | Medium-tier PCG | Size variants | Low | Engine default rock/prop |
| Natural debris | PCG-scatter compatible | Fallen leaves/branches, seasonal-appropriate | Very low cost, static | Small-tier PCG | Season variants (more in Grīṣma) | Low | Static debris props |
| Path materials | Terrain/mesh-compatible | Worn-earth corridor, not paved/urban | Low cost | N/A (exclusion zone, §23) | Wear-level variants tied to `movementPermeability` (§6) | Low | Engine default dirt path material |
| Atmospheric effects | Niagara-compatible, season-gated | Heat haze/mist/pollen reading as environmental, not decorative spectacle | Bounded particle count (§26) | N/A | Season/hydrology-gated variants | Low | Engine default Niagara starter systems |

**Cultural-sensitivity note applying across the whole table**: Vrindavan and Yamuna are living sacred
geography in Vaishnava tradition. §1.1's Canon facts (Yamuna = "Flow"/reflection threshold, Kadamba
Grove named explicitly) mean the *river* and *grove* categories carry the highest sensitivity —
generic "fantasy river" or "temperate forest pack" reskins risk visibly erasing the specific
character Canon assigns them, even though Canon supplies no geometry to match against. Where a
placeholder is unavoidable pre-purchase, prefer neutral/generic-natural over any asset explicitly
themed as a *different* named biome or culture (e.g., not a "Nordic forest" or "Amazon jungle"
pack reskinned as Vrindavan).

---

## 22. Defer-buy list

Explicitly wait for the first real Unreal greybox (Build 05 step 23+) before purchasing:

- Hero trees (grove canopy signature assets) — shop against the real greybox's actual canopy gaps,
  not imagined ones.
- Expensive full environment packs — a single "Indian riverside environment" mega-pack risks
  bundling assets for content Vrindavan doesn't have (no settlements, no architecture beyond 4
  Canon Places) and would be wasted spend.
- Architectural/sacred assets — no canon geometry exists yet for any built structure at any of the
  4 Places (§1.1); nothing to shop for until content direction is set.
- Final Yamuna shaders/water materials — start with Water System defaults (§21); Yamuna is the
  flagship, so its final look deserves to be chosen against the real greybox, not blind.
- Cinematic VFX — §27 explicitly defers final lighting/atmosphere authoring past a systemic
  baseline.
- Premium soundscape — §29 exposes hooks only; Build 07+ owns actual audio asset selection.
- Final path/settlement kits — §8's ford/crossing points are placeholder authored geometry, not a
  purchased kit.

Rationale restated from the mission: shop against real gaps once the greybox is visible, not
imagined ones — every item above requires seeing the real Build 05 greybox + Build 06 landscape
pass first.

---

## 23. Route/path realization

Runtime owns: Route identity/connectivity (`RouteDefinition{id, name, edgeIds}`, static/authored)
and `RouteState{routeId, tick, traversable}` (always derived, never persisted — currently the only
Route computes `traversable` fresh each read).

Unreal owns: spline/path mesh along each of the 3 real edges (`entry↔yamuna`, `yamuna↔grove`,
`yamuna↔path`), terrain deformation (a shallow worn-path depression, tied to
`movementPermeability`, §6), surface material (§21), physical walkability, NavMesh.

**A path spline never becomes semantic route truth.** Today, with `RouteState.traversable` always
computed (not observed to ever go false in current content), the path renders as permanently
traversable. Once `SetRouteState` (candidate op, §1.3) lands, congestion/closure become visually
representable — until then, Build 06 does not fabricate a closed/congested visual state that
Runtime cannot actually produce.

---

## 24. Navigation relationship

- **Path exclusion masks**: `path-corridor` microhabitat (§13) is a hard PCG exclusion zone — no
  foliage tier scatters into it.
- **Water boundaries**: Yamuna's bank envelope (§9) is a NavMesh boundary; no entity/visitor
  movement corridor crosses it except at the 2 authored crossing points (§9).
- **Obstacle placement constraints**: medium/large-tier PCG (rocks, canopy trunks) respects a
  NavMesh-clearance buffer along all 3 route edges and both crossing points.
- **NavMesh considerations**: generated from the authored terrain (§5) + path corridor exclusion +
  water boundary; regenerated only on class-C major content changes (§18), never per-tick.
- **Entity movement corridors**: `PatchState.movementPermeability` (0..1) is the real signal for how
  "open" a Patch reads — high-permeability zones should stay visually clear (lower obstacle
  density in the medium tier) so the renderer doesn't contradict a Runtime fact that visitors/
  entities move through it easily.

PCG must never scatter large/medium-tier obstacles across `path-corridor` or the bank-envelope
crossing points — this is checked at PCG-graph-authoring time via the exclusion mask, not at
runtime.

---

## 25. Entity habitat presentation

Preparing the *environment*, not simulating behavior (Build 08 owns behavior):

| Affordance | Microhabitat | Present population relevance |
|---|---|---|
| Herd watering | `riverbank`/`shallow-water-edge` at `yamuna` | 2 cows — `water` resource tag at `yamuna` (§1.2) |
| Grazing | `feeding-patch` at `kadamba-grove` | 2 cows — `vegetation` resource tag |
| Resting | `resting-patch` at `kadamba-grove` | 2 cows — `rest` resource tag |
| Shade seeking | `shade-patch` at `kadamba-grove` | 2 cows, hot-season relevance (Grīṣma, §16) |
| Flock gathering | `grove-interior`/`grove-edge` canopy | 2 `ambient-bird-flock` members |

Each affordance is realized as legible open ground/shade/water-edge clearance at the right
microhabitat — no behavior scripting, no animation state machine. This section exists so Build 08
inherits an environment that already *looks* capable of hosting these behaviors.

---

## 26. Lighting / atmosphere boundary

Mapping (systemic baseline only, §27 defers final cinematic authoring):

```
time (DayPhase: DAWN/MORNING/MIDDAY/AFTERNOON/DUSK/EVENING/NIGHT, 7 values, real)
season (vasanta/grishma, real)
humidity/heat intent (SeasonEnvironmentalEnvelope.humidityBand/temperatureBand, real)
  →
sun/sky angle + color temperature (per DayPhase)
fog density (per humidityBand)
cloud presentation (per precipitationBand)
wind strength (per season, feeds §14's wind-enabled materials)
material response (§6's terrain wetness/dryness)
environment FX gating (§26 Niagara triggers)
```

`SetAtmosphere{regionId, semantic, illuminationSemantic}` (existing op) is the single command
covering this whole mapping — semantic strings are content-layer, e.g.
`"midday-vasanta-mild"`/`"dusk-grishma-warm-dry"`. No new op required.

---

## 27. Niagara

Bounded candidates, gated (never ubiquitous):

| Effect | Gate | Location relevance |
|---|---|---|
| Mist | High `hydrologyBaselineBand`, dawn/dusk `DayPhase` | Yamuna only |
| Water spray | High `hydrologyBaselineBand` near channel | Yamuna only |
| Dust | Grīṣma + dry-ground microhabitat | `govardhan-path`, `vrindavan-entry` |
| Heat shimmer | Grīṣma high `temperatureBand` | World-wide, subtle |
| Pollen | Vasanta, flowering-forward | `kadamba-grove` (grove-interior/edge), riverbank-vegetation `flowering` phase |
| Insects | High `vegetationActivityBand` | `kadamba-grove` |

Each is a small, targeted particle system tied to one or two real semantic conditions — no global
"always-on ambience" system, per mission's explicit instruction against ubiquity.

---

## 28. Audio hooks

Spatial/environmental hooks only — asset selection is Build 07+'s job. Semantic zones, real
constraint from Canon honored explicitly:

- **Yamuna**: `["flowing-water"]` only (§1.1 — Canon-specified, `distant-birds` explicitly
  rejected here).
- **Kadamba Grove**: ambient grove/bird presence appropriate (this is where `ambient-bird-flock`
  actually lives).
- **Govardhan Path**: open-corridor ambience, no water/bird motifs.
- **Vrindavan Entry**: threshold-appropriate, minimal/neutral (Canon's `atmosphere: "contemplative"`
  applies world-wide at minimum, per `STK-SPEC-004`).
- **Day phase**: dawn/dusk chorus intensity variants, gated per zone.
- **Weather/season state**: Grīṣma dryness reduces ambient water/vegetation-life audio density at
  non-Yamuna zones; Yamuna's motif stays constant (river doesn't go silent).

---

## 29. Debug visualization

Toggleable, dev-only (`DL_DebugSpatial`, §4), never consumer-facing:

- Patch boundaries (4, from `VrindavanPatchLayout`)
- Microhabitat masks (11, from PCG partition-actor bounds)
- PCG masks (per tier, §11)
- Resource profile (`resourceAvailability` per Patch)
- Hydrology (`hydrologyCondition` band, color-coded)
- Vegetation condition (`vegetationCondition` band, color-coded)
- Semantic route graph (3 edges + 1 Route, traversability state)
- Entity habitat affordances (§25 zones)

**Privacy constraint, restated from §1.1**: every item above is an operational/spatial fact
(`STK-CAN-004` permits location/transition/progression state). None may be extended into an
inferred emotional/spiritual/psychological overlay — if a future build proposes a "visitor
engagement heatmap" or similar, that is out of scope for `DL_DebugSpatial` and needs its own
privacy review, not a quiet addition here.

---

## 30. Performance measurement

Measurements, not thresholds (thresholds require real GPU/workload data, per mission):

frame time; GPU time; CPU time; draw calls; instance counts (per tier, §11); PCG generation time
(baseline bake + any Class-B local regeneration, §18); memory; VRAM; shader complexity (terrain
material, §6, is the highest-frequency shader); streaming (World Partition cell load/unload
timing); HLOD behavior (transition distance/pop-in at the always-loaded Yamuna cell boundary).

---

## 31. Development-hardware benchmark

Windows/NVIDIA GPU workstation is development hardware, not a target spec — no L4/G2-specific
behavior gets encoded into world architecture (mission's explicit instruction). Benchmarking
checklist, extending Build 05 §8's runbook (§1.3) with Build-06-specific viability tests:

- **Foliage**: instanced foliage cost at §14's grass/ground-cover density (highest instance count
  category) at full 500m extent.
- **Water**: Unreal Water System cost for Yamuna's channel length + flow/reflection features (§7).
- **Lumen**: GI cost with grove canopy density (large-tier, §11) — canopy is the densest
  Nanite-suitable geometry in the scene.
- **Nanite**: instance count viability for `grove-canopy`/`understory` at dense band.
- **PCG**: generation time for the full 500m/2×2-cell baseline bake (§10), and for a representative
  Class-B local regeneration (§18) — this is the number that tells us whether Runtime-triggered
  local regen is fast enough to feel responsive at poll-cadence latency (§1.3 transport reality).

Connectivity to the real dev route (`GET .../experience-snapshot`) should be verified **before**
installing Unreal, per Build 05 §13 — carried forward unchanged here since it's a prerequisite for
every benchmark above being meaningful.

---

## 32. Build 06 first acceptance scene

Restating the mission's own acceptance definition, annotated with exactly which real contracts
satisfy each step (so whoever executes this on the GPU workstation knows what's already provable
vs. what's genuinely new work):

1. Start from Build 05 greybox (steps 1–23, already sequenced).
2. Receive Runtime state: Vasanta (real `SeasonDefinition`), Yamuna hydrology state (real
   `PatchState.hydrologyCondition` at `patch-yamuna`), Patch ecology (real `PatchState`),
   vegetation profiles (real archetype density tables, §1.2/§12).
3. Landscape realized (§5).
4. Yamuna becomes real water presentation (§7–§9, via existing `SetWaterState`).
5. Grove/riverbank/open Patches visually differ (§6, §12–§14).
6. PCG creates deterministic vegetation (§10–§11, §19).
7. Semantic routes remain clear (§23–§24 — no PCG obstruction of the 1 Route's 3 edges).
8. Visitor can traverse (NavMesh, §24).
9. Runtime advances to Grīṣma (real, Canon-authorized transition, §1.1).
10. Targeted environment delta arrives (§17, via existing `UpdateEnvironment`/`SetWaterState`/
    `SetVegetationIntent`/`SetAtmosphere` — §16 already confirms no unimplemented op is required
    for this specific transition).
11. Yamuna/vegetation/ground/atmosphere visibly change (§16, Class A/B per §18).
12. World is NOT rebuilt wholesale (§18's classification enforces this).
13. Semantic IDs remain unchanged (Patch/LocalPlace/microhabitat ids are stable strings throughout,
    §1.2/§3).
14. Runtime remains authoritative (§2's table — nothing above writes state back to Runtime except
    the one real `InteractionIntent` path Build 05 step 19 already established).

This scene requires **zero** unimplemented UnrealCommand ops — a deliberately conservative,
achievable-today first proof, with the 4 candidate ops (§1.3) reserved for a richer second pass
(Patch-ecology-pressure visuals, route congestion, canonical projection staging, group cohesion —
none of which the first acceptance scene depends on).

---

## 33. Living Forest portability

Architectural proof that the same renderer model supports a future `F01` (1-mile × 1-mile Living
Forest Sector) without Runtime/renderer contract changes — Vrindavan parameters are content, not
engine branching:

- **World frame is content, not a constant.** §1.3/§3's `VrindavanPatchLayout` (origin, scale,
  Patch anchor transforms) is a per-world authored table, not hardcoded into the World Partition
  setup or any PCG graph. A Living Forest instance gets its own `LivingForestPatchLayout` at its own
  Domain-relative origin with its own (1-mile-scale) grid choice — the World Partition
  cell-size/HLOD strategy (§3) is a per-world *configuration*, not an engine-level assumption. Build
  02's own explicit warning ("do not import Living Forest's larger sector-size convention here") is
  precisely the inverse of this proof: the two worlds must NOT share a literal scale, and the
  architecture accommodates that by keeping scale as data.
- **Semantic hierarchy is franchise-agnostic.** `Domain→Sector→Quadrant→Patch→LocalPlace→Entity`
  (§1.2) carries no Vrindavan-specific meaning at the type level — Vrindavan happens to be
  degenerate at Sector/Quadrant; Living Forest could use all 4 tiers meaningfully without any type
  change.
- **PCG graphs are content-parameterized, not world-branching.** §12's mapping table
  (`PatchState` → archetype density table → renderer parameter) has no Vrindavan-specific logic in
  it — it reads whatever `PatchState`/archetype data the active world provides. A Living Forest
  biome swaps in different archetypes (different tree/ground-cover meshes, different `habitatType`
  vocabulary) through the same mapping mechanism, same asset-registry indirection (§20), same
  regeneration-policy classification (§18).
- **Same honest limit applies both ways.** Build 02's finding that true portability is proven at
  the *engine* layer but blocked at the *Host* layer (Vrindavan-specific constants imported at
  module scope in `hostService.ts` files) applies identically here: this document's renderer-layer
  proposals (§3–§30) contain zero Vrindavan-specific branching by construction, but the *Host
  adapter* that feeds them Vrindavan's real `PatchState`/archetype data is and remains
  Vrindavan-wired — a future Living Forest build needs its own Host adapter, not a fork of this
  renderer architecture.
- **Water/terrain/biome are asset-registry content**, not engine features gated by world identity —
  Living Forest's water bodies (lakes/streams, presumably a different topology than one river) are
  a different `DA_Water_<Semantic>` content set behind the same registry pattern (§20), not a
  different code path.

---

## 34. Build 06 implementation order

Ordered for the GPU workstation, picking up immediately after Build 05's step 23:

1. Reconcile Build 05's real executed project state (confirm steps 1–23 actually landed as
   documented — this document assumes they will, but doesn't assume they did without checking).
2. Establish landscape (§5, priorities 1–2: scale + Patch positioning).
3. Establish semantic coordinate mapping (`VrindavanPatchLayout` realized as real Unreal data,
   §3/§20).
4. Establish Yamuna (§7–§9: channel, bank envelope, water body).
5. Establish microhabitat masks (§13, all 11, as PCG partition-actor boundaries).
6. Establish renderer ecological profiles (§12/§14: archetype → density-table → parameter wiring).
7. Create first PCG graph (§10: baseline, editor-time/Partitioned, large tier first).
8. Grove vegetation (§14: `grove-canopy`, then `understory`).
9. Riverbank vegetation (§7/§14: Approved `riverbank-vegetation` archetype, phase-aware).
10. Grass/ground cover (§14: `grass-ground-cover`, small tier, highest instance count — sequenced
    late deliberately, since it's the most perf-sensitive tier and benefits from having 2–9's real
    instance counts to benchmark against, §31).
11. Path exclusion (§23–§24: NavMesh, exclusion masks — must land before any tier's PCG graph is
    considered "done," since retrofitting exclusion after dense scatter is more expensive than
    authoring it in from the start).
12. Delta-driven parameter updates (§17: wire `UpdateEnvironment`/`SetWaterState`/
    `SetVegetationIntent`/`SetAtmosphere` to the real dev route's delta stream).
13. Local PCG regeneration (§18 Class B, scoped rerun).
14. Vasanta→Grīṣma proof (§16/§32 — the flagship acceptance scene).
15. Navigation/performance pass (§24/§30–§31).
16. First Fab asset evaluation (§21/§22 — only now, against the real greybox).

Modify based on actual dependencies discovered once Build 05's real project state is confirmed
(step 1) — this ordering is this document's best judgment given Build 05's documented (not yet
executed) design, not a guarantee no reordering will be needed.

---

## 35. Dependencies on Build 05

- `VrindavanPatchLayout` must exist as real Unreal-side data (Build 05 step 10–13) before §3/§20
  can be realized as anything other than a design.
- The real dev route (`GET .../experience-snapshot`) must be reachable (Build 05 step 8, §1.3
  transport) — Build 06's delta processing (§17) has nothing to consume otherwise.
- `translateToUnrealCommands`/`translateEmbodimentDeltaToUnrealCommands` (real, unchanged since
  Sprint 8/10) must remain the ingestion path Build 06 wires PCG/material updates to — no second
  translation layer.
- The 11 stable `UnrealCommand` ops (§1.3) must remain unchanged for §6/§7/§16/§26's "no new op
  required" claims to hold.
- The 4 candidate ops (`UpdatePatchEcology`, `SetRouteState`, `StageCanonicalProjection`,
  `UpdateGroupCohesion`) are **not** a Build 06 dependency for the first acceptance scene (§32) —
  only for the richer second pass named in §17/§23/§35 risks below.

---

## 36. Risks

- **Patch-ecology delta gap (§17)**: `UpdatePatchEcology` doesn't exist — Build 06 cannot realize
  `ecologicalPressure`/`resourceAvailability` changes visually until it lands. Mitigate by scoping
  the first acceptance scene (§32) to season/hydrology/vegetation deltas only, which need no new op.
- **Route-state gap (§23)**: `SetRouteState` doesn't exist — path always renders traversable.
  Low risk today since `RouteState.traversable` is observed always-true in current content; becomes
  a real gap only if Runtime content ever produces a false value before the op lands.
- **Transport latency (§1.3)**: poll-based dev route only, no push. Class-B local PCG regeneration
  (§18) will feel exactly as responsive as the poll cadence — measure this explicitly in §31, don't
  assume push-transport-grade responsiveness.
- **Global (not per-Patch) hydrology/vegetation bands (§12)**: first real pass will show uniform
  condition across all 4 Patches. Correct behavior, but worth flagging loudly to whoever reviews the
  first greybox screenshots so it isn't mistaken for a bug.
- **Two embodiment paths (§1.2)**: still open. Currently irrelevant to Build 06 since the dev route
  Build 05 targets already uses the richer path — becomes relevant only if a future build routes
  Unreal through the production embodiment-snapshot endpoint instead.
- **Cultural-sensitivity exposure (§21)**: Yamuna and Kadamba Grove are the two highest-sensitivity
  asset categories; a rushed placeholder choice under deadline pressure is the most likely way this
  goes wrong — the defer-buy list (§22) exists specifically to prevent that pressure from forcing an
  early, wrong purchase.
- **Pre-existing test flake**: `embodimentOrchestrator.test.ts`'s Vasanta/Grīṣma timing flake (named
  since Sprint 8, worsening slightly with suite runtime) is unrelated to any Build 06 work — if it
  appears during a future Build 06 code session's test runs, do not attribute it to PCG/renderer
  changes.
- **Authored-geometry drift**: because Canon supplies zero Yamuna/terrain geometry (§1.1/§8), the
  authored baseline in §8 is this document's own judgment call, not a re-derivation of an existing
  fact. Future builds should treat it as the stable baseline (per §5's "authored, not regenerated"
  rule) rather than each re-inventing channel shape independently.

---

## 37. STOP gates

Stop and escalate rather than invent past any of the following:

- Build 05's real executed project state (once it exists) contradicts this document's coordinate
  convention, grid choice, or `VrindavanPatchLayout` assumptions (§1.3/§3).
- The Runtime Bridge cannot deliver a required environmental field — specifically, if
  `UpdatePatchEcology`/`SetRouteState`/`StageCanonicalProjection`/`UpdateGroupCohesion` turn out to
  be required for a scene actually being built, and haven't landed (§17/§23/§36) — fall back to
  Class-A/existing-op realization, don't invent a substitute contract.
  do NOT redefine a Build 03 archetype (`grove-canopy`, `understory`, `grass-ground-cover`, or the
  Approved `riverbank-vegetation`) to make a PCG graph easier — reconcile against real code, escalate
  if genuinely incompatible.
- Build 04's Place/Route identity destabilizes (a 5th Place, a 4th edge, or a second Route
  appears) — Canon is closed at 4 Places/1 Route (§1.1/§1.2); this would mean Canon changed, which
  is out of this document's authority to accommodate silently.
- Environmental state would require a second Unreal-side simulation (a second hydrology/season
  clock) — forbidden absolutely (§2), no exceptions.
- Runtime contracts would need an Unreal asset path, PCG graph reference, or material name —
  forbidden absolutely (§2/§20), no exceptions.
- PCG would need to become authoritative over any fact currently owned by Runtime (§2's table) —
  stop and redesign the specific mapping, never let PCG silently start deciding.
- Canon geography would need to be treated as *established* rather than *authored-by-Build-06* —
  i.e., if anyone proposes writing Yamuna's channel shape or a Patch's massing back into
  `studiok-canon`/`studiok-specifications` as if Canon always specified it. `STK-CAN-005` forbids
  this; escalate rather than let renderer content quietly become claimed Canon fact.
- A required Build 05 contract is not yet stable when the GPU-workstation session actually starts —
  re-check `packages/world-embodiment-contracts`/`world-experience-contracts` against this
  document's §1.2/§1.3 citations before proceeding; if they've drifted, reconcile against the real
  code, don't trust this document's snapshot blindly.

---

LIVING VRINDAVAN BUILD 06 PHASE 0 —
PCG & ENVIRONMENTAL EMBODIMENT ARCHITECTURE READY —
WAITING FOR BUILD 05 UNREAL GREYBOX
