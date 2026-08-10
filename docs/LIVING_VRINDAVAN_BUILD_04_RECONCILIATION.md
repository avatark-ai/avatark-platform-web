---
build: living-vrindavan-build-04
phase: reconciliation
base: feature/living-vrindavan-build-03 @ 155dfc6 (verified terminal commit, matches origin)
---

# Living Vrindavan Build 04 — Reconciliation Record

Direct source inspection against Build 01-03's own final reports plus one level deeper into the
code those reports point at (Sprint 20 runtime facade, presentation projection, canonical/spatial
contracts, world/visitor memory boundary, participation). No design work below — facts only.

## What is already real

- **Spatial hierarchy** (Sprint 16): Domain→Sector→Quadrant→Patch→LocalPlace, fully real, static,
  `SpatialGrammar`/`buildSpatialMembershipIndex`. 4 Approved locations, 4 Patches (1:1), 3 edges, 1
  Route (`route-govardhan-path`). Reachability (`reachablePatchIds`) and Route traversability
  (`resolveRouteState`) exist; no "nearest destinations"/ranking concept exists yet.
- **Runtime v1 facade** (`lib/livingWorldHost/hostService.ts`): `createWorldInstance`,
  `wakeLivingWorld`, `getWorldSnapshotForVisitor`, `getEmbodimentSnapshotForVisitor`, `queryHealth`.
  Real, closed, Sprint 9-20 onion underneath.
- **Presentation projection** (Build 02, `lib/livingWorldEmbodiment/vrindavanPresentationProjection.ts`):
  `projectVrindavanPresentation` composes the full onion (`getEmbodimentWithCanonicalEvents` down
  through history), but its own flattening step only keeps `base` — it silently drops
  `withHistory.history` (`recentWorldChanges`, `historicalMarkers`, **`returnRecognition`**,
  `encounterHistoryState`) and `withSpatialEcology.spatialSnapshot`'s `territoryPressures`/
  `routeStates`. These are already computed, already tested (Sprint 11/12/16), simply never
  surfaced past this one flattening step.
- **Arrival today is a one-line fallback, not a policy**: both `embodiment-snapshot` and
  `world-snapshot` production routes resolve `locationId` as
  `searchParams.get('locationId') ?? worldState?.currentLocationId ?? LIVING_VRINDAVAN_DEFINITION.entryLocationId`,
  where `worldState` is `livingWorldRuntime.getState(...)` — the generic, portable, per-visitor
  `WorldState` (Sprint 1-era `@avatark/living-world-runtime`, `currentLocationId`/
  `visitedLocationIds`/`active`). This is real visitor position memory (not the durable simulation
  family) and already implements "return to prior location" inside `enterWorld` — Build 04 makes
  this policy explicit and adds the missing cases (stale/canon-directed/changed-since-last-visit),
  it does not invent a new position store.
- **World memory / visitor memory / private reflection boundary** is real and structurally enforced:
  `ReturnRecognition` (Sprint 11, semantic-fact-only, never prose) is fully implemented and tested
  but never called from any production route or the presentation projection. `PrivateReflection`'s
  repository has no `listByWorld`/`listAll` method at all (the firewall is a missing method, not a
  policy check), and `lib/runtimeKernel/dependencyBoundaries.test.ts` regex-enforces no simulation
  package ever imports the private-reflection packages.
- **Participation / encounter realization**: `ParticipationRecord`, `EncounterRecord` (finer grain),
  closed `EncounterConsequence` union. No visitor-journey-stage vocabulary exists anywhere in the
  repo (grepped for "Experience Graph" / journey-stage enums — zero hits outside the unrelated
  product-onboarding `packages/journey`).
- **Canon discipline**: Canon/specs live in sibling repos `studiok-canon`/`studiok-specifications`,
  not this repo. Exactly 6 Approved docs, exactly 4 Approved locations, confirmed no 5th anywhere.
  `yamuna-narrative-gate` (real Approved STK-SPEC-006 rule, vendored in
  `lib/livingWorldRuntime/vendor/livingVrindavan.systems.json`) vs. `govardhan-lifting`
  (Host-authored, `provenance.canonDocIds: []`, scope `{level:"PATCH", patchId:"patch-govardhan-path"}`)
  — both confirmed at the source level, not merely re-asserted from the reports.
