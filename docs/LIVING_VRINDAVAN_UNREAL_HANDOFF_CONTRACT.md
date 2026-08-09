---
build: living-vrindavan-build-01
phase: V (Unreal Handoff Contract)
status: DOCUMENT ONLY -- no Unreal project exists in this repository
---

# Living Vrindavan -- Unreal Handoff Contract

This document names the REAL, already-existing, renderer-neutral contracts an
Unreal (or any other spatial engine) adapter would consume to realize Living
Vrindavan. No Unreal project exists in this codebase, and none is created by
this document -- per Build 01's own explicit instruction ("Do NOT build
Unreal content in this repository unless an established Unreal project
exists"). Every type cited below is real and cited by its real file path; no
Unreal class name (`UObject`, `AActor`, `Blueprint`, etc.) appears in any
runtime package in this repository, and none is introduced here.

## The real renderer boundary

```
World Artifact -> Living Systems (causal truth) -> World Embodiment (renderer-neutral projection) -> RendererAdapter<TOutput>
```

`packages/renderer-contracts/src/rendererContract.ts` already defines this
boundary generically: a `RendererAdapter<TOutput>` implements `capabilities()`
and `present(plan: PresentationPlan)`; a Web adapter and an Unreal adapter are
two different `TOutput` implementations of the identical interface, negotiated
through the same `resolvePresentationPlan` pure function regardless of which
adapter calls it.

## The real Unreal-compatible instruction schema

`packages/world-embodiment-contracts/src/unrealCommand.ts` already defines
`UnrealCommand` -- a closed union of generic, engine-agnostic ops:

| Concept named in Build 01's brief | Real backing type/op |
|---|---|
| `WorldInstance` | `worldInstanceId` (a plain string identity, `@avatark/world-persistence-contracts`) -- not itself a renderer-facing type; the renderer only ever sees the snapshot/delta a given instance produced |
| `SpatialRegion` | `EmbodiedRegion` (`packages/world-embodiment-contracts/src/embodiedRegion.ts`) -- realized as `{ op: "CreateRegion", regionId, name, transform, bounds }` |
| `Patch` / `LocalPlace` | `PatchState`/`LocalPlaceDefinition` (`@avatark/spatial-ecology-contracts`) -- not yet directly translated into `UnrealCommand`; `EmbodiedRegion.locationId` today maps 1:1 to a `LocalPlace`'s own `locationId` (`patch-*`/`place-*` ids exist one layer below what the embodiment layer currently emits per-region; see "known limitations" in the Build 01 final report) |
| `EnvironmentState` | `EnvironmentPresentation` (`packages/world-embodiment-contracts/src/environmentPresentation.ts`) -- realized as `{ op: "UpdateEnvironment", atmosphere, water, vegetation }` / `SetAtmosphere` / `SetWaterState` / `SetVegetationIntent` |
| `EntityPresentation` | `EntityPresentation` (`packages/world-embodiment-contracts/src/entityPresentation.ts`) -- realized as `{ op: "PlaceEntity" }` / `{ op: "UpdateEntity" }` / `{ op: "RemoveEntity" }` |
| `GroupPresentation` | `EntityPresentation.groupId` (optional field, Sprint 10) -- realized via `PlaceEntity`/`UpdateEntity`'s own `groupId` field and `{ op: "SetGroupIntent" }` |
| `MovementIntent` | `EntityPresentation.movementSemantic`/`movementTargetLocationId` -- realized as `{ op: "MoveEntityToRegion" }` |
| `Route` | `EmbodiedTransition` (`packages/world-embodiment-contracts/src/snapshot.ts`) -- not yet its own `UnrealCommand` op; today implicit in which regions a snapshot's `reachable[]` array names (see known limitations) |
| `EncounterPresentation` | `EncounterPresentation` (`packages/world-embodiment-contracts/src/encounterPresentation.ts`) -- realized as `{ op: "CreateInteractionAnchor" }` |
| `CanonicalProjection` | `WorldInstanceCanonicalProjectionState` (`@avatark/canonical-event-contracts`, Sprint 18) -- not yet translated into any `UnrealCommand`; a canonical event's real world-visible effect today is a `PLACE`-domain `AdaptationEffect`, which surfaces through the SAME `EnvironmentPresentation`/`EncounterPresentation` path every other adaptation effect already does, never a distinct "canonical" visual op (this is consistent with the mission's own instruction that canonical events do not need a second presentation vocabulary) |
| `WorldDelta` | `WorldEmbodimentDelta` (`packages/world-embodiment-contracts/src/delta.ts`) -- realized via `translateEmbodimentDeltaToUnrealCommands` (`packages/world-embodiment-runtime/src/unrealCommandTranslator.ts`), which deliberately emits NO command for an `UNCHANGED` entry, proving the reconciliation model feeds a renderer that never rebuilds the whole world per tick |

## The real, already-functional translator

`translateToUnrealCommands(snapshot: WorldEmbodimentSnapshot): UnrealCommand[]`
and `translateEmbodimentDeltaToUnrealCommands(delta: WorldEmbodimentDelta): UnrealCommand[]`
(`packages/world-embodiment-runtime/src/unrealCommandTranslator.ts`, Sprint 8/13)
already exist, are already tested (`unrealCommandTranslator.test.ts`), and are
proven against a REAL Living Vrindavan embodiment snapshot by this build's own
`lib/livingWorldHost/vrindavanRendererNeutral.test.ts` (Phase T). No new
translation code was required for Build 01 -- the mechanism already generalizes
to this world.

## What Build 01 does NOT claim

- No Unreal project, plugin, or asset exists in this repository.
- `UnrealCommand`'s own op vocabulary is explicitly "illustrative, not
  mandatory" per its own file header -- an actual Unreal integration project
  may choose different op names as long as it consumes the same
  `WorldEmbodimentSnapshot`/`WorldEmbodimentDelta` source of truth.
- Patch/LocalPlace-level and Route-level translation (rows marked "not yet" in
  the table above) are real, named gaps, not silently claimed as solved --
  see the Build 01 final report's "known limitations" and "recommended
  Build 02" sections.
