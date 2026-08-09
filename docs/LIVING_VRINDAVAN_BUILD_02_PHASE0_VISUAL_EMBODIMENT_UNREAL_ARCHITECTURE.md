# Living Vrindavan Build 02 Phase 0 — Visual Embodiment & Unreal Integration Architecture

**As of:** 2026-08-09. Branch `feature/living-vrindavan-build-02-phase0`, forked
from `feature/sprint20-implementation` @ `8e4ea70` — the latest CLOSED
Runtime v1 state ("PERSISTENT LIVING WORLD RUNTIME V1 VERIFIED —
PRODUCTION FOUNDATION READY"). Architecture/implementation preparation
only. No runtime code, no migrations, no Unreal project created, no
Build 01 worktree touched, no Runtime v1 core touched.

Living Vrindavan Build 01 (`feature/living-vrindavan-build-01`, currently
running in another isolated session, Part 1 committed at `d313eb3`) is
treated as **read-only, provisional** input throughout this document.
Every fact drawn from it is marked **PROVISIONAL — RECONCILE AFTER BUILD
01 CLOSURE**. This document does not depend on any uncommitted Build 01
detail as a stable contract.

---

## 0. Governing law

> **STK-CAN-005 — Living World Renderer Principle (Approved):** "Canon ≠
> renderer... The renderer interprets the world. It does not define the
> world," and explicitly names Unreal Engine as a possible future
> embodiment.

Everything in this document exists to keep that law true specifically
for Unreal: Unreal renders reality; Unreal does not declare it.

---

## 1. Renderer ownership boundary

```
┌─────────────────────────────────────────────────────────────────┐
│ A. PERSISTENT LIVING WORLD RUNTIME (avatark-platform-web)        │
│    owns: worldInstanceId, season/tick, spatial hierarchy         │
│    (Domain/Sector/Quadrant/Patch/LocalPlace), environmental       │
│    state, PatchState ecology, entity/group identity & state,     │
│    movement INTENT, occupancy, encounter availability,           │
│    canonical projections, participation/interaction              │
│    affordances, provenance. Semantic truth, full stop.           │
└─────────────────────────────────────────────────────────────────┘
                    │  WorldSnapshot / WorldEmbodimentSnapshot /
                    │  SpatialSnapshot / WorldEmbodimentDelta
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ B. RENDERER-NEUTRAL EMBODIMENT LAYER (already built, Sprint 6-20)│
│    packages/world-embodiment-{contracts,runtime},                │
│    packages/renderer-contracts, packages/spatial-ecology-*.      │
│    Owns: EmbodiedRegion, EntityPresentation, EnvironmentPresentation,│
│    SensoryCue, UnrealCommand (engine-COMPATIBLE, not engine-owned),│
│    capability negotiation. Zero Unreal/React/DOM symbol anywhere. │
└─────────────────────────────────────────────────────────────────┘
                    │  UnrealCommand[] (translateToUnrealCommands, etc.)
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ C. UNREAL ADAPTER (Build 02's own new scope)                    │
│    A thin C++ bridge plugin translating UnrealCommand/           │
│    WorldEmbodimentSnapshot/SpatialSnapshot into engine calls.     │
│    Owns: actor spawn/despawn, transform application, animation   │
│    state selection, PCG parameter feed, material parameter feed. │
│    Never invents a fact not present in the semantic payload.     │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ D. UNREAL WORLD/PROJECT                                          │
│    owns: terrain meshes, landscape material, river geometry,     │
│    foliage instances, skeletal meshes, animation assets, VFX,    │
│    lighting, sound assets/playback, camera, World Partition       │
│    representation, HLOD, Nanite, PCG realization, collision/nav. │
│    NEVER authoritative — every fact here is a REALIZATION of a   │
│    fact from A, never a new one.                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ E. STUDIOK AUTHORED PRESENTATION INTENT                          │
│    STK-SPEC-004 (Approved): biome/atmosphere/soundscape-motif/    │
│    presentation-intensity/pacing PER Local Place. Authored,       │
│    never Unreal-specific (no asset path, no material reference). │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ F. ASSET/CONTENT PRODUCTION                                      │
│    owns: .uasset files, Niagara systems, MetaSounds, PCG graphs, │
│    material instances, marketplace/custom art. Content-layer     │
│    only — Runtime (A) never references a path here (§28).        │
└─────────────────────────────────────────────────────────────────┘
```

No Unreal object (Actor GUID, World Partition cell, PCG seed, save
game) may become authoritative world state. Every one of layers C-F is
downstream of A; none feeds back into A except through the existing
`InteractionIntent` → `dispatchInteractionIntent` boundary (§23).

---

## 2. Build 01 dependency map

**Verified, not assumed** (`d313eb3`, Build 01 Part 1, PROVISIONAL —
RECONCILE AFTER BUILD 01 CLOSURE for anything Part 2 changes):

| Fact | Source | Status |
|---|---|---|
| World extent: 500m × 500m | `lib/livingWorldRuntime/vrindavanBuildManifest.ts` — `worldExtent.approximateWidthMeters/HeightMeters` | PROVISIONAL, but matches this mission's own instruction exactly |
| `rendererCapabilityExpectations: { requiresRendererOwnedGeometry: false, requiresRendererOwnedSimulationState: false, acceptsSemanticSnapshotOnly: true }` | same file | PROVISIONAL — already states the exact posture this document assumes |
| Exactly 4 Approved Local Places | `studiok-canon/world-design/STK-CAN-001` (Approved), mirrored in `lib/spatialEcology/vrindavanSpatialDefinition.ts` | **Canon-confirmed, stable** — not provisional |
| Real topology: `vrindavan-entry↔yamuna`, `yamuna↔kadamba-grove`, `yamuna↔govardhan-path` — **Kadamba Grove and Govardhan Path have NO direct edge** | STK-CAN-001 + Build 01's own `lib/spatialEcology/vrindavanBuildProofs.test.ts` (new gap-filling proof) | **Canon-confirmed, stable** |
| Seasons: `vasanta` (order 1), `grishma` (order 2) only | STK-CAN-006 (Approved) | **Canon-confirmed, stable** |
| Sector/Quadrant are degenerate (single instance each) — no finer subdivision authorized at this scale | `vrindavanSpatialDefinition.ts`, predates Build 01 (Sprint 16) | **Landed runtime, stable** |
| Govardhan-lifting canonical event fixture is **Host-authored, NOT Approved Canon** (`canonDocIds: []`) | Sprint 18 (this document's own author), reconfirmed by Build 01 Part 1's own explicit flag in `docs/LIVING_VRINDAVAN_BUILD_01_PART1_NOTES.md` | **Confirmed finding — see §24** |
| World Product Manifest (`LIVING_VRINDAVAN_BUILD_MANIFEST`) exists as the one canonical "what world am I" read | `lib/livingWorldRuntime/vrindavanBuildManifest.ts` | PROVISIONAL — Build 02's own future `createWorldInstance` call should read this, not duplicate it |
| Build 01 Part 2 (in progress) plans its OWN "Unreal handoff contract (docs-only)" phase | Build 01 Part 1 handoff notes | **Coordination point, not a conflict** — see §40 |

**A real, concrete, independently-confirmed architectural finding, NOT
attributed to Build 01** (found by this document's own direct
inspection of `feature/sprint20-implementation`, the CLOSED branch this
document is based on): **two visitor-facing embodiment read paths
coexist, at different richness levels**:

1. `lib/livingWorldHost/hostService.ts#getEmbodimentSnapshotForVisitor`
   → `resolveDurableWorldEmbodimentSnapshot` (Sprint 9) → Sprint 8's own
   `resolveWorldEmbodiment` — reads ONLY `DurableWorldState` (season/
   clock/environment/entities) + Sprint 7 encounter rules. **This is
   the one real production route calls today**
   (`app/api/account/living-vrindavan/embodiment-snapshot/route.ts`,
   via `lib/worldEmbodiment/embodimentOrchestrator.ts`).
2. `lib/canonicalEvents/hostService.ts#getEmbodimentWithCanonicalEvents`
   → composes population (10) → memory (11) → social ecology (12) →
   rhythms (13) → encounter realization (14) → adaptation (15) →
   spatial ecology (16) → canonical events (18). **Fully built, fully
   tested at every layer, but not called by any production route.**

**Consequence for Build 02**: the Unreal Semantic Bridge (§21) must be
designed against path 2's richer shape (population/social/rhythms/
adaptation/spatial/canonical), since that is the ONLY path carrying the
semantic detail Unreal needs (herd/flock state, patch ecology, canonical
projections). **This is an explicit dependency on Build 01 (or a future
sprint) wiring a real production/dev route onto path 2** — see STOP
gate §40.1.

---

## 3. Coordinate model

**Origin**: the Domain root (`vrindavan-domain`'s single Sector,
`vrindavan-sector`) at Unreal world-space `(0, 0, 0)`. No georeferencing
(no real-world lat/long) — Vrindavan's own Canon never claims a real
geographic location, and STK-CAN-001 authors experiential role, not GPS
coordinates.

**Units**: 1 Unreal unit = 1 centimeter (Unreal's own default) → 1
Unreal-space meter = 100 units. The existing `SpatialBounds.radius`/
`SpatialTransform.position` (`packages/world-embodiment-contracts/src/spatial.ts`)
are explicitly documented as "a normalized, abstract layout... never a
real-world/Unreal-ready coordinate" — **this document is the first to
define a real metric mapping**, additive to that contract, never
replacing it (the abstract layout remains valid for the Web reference
adapter, which has no 3D scene to place).

**Orientation**: +X = downstream direction of the Yamuna (the one
authored directional fact — `edge-yamuna-kadamba-grove`/
`edge-yamuna-govardhan-path` are both tagged `DOWNSTREAM_OF`, per
`vrindavanSpatialDefinition.ts`); +Y = perpendicular, riverbank-to-shore;
+Z = up (Unreal convention).

**Elevation**: flat baseline (`z = 0` for all four Local Places) for
v1 — Canon authorizes no elevation claim, and inventing riverbank/path
elevation differences would be presentation invention beyond STK-SPEC-004's
own authored fields. Terrain sculpting (§6) may vary height WITHIN a
Patch for visual naturalism; it must never encode a SEMANTIC claim (no
Patch "is higher than" another in Canon).

**Transform ownership**: the Unreal-space position of each of the 4
Patches is a **Host-authored, renderer-side constant** (a new, small
`VrindavanPatchLayout` config table — analogous to
`vrindavanSpatialDefinition.ts`'s own Host-authored spatial grammar,
but living in the RENDERER/content layer, never in Runtime core). The
Runtime's own `PatchId`/`LocalPlaceId` never carries an Unreal
coordinate — semantic identity and physical placement are two different
tables, joined only by the shared `PatchId`/`LocationId` string.

**Precision**: `double` (Unreal 5's Large World Coordinates) is not
required at 500m×500m scale; `float` is sufficient. Reserved for future
expansion (§2's own extent note: "Do not import Living Forest's larger
sector-size convention here") — if a future Sector expands the world
well beyond kilometers, LWC becomes relevant then, not now.

**Deterministic placement**: given a fixed `VrindavanPatchLayout` and a
fixed Local-Place-to-Unreal-coordinate table, ANY renderer computes the
IDENTICAL Unreal-space transform for the SAME semantic entity/place —
no per-session randomization of placement. Entity POSITION WITHIN a
Patch (where exactly a cow stands) is presentation-layer detail (§12),
never semantically meaningful beyond "this entity is in this Patch."

**Semantic identity never depends on an Unreal Actor GUID** — enforced
by construction: `EntityPresentation.entityId`/`PatchId`/`LocationId`
are plain strings, already stable across snapshots (Sprint 8's own
documented invariant); the Unreal adapter's own actor-instance map
(§12) is renderer-local state, never round-tripped into Runtime.

---

## 4. Spatial hierarchy → renderer mapping

**Many-to-one and one-to-many, explicitly, per the mission's own
instruction — never a forced 1:1**:

| Semantic level | Real Vrindavan cardinality | Renderer mapping |
|---|---|---|
| Domain (`vrindavan-domain`) | 1 (degenerate) | The one Unreal Level/World Partition world |
| Sector (`vrindavan-sector`) | 1 (degenerate, "~500m×500m") | The one World Partition grid extent |
| Quadrant (`vrindavan-quadrant`) | 1 (degenerate, "Core") | No renderer unit at all — collapses entirely; a Quadrant with one member contributes nothing a Patch mapping doesn't already provide |
| Patch (4: entry/yamuna/kadamba-grove/govardhan-path) | 4 | **Many-to-one candidate**: each Patch maps to ONE OR MORE World Partition cells depending on physical footprint (§5) — never forced to exactly one cell |
| Local Place (4, 1:1 with Patch today) | 4 | A Data Layer (or Data Layer instance) per Local Place, for selective streaming/visibility (encounter staging, atmosphere overrides) — **one-to-one today, but the mapping mechanism supports one-to-many if a future Approved artifact subdivides a Patch** |
| Entity (population/group) | dynamic | Individual actors / group proxies (§12/§13) — NEVER a World Partition cell or Data Layer; entities stream independently of the spatial grammar's own cells |

**Preserved invariant**: `semantic place identity ≠ renderer streaming
unit`. A `PatchId` string never becomes a World Partition cell name, a
Data Layer asset name, or a Level name directly — each renderer-side
table (§3's `VrindavanPatchLayout`, a future `VrindavanStreamingMap`)
is a JOIN, not an identity aliasing. This is the same discipline
`packages/spatial-ecology-contracts`' own `SpatialMembership` already
enforces one layer up (a derived lookup, never carried on
`LivingEntityState` itself).

---

## 5. World Partition strategy

**500m×500m does not justify heavy streaming** — Unreal's default
World Partition grid cell (`256m` or configurable) means the ENTIRE
Vrindavan Sector fits inside 2×2 to 4×4 cells. Initial posture:

- **Always-loaded core**: one HLOD-0 always-loaded cell covering the
  hub — `patch-yamuna` (the topological center; every path routes
  through it, per §2's confirmed hub-and-spoke topology) — so the
  river, the visual anchor of the whole space, is never a pop-in
  moment.
- **Streamed local detail**: `patch-vrindavan-entry`, `patch-kadamba-grove`,
  `patch-govardhan-path` each get their own streaming cell(s), loaded
  on proximity — small enough (each Patch is a fraction of 500m) that a
  single cell per Patch is very likely sufficient; do not pre-subdivide
  further without a real profiling reason (§32).
- **Data Layers**: one per Local Place for CONTENT variation (season
  overrides, encounter-staging dressing, canonical-projection dressing
  — §24) — orthogonal to the streaming-cell grid, not a duplicate of it.
- **Actor/data-layer organization**: entities (§12) are NOT World
  Partition-managed actors in the terrain-streaming sense — they are
  spawned/despawned by the Unreal Semantic Bridge (§21) reacting to
  Runtime occupancy (§15), independent of which terrain cell happens to
  be loaded underneath them.
- **Future adjacent-sector expansion**: the grid origin (§3) and cell
  size are chosen so a FUTURE Sector (should Canon ever authorize one)
  tiles adjacently without renumbering existing cells — reserve grid
  coordinates, do not hardcode "this is the only Sector that will ever
  exist" into any Unreal DataAsset.
- **No visible operational boundary**: Patch boundaries must never
  render as a seam, fence, fog wall, or loading trigger volume the
  visitor can perceive (§11).

---

## 6. Terrain pipeline

```
Sprint 16 spatial grammar (Patch adjacency, habitat type: threshold/
riverbank/grove/corridor-path)
        +
STK-SPEC-004 authored intent (biome/atmosphere per Local Place)
        │
        ▼
terrain/blockout authoring (hand-placed heightmap sketch honoring
adjacency + habitat silhouette — a person, not a procedural system,
decides "this is where the riverbank sits, this is where the grove
canopy starts")
        │
        ▼
Landscape (Unreal Landscape actor, sculpted from the blockout)
        │
        ▼
material layers (per-habitat-type material blend: threshold/riverbank/
grove/corridor-path, painted along the blockout's own layer weights)
        │
        ▼
PCG masks (vegetation/ground-cover DENSITY masks derived from the
material layer weights — realization, never topology)
```

**Authored vs. procedural vs. Runtime-derived**:

| Aspect | Source |
|---|---|
| Patch adjacency / which locations connect | **Authored** — Canon (STK-CAN-001), immutable |
| Riverbank vs. grove vs. path silhouette | **Authored** — a person blocks it out, honoring habitat type |
| Fine ground detail, foliage scatter density | **Procedural** (PCG, §8/§9) |
| Vegetation CONDITION (sparse/moderate/dense) at a given moment | **Runtime-derived** — `PatchState.vegetationCondition` (Sprint 7→16) drives which PCG density preset is active |
| Water level/hydrology appearance | **Runtime-derived** — `PatchState.hydrologyCondition` |
| Canonical topology (which Patch exists, its neighbors) | **Never procedural** — PCG/terrain tools must not be able to change which Patches exist or which are adjacent; that is Canon+Sprint16 grammar, read-only to content tooling |

Priority order for v1, per the mission's own instruction: correct
spatial relationships → traversability → silhouette → riverbank form →
grove/path differentiation, BEFORE cinematic terrain art quality.

---

## 7. Yamuna embodiment

Runtime exposes, all already real and unmodified:

- `PatchState.hydrologyCondition` (`EnvironmentalBand`, Sprint 7→16, at
  `patch-yamuna`)
- `PatchState.resourceAvailability` (includes `"water"` at `yamuna`,
  Sprint 13→16)
- Season-driven hydrology baseline (Vasanta "moderate" → Grīṣma "low",
  STK-SPEC-006, Approved)
- STK-SPEC-004's own authored intent for `yamuna`: biome `"riverbank"`,
  atmosphere `"contemplative"`, soundscape motif `"flowing-water"`,
  presentation intensity `"restrained"`, pacing `"slow"`

Unreal mapping (realization only):

| Runtime signal | Unreal realization |
|---|---|
| `hydrologyCondition: moderate` (Vasanta) | Water System spline at nominal flow rate/width; healthy bank vegetation density |
| `hydrologyCondition: low` (Grīṣma) | Reduced flow-rate parameter, exposed bank material blend increases, bank vegetation density preset shifts down |
| `resourceAvailability` includes `"water"` | (informational only — already implied by the Patch existing at all; no separate visual state needed) |
| Soundscape motif `"flowing-water"` | Ambient embient ⁠audio channel keyed to the Water System's own flow-rate parameter (§27) |

**The same Runtime water state must be renderable on Web** — enforced
by construction: the Unreal Semantic Bridge and the Web reference
adapter both consume the IDENTICAL `PatchState`/`EnvironmentPresentation`
fields; neither ever reads an Unreal Water System parameter back into
anything the other renderer needs.

---

## 8. Vegetation / PCG architecture

```
PatchState.vegetationCondition (Runtime, Sprint 7→16)
        +
STK-SPEC-004 authored intent (biome, e.g. "riverbank"/"grove"/"path")
        ▼
Renderer Adapter (NEW, Build 02 scope): maps (habitatType, vegetationCondition)
        → a VegetationPresentation-shaped intent
        (packages/world-embodiment-contracts/src/environmentPresentation.ts,
        ALREADY EXISTS: `{ semantic: string; densityBand: EnvironmentalBand }`
        — reused verbatim, never redeclared)
        ▼
Unreal-side Vegetation Preset Registry (NEW, content-layer, §28):
        VegetationPresentation.semantic → { PCG graph ref, foliage type
        set, density multiplier table keyed by densityBand }
        ▼
PCG graph execution → foliage instances
```

Semantic variation examples (Host-authored intent, reusing the
`VegetationPresentation.semantic` string field that already exists —
no contract change needed):

- `sparse` — low `densityBand`, e.g. Grīṣma at any Patch
- `moderate` — default Vasanta baseline
- `dense-riverbank` — `patch-yamuna` at high `vegetationCondition`
- `flowering-forward` — Vasanta's own authored register ("mild,
  warming, flowering-forward," STK-CAN-006) mapped to a flowering-plant
  PCG variant at `kadamba-grove`/`yamuna` during Vasanta only

**Runtime never knows a `.uasset` path** — `VegetationPresentation`
carries only `semantic`/`densityBand`; the Vegetation Preset Registry
(§28) is the ONLY place a PCG graph reference or foliage-type asset
path exists.

---

## 9. PCG ownership

**PCG may control**: foliage scattering, ground cover, rock/prop
distribution, density realization, per-instance variation (rotation/
scale jitter), visual micro-detail.

**PCG must NOT decide**: canonical place identity (a PCG graph never
determines "this location is Yamuna" — that's `LocationId`, fixed by
Canon), legal transitions (PCG never gates which Patches connect — that
is `SpatialEdge`/topology, Sprint 16, immutable to content tooling),
world consequences (a PCG seed change must never alter `PatchState.
ecologicalPressure` or any Runtime fact — the causal arrow is
Runtime→PCG, never PCG→Runtime), entity identity (PCG-scattered rocks/
grass are never `EntityId`-bearing; `LivingEntityState` entities are a
completely separate spawn path, §12), encounter availability (PCG
never creates or removes an `EncounterOpportunity`), narrative truth
(PCG never reacts to or produces `CanonicalEventProjection` state
directly — only to the ALREADY-realized `PLACE`-domain `AdaptationEffect`
a canonical event may have produced, §24).

---

## 10. Local Place visual grammar

Grounded entirely in real, Approved StudioK content (STK-CAN-001,
STK-CAN-003, STK-SPEC-004) plus Sprint 16's own real spatial grammar —
**zero invented canonical detail**:

### `vrindavan-entry` (Patch: `patch-vrindavan-entry`, habitat: `threshold`)
- **Terrain character**: transitional threshold ground — neither river
  nor grove nor path yet; the "arrival" register.
- **Landmark language**: an unmistakable single arrival marker (a
  gateway tree, an old stone marker — content decision, not Canon
  detail) that visually says "you have crossed over," nothing ornate.
- **Vegetation**: sparse-to-moderate, deliberately less dense than
  `kadamba-grove` — presence without immersion yet.
- **Water relationship**: none (no `water` resource affordance here).
- **Atmosphere**: `"arrival"` (STK-SPEC-004), presentation intensity
  `"restrained"`, pacing `"slow"`.
- **Traversal**: the world graph's own entry point
  (`entryLocationId`) — the ONE Local Place every visitor's session
  begins at.
- **Visual transition**: opens toward `yamuna` (the only real edge).
- **Audio intent**: quiet, orientation-focused, no dominant motif
  authored yet (STK-SPEC-004's own `soundscape` is unspecified here —
  do not invent one; use ambient environmental bed only, §27).
- **Encounter staging affordance**: none seeded (Sprint 14/18's own
  encounter rules are anchored at `yamuna`/`kadamba-grove`/
  `govardhan-path`, never `vrindavan-entry`).

### `yamuna` (Patch: `patch-yamuna`, habitat: `riverbank`)
- **Terrain character**: riverbank, the hub of the whole topology (§2)
  — every path leads through here.
- **Landmark language**: the river itself is the landmark; no
  competing structure should draw focus from it.
- **Vegetation**: riverside plant life, `riverbank-vegetation` entity
  archetype (dormant→budding→flowering→seeding, real Sprint 7/16
  lifecycle) visually present as a living, changing feature, not
  static dressing.
- **Water relationship**: primary — the Water System is centered here.
- **Atmosphere**: `"contemplative"`, soundscape motif
  `"flowing-water"`, restrained/slow (STK-SPEC-004).
- **Traversal**: the ONLY hub — reaches `vrindavan-entry`,
  `kadamba-grove`, AND `govardhan-path` (the latter two have no direct
  edge to each other, §2).
- **Visual transition**: three distinct sightlines/paths radiating
  from one riverbank vantage.
- **Audio intent**: flowing water as the dominant, always-present
  motif (§27).
- **Encounter staging affordance**: the real, Approved
  `yamuna-flowering-reflection` encounter rule (Sprint 7/14) and the
  real `yamuna-narrative-gate` protected-narrative rule (§24, §25) are
  both anchored here.

### `kadamba-grove` (Patch: `patch-kadamba-grove`, habitat: `grove`)
- **Terrain character**: enclosed grove, closer/more intimate scale
  than the open riverbank.
- **Landmark language**: canopy cover creating a distinct light
  quality shift from `yamuna`'s open sky.
- **Vegetation**: dense, `moderate`-to-`dense` `vegetationCondition`
  baseline; `ambient-bird-flock` entity archetype
  (dispersed→present→departed, real Sprint 7/16) visibly active.
- **Water relationship**: none directly (reachable only via `yamuna`).
- **Atmosphere**: `"intimate"`, soundscape motif `"grove-ambience"`,
  restrained/slow (STK-SPEC-004).
- **Traversal**: reachable ONLY via `yamuna` — dead-end from the
  grove's own side except back toward the river.
- **Visual transition**: canopy closing in as the visitor approaches
  from `yamuna`.
- **Audio intent**: layered ambient grove sound (birds, leaves, small
  movement) — see `ambient-bird-flock`'s own real presence.
- **Encounter staging affordance**: `kadamba-grove-ambient-presence`
  (Sprint 7/14) and Sprint 11's own emergent-encounter rules keyed on
  recent arrival/reunion here.

### `govardhan-path` (Patch: `patch-govardhan-path`, habitat: `corridor-path`)
- **Terrain character**: a path/corridor form, distinct from both the
  open riverbank and the enclosed grove — movement-oriented space.
- **Landmark language**: a sense of DIRECTION and destination-not-yet-
  reached — the "stewardship"/"responsibility" register (STK-CAN-001).
- **Vegetation**: moderate, corridor-appropriate (not as enclosed as
  the grove, not as open as the riverbank).
- **Water relationship**: none directly (reachable only via `yamuna`).
- **Atmosphere**: `"purposeful"`, presentation intensity `"standard"`
  (the one Local Place authored at standard rather than restrained
  intensity), pacing `"moderate"` (also the one Local Place authored
  faster than "slow").
- **Traversal**: reachable ONLY via `yamuna`; the one Route (`route-
  govardhan-path`, Sprint 16) models this as a corridor, not a point.
- **Visual transition**: a lengthening, directional view as the
  visitor commits to the path.
- **Audio intent**: activity/movement-suggestive, matching "moderate"
  pacing — distant pastoral activity motif is appropriate here (§27),
  more so than at the other three Local Places.
- **Encounter staging affordance**: the Host-authored (not-yet-Canon,
  §24) `canonical-event-govardhan-lifting` fixture is scoped here;
  present it with the honest caveat (§24) until StudioK authorizes it.

---

## 11. Visual continuity

Patch boundaries are simulation/operational structures, never fences.
Concretely, for v1:

- Terrain height, material blend, and vegetation density all
  interpolate CONTINUOUSLY across a Patch boundary (blended in the
  Landscape material graph / PCG mask falloff, never a hard material
  seam at the boundary polygon).
- Ambient audio channels (§27) crossfade across boundaries by distance
  to the nearest Local Place's own soundscape motif, never cut.
- Lighting/atmosphere (§17) is a single, world-wide Sky/Atmosphere
  system parameterized by season/time — never a per-Patch lighting
  rig that would create a visible seam.
- World Partition cell boundaries (§5) must not coincide with any
  visible material/prop-density discontinuity — verify this explicitly
  during blockout review, not just by convention.
- Ambient life (birds, insects, distant animal sound) should not
  "stop" at a boundary — it is authored as a continuous field
  (density/frequency varying smoothly with Patch) not a per-Patch
  on/off switch.

---

## 12. Entity representation

```
LivingEntityState (Runtime, Sprint 7/10, authoritative)
        │  entityId, archetypeId, locationId, lifecyclePhase
        ▼
EntityPresentation (renderer-neutral, packages/world-embodiment-contracts,
        ALREADY EXISTS — entityId carried through unchanged,
        presentationArchetype/activityHint/animationSemantic/
        audioSemantic/movementSemantic/movementTargetLocationId/groupId)
        │
        ▼
Unreal representation (Build 02 scope): an EntityActorBinding table,
        renderer-local, keyed by entityId → { actor: AActor* | null,
        lastKnownLocationId, lastAppliedTransform }
```

**Kept explicitly separate** (per the mission's own instruction):
semantic identity (`entityId`, Runtime-owned, permanent), authoritative
lifecycle state (`LivingEntityState.lifecyclePhase`, Runtime-owned),
renderer actor instance (`AActor*`, Unreal-owned, transient — may be
null while the entity is semantically alive but not currently
streamed-in).

- **entityId → actor binding**: a renderer-local map, never persisted
  to Runtime. Looked up/created on demand from `EntityPresentation`.
- **Spawn/despawn**: driven by `EntityPresentation.visible` combined
  with World Partition cell load state — an entity's Patch being
  unloaded despawns its actor; the semantic entity is untouched (§15).
- **Streaming rehydration**: on re-load, the binding table's
  `lastKnownLocationId`/latest `EntityPresentation` (re-fetched, not
  cached indefinitely) respawns the actor at the CURRENT semantic
  state — never resumes from a stale cached transform.
- **Transform update**: applied from `movementTargetLocationId`
  (semantic) via the Unreal adapter's own NavMesh/pathfinding (§14) —
  never a raw coordinate from Runtime (none exists yet, §3, and even
  once it does, Runtime should express intent, not literal path).
- **Animation semantic**: `EntityPresentation.animationSemantic` drives
  an Unreal animation state machine selection (§16), never vice versa.
- **Visibility**: `EntityPresentation.visible` — a semantic fact (is
  this entity currently meant to be observable), independent of
  whether ITS OWN Patch happens to be streamed in.
- **Group membership**: `EntityPresentation.groupId` (already exists)
  feeds herd/flock representation (§13).
- **LOD**: renderer-only concern (§13's tiering), never round-tripped
  to Runtime.

---

## 13. Herd/flock representation

Population/group support (Sprint 10+) already models `GroupId`,
cohesion, and `SetGroupIntent`-shaped semantic direction
(`packages/world-embodiment-contracts/src/unrealCommand.ts`, already
exists). Three representation tiers, purely a renderer-side LOD
decision, never altering authoritative group state:

| Tier | Distance | Representation |
|---|---|---|
| Near visitor | close | Individual visible actors per `EntityPresentation`, full animation/audio |
| Mid-distance | medium | Simplified group behavior — shared/blended animation state per group, reduced per-instance skeletal update rate |
| Far | distant | Aggregate/impostor representation (billboard/instanced-mesh cluster, or ambient ONLY — e.g. distant bird-flock silhouette + ambient audio motif, no individual skeletal actors at all) |

**Avoid one expensive full-AI controller per member where
unnecessary** — for the real seeded Vrindavan population (2 cows at
`yamuna`, 2 bird-flock members at `kadamba-grove`, Sprint 10's own
deliberately small archetype set), even "near visitor" tier is cheap;
this tiering exists for future population growth, not because today's
2+2 entities need it. Authoritative group identity/state
(`GroupState.cohesion`, `memberEntityIds`) is NEVER read from or
written by the renderer tier decision — tiering is purely "how do I
draw what Runtime already told me is there."

---

## 14. Movement

```
Runtime: entity/group SEMANTIC movement intent
        MovementSemantic + movementTargetLocationId (already exists,
        EntityPresentation) — "this entity should move from Patch A's
        semantic region toward Patch B's"
        │
        ▼
Unreal: NavMesh/pathfinding + animation produces ACTUAL visual traversal
        (may detour around a prop, another actor, a temporary obstacle)
```

If the renderer's own physical path temporarily differs from a literal
straight line (obstacle avoidance, navmesh routing around the terrain
blockout), the **semantic destination remains Runtime-owned** — the
Unreal adapter never reports the detour back into Runtime; Runtime
only ever needs to know "did the entity reach `movementTargetLocationId`
yet," answered by the NEXT wake's own `LivingEntityState.locationId`
update (Sprint 10, unmodified), never by continuous position telemetry.
**Do not report every centimeter back into Runtime** — this is a hard
architectural boundary, not a performance optimization: Runtime has no
contract field to receive centimeter-level position at all, and
inventing one would let Unreal's own pathfinding become a second
source of location truth.

---

## 15. Occupancy

Runtime owns semantic occupancy (`PlaceOccupancy`, Sprint 13;
`PatchState.presentEntityIds`, Sprint 16). **Streaming visibility ≠
semantic presence, explicit invariant**: an entity whose Patch's World
Partition cell is currently unloaded is NOT semantically absent from
that Patch — `PatchState.presentEntityIds` still lists it, because
Runtime's own occupancy derivation (Sprint 13→16) never consults
anything Unreal-side. The Unreal adapter's own `EntityActorBinding`
(§12) may correctly show `actor: null` for that entity while Runtime
correctly shows it present — this is NOT a bug, it is the designed
separation. A future dev/diagnostic mode (§36) should be able to
display "N entities present, M currently streamed/visible" as two
distinct, both-correct numbers.

---

## 16. Animation

Semantic animation layer, using ONLY vocabulary already authorized by
real contracts (`EntityPresentation.animationSemantic`,
`activityHint` — both already exist and are free-form strings, not yet
a closed enum): `idle`, `travel`, `graze`, `drink`, `rest`, `gather`,
`disperse`, `observe` — chosen because they already map onto real
Sprint 10/13 behavior vocabulary (`BehaviorType`: `MOVE_TO_RESOURCE`,
`REST`, `GRAZE`, `DRINK`, `SOCIALIZE`, etc., and `RhythmPhase`/day-phase
routine windows, Sprint 13). Build 02 should NOT widen
`animationSemantic` into a closed union in Runtime contracts (it is
correctly a free string today, letting content evolve without a
contract change) — instead, the Unreal-side Animation Semantic Registry
(§28) maps each observed string to: an animation state machine node,
motion-matching database entry, or montage, plus optional procedural
look-at/IK layering. **Animation Blueprint state is never world
truth** — if two animation states are mid-blend when a snapshot
arrives, the semantic fact (`animationSemantic`) simply updates; the
Blueprint's own transition logic (not Runtime) decides how the visual
blend resolves.

---

## 17. Atmosphere

```
Runtime (Sprint 7, unmodified): season/time, weather bands, hydrology
bands, ecological bands
        │
        ▼
Renderer Adapter: AtmospherePresentation (ALREADY EXISTS: semantic +
        temperatureBand + illuminationSemantic)
        │
        ▼
Unreal: Sky Atmosphere/Volumetric Cloud parameters, fog density, wind
        source strength/direction, directional light color/intensity,
        vegetation-material wind-response parameter, surface
        wetness/dryness material parameter
```

Causal environment stays Runtime-owned absolutely — the Unreal adapter
never computes a weather/season transition itself; it only ever reads
`EnvironmentPresentation`/`AtmospherePresentation` (both already exist)
and maps semantic → visual parameter.

---

## 18. Time of day

`WorldClock`/`tick` (Sprint 7/9) remains authoritative. Unreal maps
logical tick → sun position/sky/lighting/shadow/ambient-audio-
schedule/visual-activity-level via a deterministic function of tick
(or the day-phase already derived from it, Sprint 13's own `DayPhase`
— reused, not re-derived independently in Unreal). **Do not let Unreal
clock drift become world time**: the Unreal adapter's own local
"visual clock" (whatever interpolation it runs between snapshots for
smooth sun movement) must RESYNC to the authoritative tick on every new
snapshot/delta (§20), never accumulate its own drifted notion of "how
much time has passed" across multiple snapshots. Resync behavior:
snapshot arrives with tick T → adapter's own visual-clock target jumps
to T's own sun-position mapping; any local INTERPOLATION only smooths
the visual transition TOWARD that target, never redefines the target.

---

## 19. Season presentation

Build 01 begins with Vasanta; Grīṣma is the one other Approved,
reference season (STK-CAN-006). Build 02 architects for exactly these
two, parameterized so later seasons (should Canon ever authorize them)
are **content additions, never renderer architecture changes**:

```ts
// Illustrative shape only -- Runtime contract unchanged, this is a
// renderer/content-layer config table.
interface SeasonPresentationProfile {
  seasonId: string                  // "vasanta" | "grishma" today
  skyPreset: string                 // asset registry key, §28
  vegetationDensityMultiplier: number
  waterFlowRateMultiplier: number
  ambientAudioBedKey: string
}
```

A `Record<seasonId, SeasonPresentationProfile>` keyed by Runtime's own
`seasonId` string (already exists, `SharedWorldState.season.currentSeasonId`)
means adding a third season later is: author a new Canon/spec season
(StudioK's own governance work), add one new table row (content
work) — **zero Unreal C++/Blueprint code change, zero Runtime
contract change**. Do NOT pre-build stub profiles for the other four
Vrindavan seasons Canon has not yet authorized (STK-CAN-006 itself
authorizes only Vasanta→Grīṣma as a transition; do not invent
Grīṣma→X).

---

## 20. World deltas

`WorldEmbodimentDelta`/`EmbodimentDeltaEntry` (Sprint 8, already
exists: `{path, op: ADD|UPDATE|REMOVE|UNCHANGED, before?, after?}`) and
`SpatialDelta`/`SpatialDeltaEntry` (Sprint 16, already exists,
`kind: patch|territoryPressure|route`) are the REUSED mechanism — Build
02 adds no new delta type, only maps existing delta entries into
targeted Unreal update calls instead of a full snapshot rebuild:

| Delta path pattern | Unreal update |
|---|---|
| `region:<locationId>.environment` | `UpdateEnvironment`/`SetAtmosphere`/`SetWaterState`/`SetVegetationIntent` (all already exist, `unrealCommand.ts`) targeted at that region's own actors/materials only |
| `entity:<entityId>` (UPDATE) | `UpdateEntity` (transform/animation/activity), never a despawn/respawn |
| `entity:<entityId>` (ADD/REMOVE) | `PlaceEntity`/`RemoveEntity` |
| `patch` (spatial delta) | Landscape material parameter / PCG density parameter update for that Patch's own region only |
| `territoryPressure`/`route` (spatial delta) | informational only for v1 — no direct visual representation proposed yet (§39's own scope: prove the mechanism, not every visual consequence) |

**Stable semantic IDs preserved throughout** — `entityId`/`locationId`/
`PatchId` never change identity across a delta; this is what makes
"patch only what changed" possible at all (already Sprint 8's own
documented rationale for `EmbodimentDeltaEntry.path`).

---

## 21. Unreal command bridge

**Existing** (`packages/world-embodiment-runtime/src/unrealCommandTranslator.ts`,
90 lines, Sprint 8/10): `translateToUnrealCommands(snapshot:
WorldEmbodimentSnapshot): UnrealCommand[]`,
`translateEmbodimentDeltaToUnrealCommands(delta): UnrealCommand[]`,
`translateGroupIntentToUnrealCommands(groups): UnrealCommand[]`. All
three are pure, headless, engine-dependency-free — proven, tested,
reused verbatim.

**What it already supports**: region creation/environment/atmosphere/
water/vegetation-intent, entity place/update/remove/move-to-region,
group intent, interaction-anchor creation for encounters (`CreateInteractionAnchor`).

**What Build 01 will require that it does NOT yet support** (verified
by direct inspection — `UnrealCommand`'s own closed union has no case
for any of the following):

1. **Spatial-ecology-derived signals** — `PatchState.ecologicalPressure`,
   `resourceAvailability`, `movementPermeability` (Sprint 16) have no
   `UnrealCommand` op yet. `SpatialSnapshot`/`SpatialDelta` are never
   consumed by `unrealCommandTranslator.ts` at all today.
2. **Canonical-event projection presentation** (Sprint 18) — no op for
   "stage/present a completed `CanonicalEventProjection`" exists.
3. **Population/social/rhythms richness** — `translateToUnrealCommands`
   takes the BASE `WorldEmbodimentSnapshot` (Sprint 8), which per §2's
   own finding is not yet fed by the composed chain in production; the
   translator itself has no opinion on herd cohesion, relationship
   band, or day-phase routine — it only sees whatever
   `EntityPresentation`/`EmbodiedRegion` already carries.

**Which commands should become Build 02 implementation work** (once
Build 01 closes and reconciliation confirms the shapes, per STOP gate
§40.1): additive `UnrealCommand` variants — `UpdatePatchEcology`
(ecologicalPressure/resourceAvailability/movementPermeability →
material/PCG parameter), `StageCanonicalProjection`
(activationId/scope/mandatedFacts → staging/visibility/camera
affordance, §24), `UpdateGroupCohesion` (extends the already-existing
`SetGroupIntent` shape, does not replace it). **Do not create a
competing Unreal bridge** — every one of these is an ADDITIVE case on
the existing closed union, in the existing file, following the exact
precedent Sprint 10 already set when it added `MoveEntityToRegion`/
`SetGroupIntent` to Sprint 8's original four ops.

---

## 22. Renderer capability negotiation

`EmbodimentRendererCapabilities` (`packages/world-embodiment-contracts/src/capability.ts`,
already exists) already models exactly the axes Unreal-vs-Web needs:
`spatial3D`, `ambientAudio`, `spatialAudio`, `animation`, `particles`,
`dynamicLighting`, `haptics`, `vegetationInstances`, `waterSurface`,
`largeWorldStreaming`. `negotiateRegionForCapabilities` (`packages/
world-embodiment-runtime/src/capabilityNegotiation.ts`, already exists)
degrades an `EmbodiedRegion` for a declared capability set.

Unreal declares (proposed, all true, matching `MINIMAL_EMBODIMENT_CAPABILITIES`'s
own "everything false is the floor" contract in reverse): `spatial3D:
true, ambientAudio: true, spatialAudio: true, animation: true,
particles: true, dynamicLighting: true, haptics: false (v1), 
vegetationInstances: true, waterSurface: true, largeWorldStreaming: true`.
Web declares mostly `false` today (its own existing reference-adapter
posture, unmodified). **Both receive the SAME underlying
`WorldEmbodimentSnapshot`/`SpatialSnapshot`** — negotiation governs
which fields a renderer bothers to REALIZE, never which facts exist.

---

## 23. Interaction input

Unreal player interaction → `InteractionIntent` (Sprint 6/19, closed
union, 5 variants: `EnterWorldIntent`, `LeaveWorldIntent`,
`VisitLocationIntent`, `BeginReflectionIntent`, `SelectEncounterIntent`)
→ `dispatchInteractionIntent` (`lib/worldEmbodiment/intentDispatcher.ts`,
Sprint 8, unchanged) — **the single renderer→Host crossing point,
verified unchanged since Sprint 8 through Sprint 19's own extension**.
A future Unreal input bridge constructs one of these 5 intent objects
and submits it here — it must never call any deeper Host function
(`authorizeAndRecordParticipation`, `wakeWorldWithCanonicalEvents`,
any repository) directly.

The Unreal client never directly writes entity state, world state,
Canon, adaptation, or memory — structurally true today (verified:
`dispatchInteractionIntent` has no renderer-conditional branch, per
Sprint 20's own acceptance proof L) and remains true because Build 02
introduces no new write path — only a new CALLER of the existing one.

Examples mapped to real, existing intents: enter location →
`VisitLocationIntent`; participate/select encounter →
`SelectEncounterIntent` (routes through Sprint 19's
`authorizeAndRecordParticipation`, itself gated by
`resolveParticipationAuthorization`); begin reflection →
`BeginReflectionIntent` (routes to Sprint 19's `recordPrivateReflection`
— content NEVER re-enters any simulation resolver, per Sprint 19's own
verified firewall, §25/§27's own privacy note).

---

## 24. Canonical-event embodiment

```
Runtime (Sprint 18, unmodified): WorldInstanceCanonicalProjectionState
        { status: COMPLETED, activationId, mandatedFacts, scope,
          worldEventId }
        │
        ▼
Renderer (Build 02, new): staging/visibility/audio/FX/animation/camera
        AFFORDANCES derived from `scope` (a real Sprint 16
        CanonicalEventProjectionScope — today `{level: "PATCH",
        patchId: "patch-govardhan-path"}`) and `mandatedFacts` (today
        one `LOCATION_ACTIVE` fact)
```

**If a cinematic sequence is interrupted visually, Runtime canonical
state remains authoritative** — enforced by construction:
`WorldInstanceCanonicalProjectionState.status` transitions to
`COMPLETED` the instant Runtime's own `applyCanonicalEventConsequences`
succeeds (Sprint 18, already true, already tested — replay-idempotent),
entirely independent of whether any renderer ever plays, finishes, or
skips a presentation of it. A Sequencer/cinematic completing has ZERO
write path back into `WorldInstanceCanonicalProjectionState` — none is
proposed, none should ever be built.

**Honest Canon-discipline caveat, carried forward from Build 01 Part
1's own explicit flag (§2 above)**: the only canonical-event fixture
that currently exists (`canonical-event-govardhan-lifting`) is
Host-authored, `canonDocIds: []` — **not yet an Approved StudioK Canon
artifact**. Build 02's own presentation of it, when implemented, must
carry the identical caveat Sprint 18/Build 01 already attached — label
it "exercises the real canonical-event MECHANISM, pending StudioK
Work Order authorization," never present it as Canon-approved content.
The cleaner Canon-real alternative for a FIRST canonical-presence
visual proof is `yamuna-narrative-gate` (a real, Approved
`narrative-protected` encounter rule from STK-SPEC-006) — Build 02
should prefer this if/when Build 01 Part 2 does not already resolve
the choice (PROVISIONAL, reconcile after Build 01 closure).

---

## 25. Protected-character distinction

**Not implemented in this Phase 0**, per explicit instruction. The
distinction to preserve architecturally: `LivingEntityState` (Sprint 7)
is a persistent ECOLOGICAL/SOCIAL entity — autonomous, behavior-driven,
subject to Sprint 10-15's own needs/rhythm/adaptation machinery, and
explicitly NEVER Canon-authored identity (the real seeded archetypes
are `cow`/`bird-flock`, generic and Host-authored, per Sprint 10's own
documented discipline). A **protected canonical/narrative presence**
(should StudioK ever author one — only "Krishna" is named anywhere in
current Canon, per direct inspection of `studiok-canon`; Radha/Nanda/
Yashoda are this MISSION's own illustrative examples, not confirmed
Canon characters) would need a DIFFERENT contract: presence gated by
`CanonicalEventProjection`/`protectedNarrativeGateOpen` (Sprint 7/14/18,
already real), never spawned/despawned by Sprint 10's own population
tick loop, never carrying a `GroupId`/`RhythmSchedule`/`NeedState` the
way an ordinary entity does. **Do not implement this contract now** —
architect only the exclusion: an ordinary `LivingEntityState` must
never automatically become a protected presence, and a protected
presence (once StudioK authorizes one) must never be constructed via
`lib/livingPopulation/vrindavanPopulationDefinition.ts`'s own
archetype-seeding path.

---

## 26. Encounter presentation

Runtime decides encounter availability (`EncounterOpportunity`,
Sprint 10; `EncounterRecord`, Sprint 14) — unchanged. `UnrealCommand`
already has `CreateInteractionAnchor{regionId, ruleId, category,
interactionAffordance}` (Sprint 8). Unreal may present: entity
behavior cue (an entity's own `animationSemantic` shifting toward
`observe`/`gather` near an available encounter), spatial cue (subtle
lighting/particle emphasis at the anchor point — restrained, matching
STK-SPEC-004's own `"restrained"` intensity authored for 3 of 4 Local
Places), interaction prompt (minimal, diegetic where possible), camera
framing (a soft camera-assist toward the anchor, never a forced cut),
subtle visual/audio affordance. **Avoid game-like floating quest
markers** unless a future, separate experience-design authorization
explicitly calls for one — `interactionAffordance` (already a free
string field) is the hook for that decision, made later, by content
design, not by this architecture.

---

## 27. Audio architecture

Separate semantic audio intent (`SensoryCue{channel, semantic}`,
already exists — `channel: "ambientAudio" | "spatialAudio" | ...`)
from audio ASSETS (§28). Channels, grounded in STK-SPEC-004's own
authored soundscape motifs plus the mission's own list:

| Channel | Source |
|---|---|
| River (flowing water) | STK-SPEC-004 `yamuna.soundscape.motif: "flowing-water"` |
| Grove ambience (birds/leaves) | STK-SPEC-004 `kadamba-grove.soundscape.motif: "grove-ambience"`, reinforced by real `ambient-bird-flock` entity presence |
| Cattle | real seeded cow entities at `yamuna` — entity-attached `audioSemantic` (already an `EntityPresentation` field) |
| Wind | `AtmospherePresentation`-driven, world-wide |
| Footsteps | visitor-local, renderer-only (no Runtime signal needed) |
| Distant pastoral activity | appropriate at `govardhan-path` specifically (its own authored `"purposeful"`/`"moderate"`-pacing register, distinct from the other three Local Places' `"restrained"`/`"slow"`) |
| Canonical-event authored sound | gated by `WorldInstanceCanonicalProjectionState.status === COMPLETED` (§24) — **never autoplayed** without that gate, and never autoplayed at all for authored sacred/music content without an explicit, separate specification (mission's own instruction, taken literally: no such specification exists yet, so no such content is proposed here) |

Audio responds to location (nearest Local Place's own motif),
environment (season/hydrology-driven flow-rate → river audio
intensity), time (day-phase → activity-level ambient bed), and living
entities (per-entity `audioSemantic`, already exists).

---

## 28. Asset / material registry

A NEW, Unreal-content-layer-only mapping table (or Data Asset), never
touching Runtime:

```
VegetationPresentation.semantic ("dense-riverbank")
        → { pcgGraph: /Game/.../PCG_Yamuna_DenseRiverbank,
            foliageSet: [...], materialInstances: [...] }

AtmospherePresentation.semantic ("contemplative")
        → { skyPreset: ..., postProcessProfile: ... }

EntityPresentation.animationSemantic ("graze")
        → { animBlueprint state / motion-matching database entry }
```

**Runtime should never know a `.uasset` path, a Niagara system path, a
material instance, or a skeletal mesh** — enforced structurally,
already true today (verified: zero such reference exists anywhere in
`packages/world-embodiment-contracts`/`-runtime`, `packages/spatial-
ecology-*`, or any `lib/*Definition.ts` file). This registry lives
entirely in the Unreal project's own `Source`/`Content` (§37), likely
as `UDataAsset` subclasses keyed by the semantic string, following
Living Symphony's own real, established naming convention (§37):
`DA_Region_<RegionName>` for per-place data, extended here to
`DA_Vegetation_<Semantic>`/`DA_Atmosphere_<Semantic>` for the
per-semantic registries this section proposes.

---

## 29. Marketplace asset category matrix

No products recommended (per instruction). Categories only:

| Category | Required for v1 | Nice-to-have | Placeholder-viable | Custom/authored needed |
|---|---|---|---|---|
| Indian riverine vegetation (reeds, riverside grasses) | ✓ (`yamuna`) | | ✓ (generic reeds acceptable initially) | eventually, for authenticity |
| Grasses/ground cover | ✓ (all 4 Patches) | | ✓ | |
| Subtropical/tropical trees (grove canopy) | ✓ (`kadamba-grove`) | | ✓ | eventually, for kadamba-specific silhouette (kadamba is a named tree species — a future authenticity pass, not v1-blocking) |
| Water materials/Water System content | ✓ (`yamuna`) | | ✓ (stock Water System) | |
| Terrain materials (riverbank mud, grove soil, path dirt/stone) | ✓ | | ✓ | |
| Rocks/ground props | | ✓ | ✓ | |
| Pastoral props (simple rural dressing) | | ✓ | ✓ | |
| Cattle (skeletal mesh + basic idle/graze/drink/walk anim) | ✓ (real seeded `cow` archetype) | | ✓ for prototype | ✓ eventually — likely the highest-priority CUSTOM asset given cattle's real, load-bearing presence at `yamuna` |
| Birds (flock representation, §13) | ✓ (real seeded `bird-flock` archetype) | | ✓ (impostor/particle-based flock is viable even long-term, §13) | |
| Ambient animal animations (idle/graze/drink/rest/gather/disperse/observe, §16) | ✓ | | partially | cattle-specific gestures eventually |
| Village/rural props | | ✓ | ✓ | |
| Atmospheric VFX (mist, dust, light shafts) | | ✓ | ✓ | |

---

## 30. Visual style

Cinematic, natural, luminous, alive, subtle, spiritually resonant
without visual cliché, grounded enough to feel inhabitable — per
instruction. Concretely tied to real authored intent: 3 of 4 Local
Places are authored `"restrained"` intensity / `"slow"` pacing
(STK-SPEC-004) — this is not a style suggestion, it is Approved
content direction. `govardhan-path` alone authorizes `"standard"`/
`"moderate"` — the one place where slightly more visual/pacing energy
is legitimate. Avoid: theme-park sacredness, excessive gold, fantasy
glow everywhere, constant divine VFX, visual clutter, game HUD
language — all in direct tension with the `"restrained"` register
Canon/spec already commits to for 3 of 4 places. The world should feel
alive FIRST; meaning emerges through experience, not through VFX
insistence.

---

## 31. Visitor camera/controller recommendation

**Third-person** for the Build 02 prototype: better serves "traversal
of the world" (the mission's own stated key test) by keeping the
character's own relationship to the herd/grove/river legible, and
matches the "inhabitable, grounded" style goal (§30) better than
first-person's narrower framing for a contemplative, walking-paced
experience. **Free-camera diagnostic mode** (§36) should exist
alongside it, for spatial/debug review, but is NOT the visitor-facing
default. Do not overbuild avatar customization — a single, simple,
unbranded default character is sufficient; nothing in Canon (STK-CAN-001
through 006) authors a visitor-avatar appearance, so none should be
invented beyond the minimum needed to test traversal and interaction.

---

## 32. Performance architecture

Measurement checkpoints, not invented GPU budgets (per instruction):

- **Active visible entities**: measure actor count within streaming
  range at each of the 4 Local Places under the real seeded population
  (2 cows + 2 bird-flock members today) — establish a baseline before
  any population growth.
- **Foliage density**: measure PCG instance count per Patch at each
  `vegetationCondition` density preset (§8).
- **Draw calls / Nanite candidates**: terrain (Landscape/Nanite-enabled
  where applicable) and any authored static meshes are natural Nanite
  candidates; foliage/vegetation instancing should be profiled
  separately (Nanite foliage support is engine-version-dependent —
  verify against the actual target Unreal version at implementation
  time, not assumed here).
- **Shadow cost / Lumen cost**: measure at the always-loaded
  `patch-yamuna` core cell first (§5) — it is both the visual anchor
  and the one Patch every session guarantees visiting.
- **Water**: measure Water System cost at `yamuna` specifically,
  across both season presets (§19) — Grīṣma's reduced flow may also
  reduce simulation cost, worth confirming rather than assuming.
- **PCG / animation / audio / World Partition / HLOD**: establish one
  baseline measurement per system BEFORE any content-density increase,
  so future iteration has a real delta to compare against, not a guess.

---

## 33. Target hardware tiers

A. **Developer workstation / high-end PC** — full Lumen/Nanite/Water/
PCG realization, primary development/authoring target.
B. **Mainstream PC** — same content, reduced quality presets
(existing Unreal scalability settings — no Vrindavan-specific
architecture needed beyond ensuring content respects standard
scalability groups).
C. **Streamed/cloud-rendered client** — do not assume local Unreal
rendering for every future consumer; the renderer-neutral embodiment
layer (§1.B) already means a cloud-rendering host is just another
Unreal-adapter DEPLOYMENT, not an architecture change — Runtime and the
Semantic Bridge contract are unaffected by where the Unreal instance
physically runs.

---

## 34. Server/client boundary

Persistent Living World Runtime remains logically server-authoritative
— already true, unconditionally, today (verified throughout this
document: zero write path from any renderer concern into Runtime
state). Unreal client runs: rendering, animation, local movement
presentation (§14), camera, input capture (translated to
`InteractionIntent`, §23). Synchronization boundary: the SAME boundary
that already exists between the Runtime facade
(`lib/livingWorldHost/hostService.ts`) and any caller —
`getWorldSnapshotForVisitor`/`getEmbodimentSnapshotForVisitor` (or,
once reconciled per §2's own finding, the richer
`getEmbodimentWithCanonicalEvents`-family read) for state IN, `dispatchInteractionIntent`
for intent OUT. Unreal is a caller across a process/network boundary,
architecturally identical in kind to the existing Web reference
adapter — not a special case requiring a new boundary concept.

---

## 35. Networking boundary

**Not a full MMO network architecture** (per instruction) — only the
contract between world runtime and renderer client:

- **Initial snapshot**: `getWorldSnapshotForVisitor`/
  `getEmbodimentSnapshotForVisitor` (already exists) — or, pending
  §2's reconciliation, the richer composed equivalent.
- **Delta stream**: `WorldEmbodimentDelta`/`SpatialDelta` (already
  exist, §20) — polled or pushed, transport-agnostic; this document
  does not mandate WebSocket vs. polling vs. any specific transport,
  since none of the existing contracts assume one.
- **Semantic input**: `InteractionIntent` → `dispatchInteractionIntent`
  (§23, already exists).
- **Resync**: a renderer whose local delta history has gone stale (or
  never connected before) simply requests a fresh full snapshot — no
  new mechanism needed, `sinceTick`-style parameters already exist on
  the embodiment getters.

Core Runtime remains unbound to Unreal's own replication model —
Unreal-side multiplayer (if ever needed) is Unreal's own concern
between multiple LOCAL clients of one Unreal server process, entirely
downstream of this one snapshot/delta/intent contract; out of scope
here.

---

## 36. Development/debug modes

Renderer TOOLING, never world truth (no Runtime field exists or should
exist to represent "which debug mode is active"):

A. **World Diagnostic Mode** — semantic IDs (`entityId`, `PatchId`,
`LocationId`, `activationId`) rendered as overlay text/labels.
B. **Experience Mode** — the real consumer-facing default, minimal UI,
matching §30's own restrained style.
C. **Spatial Debug Mode** — Patch/topology visualization (draw the
real Sprint 16 `SpatialEdge`/adjacency graph, §2's own confirmed
hub-and-spoke topology, directly in-world as debug geometry).
D. **Performance Mode** — the §32 measurement checkpoints surfaced
live (draw calls, entity counts, streaming cell state).

---

## 37. Unreal project structure

**No Unreal project exists yet for Living Vrindavan** (confirmed by
direct filesystem inspection — no `.uproject` anywhere under
`avatark-*` or `living-vrindavan*`). One DOES exist for a sibling
StudioK world, **Living Symphony**
(`/home/user/workspace/living-symphony/unreal/`), governed by two real,
Accepted ADRs directly relevant here:

- **LS-ADR-001** (repo topology): single monorepo per world (`docs/`,
  `canon/`, `specifications/`, `unreal/{Config,Content,Plugins,Source}`)
  over a three-way split — justified by "no finished art yet, single
  world," with an explicit, named revisit trigger: **"a second StudioK
  world begins integrating Living Symphony plugins or assets."**
- **LS-ADR-002** (plugin architecture): four plugins —
  `StudioKWorldCore` (zero StudioK-internal dependencies; owns
  `FStudioKWorldId`/`FStudioKRegionId` value types, base
  `IStudioKWorldRuntime`/`IStudioKEventChannel` interfaces,
  `UStudioKWorldDataAsset`/`UStudioKRegionDataAsset` base classes —
  **explicitly, "every other StudioK plugin, in Living Symphony or any
  future world, is expected to depend on this one"**),
  `StudioKRhythmRuntime`/`StudioKWorldEvents` (each depends only on
  WorldCore), `StudioKDeveloperTools` (Editor-only, may depend on all
  three).

**This is a coordination point, not a decision this document can make
unilaterally** (StudioK-platform-level governance, outside
`avatark-platform-web`'s own authority) — but the architecturally
correct target, matching LS-ADR-002's own explicit design intent, is:
Living Vrindavan's Unreal integration depends on `StudioKWorldCore`
(once/if StudioK platform governance extracts it to a shared location
per LS-ADR-001's own named revisit trigger — which Vrindavan's own
Unreal integration effort literally IS), plus a NEW
`StudioKVrindavanRuntime` plugin (Vrindavan-specific: Patch layout,
canonical-event staging, population/herd realization), following the
IDENTICAL "depends only on WorldCore" discipline `StudioKRhythmRuntime`
already establishes.

**Until that StudioK-platform decision is made** (flagged, not
resolved, here — see STOP gate §40.5), propose a self-contained
`living-vrindavan` monorepo mirroring LS-ADR-001's own reasoning
exactly (no finished art yet, single world, zero benefit from an early
split):

```
living-vrindavan/
  docs/                          -- this class of architecture document
  canon/                         -- reference-only mirrors of Approved STK-CAN-*
  specifications/                -- reference-only mirrors of Approved STK-SPEC-*
  unreal/
    Config/
    Content/LivingVrindavan/
      Regions/<LocalPlaceName>/  -- VrindavanEntry/ Yamuna/ KadambaGrove/ GovardhanPath/
      PCG/<LocalPlaceName>/
      Niagara/<LocalPlaceName>/
      MetaSounds/<LocalPlaceName>/
    Plugins/
      StudioKVrindavanRuntime/   -- depends only on StudioKWorldCore (once available)
      StudioKVrindavanDeveloperTools/  -- Editor-only, mirrors StudioKDeveloperTools
    Source/LivingVrindavan/
      Public/  Private/
        RuntimeBridge/           -- the Unreal Semantic Bridge (§21)
        Environment/             -- atmosphere/water/vegetation realization (§6-9,17)
        Entities/                -- entity/group actor binding (§12-13)
        Canonical/               -- canonical-projection staging (§24)
        Interactions/            -- InteractionIntent construction (§23)
        Debug/                   -- development modes (§36)
```

Content is organized BY REGION (matching Living Symphony's own real,
documented `folder-standards.md` convention: `Regions/<Name>/`,
`PCG/<Name>/`, `Niagara/<Name>/`, `MetaSounds/<Name>/`); Source is
organized BY SYSTEM (matching this mission's own suggested
`/Environment /Vegetation /Water /Entities /Audio /Interactions
/Canonical /Data /RuntimeBridge /Debug` list, consolidated to avoid
redundant folders — e.g. Water/Vegetation fold into `Environment/`
since they share one `EnvironmentPresentation` source contract, §7-9).
Asset naming follows Living Symphony's own real convention
(`DA_Region_<Name>`, `PCG_<Name>_<Purpose>`, `NS_<Name>_<Effect>`,
`MSS_<Name>_<Concept>`), extended per §28 for per-semantic (not only
per-region) registries.

**No large Unreal binary project is created in this Phase 0 mission**
— this section is a proposal only.

---

## 38. Build 02 implementation sequence

1. Create/recover the Unreal project (per §37's own resolved topology
   — self-contained `living-vrindavan/unreal/` unless StudioK
   governance has by then extracted `StudioKWorldCore`).
2. Establish the Runtime bridge (a thin HTTP/RPC client against
   `lib/livingWorldHost/hostService.ts`'s facade, or whatever transport
   Build 01/02 reconciliation settles on, §35).
3. Ingest Build 01's World Product Manifest
   (`LIVING_VRINDAVAN_BUILD_MANIFEST`) — read-only, never duplicated.
4. Construct the 500m×500m blockout (§6).
5. Map the spatial hierarchy (§4) into the real World Partition/Data
   Layer structure (§5).
6. Embody Yamuna (§7).
7. Vegetation/PCG (§8-9).
8. Local Places (§10).
9. Entity presentation (§12).
10. Movement/occupancy (§14-15).
11. Time/environment (§17-19).
12. Interaction bridge (§23).
13. Canonical projection visualization (§24) — with the honest Canon
    caveat resolved first (reconcile against Build 01 Part 2's own
    choice, §24).
14. World deltas (§20).
15. Leave/return proof (§39's own flagship scenario, steps
    "visitor leaves → world runtime continues independently → visitor
    returns").
16. Performance/debug pass (§32, §36).

No further roadmap beyond this is proposed — this is the architectural
finish line for Build 02 Phase 0, not the start of a Build 03 program.

---

## 39. Build 02 acceptance scenario

```
Start Unreal
    ↓
connect to Living Vrindavan dev world instance (a real worldInstanceId,
    e.g. "living-vrindavan-dev-001"-style, per Build 01's own handoff note)
    ↓
receive authoritative snapshot (getWorldSnapshotForVisitor /
    getEmbodimentSnapshotForVisitor, or the reconciled richer
    equivalent per §2)
    ↓
materialize 500m x 500m world (§4-6, real 4-Patch hierarchy, real
    hub-and-spoke topology)
    ↓
visitor appears at Vrindavan Entry (the real entryLocationId)
    ↓
walk toward Yamuna (the real, only, hub edge)
    ↓
river/vegetation/entity presentation matches Runtime state (§7-9,12 --
    real hydrology band, real cow presence)
    ↓
move to an authorized next location (Kadamba Grove OR Govardhan Path --
    both real, both reachable only via Yamuna, §2)
    ↓
world time advances (§18, real WorldClock tick)
    ↓
environment changes visually (§17, real season/band-driven atmosphere)
    ↓
entity movement appears (§14, real semantic movement intent realized)
    ↓
visitor leaves (real LeaveWorldIntent, §23)
    ↓
world runtime continues independently (Sprint 9-20's own real
    dormancy/wake/deterministic-catch-up -- unmodified by Build 02)
    ↓
visitor returns later (real re-entry)
    ↓
same worldInstanceId
    ↓
world looks legitimately different (§19-20 -- season/entity-state
    delta genuinely changed, not scripted)
    ↓
same persistent entities where appropriate (§12's entityId continuity,
    already proven by Build 01 Part 1's own
    vrindavanEntityContinuity.test.ts)
    ↓
renderer never authored world truth (§1, §23 -- structurally true
    throughout, verified by construction at every step above)
```

---

## 40. Dependencies on Build 01 / Risks / STOP gates

### Dependencies on Build 01

1. Build 01 Part 2's own final `worldInstanceId` convention (the dev
   fixture, e.g. `living-vrindavan-dev-001`) — Build 02 must use
   WHATEVER Build 01 actually settles on, not invent its own.
2. Build 01 Part 2's own choice of canonical-presence proof fixture
   (§24) — reconcile before implementing §13/§38 step 13.
3. Build 01 Part 2's own planned "Unreal handoff contract (docs-only)"
   phase — this document should be treated as the SENIOR, more
   thorough architecture once Build 01 closes; reconcile any conflict
   in Build 01's favor only where Build 01's own artifact reflects
   something this document could not have known (e.g. a materially
   different world extent or topology finding).
4. §2's own "two embodiment surfaces" finding — whether Build 01 Part
   2, or a future sprint, converges production onto the richer
   composed chain (`getEmbodimentWithCanonicalEvents`) is a real,
   unresolved prerequisite for Unreal to receive anything beyond
   Sprint 7/8-level richness.

### Risks

1. If Build 01 Part 2 changes the world extent away from 500m×500m,
   §3-6 (coordinate model, World Partition, terrain) need
   re-verification, not necessarily re-architecture — the mapping
   MECHANISM (many-to-one Patch→cell, degenerate Sector/Quadrant) is
   extent-independent.
2. If StudioK platform governance has not yet decided the
   `StudioKWorldCore` extraction question (§37) by Build 02
   implementation time, the self-contained `living-vrindavan` monorepo
   fallback (§37) is the correct default — do not block on that
   governance decision.
3. Marketplace cattle/bird assets (§29) are the most likely genuine
   schedule risk (living, load-bearing entities with no adequate
   placeholder-only long-term path) — flag early to whoever owns asset
   procurement.

### STOP gates

1. **STOP** if Build 01 does not expose a stable, documented
   `worldInstanceId`/manifest convention by its own closure — Build 02
   implementation should not guess one.
2. **STOP** if any renderer-contract change this document proposes
   (the additive `UnrealCommand` variants, §21) turns out to conflict
   with a Runtime v1 ownership boundary Sprint 20 established — none
   is currently known to conflict (verified: all proposed additions
   are realization-only, no new Runtime write path), but re-verify
   against Build 01/02's actual final Runtime state before
   implementing.
3. **STOP** if implementing any part of this architecture would
   require Unreal-specific state in Runtime core — none is proposed
   here; if implementation discovers a need for one, that is itself a
   STOP, not a workaround to build.
4. **STOP** if Canon would need to be invented to fill a gap this
   document left honest (e.g. `govardhan-path`'s own physical
   elevation, kadamba tree species specificity) — use a content-layer
   judgment call instead (already the posture §6/§10 take), never a
   new Canon claim.
5. **STOP** (coordination, not blocking) — do not finalize the
   `StudioKWorldCore` dependency decision (§37) without StudioK
   platform-level authorization; proceed with the self-contained
   fallback until that authorization exists.
6. **STOP** if Build 01 changes world identity/provisioning semantics
   materially (e.g. a real `WorldRuntimeManifest`/`createWorldInstance`
   artifact-selection mechanism lands, per Sprint 20's own §21 debt
   item #2/#4) — re-verify §2/§38 step 3 against the new mechanism
   before implementing world-instance connection logic.

---

LIVING VRINDAVAN BUILD 02 PHASE 0 — VISUAL EMBODIMENT & UNREAL INTEGRATION ARCHITECTURE READY — WAITING FOR BUILD 01 CLOSURE