- **Living population/rhythms observation surface** (Build 03): fully real read-only query
  functions already exist (`getPopulationSnapshot`, `getPlaceOccupancy`, `getGroupRoutineIntent`,
  `getResourceOpportunities`, etc.) — Build 04 needs zero new simulation hooks to observe presence.
- **Unreal translation**: `UnrealCommand` union has no Patch/LocalPlace/Route-level vocabulary yet —
  confirmed still open (Build 02 named it, Build 03 did not touch `world-embodiment-runtime`).

## What remains provisional / explicitly out of scope for Build 04

- The Sprint-7-era singleton (`WorldRuntime`/`livingWorldRuntime`) and the durable
  `worldInstanceId`-scoped family are two real, separate systems composed together at the route
  layer, not one. Build 04 treats this as a given (uses the singleton for per-visitor position,
  the durable family for everything else) rather than attempting a merge — that merge is not this
  build's mission.
- Patch/LocalPlace/Route-level `UnrealCommand` vocabulary stays open — Build 02's own report
  deferred it to "whenever an actual Unreal integration project is started"; Build 04 defines the
  renderer-neutral semantic snapshot Unreal will eventually consume, but does not extend the
  translator's vocabulary (no Unreal project exists to justify committing to new command shapes yet).
- The two named engine-boundary findings from Build 03 §7 (group-relocation vote-counting scope;
  `memoryHint`'s currently-unobservable divergence) are unchanged by Build 04 — not touched.
- Living Forest / other Living Worlds remain portability-proof-only at the Host layer (Build 02's
  own honest finding: `getEmbodimentWithCanonicalEvents` and everything it composes is
  Vrindavan-wired by pre-existing convention) — Build 04's own new Host-layer composition file
  necessarily inherits the same, named, pre-existing limitation; the new generic packages
  themselves stay world-identity-neutral, same discipline as every prior runtime package.

## What Build 04 actually adds

1. Two new generic, portable packages — `@avatark/world-experience-contracts` and
   `@avatark/world-experience-runtime` — for: an Arrival policy (first-ever / returning / stale /
   canon-directed / safe-fallback, plus a `worldChangedSinceLastVisit` flag from `ReturnRecognition`),
   a declarative Experience Graph (stage vocabulary + allowed transitions, descriptive not a
   scripted sequence, not a gate on the simulation), a Place Continuity view, an Orientation
   projection, and a `WorldExperienceSnapshot` Unreal-handoff aggregate.
2. Additive fields on the existing `VrindavanPresentationState`/`projectVrindavanPresentation`
   (Build 02's own function): `history` (the already-computed-but-dropped return
   recognition/historical markers/recent world events) and `territoryPressures`/`routeStates`
   (already-computed-but-dropped spatial fields). Zero new engine capability — this is the exact
   "additive projection over the existing chain" discipline Build 03 established, applied to the
   projection's own flattening step instead of new content.
3. Vrindavan-specific Host-layer wiring (`lib/livingWorldExperience/`) composing the two new generic
   packages with the extended presentation projection, the spatial grammar, and the Sprint-7
   singleton's per-visitor position — following the same Host-composition convention every prior
   `vrindavan*Definition.ts`/`hostService.ts` file already uses.
4. One new production route (visitor-facing arrival+orientation) and one new dev diagnostic route
   (full `WorldExperienceSnapshot`), following the existing `app/api/{account,dev/account}/living-vrindavan/*`
   conventions exactly.

## What must wait for Unreal (named, not built here)

- Patch/LocalPlace/Route-level `UnrealCommand` vocabulary (extends `translateToUnrealCommands`'s
  input coverage, not its correctness — the existing translator already accepts the richer
  snapshot's base fields, per Build 02 proof J).
- Any actual greybox scene, asset, or Unreal project — none created, per mission constraint.
