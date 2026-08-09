# Sprint 16, Phase 0 — Spatial Ecology & Territory: Architecture / Specification

**Status:** architecture/specification preparation only. No runtime code, no migrations, no
modifications to Sprint 15 or any shared runtime package. Branch:
`feature/sprint16-phase0-spatial-architecture`, forked from the completed Sprint 14 state
(`7c54cb9`, "docs: update handoff snapshot to cover Sprints 5-14"), in an isolated worktree so the
concurrently-running Sprint 15 session (`feature/sprint15-world-adaptation`, uncommitted
`packages/world-adaptation-contracts/` present in its worktree at the time of writing) is untouched.

Everything cited below as "existing" was read directly from the Sprint 7–14 source in this
worktree (`packages/living-systems-contracts`, `packages/living-population-contracts`,
`packages/social-ecology-contracts`, `packages/living-rhythms-contracts`,
`packages/world-memory-contracts`, `packages/world-persistence-contracts`,
`packages/encounter-realization-contracts`, `packages/living-world-runtime`,
`packages/runtime-contracts`) and from the StudioK-vendored Living Vrindavan artifacts
(`lib/livingWorldRuntime/vendor/livingVrindavan.world.json`,
`/home/user/workspace/studiok-specifications/living-vrindavan/`). No fact below was invented; where
the existing corpus does not authorize a fact, it is marked **UNRESOLVED**.

---

## 1. Current Sprint 7–14 spatial ground truth

The runtime today has **no spatial model at all** beyond a flat, unweighted location graph. Every
sprint from 7 through 14 layers new causal/social/behavioral richness onto exactly one spatial
primitive: `LocationId` (a plain string). Concretely:

| Concern | Type | Package | Spatial content |
|---|---|---|---|
| Entity position | `LivingEntityState.locationId` | `living-systems-contracts` | single `LocationId`, no coordinates |
| World-wide environment | `EnvironmentalState` (`weather`/`hydrology`/`ecology`) | `living-systems-contracts` | **one value for the entire world instance** — no per-location or per-region variation exists anywhere |
| Reachability | `WorldLocationGraph = Record<LocationId, LocationId[]>` | `living-population-contracts` | unweighted, undirected adjacency map; no distance, no barriers, no direction |
| Movement | `MovementIntent { entityId, type, targetLocationId }` | `living-population-contracts` | semantic only, explicitly "no coordinates, no path, no spatial geometry" (Sprint 10, Phase 7 comment) |
| Perception | `EntityPerception.reachableLocationIds` / `reachableWaterLocationIds` / `reachableVegetationLocationIds` | `living-population-contracts` | derived from the same flat graph + per-location resource tags |
| Resource affordance | `LocationResourceAffordance { locationId, resourceTags: ResourceTag[] }` | `living-population-contracts` | a closed tag vocabulary (`water`/`vegetation`/`shelter`/`gathering`/`rest`/`corridor`) assigned per `LocationId`, Host-layer judgment, not Canon |
| Territory | `HomeRange { ownerType, ownerId, preferredLocationIds: LocationId[] }` | `social-ecology-contracts` | an **ordered preference list of locations**, not a region; no geometry, no overlap/competition model |
| Occupancy | `PlaceOccupancy { locationId, presentEntityIds, presentGroupIds, occupancyLevel }` | `living-rhythms-contracts` | per-location, always recomputed fresh, never stored |
| Place rhythm | `PlaceRhythmProfile` | `living-rhythms-contracts` | bounded counter keyed by `(locationId, dayPhase, occupancyLevel)` |
| History | `HistoricalMarker { locationId, tick, category, detail }` | `world-memory-contracts` | location-scoped, not region-scoped |
| Encounters | `EncounterOpportunity.locationId`, `EncounterRecord.locationId` | `living-population-contracts`, `encounter-realization-contracts` | location-scoped only |
| Groups | `Group { locationId, targetLocationId, memberEntityIds, cohesion }` | `living-population-contracts` | location-scoped |
| World identity | `WorldInstance { id, definitionId, definitionVersion }`, `WorldInstanceId = WorldId` | `world-persistence-contracts` | no spatial dimension; purely an instance/version identity |

**The single most important ground-truth fact for Sprint 16:** `EnvironmentalState` (Sprint 7's
weather → hydrology → ecology causal chain) is a **world-global singleton**. There is no type,
field, or function anywhere in Sprints 7–14 that computes "hydrology at location X" — only
"hydrology for this world instance, right now." Every richer spatial question the mission brief
asks ("what lies upstream," "how does a river affect multiple patches") is currently unanswerable
because the causal engine has no spatial resolution to answer it *with*, not because a query is
missing.

A second important fact: **two, unrelated `WorldDefinition` types already coexist** —
`@avatark/world-persistence-contracts`'s `WorldDefinition { id, version, name }` (an
identity/version pointer only) and `@avatark/living-world-runtime`'s `WorldDefinition { id, name,
entryLocationId, locations, activities }` (an authored progression graph). Sprint 16 must not add a
third type with the same name; see §22.

A third fact worth naming: this codebase has an established, repeated convention of **deriving
place-scoped facts fresh on every read rather than storing them** — `PlaceOccupancy` (Sprint 13),
`PopulationSnapshot` (Sprint 10), `HistoricalCondition` (Sprint 11), and `PlaceAttachment` (Sprint
12) are all explicitly "QUERY-facing projections, never themselves stored." Sprint 16's design
leans on this convention wherever it applies (§9, §17).

## 2. Existing location/entity/occupancy contracts (verbatim shapes)

```ts
// living-systems-contracts/entity.ts
export interface LivingEntityState {
  id: EntityId
  archetypeId: EntityArchetypeId
  locationId: LocationId
  lifecyclePhase: string
  attributes: Record<string, string | number | boolean>
  lastUpdatedTick: number
}

// living-population-contracts/locationGraph.ts
export type WorldLocationGraph = Record<LocationId, LocationId[]>

// living-population-contracts/movement.ts
export type MovementIntentType =
  | "MoveToLocation" | "Remain" | "FollowGroup" | "ApproachResource"
  | "ReturnToGroup" | "ApproachRelatedEntity" | "ReturnToHomeRange"
export interface MovementIntent {
  entityId: EntityId
  type: MovementIntentType
  targetLocationId: LocationId | null
}

// social-ecology-contracts/territory.ts
export interface HomeRange {
  id: HomeRangeId
  worldId: WorldId
  ownerType: "ENTITY" | "GROUP"
  ownerId: string
  preferredLocationIds: LocationId[]   // ordered, first = most preferred
  establishedTick: number
}
export interface PlaceAttachment {   // derived, not stored
  ownerType: "ENTITY" | "GROUP"
  ownerId: string
  currentLocationId: LocationId
  withinHomeRange: boolean
  preferredLocationIds: LocationId[]
}

// living-rhythms-contracts/placeOccupancy.ts
export type OccupancyLevel = "QUIET" | "ACTIVE" | "GATHERING" | "DISPERSING" | "RESTING"
export interface PlaceOccupancy {   // derived fresh, no repository
  locationId: LocationId
  tick: number
  presentEntityIds: EntityId[]
  presentGroupIds: GroupId[]
  entityCountsByArchetype: Record<string, number>
  activityMix: Partial<Record<BehaviorType, number>>
  occupancyLevel: OccupancyLevel
}

// world-persistence-contracts/worldInstance.ts
export type WorldInstanceId = WorldId   // same string space, not a new branded type
export interface WorldInstance {
  readonly id: WorldInstanceId
  readonly definitionId: WorldDefinitionId
  readonly definitionVersion: WorldVersion
  readonly createdAt: Timestamp
}
```

These are the load-bearing shapes Sprint 16 must remain compatible with. None of them are modified
by anything proposed below.

## 3. Proposed spatial hierarchy

```
Living World
 └─ Domain            (a world's own top-level named region grammar, e.g. "Vrindavan Core")
     └─ Sector         (world-grammar-sized operational unit, e.g. Forest's "F01" = 1mi × 1mi)
         └─ Quadrant    (Sector subdivision, e.g. Forest's NW/NE/SW/SE)
             └─ Patch    (operational/ecological unit — habitat, resource, permeability)
                 └─ Microhabitat / Local Place  (experiential/narrative-significant point)
                     └─ Entity
```

The hierarchy is **standard vocabulary**, but every level's cardinality and physical size is
**world-grammar data**, not an engine constant:

- Living Forest: Domain → many Sectors (F01, F02, …), each 1mi × 1mi (~640 acres), 4 Quadrants of
  ~160 acres, 4 Patches per Quadrant of ~40 acres.
- Living Vrindavan: currently one Domain, and — per §11 below — a **degenerate** Sector/Quadrant
  level (collapsed to exactly one implicit instance each) over its ~500m × 500m authored extent,
  because nothing in Canon today divides Vrindavan into multiple named regions at that scale.

**A level may legitimately collapse to a single implicit instance.** This is the mechanism that
lets the same hierarchy describe a 4-location, 500m proof-of-concept world and a multi-sector,
multi-hundred-acre forest without the engine caring which regime it's in. See §26 for why this is
flagged as needing explicit sign-off rather than treated as settled.

## 4. Definition vs. state separation

Every level gets exactly two kinds of record, mirroring the existing `EntityArchetype` (authored)
vs. `LivingEntityState` (runtime) split and the existing `HomeRange` (durable claim) vs.
`PlaceAttachment` (derived query) split:

| Kind | Written by | Changes when | Persisted? |
|---|---|---|---|
| `*Definition` (Domain/Sector/Quadrant/Patch/LocalPlace) | StudioK authoring, versioned with the world's own `WorldDefinitionId`/`WorldVersion` | a Canon/spec revision | static data, shipped with the world definition — **not** per-instance runtime storage, exactly like `EntityArchetype`/`SeasonDefinition` today |
| `*State` (PatchState/TerritoryState/RouteState) | the Sprint 16 runtime, per world **instance** | simulation ticks | some derived fresh (no repository — like `PlaceOccupancy`), some durable (needs a repository + checkpoint slot — like `HomeRange`); decided per type in §17 |

No level gets an unrestricted property bag. `PatchDefinition` carries only what §9 lists;
everything else is a tagged extension point (`resourceTags`, matching the existing closed
`ResourceTag` union), never a free-form map.

## 5. Stable spatial identity model

All identifiers are **plain string aliases**, matching this repo's explicit, repeatedly-stated
convention (`runtime-contracts/ids.ts`'s own comment: branding was "considered and rejected because
it would touch every existing signature"). Sprint 16 does not deviate from that.

```ts
// PROPOSED — SUBJECT TO SPRINT 15 RECONCILIATION
export type DomainId = string
export type SectorId = string
export type QuadrantId = string
export type PatchId = string
export type LocalPlaceId = string
export type SpatialEdgeId = string
export type TerritoryClaimId = string     // HomeRangeId already exists and is reused, not replaced
export type RouteId = string
```

Stability rule: a spatial id is **assigned once by the world's authored `SpatialGrammar`** (§6) and
never derived from, or synchronized against, any renderer object identity (no Unreal `FGuid`, no
World Partition cell key, no React key). If Unreal geometry, LOD, or streaming cells are ever
regenerated, every `PatchId` etc. must still resolve to the same semantic patch. This is the same
posture `WorldInstanceId = WorldId` already takes for instance identity (Sprint 9) — identity is a
runtime/semantic concern, not an asset concern.

## 6. Topology model

Three distinct concerns, deliberately kept apart (the mission brief's own instruction):

1. **Geometry** — real-world scale/shape (an area in acres, a nominal bounding shape). Sprint 16
   stores this only as **descriptive metadata** on `*Definition` records (§25's "Unresolved" #4)
   — it is never consulted by causal or movement logic. This is a deliberate continuation of the
   zero-coordinate discipline every sprint from 7–14 already holds.
2. **Topology** — the graph of relations between spatial units. This is what movement, reachability,
   and propagation actually consult.
3. **Semantic place meaning** — what a Local Place *means* (a crossing, a threshold, a gathering
   place) — narrative/experiential, never itself a reachability input.

```ts
// PROPOSED — SUBJECT TO SPRINT 15 RECONCILIATION
export type SpatialRelation =
  | "CONTAINS"          // parent → child in the hierarchy (Domain contains Sector, etc.)
  | "ADJACENT_TO"       // shares a boundary; does NOT imply traversable
  | "CONNECTED_TO"      // directly traversable (supersets today's WorldLocationGraph edges)
  | "UPSTREAM_OF"       // hydrological direction, asymmetric
  | "DOWNSTREAM_OF"     // inverse of UPSTREAM_OF
  | "CROSSES_BOUNDARY"  // an edge that spans two Patches/Quadrants (e.g. a river through 3 patches)
  | "CORRIDOR"          // a route-like connection favoring safe/continuous movement
  | "BARRIER"           // a relation that blocks or restricts traversal (water, terrain)

export interface SpatialEdge {
  id: SpatialEdgeId
  worldDefinitionId: WorldDefinitionId
  fromId: string   // any spatial id (PatchId | LocalPlaceId | LocationId)
  toId: string
  relation: SpatialRelation
  traversable: boolean
  // Closed, additive condition tags — same discipline as ResourceTag — never free text.
  conditions?: Array<"REQUIRES_LOW_HYDROLOGY" | "REQUIRES_HIGH_HYDROLOGY" | "SEASONAL">
}
```

`WorldLocationGraph` (Sprint 10) is **not replaced**. It becomes the `CONNECTED_TO` projection of
`SpatialEdge[]` at the `LocationId`/Local-Place grain — every existing consumer of
`WorldLocationGraph` keeps working unchanged (§21). `SpatialEdge` is additive richness sitting
*above* it: barriers, corridors, and upstream/downstream relations that the flat adjacency map
cannot express (example: two Patches can be `ADJACENT_TO` without being `CONNECTED_TO`, if a river
separates them and no `CORRIDOR`/bridge exists — exactly the mission brief's own example).

## 7. Sector model

```ts
// PROPOSED — SUBJECT TO SPRINT 15 RECONCILIATION
export interface SectorDefinition {
  id: SectorId
  worldDefinitionId: WorldDefinitionId
  domainId: DomainId
  name: string
  /** Descriptive only — never consulted by runtime logic. See §6. */
  nominalExtentDescription?: string   // e.g. "1 mile x 1 mile (~640 acres / ~2.59 km2)"
  quadrantIds: QuadrantId[]
}
```

A Sector is a StudioK-authored operational grouping. Forest: `F01`, `F02`, … Vrindavan: one
implicit Sector for now (§11). Nothing about the engine assumes uniform Sector size across worlds
or even within one world (Forest's own `F01, F02, F03...` numbering already implies sectors may be
added incrementally, not pre-declared as a fixed grid).

## 8. Quadrant model

```ts
// PROPOSED — SUBJECT TO SPRINT 15 RECONCILIATION
export interface QuadrantDefinition {
  id: QuadrantId
  sectorId: SectorId
  /** World-authored label, e.g. Forest's "NW"/"NE"/"SW"/"SE" -- never a fixed 4-way enum,
   * some worlds may not use compass quadrants at all. */
  label: string
  patchIds: PatchId[]
}
```

Purely a `CONTAINS` grouping of Patches; carries no ecological state of its own. Any "quadrant-level
condition" (e.g. "the NW quadrant is dry") is always a **rollup computed from its Patches**, never
independently maintained — same non-duplication posture as §17's Patch/Territory rollups.

## 9. Patch model

```ts
// PROPOSED — SUBJECT TO SPRINT 15 RECONCILIATION
export type HabitatType = string   // world-authored vocabulary, e.g. "riverbank" | "grove" | "path"
                                     // -- deliberately NOT a closed cross-world union (mission
                                     // brief: "do not encode forest ecology as universal ontology")

export interface PatchDefinition {
  id: PatchId
  quadrantId: QuadrantId | null   // null permitted when Quadrant is degenerate (§11)
  worldDefinitionId: WorldDefinitionId
  habitatType: HabitatType
  /** Bridge to today's addressable unit -- every LocationId a Patch contains. */
  containedLocationIds: LocationId[]
  nominalExtentDescription?: string
}

// Dynamic. Always DERIVED, never independently simulated (see §14) --
// same "no second causal engine" discipline the boundary audit in §21 requires.
export interface PatchState {
  patchId: PatchId
  tick: number
  // Derived from the world-global EnvironmentalState (Sprint 7), never a
  // second value -- see §14.
  vegetationCondition: EnvironmentalBand
  hydrologyCondition: EnvironmentalBand
  // Derived by unioning ResourceTag affordances across containedLocationIds.
  resourceAvailability: ResourceTag[]
  // Rollup of PlaceOccupancy (Sprint 13) across containedLocationIds -- not a new occupancy engine.
  occupancy: OccupancyLevel
  // 0..1, derived from SpatialEdge traversability + current hydrology/season --
  // "how easy is movement across/through this patch right now."
  movementPermeability: number
}
```

Patch is the first level that carries operational/ecological *state* — everything above it
(Domain/Sector/Quadrant) is pure grouping. `PatchState` is intentionally not "an unrestricted
property bag": every field is a named, derivable quantity with a stated source, matching the
mission brief's explicit constraint.

## 10. Microhabitat / Local Place model

```ts
// PROPOSED — SUBJECT TO SPRINT 15 RECONCILIATION
export interface LocalPlaceDefinition {
  id: LocalPlaceId
  patchId: PatchId
  /** The bridge: a Local Place IS (today, 1:1) an existing LocationId. Sprint 16 does not
   * introduce sub-location geometry finer than what Canon already names -- see §26. */
  locationId: LocationId
  /** Experiential/narrative significance, StudioK-authored, e.g. "riverbank crossing." Only
   * populated where an existing Approved artifact already names this significance -- never
   * invented to fill the model (mission brief, verbatim constraint). */
  experientialSignificance?: string
}
```

**Patch vs. Local Place, precisely:** a Patch is the operational unit ecology/occupancy/movement
math runs against; a Local Place is the *reason a visitor or entity cares about that spot*. Today,
because Vrindavan authorizes only 4 named locations and no finer terrain grain, **Patch and Local
Place are 1:1** for Vrindavan (§11). For Forest, a single ~40-acre Patch could plausibly contain
several Local Places (a clearing, a crossing, a trailhead) — Sprint 16's contracts must support
that even though the current worlds don't yet exercise it.

## 11. Territory model

Sprint 12 **already has a territory concept**: `HomeRange` (an ordered `preferredLocationIds` list
per `ENTITY`/`GROUP` owner) and `PlaceAttachment` (a derived "is the owner currently within its own
home range" projection). This is the single largest overlap risk in Sprint 16 — see §21's boundary
audit. The resolution: **`HomeRange` is not replaced.** Sprint 16 adds a *spatial aggregation layer
on top of it*, never a second ownership record.

```ts
// PROPOSED — SUBJECT TO SPRINT 15 RECONCILIATION
export type TerritoryClaimStrength = "TRANSIENT" | "ESTABLISHED" | "CONTESTED"

// A NEW, higher-order read: "which Patch(es)/Quadrant(s) does this owner's existing
// HomeRange fall within, and who else's HomeRange overlaps there." Computed FROM
// HomeRange.preferredLocationIds + the Patch containment map -- never a second
// preferredLocationIds-equivalent list.
export interface TerritoryClaim {
  id: TerritoryClaimId
  worldId: WorldId
  homeRangeId: HomeRangeId          // reference, not a copy
  patchId: PatchId
  strength: TerritoryClaimStrength
  establishedTick: number
}

// Derived, never stored -- same posture as PlaceAttachment/PlaceOccupancy.
export interface TerritoryPressure {
  patchId: PatchId
  tick: number
  overlappingClaimCount: number
  contestedOwnerIds: string[]       // HomeRange.ownerId values with overlapping claims here
}
```

Deliberately **no ownership semantics** anywhere in this shape (`TerritoryClaim` is a claim, not a
title) and deliberately **no contest-resolution mechanics** (eviction, exclusive use) — the mission
brief explicitly says "do not assume ownership," and Phase 0 recommends deferring actual
contest-resolution to a later sprint (§26). What Sprint 16 must land is the *read model*: given
existing `HomeRange` records, which Patches are shared, avoided, or contested, so that future
movement/encounter logic has something to consult.

## 12. Movement semantic model

No pathfinding, no NavMesh — a **richer semantic contract** that a future resolver (still not built
in Sprint 16) will consume. The existing `MovementIntent` (targetLocationId, still a `LocationId`)
is **unchanged**; a new resolution-contract sits above it:

```ts
// PROPOSED — SUBJECT TO SPRINT 15 RECONCILIATION -- DESCRIBES A FUTURE RESOLVER, NOT BUILT HERE
export interface SpatialMovementContext {
  entityId: EntityId
  currentLocationId: LocationId
  currentPatchId: PatchId
  // Inputs the mission brief lists explicitly -- each already exists as a contract
  // somewhere in Sprints 7-14; this type only NAMES how they compose, it does not
  // re-implement any of them.
  needs: /* Sprint 10 EntityNeeds, referenced */ unknown
  dayPhaseRoutine: /* Sprint 13 RoutineWindow, referenced */ unknown
  groupState: /* Sprint 10/12 Group + RelationshipState, referenced */ unknown
  territoryContext: TerritoryClaim | null
  environment: EnvironmentalState
  topology: SpatialEdge[]
  // Sprint 15 seam -- see §15. Left as `unknown` deliberately; do not guess the shape.
  adaptationBias?: unknown
}

export interface SpatialMovementResolution {
  entityId: EntityId
  // The resolver's OUTPUT is still a plain MovementIntent -- Sprint 10's contract is
  // the stable public interface every downstream consumer already depends on.
  intent: MovementIntent
  // Diagnostic only, never itself consulted by downstream logic (would defeat the point
  // of MovementIntent being the stable seam).
  reasoning?: { consideredPatchIds: PatchId[]; rejectedReason?: string }
}
```

The chain the mission brief specifies (`entity state + needs + rhythm + group + relationship +
environment + topology + territory + adaptation → intent → route/destination → occupancy`) is
represented here as *what a future function's input/output shape is*, not as an implemented
function. Sprint 16 Phase 0 explicitly does not implement `resolveSpatialMovement(...)`.

## 13. Occupancy integration

Four distinct occupancy concepts, composed without duplicating state:

| Concept | Source of truth | New in Sprint 16? |
|---|---|---|
| Entity present at a Local Place | `PlaceOccupancy.presentEntityIds` (Sprint 13, per `LocationId`) | No — reused as-is |
| Entity inhabiting a Patch | rollup: union of `PlaceOccupancy` for every `LocationId` in `PatchDefinition.containedLocationIds` | New, but derived-only, no repository |
| Group occupying a Territory | rollup: `TerritoryClaim`s whose `patchId`'s occupancy rollup includes the group's members | New, derived-only |
| Entity traversing a Route | transient — an entity whose `MovementIntent.targetLocationId` differs from `currentLocationId` this tick, located on a `SpatialEdge` with `relation: "CORRIDOR"` | New, derived-only, no state at all (a computed instantaneous fact) |

None of these get a repository. All four are pure functions over already-persisted state
(`LivingEntityState[]`, `Group[]`, `HomeRange[]`, plus the static `PatchDefinition`/`SpatialEdge`
grammar) — continuing the `PlaceOccupancy`/`PopulationSnapshot` precedent exactly.

## 14. Hydrology/ecology spatial propagation model

**This is the section most at risk of accidentally building a second causal engine. It must not.**

Sprint 7's `EnvironmentalState` (`weather` → `hydrology` → `ecology`, one value per world instance)
remains the **sole causal engine** and the **sole source of world-global truth.** Sprint 16 adds a
*spatial weighting function*, not a new simulation:

```
world-global EnvironmentalState (Sprint 7, unchanged)
        │
        ▼
 spatial propagation weights, PER PATCH (Sprint 16, new, pure/stateless)
   e.g. a riverbank Patch amplifies hydrologyBand; a grove Patch dampens it
        │
        ▼
 PatchState.hydrologyCondition / vegetationCondition (§9, derived every read)
```

The weighting function's inputs are (a) the single world-global `EnvironmentalState` value, (b)
each Patch's `habitatType` and `SpatialEdge` relations (`UPSTREAM_OF`/`DOWNSTREAM_OF`/`ADJACENT_TO`
a water-bearing Patch), and (c) nothing else. It is stateless and re-derivable every tick — exactly
like `PlaceOccupancy`. **No new `WeatherState`/`HydrologyState`/`EcologyState` is computed
per-Patch by a second simulation loop; the numbers a Patch reports are always a deterministic
transform of the one existing world-global value.** This satisfies both mission constraints
simultaneously: "extend spatial resolution" and "must not create a second environmental simulation
engine."

## 15. Sprint 15 adaptation integration seam

Sprint 15 is establishing Persistent History → Bounded Adaptation → Changed Future Behavior, on an
uncommitted branch this session must not read into or depend on. The seam is described
**structurally, without naming a single Sprint-15 type**:

> Sprint 16 requires exactly one thing from Sprint 15: a per-owner (`EntityId` or `GroupId`)
> **numeric or categorical weighting signal**, keyed by spatial target (a `PatchId`, `LocalPlaceId`,
> or `SpatialEdgeId`), expressing learned preference or avoidance. Wherever such a signal exists
> once Sprint 15 closes, it becomes one additional optional input to `SpatialMovementContext`
> (§12, the `adaptationBias?: unknown` field) and to `TerritoryClaim` strength derivation (§11) —
> exactly the same "additive optional parameter" pattern Sprint 13 already used to extend
> `selectBehavior` with `dayPhase`/`routineWindow` without touching its existing signature.

No Sprint 15 type name, field name, or shape is assumed. Reconciliation happens as a named Sprint
16 implementation phase (§27) after Sprint 15 merges, not now.

## 16. Renderer-adapter boundary

Everything in §5–§14 is renderer-neutral: no `Actor`, `UObject`, Blueprint, World Partition, NavMesh,
Landscape, PCG component, React, DOM, or CSS type appears in any proposed contract. The existing
`@avatark/world-embodiment-contracts`/`-runtime` packages (Sprint 8) already establish exactly this
boundary for presentation — Sprint 16's spatial contracts become **new renderer-neutral inputs**
those packages can translate, the same way they already translate `WorldSnapshot` today:

```
 spatial-ecology-contracts (PatchState, SpatialEdge, TerritoryClaim, ...)
        │  (read-only, via a Host-layer adapter -- Sprint 16 does not modify world-embodiment-*)
        ▼
 world-embodiment-runtime (Sprint 8, unchanged) resolves World -> Embodiment
        │
        ▼
 Web reference adapter (existing)      Unreal adapter (future, out of scope)
   -> could render Patch boundaries      -> could drive World Partition region loading,
      as a debug overlay only               PCG spawn constraints, NavMesh generation
```

Sprint 16 Phase 0 does not modify `world-embodiment-contracts`; it only establishes that the new
spatial state is *eligible* input for a future embodiment-resolver extension, following the same
capability-negotiation precedent Sprint 8 Phase 10 already built.

## 17. Persistence implications

| Type | Persisted? | Mechanism |
|---|---|---|
| `DomainDefinition`/`SectorDefinition`/`QuadrantDefinition`/`PatchDefinition`/`LocalPlaceDefinition` | Static, versioned with `WorldDefinitionId`/`WorldVersion` | Shipped as part of the world's authored grammar (like `EntityArchetype[]`/`SeasonDefinition[]` today) — no runtime repository |
| `SpatialEdge[]` | Static | Same as above |
| `PatchState` | **No** — always derived fresh | Pure function, no repository (§9, §14) |
| `TerritoryClaim` | **Yes** — durable, accumulates over ticks (`establishedTick`, contest history) | New repository, `worldId`-scoped, same shape discipline as `HomeRangeRepository` |
| `TerritoryPressure` | **No** — always derived fresh | Pure function over `TerritoryClaim[]` + occupancy rollups |
| `RouteDefinition` | Static | Same as Patch definitions |
| `RouteState` | **No** — always derived fresh from `RouteDefinition` + current `EnvironmentalState` | Pure function |

Only `TerritoryClaim` needs a new repository. Everything else is either static authored data
(already the existing pattern) or a pure derivation (already the existing pattern for
`PlaceOccupancy`/`PlaceAttachment`/`HistoricalCondition`). This keeps Sprint 16's persistence
footprint minimal and precedent-consistent.

## 18. worldInstanceId isolation

Every new repository (only `TerritoryClaimRepository`, per §17) is keyed by `worldId`
(`WorldInstanceId`, same string space as `WorldId` per Sprint 9), exactly like every existing
repository (`LivingEntityStateRepository.get(worldId, entityId)`,
`HomeRangeRepository.get(worldId, ownerType, ownerId)`). Static `*Definition` and `SpatialEdge`
records are keyed by `WorldDefinitionId`, not `WorldInstanceId` — they are shared across every
instance of the same definition, exactly like `EntityArchetype`. This means two concurrent Living
Vrindavan instances get independent `TerritoryClaim` state but share the identical Patch/Sector
grammar, with zero new isolation mechanism required.

## 19. Checkpoint/replay implications

`WorldCheckpoint` (Sprint 9) today snapshots `sharedState` + `entities`. Because `PatchState` is
always derived fresh (§14, §17), it needs **no checkpoint slot at all** — recovery already
reconstructs it for free from the checkpointed `sharedState.environmentalState` +
`entities`/`Group[]` + the static grammar. `TerritoryClaim`, being durable, needs one **additive**
field:

```ts
// PROPOSED — SUBJECT TO SPRINT 15 RECONCILIATION -- additive field on WorldCheckpoint
export interface WorldCheckpoint {
  // ...all existing fields, unchanged...
  readonly territoryClaims?: readonly TerritoryClaim[]   // optional: absent = no claims yet, exactly
                                                           // like Sprint 14's own optional
                                                           // `RelationshipEvidence.encounterCount`
}
```

This is the same "additive, optional, old data reads as empty/zero" discipline Sprint 14 already
used for `RelationshipEvidence.encounterCount`. No existing `WorldCheckpoint` consumer breaks. A
replay proof (mirroring Sprint 14's own replay/multi-instance proofs) would assert:
`TerritoryClaim` recovery from `(checkpoint N, events after N)` reproduces the identical set a live
run would have — nothing about Patch/Route state needs its own replay proof, because nothing about
it is stored to replay.

## 20. Alternate-world reuse

No forest-specific, Vrindavan-specific, or franchise-specific vocabulary appears in any proposed
contract — `HabitatType` is a plain string (world-authored), `ResourceTag` is already a
cross-sprint-reused closed union, and every hierarchy level's cardinality is data (§3). The two
proof designs in §23/§24 exist specifically to demonstrate this: the *same* `PatchDefinition`,
`SpatialEdge`, `TerritoryClaim` types back both a 4-Local-Place, single-Patch, 500m Vrindavan and a
16-Patch, 4-Quadrant, 1-mile Forest Sector, with zero engine-level branching on which world is
running — exactly the discipline `living-systems-runtime`'s own Sprint 7 Phase 19 test ("prove the
grammar admits a different Living World through data alone") already established as this codebase's
bar for reuse.

## 21. Backward compatibility

Nothing existing changes shape:

- `LivingEntityState.locationId` — **untouched**. Spatial membership (`patchId`, `quadrantId`, …) is
  always looked up via a static `LocationId -> {patchId, quadrantId, sectorId, domainId}` index
  built from `PatchDefinition.containedLocationIds`, never stored on the entity. This mirrors the
  exact posture `PlaceAttachment`/`PlaceOccupancy` already take toward *other* derived facts, and it
  means zero of the ~30 existing call sites that read `LivingEntityState.locationId` need to change.
- `WorldLocationGraph` — untouched; becomes one materialized view of `SpatialEdge[]` (§6).
- `HomeRange`/`PlaceAttachment` — untouched; `TerritoryClaim`/`TerritoryPressure` read them, never
  replace or duplicate their fields (§11).
- `MovementIntent` — untouched; remains the stable output shape a future
  `SpatialMovementResolution` produces (§12).
- `EnvironmentalState` — untouched; Patch-level conditions are a derived transform, never a second
  value (§14).
- `WorldCheckpoint` — one additive optional field (§19).

## 22. Proposed TypeScript contracts (consolidated)

All contracts above, plus package placement, are consolidated in §5–§14 and §23's package layout.
One naming note carried over from §1: the new authored-grammar type is named `SpatialGrammar`, not
`WorldDefinition` — there are already two same-named, differently-shaped `WorldDefinition` types in
this codebase (`world-persistence-contracts` vs. `living-world-runtime`); a third would make an
already-confusing collision worse.

```ts
// PROPOSED — SUBJECT TO SPRINT 15 RECONCILIATION
export interface SpatialGrammar {
  worldDefinitionId: WorldDefinitionId
  /** Descriptive only (§6) -- e.g. "acre-mile" for Forest, "metric" for Vrindavan. Never
   * consulted by causal/movement logic, only by docs/tooling/future Unreal sizing. */
  unitSystemLabel: string
  domainIds: DomainId[]
}
```

## 23. Proposed package/module structure

Following this repo's own established `-contracts`/`-runtime` pairing (every Sprint 7–14 package
is one such pair):

```
packages/
  spatial-ecology-contracts/     # NEW -- Sprint 16
    src/
      ids.ts                     # DomainId, SectorId, QuadrantId, PatchId, LocalPlaceId,
                                  #   SpatialEdgeId, TerritoryClaimId, RouteId
      grammar.ts                 # SpatialGrammar
      domain.ts                  # DomainDefinition
      sector.ts                  # SectorDefinition
      quadrant.ts                # QuadrantDefinition
      patch.ts                   # PatchDefinition, PatchState
      localPlace.ts               # LocalPlaceDefinition
      topology.ts                 # SpatialRelation, SpatialEdge
      territory.ts                 # TerritoryClaim, TerritoryPressure, TerritoryClaimRepository
                                  #   (imports HomeRange from @avatark/social-ecology-contracts,
                                  #    never redeclares it)
      route.ts                     # RouteDefinition, RouteState
      movement.ts                  # SpatialMovementContext, SpatialMovementResolution
                                  #   (imports MovementIntent from @avatark/living-population-contracts)
      index.ts

  spatial-ecology-runtime/       # NEW -- Sprint 16 (implementation phase, not Phase 0)
    src/
      placeIndex.ts               # LocationId -> {patchId, quadrantId, sectorId, domainId} lookup
      patchState.ts                # resolvePatchState (pure, derives from EnvironmentalState)
      territory.ts                 # resolveTerritoryClaims / resolveTerritoryPressure (pure)
      topologyReachability.ts     # reachability over SpatialEdge[], respecting BARRIER/CORRIDOR
      occupancyRollup.ts           # Patch/Territory occupancy rollups over PlaceOccupancy
      index.ts
```

Both packages depend only on `@avatark/runtime-contracts`, `@avatark/living-systems-contracts`,
`@avatark/living-population-contracts`, `@avatark/social-ecology-contracts`, and
`@avatark/living-rhythms-contracts` — the same dependency-boundary-enforcement discipline Sprint 7
Phase 9 and Sprint 8 Phase 9/23 already extended to every prior boundary applies unchanged here; a
future implementation phase should add `spatial-ecology` to that same enforcement test, not invent
a new one.

## 24. Proposed migration, if one will eventually be needed

**None of Sprint 7–14's own state has a real database migration yet** — `living-systems-contracts`'s
own `repositories.ts` says outright: "any real database schema is proposal-only this sprint (no
migration exists or is applied)," and nothing in Sprints 8–14 changes that posture. Sprint 16
follows the identical posture: **no migration is proposed or applied in Phase 0 or in the eventual
implementation phase**, unless and until the project-wide decision to back any of this with a real
database is made (which is outside Sprint 16's scope). If/when that decision is made, only
`TerritoryClaim` (§17) would need a table — everything else is either static JSON grammar (shipped
the same way `livingVrindavan.systems.json` is today) or derived and needs no storage at all.

## 25. Acceptance-test matrix (for the eventual implementation phase, not run now)

| # | Scenario | Given | When | Then |
|---|---|---|---|---|
| A1 | Patch containment is total | any `WorldDefinition`'s full `locations[]` | the `PlaceIndex` is built | every `LocationId` resolves to exactly one `PatchId` (no orphans, no double-membership) |
| A2 | Patch state never diverges from world-global environment | `EnvironmentalState.hydrology.hydrologyBand = "low"` | `PatchState` is derived for a riverbank Patch | `hydrologyCondition` reflects the single world-global value transformed by habitat weighting, never an independently-drifted value |
| A3 | Barrier blocks reachability despite adjacency | two Patches `ADJACENT_TO` but connected only by a `BARRIER` edge | reachability is computed | the two Patches are not `CONNECTED_TO`-reachable |
| A4 | Corridor enables reachability despite non-adjacency | two Patches not nearest-neighbors but joined by an authored `CORRIDOR` edge | reachability is computed | the two Patches are reachable |
| A5 | Territory claim derived, not duplicated | an existing `HomeRange` with `preferredLocationIds` spanning one Patch | `TerritoryClaim` is derived | exactly one claim references that `HomeRangeId`; no new preference list is created |
| A6 | Territory pressure reflects overlap | two `HomeRange`s (different owners) whose preferred locations fall in the same Patch | `TerritoryPressure` is computed | `overlappingClaimCount >= 2`, both owner ids listed |
| A7 | Occupancy rollup matches sum of PlaceOccupancy | `PlaceOccupancy` computed independently for each `LocationId` in a Patch | Patch occupancy rollup is computed | rollup's `presentEntityIds` equals the union across contained locations |
| A8 | Checkpoint/recovery round-trips territory claims | a `WorldCheckpoint` with `territoryClaims` populated | the world instance is recovered from checkpoint + later events | recovered `TerritoryClaim[]` matches a live run's claims exactly (mirrors Sprint 14's own replay proof shape) |
| A9 | Old checkpoints still load | a `WorldCheckpoint` recorded before Sprint 16 (no `territoryClaims` field) | it is loaded by Sprint-16-aware code | it loads successfully with `territoryClaims` treated as empty |
| A10 | Vrindavan reuse | the Vrindavan `SpatialGrammar` (§23) | the full pipeline (§14, §11, §13) runs | it operates without any Vrindavan-specific branch in `spatial-ecology-runtime` |
| A11 | Forest reuse | a Forest `SpatialGrammar` (§24, hypothetical F01 fixture) | the same pipeline runs | it operates without any Forest-specific branch, and without touching Vrindavan's fixture |
| A12 | Existing consumers unaffected | any Sprint 7–14 test suite | run unmodified | all pass unmodified (no `spatial-ecology-*` import required by any existing package) |

## 26. Vrindavan spatial proof design (future Sprint 16 acceptance scenario — not implemented)

**Ground truth used** (from `lib/livingWorldRuntime/vendor/livingVrindavan.world.json` and
`lib/livingPopulation/vrindavanPopulationDefinition.ts`): 4 authored locations —
`vrindavan-entry`, `yamuna`, `kadamba-grove`, `govardhan-path` — connected as an undirected star
centered on `yamuna` (`entry↔yamuna`, `yamuna↔kadamba-grove`, `yamuna↔govardhan-path`).
`yamuna` carries the `water` resource tag (and the StudioK-vendored `riverbank-vegetation` entity
archetype); `kadamba-grove` carries `vegetation`/`shelter`/`rest` (and `ambient-bird-flock`);
`govardhan-path` carries `gathering`/`corridor`. A Host-layer cow herd starts at `yamuna`, a
bird-flock at `kadamba-grove`.

**Proposed decomposition** (honest about what Canon does *not* yet authorize — see §27's STOP
gate): one Domain ("Vrindavan Core"), one degenerate Sector, one degenerate Quadrant, and **Patch
= Local Place = existing `LocationId`, 1:1**, because nothing in the authored artifact divides any
of the 4 locations into sub-regions:

```
Domain: Vrindavan Core
 └─ Sector: (degenerate, = whole domain)
     └─ Quadrant: (degenerate, = whole sector)
         ├─ Patch "vrindavan-entry" (habitatType: "threshold")
         │    └─ Local Place: vrindavan-entry
         ├─ Patch "yamuna" (habitatType: "riverbank")   ── UPSTREAM_OF / hydrology hub
         │    └─ Local Place: yamuna
         ├─ Patch "kadamba-grove" (habitatType: "grove")   ── DOWNSTREAM_OF yamuna
         │    └─ Local Place: kadamba-grove
         └─ Patch "govardhan-path" (habitatType: "corridor-path")   ── DOWNSTREAM_OF yamuna
              └─ Local Place: govardhan-path
```

`SpatialEdge`s: `entry CONNECTED_TO yamuna`, `yamuna CONNECTED_TO kadamba-grove` (also tagged
`DOWNSTREAM_OF` since kadamba-grove is downhill-adjacent to the river bank), `yamuna CONNECTED_TO
govardhan-path` (also `DOWNSTREAM_OF`). No `BARRIER` edges are authorized by Canon today — Vrindavan
stays fully connected, matching the existing undirected graph exactly (§21 compatibility check).

**Acceptance scenario (conceptual, not implemented):**

1. Season/weather shifts the world-global `EnvironmentalState.hydrology.hydrologyBand` from
   `"moderate"` to `"low"`.
2. `PatchState` for `yamuna` (habitatType `"riverbank"`, the hydrology hub) derives a lowered
   `hydrologyCondition` and, via `DOWNSTREAM_OF` weighting, `kadamba-grove` and `govardhan-path`
   derive comparatively less-affected but still-adjusted `vegetationCondition`.
3. `resourceAvailability` for `yamuna` drops the `water` tag's availability (mirrors the *existing*
   Sprint 10 rule in `perception.ts`: `hydrologyBand !== "low"` gates `waterAvailable` — restated at
   Patch grain, not reimplemented, per §14's "no second engine" discipline).
4. Cow herd's `EntityPerception.reachableWaterLocationIds` (existing Sprint 10 mechanism) no longer
   includes `yamuna`; a `MovementIntent` (existing Sprint 10 mechanism) targets
   `ApproachResource`/another reachable location instead.
5. `PlaceOccupancy` for `yamuna` (existing Sprint 13 mechanism) drops toward `QUIET`; Patch-level
   occupancy rollup (§13, new) reflects the same drop at the Patch grain.
6. `EncounterOpportunity`/`EncounterRecord` eligibility at `yamuna` (existing Sprint 10/14
   mechanisms) is reduced accordingly, because population presence — the existing eligibility
   input — genuinely dropped.

Every step after step 1 is either an **existing, unmodified mechanism reading an unchanged
input**, or a **new Patch-grain rollup of that same existing mechanism**. Nothing in this scenario
requires a new causal rule.

## 27. Living Forest reuse proof design (future Sprint 16 acceptance fixture — not implemented)

Using the Forest planning grammar given directly in the mission brief (no Forest artifacts exist in
this repo yet — confirmed by search; this fixture is illustrative, to be authored, not discovered):

```
Domain: Living Forest
 └─ Sector: F01  (nominalExtentDescription: "1 mile x 1 mile (~640 acres / ~2.59 km2)")
     ├─ Quadrant: F01-NW
     │    ├─ Patch F01-NW-1 .. F01-NW-4  (~40 acres each)
     ├─ Quadrant: F01-NE
     │    ├─ Patch F01-NE-1 .. F01-NE-4
     ├─ Quadrant: F01-SW
     │    ├─ Patch F01-SW-1 .. F01-SW-4
     └─ Quadrant: F01-SE
          ├─ Patch F01-SE-1 .. F01-SE-4
              └─ each Patch: 0..N Local Places (illustrative: a clearing, a crossing, a trailhead)
```

**Reuse claim to be proven:** `spatial-ecology-runtime`'s `resolvePatchState`,
`resolveTerritoryClaims`, `resolveTerritoryPressure`, and topology-reachability functions run
against this 21-node (1 Domain + 1 Sector + 4 Quadrants + 16 Patches, before Local Places) Forest
fixture with **the same function signatures, same package, same zero world-specific branches** as
the 4-node Vrindavan fixture in §26 — mirroring the exact bar Sprint 7 Phase 19's existing test
already set ("prove the grammar admits a different Living World through data alone"). The two
fixtures differ only in their `SpatialGrammar`/`*Definition` data, never in engine code. Neither
fixture is built in Phase 0; this section specifies what the eventual fixture pair must
demonstrate.

## 28. Boundary / collision audit

| Sprint (owner) | Existing owner | Sprint 16 need | Integration method |
|---|---|---|---|
| Sprint 7 — causal environment | `living-systems-contracts`/`-runtime`: world-global `EnvironmentalState` | spatial resolution of hydrology/ecology per Patch | **Derive, never re-simulate** — Patch conditions are a stateless transform of the one world-global value (§14). Sprint 7's own causal function is not touched. |
| Sprint 9 — persistence | `world-persistence-contracts`/`-runtime`: `WorldCheckpoint`, leasing, concurrency | new spatial state must be checkpointable/instance-isolated | New `TerritoryClaim` follows the identical `worldId`-scoped repository + additive optional checkpoint field pattern (§17–§19). No new concurrency/leasing mechanism introduced. |
| Sprint 10 — population | `living-population-contracts`/`-runtime`: `WorldLocationGraph`, `MovementIntent`, `EncounterOpportunity`, `EntityPerception`, `ResourceTag` | richer topology (barriers/corridors/direction) and territory-aware movement | `SpatialEdge` is additive above `WorldLocationGraph`, which becomes one materialized projection of it (§6). `MovementIntent`'s shape is unchanged; only a future resolver's *inputs* grow (§12). |
| Sprint 11 — world memory | `world-memory-contracts`/`-runtime`: `HistoricalMarker.locationId`, return recognition | patch/region-scoped history queries | `HistoricalMarker` keeps `locationId` as its primary spatial key; any Patch-scoped history query is a rollup over markers whose `locationId` falls in that Patch — no new marker type, no schema change. |
| Sprint 12 — social ecology | `social-ecology-contracts`/`-runtime`: `HomeRange`, `RelationshipState`, `SeparationState` — **`HomeRange` already IS Sprint 12's territory model** | territory as a spatial region with overlap/pressure, not just an ordered location list | **Highest-risk overlap in this audit.** Resolution: `TerritoryClaim`/`TerritoryPressure` are read-only aggregations computed FROM existing `HomeRange` records (§11) — `HomeRange` remains the sole durable ownership/preference record. No second "territory" storage is created. |
| Sprint 13 — living rhythms | `living-rhythms-contracts`/`-runtime`: `PlaceOccupancy` (per-location, always fresh), `PlaceRhythmProfile` | occupancy composed across Patch/Territory/Route | Patch/Territory occupancy are rollups of the existing per-`LocationId` `PlaceOccupancy` function (§13) — the function itself is never modified or duplicated. |
| Sprint 14 — encounter realization | `encounter-realization-contracts`/`-runtime`: `EncounterRecord.locationId`, causal realization resolver | spatial conditions (barrier crossed, patch reachability) as an eligibility input | Additive optional input to the existing eligibility computation — same pattern Sprint 13 already used to extend `selectBehavior` with `dayPhase`/`routineWindow` (§15's own precedent). `EncounterRecord`'s stored shape is untouched. |
| Sprint 15 — world adaptation (in progress, uncommitted) | unknown/unstable | adaptation effects should weight spatial preference/avoidance/routes | Seam described structurally only (§15); zero dependency taken on any Sprint 15 type until it closes and merges. |

No proposed Sprint 16 concept duplicates an existing engine. The one place genuine care is required
during implementation is Sprint 12's `HomeRange` — it must stay the single source of territorial
truth, with Sprint 16 strictly additive on top.

## 29. Implementation sequence for Sprint 16 (after Phase 0, after Sprint 15 closes)

1. `spatial-ecology-contracts`: ids, `SpatialGrammar`, `*Definition` types, `SpatialEdge`,
   `TerritoryClaim`/`TerritoryPressure` shapes, `RouteDefinition`/`RouteState`,
   `SpatialMovementContext`/`Resolution` — types only, no logic, no repository implementation yet.
2. Author the Vrindavan `SpatialGrammar` fixture (§26) as static data, reviewed against Canon for
   any claim not already authorized (expect this review to surface the §31 STOP items).
3. `spatial-ecology-runtime`: `placeIndex.ts` (the `LocationId -> {patchId, ...}` lookup) +
   dependency-boundary-enforcement test extension (§23).
4. Topology: materialize `WorldLocationGraph` as `CONNECTED_TO` `SpatialEdge`s; implement
   reachability respecting `BARRIER`/`CORRIDOR`/`ADJACENT_TO` distinctions (§6).
5. `resolvePatchState` (§9, §14) — pure derivation from `EnvironmentalState` + `ResourceTag` +
   `PlaceOccupancy`. Acceptance tests A1–A2, A7.
6. `TerritoryClaimRepository` + `resolveTerritoryClaims`/`resolveTerritoryPressure` (§11, §17) over
   existing `HomeRange` data. Acceptance tests A5–A6. `WorldCheckpoint` additive field + replay
   proof (§19). Acceptance tests A8–A9.
7. `RouteDefinition`/`RouteState` for Vrindavan's `govardhan-path` (already tagged `corridor`) as
   the first real Route instance.
8. Describe (do not yet wire) the `SpatialMovementResolution` contract's consumption by a future
   movement resolver (§12) — left as a documented seam, matching this Phase 0's own "describe, don't
   implement" instruction for movement.
9. Additive spatial input into encounter eligibility (§28's Sprint 14 row) — optional parameter
   only.
10. Sprint 15 reconciliation phase: once Sprint 15 merges, name the real adaptation-signal type and
    wire it into `SpatialMovementContext.adaptationBias` and `TerritoryClaim` strength (§15).
11. Author the Forest `SpatialGrammar` fixture (§27) and run the identical pipeline against it —
    the reuse proof.
12. Full acceptance-test matrix (§25), plus a replay/multi-instance proof mirroring Sprint 14's own
    pattern.

## 30. ASCII architecture diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          SPATIAL HIERARCHY (renderer-neutral)                 │
│                                                                                │
│   Living World                                                                │
│     └─ Domain                                                                 │
│         └─ Sector          (world-grammar sized; may be degenerate = 1)       │
│             └─ Quadrant     (may be degenerate = 1)                           │
│                 └─ Patch     ── habitat / resource / permeability / occupancy │
│                     └─ Local Place  ── experiential/narrative significance    │
│                         └─ Entity   (LivingEntityState.locationId, unchanged) │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                    EXISTING CAUSAL CHAIN (Sprint 7-14, unchanged)             │
│                                                                                │
│  WorldClock/Season → Weather → Hydrology → Ecology  (Sprint 7, WORLD-GLOBAL)  │
│         │                                                                     │
│         ▼                                                                     │
│  Entity Needs → Living Rhythms (Sprint 10/13)                                 │
│         │                                                                     │
│         ▼                                                                     │
│  Place Occupancy (Sprint 13) → Social Interaction → Encounter Opportunity     │
│         │                        (Sprint 10/12)         (Sprint 10)          │
│         ▼                                                                     │
│  Encounter Realization → Consequence → Memory → Adaptation (Sprint 14/15)     │
└──────────────────────────────────────────────────────────────────────────────┘
                         │ Sprint 16 inserts spatial RESOLUTION here,
                         │ never a parallel chain:
                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│              SPRINT 16 SPATIAL RESOLUTION LAYER (new, pure/derived)           │
│                                                                                │
│   world-global EnvironmentalState ──weighted-by-habitat──▶ PatchState         │
│                                          (§14: NOT a second engine)           │
│                                                                                │
│   WorldLocationGraph (Sprint 10) ══▶ SpatialEdge[CONNECTED_TO] (§6)           │
│                                  ╲                                            │
│                                   ╲▶ SpatialEdge[BARRIER|CORRIDOR|UPSTREAM]   │
│                                                                                │
│   HomeRange (Sprint 12) ──rollup──▶ TerritoryClaim ──rollup──▶ TerritoryPressure│
│                                          (§11: HomeRange stays sole truth)    │
│                                                                                │
│   PlaceOccupancy (Sprint 13, per-LocationId) ──union-over-Patch──▶            │
│                                          Patch/Territory occupancy rollup     │
│                                                                                │
│   LivingEntityState.locationId ──static PlaceIndex lookup──▶                 │
│                                          {patchId, quadrantId, sectorId}      │
│                                          (§21: NEVER stored on the entity)    │
└──────────────────────────────────────────────────────────────────────────────┘
                         │
                         ▼  (future, NOT Sprint 16, described only)
┌──────────────────────────────────────────────────────────────────────────────┐
│  world-embodiment-runtime (Sprint 8, unmodified) ──▶ Web adapter / Unreal     │
│    consumes PatchState/SpatialEdge/TerritoryClaim as new renderer-neutral     │
│    inputs, exactly as it already consumes WorldSnapshot today.                │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 31. Unresolved questions / explicit STOP gates

These require an explicit decision — from StudioK Canon, from the mission owner, or from Sprint 15
closing — before Sprint 16 implementation proceeds past §29 step 2:

1. **STOP — Vrindavan sub-location geometry is not Canon-authorized.** Today's artifact names
   exactly 4 locations with no finer terrain grain. §26's decomposition (Patch = Local Place = the
   4 existing locations, Sector/Quadrant degenerate) is Phase 0's *recommended, most conservative*
   reading — it invents no geography. Before implementation, StudioK Canon must confirm this
   reading is acceptable, or provide the finer-grained artifact this design would otherwise need to
   honestly represent.
2. **STOP — degenerate-level semantics need explicit sign-off.** §3/§11 propose that Sector/Quadrant
   may collapse to exactly one implicit instance for small worlds. This is architecturally clean but
   changes what "the hierarchy is standard" means in practice (a "standard" hierarchy where 3 of 6
   levels are silently size-1 for the flagship world is a real design choice, not a neutral default).
3. **Sprint 15's exact contract shape is unknown.** §15's seam is described structurally with zero
   named types. The `adaptationBias?: unknown` field in `SpatialMovementContext` cannot be finalized
   until Sprint 15 merges; treat this as a required reconciliation pass (§29 step 10), not an
   oversight.
4. **Coordinate system: recommend none.** The mission brief asks for "core spatial state remains
   metric/geospatial internally," but zero coordinates exist anywhere in Sprints 7–14 — every
   spatial fact today is graph/tag-based. Phase 0 recommends keeping it that way: `
   nominalExtentDescription` fields are descriptive metadata only (§6), never live geometry consulted
   by runtime logic. Introducing real coordinate-bearing geometry would be a much larger departure
   from 8 sprints of established discipline than this brief's other asks, and nothing in the two
   proof designs (§26, §27) actually requires it. This needs explicit confirmation before
   implementation, since it is a deviation from the letter (though not, this document argues, the
   spirit) of the mission brief's phrasing.
5. **Territory contest-resolution mechanics are out of scope for Sprint 16.** `TerritoryPressure`
   (§11) is a read model (who overlaps where); it does not decide who "wins" a contested Patch. Confirm
   this deferral is acceptable before implementation, since the mission brief lists
   `TerritoryPressure` without explicitly scoping it to read-only.
6. **No database migration exists project-wide.** §24 assumes this remains true for Sprint 16.
   Confirm before implementation that no parallel decision to introduce real persistence has been
   made elsewhere in the program.

---

**SPRINT 16 PHASE 0 — SPATIAL ECOLOGY & TERRITORY ARCHITECTURE READY — AWAITING SPRINT 15 CLOSURE**
