# StudioK → Unreal 5.8 Integration Contract Pack

**Branch:** `feature/studiok-unreal-integration-contract-pack`, based on `feature/studiok-living-world-kernel-vertical-slice` @ `23fa307`.
**Status:** docs + fixtures + a targeted fixture-conformance test only. No Unreal project, no `.uasset`/`.umap`, no engine install. No Build 01-06 or kernel-vertical-slice branch was touched.

**Architectural law, unchanged:** StudioK owns world truth. Unreal owns embodiment. Nothing below leaks an Unreal type, asset path, Actor class, PCG graph, Data Layer name, World Partition cell, or material path into a StudioK core contract — every one of those stays entirely on the (not-yet-built) Unreal side of Section 12/13.

---

## 1. Repository / ground-truth reconciliation

Read in full, from the current tip of `feature/studiok-living-world-kernel-vertical-slice` (`23fa307`), which is a linear descendant of Sprint 20 and every Living Vrindavan Build 01-06:

- `docs/SPRINT20_FINAL_REPORT.md` — Persistent Living World Runtime v1: the Sprint 9-20 checkpoint/lease/wake-catch-up/durable-state stack, plus a facade unifying prior singleton access paths.
- `docs/LIVING_VRINDAVAN_BUILD_01_FINAL_REPORT.md` through `..._BUILD_04_FINAL_REPORT.md` (+ `BUILD_04_RECONCILIATION.md`)
- `docs/LIVING_VRINDAVAN_BUILD_02_PHASE0_VISUAL_EMBODIMENT_UNREAL_ARCHITECTURE.md`
- `docs/LIVING_VRINDAVAN_BUILD_05_UNREAL_HANDOFF.md`
- `docs/LIVING_VRINDAVAN_BUILD_06_PHASE0_PCG_ENVIRONMENT_ARCHITECTURE.md`
- `docs/STUDIOK_LIVING_WORLD_KERNEL_VERTICAL_SLICE.md` and its `_FINAL_REPORT.md`
- `docs/LIVING_VRINDAVAN_ARCHITECTURE_BOUNDARY.md`, `docs/LIVING_VRINDAVAN_HANDOFF.md` (stale Sprint-14 snapshot; historical record only, not cited as current state anywhere below)
- `docs/LIVING_VRINDAVAN_UNREAL_HANDOFF_CONTRACT.md`, `docs/LIVING_VRINDAVAN_UNREAL_58_READINESS_RECONCILIATION.md`
- Every real contract/runtime source file cited by file:line throughout this document (`packages/world-experience-contracts`, `packages/world-embodiment-contracts`, `packages/world-embodiment-runtime`, `packages/spatial-ecology-contracts`, `packages/living-rhythms-contracts`, `packages/canonical-event-contracts`, `packages/world-memory-contracts`, `packages/world-persistence-contracts`, `packages/renderer-contracts`, `lib/livingPopulation/vrindavanPopulationDefinition.ts`, `lib/livingForest/definition.ts`, `lib/livingForest/hostService.ts`, `lib/livingForest/livingForestVerticalSlice.test.ts`).

**One sibling branch exists that predates this reconciliation and is deliberately NOT the base for this work:** `feature/living-vrindavan-unreal-58-fab-readiness` (`2fcb3a3`), checked out at `/home/user/workspace/avatark-platform-web-vrindavan-unreal-readiness`. It branched from Build 03 (`155dfc6`) and therefore never saw Build 04 (World Experience/Place Continuity), Build 05 (GPU handoff), Build 06 Phase 0 (PCG/environment), or the StudioK kernel vertical slice. Its own `docs/LIVING_VRINDAVAN_UNREAL_58_FAB_READINESS.md` is real and is cited below (asset-registry naming convention, Section 13) precisely because it is still the most detailed treatment of that one topic — but it is not the base, was not altered, and this pack does not duplicate its readiness-axis table wholesale. `docs/LIVING_VRINDAVAN_UNREAL_58_READINESS_RECONCILIATION.md` (present only in the current worktree) already reconciled that older package against Build 04; this pack continues from that reconciliation's own end state rather than re-deriving it.

No type name below was invented from memory. Every interface, union, and field name quoted in Sections 2-20 was re-read directly from source on `23fa307` while writing this pack.

---

## 2. Contract stack

| Layer | Real type / source | Owner | Persisted? | Derived? | Renderer-neutral? | Unreal-consumable? |
|---|---|---|---|---|---|---|
| A. World identity | `WorldId = string` (`packages/runtime-contracts/src/ids.ts:21`), e.g. `"living-vrindavan"` | Host-authored constant | No (it's a literal, not a row) | No | Yes | Yes (opaque string) |
| B. World version | `WorldDefinition.version` / `WorldEmbodimentSnapshot.worldVersion` (`packages/world-persistence-contracts/src/worldInstance.ts:23`, `packages/world-embodiment-contracts/src/snapshot.ts:29`) | Runtime | Yes (`WorldDefinition` record) | No | Yes | Yes |
| C. worldInstanceId | `WorldInstanceId = WorldId` — same string space, not a new branded type (`packages/world-persistence-contracts/src/ids.ts:12`) | Runtime / persistence | Yes (`WorldInstance` record) | No | Yes | Yes |
| D. tick / logical time | `simulationTick` / `tick: number` (`SimulationTick`, checkpoint/durable-state) | Runtime | Yes (`WorldCheckpoint.tick`, `DurableWorldState`) | No (authoritative counter; advanced by the wake-catch-up planner, never recomputed from wall-clock at read time) | Yes | Yes |
| E. season | `{ id, name }` on every snapshot; `SharedWorldState.season` | Runtime (Living Systems) | Yes (part of checkpointed shared state) | `name` is a lookup label over the persisted `id` | Yes | Yes |
| F. environment | `EnvironmentPresentation` (atmosphere/water/vegetation bands + `SensoryCue[]`) | Runtime (`world-embodiment-runtime`) | No — always recomputed fresh from persisted `EnvironmentalState` + season envelope | Yes | Yes (semantic bands, never an asset ref) | Yes |
| G. spatial hierarchy | Domain/Sector/Quadrant/Patch/LocalPlace (`spatial-ecology-contracts`) | StudioK spatial grammar — Host-authored static definition per world (`vrindavanSpatialDefinition.ts`, `livingForest/definition.ts`) | Topology itself: no (code-defined, not a DB row). `PatchState`/`RouteState`/`TerritoryPressure`: explicitly never persisted either — "no repository, no save" (source comments, `patchState.ts:11-12`, `route.ts:17-20`) | Yes (all dynamic state) | Yes | Yes |
| H. places / patches | `LocationId`, `PatchId`, `LocalPlaceId` (all plain `string` aliases) | Same as G | Same as G | Same as G | Yes | Yes |
| I. entities | `LivingEntityState` (raw) / `EntityPresentation` (read model) | Runtime | Raw state: yes (`DurableWorldState.entities`, `WorldCheckpoint.entities`). Presentation: derived fresh | Presentation: yes | Yes | Yes |
| J. groups / populations | `GroupState` (persisted) / `GroupRoutineIntent` (Host-composed read, never written back — `groupRoutine.ts:9-14`) | Runtime | `GroupState`: yes. `GroupRoutineIntent`: no, always derived | Yes | Yes | Yes, via `SetGroupIntent` — see Section 6 for the fragmented wiring caveat |
| K. encounters | `EncounterRuleId` (static rule), `EncounterRecordId` (content-hash-derived, persisted), `EncounterPresentation` (derived) | Runtime | Rule definitions: static code. `EncounterRecord`: yes, persisted | Presentation: yes | Yes | Yes, via `CreateInteractionAnchor` |
| L. canonical presence | `CanonicalEventDefinition` (Host/Canon-authored, static), `WorldInstanceCanonicalProjectionState` (persisted per instance), `VisitorCanonicalEventWitness` (persisted per visitor) | Canon governs definition/eligibility; Runtime owns projection state | Yes (projection state + witness repositories) | Eligibility computed; status transitions persisted once decided | Yes | **No** — no `UnrealCommand` op carries canonical presence today; only `PlaceCanonicalPresence` inside `WorldExperienceSnapshot` (see Sections 6, 19) |
| M. visitor continuity | `ArrivalDecision`, `PlaceContinuityView.visitor`, `VisitorContextProjection` | Runtime (`world-experience-contracts`), computed from persisted visitor records | Underlying records: yes. Projection itself: derived fresh | Yes | Yes | Informational only — no dedicated op |
| N. world memory projection | `WorldEvent`, `HistoricalMarker` (persisted); `ReturnRecognition`, `HistoricalCondition` (always derived on demand) | Runtime (`world-memory-contracts`) | `WorldEvent`/`HistoricalMarker`: yes. `ReturnRecognition`/`HistoricalCondition`: no | Yes for the latter two | Yes | Informational only today — see Section 6 |
| O. presentation hints | `PresentationHint[]`, `SensoryCue[]`, `EnvironmentPresentation` bands | Runtime | No, always derived | Yes | Yes | Yes — this is the layer `UnrealCommand` exists to carry |
| P. renderer capabilities | `EmbodimentRendererCapabilities`, legacy `RendererCapabilities` (`capability.ts:10-38`, `rendererContract.ts:15-18`) | Adapter declares; Runtime negotiates (`capabilityNegotiation.ts`) | No — declared per session, never stored | N/A | By definition | This is what Unreal **sends**, not receives |
| Q. renderer commands | `UnrealCommand` (11-op union, `unrealCommand.ts:21-32`) | Runtime emits (3 separate translator functions — Section 5/6); Unreal adapter executes | No — derived per call | Yes | **Deliberately not** — this is the one renderer-facing vocabulary, though still asset-free by construction | Yes — this is the wire format |
| R. visitor intents back to Runtime | `InteractionIntent` (5-variant union, `interactionIntent.ts:17-84`) | Adapter constructs from player input; Runtime validates/applies | The intent itself: no. Its consequences (`WorldEvent`, checkpoint state): yes | N/A | Yes — Runtime never sees an input-device concept | Yes — this is what Unreal **sends** |

---

## 3. Snapshot contract — `WorldExperienceSnapshot`

**This is the exact snapshot Unreal should consume first.** It is `WorldExperienceSnapshot` (`packages/world-experience-contracts/src/worldExperienceSnapshot.ts:18-29`), which already **embeds** `WorldEmbodimentSnapshot` as its own `embodiment` field — the "richer, current path" instruction in the mission is not a choice between two competing snapshots, it is this one composition, already real:

```ts
export interface WorldExperienceSnapshot {
  worldId: WorldId
  userId: string
  generatedAt: string
  suggestedStage: ExperienceStage
  arrival: ArrivalDecision
  orientation: OrientationProjection
  place: PlaceContinuityView
  nearbyPlaces: PlaceContinuityView[]
  recentWorldChanges: WorldEvent[]
  embodiment: Readonly<WorldEmbodimentSnapshot>
}
```

Every field is **required** — there are no optional fields on this type today, which is itself worth naming plainly (see the versioning gap in Section 21: this also means there is no room today for a renderer to signal "I don't understand this field yet" other than ignoring it structurally).

**Field-by-field provenance:**

| Requirement | Where it lives |
|---|---|
| version | **Absent.** No `schemaVersion`/`version` field exists on `WorldExperienceSnapshot` itself. `embodiment.worldVersion` exists one level down. Confirmed gap — see Section 21. |
| tick | `embodiment.simulationTick`; also `place.tick`/`nearbyPlaces[].tick` |
| worldInstanceId | `worldId` (same string space as `WorldInstanceId`, Section 9) |
| spatial IDs | `place.locationId`, `place.region.spatialNode.id`, `place.patchState.patchId`, `nearbyPlaces[].locationId` |
| entity IDs | `place.nearbyEntities[].entityId`, `embodiment.current.entities[].entityId` |
| environment state | `embodiment.current.environment`, `embodiment.reachable[].environment` |
| presentation state | `embodiment` in full — regions, entities, encounters, sensory cues |
| visitor continuity | `arrival`, `place.visitor`, `embodiment.visitorContext` |
| canonical presence | `place.canonicalPresence`, `nearbyPlaces[].canonicalPresence`, `orientation.whatIsHappening.activeCanonicalPresence` |
| available interactions | `place.encounterOpportunities`, `embodiment.current.encounters`, `place.nearbyDestinations` |
| provenance | `embodiment.provenance` (`WorldEmbodimentProvenance`) — the ONLY provenance field on the whole snapshot; `WorldExperienceSnapshot` itself carries none of its own |

**Sample JSON payload for Living Vrindavan** — real IDs throughout (`living-vrindavan`, `yamuna`, `vrindavan-entry`, `kadamba-grove`, `govardhan-path`, `avatark-population-cow-1/2`, `avatark-population-bird-flock-1`, `yamuna-flowering-reflection`, `yamuna-narrative-gate`, `kadamba-grove-ambient-presence`, `canonical-event-govardhan-lifting`, `route-govardhan-path`). Reproduced in full below; committed verbatim at `docs/fixtures/unreal/living-vrindavan.snapshot.example.json` and structurally verified by `lib/livingWorldExperience/unrealFixtureValidation.test.ts` (Section 26). See that fixture's own `README.md` for exactly which values are real vs. illustrative (timestamps, tick numbers, and `spatialNode.transform`/`bounds` are hand-composed — Runtime does not carry authoritative Unreal coordinates; see Section 10).

```json
{
  "worldId": "living-vrindavan",
  "userId": "dev-inspector",
  "generatedAt": "2026-08-11T12:00:00.000Z",
  "suggestedStage": "RECOGNITION_OF_CHANGE",
  "arrival": {
    "locationId": "yamuna",
    "reason": "RETURNING_TO_PRIOR_PLACE",
    "isFirstEverVisit": false,
    "priorLocationId": "vrindavan-entry",
    "worldChangedSinceLastVisit": true
  },
  "orientation": {
    "worldId": "living-vrindavan",
    "userId": "dev-inspector",
    "generatedAt": "2026-08-11T12:00:00.000Z",
    "whereAmI": {
      "locationId": "yamuna",
      "name": "Yamuna",
      "season": { "id": "vasanta", "name": "Vasanta" },
      "dayPhase": "MIDDAY"
    },
    "whatIsAroundMe": {
      "nearbyEntityCount": 2,
      "occupancyLevel": "ACTIVE",
      "presentationHints": [
        { "kind": "entity-archetype", "id": "avatark-population-cow", "label": "Cows at the riverbank" }
      ]
    },
    "whatIsHappening": {
      "encounterOpportunityCount": 1,
      "activeCanonicalPresence": [],
      "groupRoutineIntentCount": 0
    },
    "whereCanIGo": [
      { "locationId": "vrindavan-entry", "reachable": true, "viaRouteId": null, "routeTraversable": null },
      { "locationId": "kadamba-grove", "reachable": true, "viaRouteId": null, "routeTraversable": null },
      { "locationId": "govardhan-path", "reachable": true, "viaRouteId": "route-govardhan-path", "routeTraversable": true }
    ],
    "whatHasChanged": {
      "sinceLastVisit": true,
      "facts": [
        { "type": "season_changed", "sourceCategories": ["SEASON_TRANSITION"], "occurrenceCount": 1 },
        { "type": "population_relocated", "sourceCategories": ["POPULATION_MOVEMENT"], "occurrenceCount": 2 }
      ]
    },
    "arrival": {
      "locationId": "yamuna",
      "reason": "RETURNING_TO_PRIOR_PLACE",
      "isFirstEverVisit": false,
      "priorLocationId": "vrindavan-entry",
      "worldChangedSinceLastVisit": true
    }
  },
  "place": {
    "worldId": "living-vrindavan",
    "locationId": "yamuna",
    "tick": 42,
    "season": { "id": "vasanta", "name": "Vasanta" },
    "region": {
      "locationId": "yamuna",
      "name": "Yamuna",
      "spatialNode": {
        "id": "yamuna",
        "parentId": null,
        "role": "hub",
        "transform": { "position": { "x": 0, "y": 0, "z": 0 } },
        "bounds": { "radius": 40 },
        "tags": ["riverbank", "hub", "reflection-capable"]
      },
      "environment": {
        "atmosphere": { "semantic": "warm-flowering-vasanta", "temperatureBand": "moderate", "illuminationSemantic": "midday-bright" },
        "water": { "semantic": "flowing-riverbank", "levelBand": "moderate" },
        "vegetation": { "semantic": "riverbank-reeds", "densityBand": "moderate" },
        "sensoryCues": [
          { "channel": "ambientAudio", "semantic": "river-flow-ambient" },
          { "channel": "visual", "semantic": "flowering-drift" }
        ]
      },
      "entities": [
        {
          "entityId": "avatark-population-cow-1",
          "archetypeId": "avatark-population-cow",
          "locationId": "yamuna",
          "visible": true,
          "presentationArchetype": "cow",
          "activityHint": "drinking",
          "animationSemantic": "drink-idle",
          "audioSemantic": null,
          "movementSemantic": null,
          "movementTargetLocationId": null,
          "groupId": "avatark-population-cow-herd"
        },
        {
          "entityId": "avatark-population-cow-2",
          "archetypeId": "avatark-population-cow",
          "locationId": "yamuna",
          "visible": true,
          "presentationArchetype": "cow",
          "activityHint": "grazing",
          "animationSemantic": "graze-idle",
          "audioSemantic": null,
          "movementSemantic": null,
          "movementTargetLocationId": null,
          "groupId": "avatark-population-cow-herd"
        }
      ],
      "encounters": [
        { "ruleId": "yamuna-flowering-reflection", "locationId": "yamuna", "category": "reflective", "interactionAffordance": "begin-reflection" },
        { "ruleId": "yamuna-narrative-gate", "locationId": "yamuna", "category": "narrative-protected", "interactionAffordance": "observe" }
      ]
    },
    "patchState": {
      "patchId": "patch-yamuna",
      "tick": 42,
      "vegetationCondition": "moderate",
      "hydrologyCondition": "moderate",
      "resourceAvailability": ["water"],
      "occupancyLevel": "ACTIVE",
      "presentEntityIds": ["avatark-population-cow-1", "avatark-population-cow-2"],
      "presentGroupIds": ["avatark-population-cow-herd"],
      "movementPermeability": 1,
      "ecologicalPressure": 0
    },
    "territoryPressure": null,
    "dayPhase": "MIDDAY",
    "occupancy": {
      "locationId": "yamuna",
      "tick": 42,
      "presentEntityIds": ["avatark-population-cow-1", "avatark-population-cow-2"],
      "presentGroupIds": ["avatark-population-cow-herd"],
      "entityCountsByArchetype": { "avatark-population-cow": 2 },
      "activityMix": { "DRINK": 0.5, "GRAZE": 0.5 },
      "occupancyLevel": "ACTIVE"
    },
    "groupRoutineIntents": [
      { "groupId": "avatark-population-cow-herd", "intent": "OCCUPY_PLACE", "targetLocationId": "yamuna", "tick": 42 }
    ],
    "resourceOpportunities": [
      { "locationId": "yamuna", "category": "water", "available": true, "tick": 42 }
    ],
    "nearbyEntities": [
      {
        "entityId": "avatark-population-cow-1",
        "archetypeId": "avatark-population-cow",
        "locationId": "yamuna",
        "visible": true,
        "presentationArchetype": "cow",
        "activityHint": "drinking",
        "animationSemantic": "drink-idle",
        "audioSemantic": null,
        "movementSemantic": null,
        "movementTargetLocationId": null,
        "groupId": "avatark-population-cow-herd"
      },
      {
        "entityId": "avatark-population-cow-2",
        "archetypeId": "avatark-population-cow",
        "locationId": "yamuna",
        "visible": true,
        "presentationArchetype": "cow",
        "activityHint": "grazing",
        "animationSemantic": "graze-idle",
        "audioSemantic": null,
        "movementSemantic": null,
        "movementTargetLocationId": null,
        "groupId": "avatark-population-cow-herd"
      }
    ],
    "encounterOpportunities": [
      { "ruleId": "yamuna-flowering-reflection", "locationId": "yamuna", "category": "reflective", "interactionAffordance": "begin-reflection" },
      { "ruleId": "yamuna-narrative-gate", "locationId": "yamuna", "category": "narrative-protected", "interactionAffordance": "observe" }
    ],
    "nearbyDestinations": [
      { "locationId": "vrindavan-entry", "reachable": true, "viaRouteId": null, "routeTraversable": null },
      { "locationId": "kadamba-grove", "reachable": true, "viaRouteId": null, "routeTraversable": null },
      { "locationId": "govardhan-path", "reachable": true, "viaRouteId": "route-govardhan-path", "routeTraversable": true }
    ],
    "routeStates": [
      { "routeId": "route-govardhan-path", "tick": 42, "traversable": true }
    ],
    "canonicalPresence": [],
    "rememberedConsequences": [],
    "presentationHints": [],
    "visitor": {
      "userId": "dev-inspector",
      "hasVisitedBefore": true,
      "meaningfulEncounterCount": 1,
      "reflectionCount": 1
    }
  },
  "nearbyPlaces": [ "...3 entries -- vrindavan-entry, kadamba-grove, govardhan-path, full shape identical to `place` above; see the committed fixture file for the complete, verbatim content" ],
  "recentWorldChanges": [
    {
      "id": "we-0001",
      "worldId": "living-vrindavan",
      "tick": 40,
      "category": "SEASON_TRANSITION",
      "locationId": null,
      "participantEntityIds": [],
      "causalReferences": [{ "kind": "season", "ref": "vasanta" }],
      "consequences": [],
      "significance": "LANDMARK",
      "retentionTier": "LANDMARK",
      "provenance": { "derivedFromEventIds": [], "derivationRule": "season-schedule-advance", "causalReferences": [{ "kind": "season", "ref": "vasanta" }] },
      "occurredAt": "2026-08-11T11:00:00.000Z"
    },
    {
      "id": "we-0002",
      "worldId": "living-vrindavan",
      "tick": 41,
      "category": "POPULATION_MOVEMENT",
      "locationId": "yamuna",
      "participantEntityIds": ["avatark-population-cow-1", "avatark-population-cow-2"],
      "causalReferences": [{ "kind": "need", "ref": "thirst" }],
      "consequences": [{ "type": "HISTORICAL_MARKER", "targetEntityId": null, "targetGroupId": "avatark-population-cow-herd", "targetLocationId": "yamuna", "detail": { "note": "herd returned to Yamuna" } }],
      "significance": "MEANINGFUL",
      "retentionTier": "DURABLE",
      "provenance": { "derivedFromEventIds": [], "derivationRule": "population-tick-delta", "causalReferences": [{ "kind": "need", "ref": "thirst" }] },
      "occurredAt": "2026-08-11T11:30:00.000Z"
    }
  ],
  "embodiment": {
    "worldId": "living-vrindavan",
    "worldVersion": 1,
    "simulationTick": 42,
    "season": { "id": "vasanta", "name": "Vasanta" },
    "current": { "...": "same EmbodiedRegion shape as `place.region` above, for `yamuna`" },
    "reachable": [ "...3 EmbodiedRegions for vrindavan-entry, kadamba-grove, govardhan-path" ],
    "transitions": [
      { "toLocationId": "vrindavan-entry", "affordance": "threshold-crossing" },
      { "toLocationId": "kadamba-grove", "affordance": "gradual-emergence" },
      { "toLocationId": "govardhan-path", "affordance": "branching-choice" }
    ],
    "visitorContext": { "userId": "dev-inspector", "lastLocationId": "vrindavan-entry", "meaningfulEncounterCount": 1, "reflectionCount": 1 },
    "protectedNarrative": { "worldId": "living-vrindavan", "episodeRef": null, "sceneRef": null, "resolved": false },
    "generatedAt": "2026-08-11T12:00:00.000Z",
    "provenance": {
      "worldArtifactSpecId": "STK-CAN-001",
      "experienceArtifactSpecId": "STK-SPEC-006",
      "systemsArtifactSpecId": "STK-CAN-006",
      "canonDocIds": ["STK-CAN-001", "STK-CAN-006", "STK-SPEC-006"]
    }
  }
}
```

The `"..."` placeholders above exist only to keep this document's inline copy readable — they are **not** present in the real fixture. The full, byte-exact, no-placeholders payload is committed at `docs/fixtures/unreal/living-vrindavan.snapshot.example.json` and is what `unrealFixtureValidation.test.ts` (Section 26) actually parses and type-checks; treat that file, not this inline excerpt, as canonical if the two are ever compared line by line.

---

## 4. Forest snapshot proof

Real fixture data, not invented: `lib/livingForest/definition.ts` (`LIVING_FOREST_WORLD_ID = "living-forest-fixture"`, `forest-domain` → `forest-f01` (Sector, `"1 mile x 1 mile (~640 acres / ~2.59 km2)"`) → `forest-f01-nw` (Quadrant) → `patch-forest-p01/02/03` → `forest-clearing`/`forest-stream`/`forest-pond`) and `lib/livingForest/hostService.ts` (`deer-1`, `deer-2`, group `deer-herd-1`). The leave/return scenario below (`canopy-wet` → `drought`, `deer-1` relocating to `forest-pond` by seeded memory while `deer-2` takes the raw deterministic default of `forest-stream`) is the literal proof `lib/livingForest/livingForestVerticalSlice.test.ts:255-305` already asserts — not a new scenario invented for this pack.

Committed at `docs/fixtures/unreal/living-forest-f01.snapshot.example.json`, verified by the same `unrealFixtureValidation.test.ts`. Reproduced in full below — same top-level shape as Section 3's Vrindavan payload, same translator, different world:

```json
{
  "worldId": "living-forest-fixture",
  "userId": "dev-inspector",
  "generatedAt": "2026-08-10T06:00:05.000Z",
  "suggestedStage": "RECOGNITION_OF_CHANGE",
  "arrival": {
    "locationId": "forest-clearing",
    "reason": "RETURNING_TO_PRIOR_PLACE",
    "isFirstEverVisit": false,
    "priorLocationId": "forest-clearing",
    "worldChangedSinceLastVisit": true
  },
  "orientation": {
    "worldId": "living-forest-fixture",
    "userId": "dev-inspector",
    "generatedAt": "2026-08-10T06:00:05.000Z",
    "whereAmI": { "locationId": "forest-clearing", "name": "Clearing", "season": { "id": "drought", "name": "Drought" }, "dayPhase": "MIDDAY" },
    "whatIsAroundMe": { "nearbyEntityCount": 0, "occupancyLevel": "QUIET", "presentationHints": [] },
    "whatIsHappening": { "encounterOpportunityCount": 0, "activeCanonicalPresence": [], "groupRoutineIntentCount": 0 },
    "whereCanIGo": [
      { "locationId": "forest-stream", "reachable": true, "viaRouteId": null, "routeTraversable": null },
      { "locationId": "forest-pond", "reachable": true, "viaRouteId": null, "routeTraversable": null }
    ],
    "whatHasChanged": {
      "sinceLastVisit": true,
      "facts": [
        { "type": "season_changed", "sourceCategories": ["SEASON_TRANSITION"], "occurrenceCount": 1 },
        { "type": "population_relocated", "sourceCategories": ["POPULATION_MOVEMENT"], "occurrenceCount": 2 }
      ]
    },
    "arrival": {
      "locationId": "forest-clearing",
      "reason": "RETURNING_TO_PRIOR_PLACE",
      "isFirstEverVisit": false,
      "priorLocationId": "forest-clearing",
      "worldChangedSinceLastVisit": true
    }
  },
  "place": {
    "worldId": "living-forest-fixture",
    "locationId": "forest-clearing",
    "tick": 5,
    "season": { "id": "drought", "name": "Drought" },
    "region": {
      "locationId": "forest-clearing",
      "name": "Clearing",
      "spatialNode": { "id": "forest-clearing", "parentId": null, "role": "hub", "transform": { "position": { "x": 0, "y": 0, "z": 0 } }, "bounds": { "radius": 30 }, "tags": ["clearing"] },
      "environment": {
        "atmosphere": { "semantic": "dry-clearing-drought", "temperatureBand": "high", "illuminationSemantic": "midday-bright" },
        "water": { "semantic": "none", "levelBand": "low" },
        "vegetation": { "semantic": "dry-clearing-grass", "densityBand": "low" },
        "sensoryCues": [{ "channel": "ambientAudio", "semantic": "dry-wind-ambient" }]
      },
      "entities": [],
      "encounters": []
    },
    "patchState": {
      "patchId": "patch-forest-p01", "tick": 5, "vegetationCondition": "low", "hydrologyCondition": "low",
      "resourceAvailability": ["vegetation", "shelter", "gathering"], "occupancyLevel": "QUIET",
      "presentEntityIds": [], "presentGroupIds": [], "movementPermeability": 1, "ecologicalPressure": 0
    },
    "territoryPressure": null,
    "dayPhase": "MIDDAY",
    "occupancy": { "locationId": "forest-clearing", "tick": 5, "presentEntityIds": [], "presentGroupIds": [], "entityCountsByArchetype": {}, "activityMix": {}, "occupancyLevel": "QUIET" },
    "groupRoutineIntents": [],
    "resourceOpportunities": [
      { "locationId": "forest-clearing", "category": "vegetation", "available": true, "tick": 5 },
      { "locationId": "forest-clearing", "category": "shelter", "available": true, "tick": 5 },
      { "locationId": "forest-clearing", "category": "gathering", "available": true, "tick": 5 }
    ],
    "nearbyEntities": [],
    "encounterOpportunities": [],
    "nearbyDestinations": [
      { "locationId": "forest-stream", "reachable": true, "viaRouteId": null, "routeTraversable": null },
      { "locationId": "forest-pond", "reachable": true, "viaRouteId": null, "routeTraversable": null }
    ],
    "routeStates": [],
    "canonicalPresence": [],
    "rememberedConsequences": [
      {
        "id": "hm-0001", "worldId": "living-forest-fixture", "locationId": "forest-clearing", "tick": 5,
        "category": "population_departed", "detail": { "note": "herd relocated away from the clearing toward water" },
        "provenance": { "derivedFromEventIds": [], "derivationRule": "population-tick-delta", "causalReferences": [{ "kind": "need", "ref": "water" }] }
      }
    ],
    "presentationHints": [],
    "visitor": { "userId": "dev-inspector", "hasVisitedBefore": true, "meaningfulEncounterCount": 0, "reflectionCount": 0 }
  },
  "nearbyPlaces": [
    "...forest-stream (deer-2, raw deterministic default) and forest-pond (deer-1, memory-directed relocation) -- full PlaceContinuityView shape identical to `place` above; see the committed fixture for the complete, verbatim content"
  ],
  "recentWorldChanges": [
    {
      "id": "we-f-0001", "worldId": "living-forest-fixture", "tick": 3, "category": "SEASON_TRANSITION", "locationId": null,
      "participantEntityIds": [], "causalReferences": [{ "kind": "season", "ref": "drought" }], "consequences": [],
      "significance": "LANDMARK", "retentionTier": "LANDMARK",
      "provenance": { "derivedFromEventIds": [], "derivationRule": "season-schedule-advance", "causalReferences": [{ "kind": "season", "ref": "drought" }] },
      "occurredAt": "2026-08-10T06:00:03.000Z"
    },
    {
      "id": "we-f-0002", "worldId": "living-forest-fixture", "tick": 4, "category": "POPULATION_MOVEMENT", "locationId": "forest-clearing",
      "participantEntityIds": ["deer-1", "deer-2"], "causalReferences": [{ "kind": "need", "ref": "water" }],
      "consequences": [{ "type": "HISTORICAL_MARKER", "targetEntityId": null, "targetGroupId": "deer-herd-1", "targetLocationId": "forest-clearing", "detail": { "note": "herd dispersed from the clearing toward water" } }],
      "significance": "MEANINGFUL", "retentionTier": "DURABLE",
      "provenance": { "derivedFromEventIds": [], "derivationRule": "population-tick-delta", "causalReferences": [{ "kind": "need", "ref": "water" }] },
      "occurredAt": "2026-08-10T06:00:04.000Z"
    }
  ],
  "embodiment": {
    "worldId": "living-forest-fixture",
    "worldVersion": 1,
    "simulationTick": 5,
    "season": { "id": "drought", "name": "Drought" },
    "current": { "...": "same EmbodiedRegion shape as `place.region` above, for `forest-clearing`" },
    "reachable": [ "...2 EmbodiedRegions for forest-stream (deer-2) and forest-pond (deer-1)" ],
    "transitions": [
      { "toLocationId": "forest-stream", "affordance": "gradual-emergence" },
      { "toLocationId": "forest-pond", "affordance": "gradual-emergence" }
    ],
    "visitorContext": { "userId": "dev-inspector", "lastLocationId": "forest-clearing", "meaningfulEncounterCount": 0, "reflectionCount": 0 },
    "protectedNarrative": { "worldId": "living-forest-fixture", "episodeRef": null, "sceneRef": null, "resolved": false },
    "generatedAt": "2026-08-10T06:00:05.000Z",
    "provenance": {
      "worldArtifactSpecId": "STK-CAN-999",
      "experienceArtifactSpecId": "STK-CAN-999",
      "systemsArtifactSpecId": "STK-CAN-999",
      "canonDocIds": ["STK-CAN-999"]
    }
  }
}
```

Same `"..."` caveat as Section 3: the committed `docs/fixtures/unreal/living-forest-f01.snapshot.example.json` has no placeholders and is what the validation test actually runs against — treat it as canonical.

**One honest, explicit gap this proof surfaces:** there is no live `composeLivingForestWorldExperienceSnapshot` function anywhere in this repository — the Vrindavan composer (`composeVrindavanWorldExperienceSnapshot`, `lib/livingWorldExperience/vrindavanWorldExperienceSnapshot.ts`) is itself Vrindavan-named and world-specific. What **is** proven, by direct execution in `unrealFixtureValidation.test.ts`, is that:

1. The `WorldExperienceSnapshot`/`WorldEmbodimentSnapshot` **types** structurally accept real Forest content with zero modification (proven by `tsc --noEmit` on this pack).
2. The real, unmodified `translateToUnrealCommands` function (`packages/world-embodiment-runtime/src/unrealCommandTranslator.ts:27-28`) accepts the Forest fixture's `embodiment` and returns well-formed `UnrealCommand[]` — the exact same function call used for Vrindavan, no `if (worldId === ...)` branch anywhere in that file.

What is **not** proven (and should not be implied): that a live HTTP round-trip for the Forest world exists today. It does not. Building `composeLivingForestWorldExperienceSnapshot` — following the exact same contract, not a new one — is real, scoped, non-blocking follow-up work outside this pack's docs-only mandate.

---

## 5. World delta contract

**Naming correction against the mission brief:** neither `WorldDelta` nor `EmbodimentDelta` exists under those exact names anywhere in the codebase (`grep -rn` returns zero matches for either). The real type is `WorldEmbodimentDelta` (`packages/world-embodiment-contracts/src/delta.ts:1-22`):

```ts
export type EmbodimentDeltaOp = "ADD" | "UPDATE" | "REMOVE" | "UNCHANGED"

export interface EmbodimentDeltaEntry {
  path: string
  op: EmbodimentDeltaOp
  before?: unknown
  after?: unknown
}

export interface WorldEmbodimentDelta {
  worldId: string
  fromTick: number
  toTick: number
  entries: EmbodimentDeltaEntry[]
}
```

There is no experience-layer delta at all — nothing diffs two `WorldExperienceSnapshot`s or two `PlaceContinuityView`s. "What changed since a visitor last visited" is instead carried entirely through `ReturnRecognition`'s closed, semantic `ReturnRecognitionFact[]` (Section 18), never a structural diff. This is a real, three-way distinction worth stating precisely for the adapter author:

- **Snapshot** = `WorldExperienceSnapshot` — full state, always safe to fully re-render from.
- **Delta** = `WorldEmbodimentDelta` — presentation-layer-only, path-keyed (`region:<id>`, `region:<id>.environment`, `entity:<id>`, `` encounter:<locationId>:<ruleId> ``), computed by `diffWorldEmbodiment(prev, next)` (`packages/world-embodiment-runtime/src/embodimentDelta.ts:35-63`). It never carries experience-layer facts (arrival, canonical presence, memory) — only what `WorldEmbodimentSnapshot` itself holds.
- **Renderer command** = `UnrealCommand[]` — the wire format, produced from either a snapshot or a delta by one of three separate translator functions (Section 6).

**Delta-category mapping**, from direct inspection of `translateEmbodimentDeltaToUnrealCommands` (`unrealCommandTranslator.ts:31-63`):

| Delta category | Path shape | Real `UnrealCommand` mapping |
|---|---|---|
| Entity lifecycle (add) | `entity:<id>`, op `ADD` | `PlaceEntity` |
| Entity lifecycle (remove) | `entity:<id>`, op `REMOVE` | `RemoveEntity` |
| Entity movement / update | `entity:<id>`, op `UPDATE` | `UpdateEntity`, plus `MoveEntityToRegion` if `movementTargetLocationId` differs from the entity's own region |
| Environment (atmosphere+water+vegetation, as one unit) | `region:<id>.environment`, op `ADD`/`UPDATE` | `SetAtmosphere` **+** `SetWaterState` **+** `SetVegetationIntent` — all three, always together; the delta path has no finer granularity than "the whole environment object changed" |
| Encounter availability (add) | `encounter:<locationId>:<ruleId>`, op `ADD` | `CreateInteractionAnchor` |
| Encounter availability (remove) | same, op `REMOVE` | **None — explicitly documented as out of scope** ("an interaction anchor disappearing is presentation-only cleanup, not something the reference translator needs a distinct op for this sprint", `unrealCommandTranslator.ts:65-68`) |
| Season transition | Not a delta entry kind at all — `season` lives on the snapshot/delta top level (`fromTick`/`toTick` context), never diffed per-path | No dedicated op; a season change is only visible via a fresh full-snapshot re-translation or via the coarse `region:*.environment` entries the season's envelope indirectly produces |
| Water state alone / vegetation intent alone | Same `region:<id>.environment` path as atmosphere — **cannot be isolated** | Same trio, always together (see gap below) |
| Group intent | **No path kind exists for groups in `WorldEmbodimentDelta` at all** — `diffWorldEmbodiment` only keys `region`/`entity`/`encounter` | Handled by a *third*, entirely separate function, `translateGroupIntentToUnrealCommands(groups: GroupIntentInput[])` (`unrealCommandTranslator.ts:79`), which does not consume a snapshot or a delta — the Host layer must itself convert `GroupState` into `GroupIntentInput[]` before calling it. Flagged in Section 6. |
| Patch ecology, Route state, Place Continuity, canonical presence | No `WorldEmbodimentDelta` path kind exists for any of these — they live only on `WorldExperienceSnapshot`, which has no delta form at all | No mapping exists; full re-fetch is the only path today (Section 6) |

**A real inconsistency worth flagging plainly:** the full-snapshot translator (`translateToUnrealCommands`) emits one coarse `UpdateEnvironment` op per region; the delta translator emits three fine-grained ops (`SetAtmosphere`/`SetWaterState`/`SetVegetationIntent`) for the *same underlying change*. An Unreal adapter that only implements one op shape for environment updates will silently miss the other transport's equivalent update. This is not a mission-invented gap — it is the literal, current behavior of two real functions in the same file.

---

## 6. UnrealCommand gap analysis

The real union, unchanged, 11 operations (`packages/world-embodiment-contracts/src/unrealCommand.ts:21-32`):

```ts
export type UnrealCommand =
  | { op: "CreateRegion"; regionId: string; name: string; transform: SpatialTransform; bounds: SpatialBounds }
  | { op: "UpdateEnvironment"; regionId: string; atmosphere: AtmospherePresentation; water: WaterPresentation; vegetation: VegetationPresentation }
  | { op: "SetAtmosphere"; regionId: string; semantic: string; illuminationSemantic: string }
  | { op: "SetWaterState"; regionId: string; semantic: string; levelBand: EnvironmentalBand }
  | { op: "SetVegetationIntent"; regionId: string; semantic: string; densityBand: EnvironmentalBand }
  | { op: "PlaceEntity"; entityId: string; regionId: string; presentationArchetype: string; animationSemantic: string; groupId?: string | null }
  | { op: "UpdateEntity"; entityId: string; animationSemantic: string; activityHint: string; groupId?: string | null }
  | { op: "RemoveEntity"; entityId: string }
  | { op: "MoveEntityToRegion"; entityId: string; fromRegionId: string; toRegionId: string; movementSemantic: string }
  | { op: "SetGroupIntent"; groupId: string; regionId: string; targetRegionId: string | null; cohesion: number }
  | { op: "CreateInteractionAnchor"; regionId: string; ruleId: string; category: EncounterCategory; interactionAffordance: string }
```

**Which functions actually emit which op** (not assumed — read from the 3 real translator functions):

| Op | `translateToUnrealCommands` (full snapshot) | `translateEmbodimentDeltaToUnrealCommands` (delta) | `translateGroupIntentToUnrealCommands` (separate, manual input) |
|---|---|---|---|
| `CreateRegion` | ✅ | ❌ never | ❌ |
| `UpdateEnvironment` | ✅ (coarse) | ❌ | ❌ |
| `SetAtmosphere` | ❌ | ✅ (fine, always paired with the two below) | ❌ |
| `SetWaterState` | ❌ | ✅ | ❌ |
| `SetVegetationIntent` | ❌ | ✅ | ❌ |
| `PlaceEntity` | ✅ | ✅ (on `ADD`) | ❌ |
| `UpdateEntity` | ❌ | ✅ (on `UPDATE`) | ❌ |
| `RemoveEntity` | ❌ | ✅ (on `REMOVE`) | ❌ |
| `MoveEntityToRegion` | ✅ | ✅ | ❌ |
| `SetGroupIntent` | ❌ | ❌ | ✅ — **only** entry point, and it does not take a snapshot/delta at all |
| `CreateInteractionAnchor` | ✅ | ✅ (on `ADD` only) | ❌ |

Every declared op IS emitted by *something* — there is no dead op in the union — but the wiring is fragmented across three independent functions with different input shapes, and no single function alone produces the full set. An Unreal adapter needs all three entry points, and the Host layer must still hand-build `GroupIntentInput[]` from `GroupState` before the third one is even callable — that conversion does not exist yet in this codebase.

**Classification of the mission's named semantic requirements**, against current code:

| Requirement | Classification | Notes |
|---|---|---|
| Region creation/environment/entities/interaction anchors (greybox essentials) | **SUPPORTED NOW** | `translateToUnrealCommands` end to end |
| Entity movement/update/removal via delta | **SUPPORTED NOW** | `translateEmbodimentDeltaToUnrealCommands` |
| Group cohesion | **SUPPORTED INDIRECTLY** | `SetGroupIntent` op exists and is emitted by `translateGroupIntentToUnrealCommands`, but only from a manually-built `GroupIntentInput[]`, never from a snapshot or delta directly — no Host-layer glue exists yet to call it automatically |
| Patch ecology (`PatchState` — vegetation/hydrology condition, occupancy, movement permeability) | **MISSING BUT NON-BLOCKING FOR GREYBOX** | Real data exists (`PlaceContinuityView.patchState`), zero `UnrealCommand` mapping. Proposed op below. |
| Route state (`RouteState` — the one real Route, `route-govardhan-path`) | **MISSING BUT NON-BLOCKING FOR GREYBOX** | Real data exists (`PlaceContinuityView.routeStates`), zero mapping. Proposed op below. |
| Place Continuity (`rememberedConsequences`, `presentationHints`, `visitor`) | **MISSING BUT NON-BLOCKING FOR GREYBOX** | This is presentation/UI-adjacent context, arguably renderer-UI rather than 3D-scene state; may never need a scene-command mapping at all — flagged as an open question, not assumed. |
| Orientation (`OrientationProjection` — "where am I / what's around me / what's happening") | **DEFERRED** | Likely the wrong shape for a command op entirely (it's a whole-projection summary, not an incremental scene instruction) — needs product decision, not a command, before any mapping is proposed. |
| ReturnRecognition | **MISSING BUT NON-BLOCKING FOR GREYBOX** | Semantic facts only (Section 18) — could map to a UI/notification layer in Unreal, not a scene-mutation op. No command proposed; likely doesn't want one. |
| Canonical projection (`WorldInstanceCanonicalProjectionState` / `PlaceCanonicalPresence`) | **MISSING AND BLOCKING for any build that needs to render Canon-authorized content** | Zero mapping today. This is the one gap with real product weight — see the proposed `StageCanonicalProjection` op and the Canon Firewall requirements in Section 19 before implementing it. |

**Proposed additive ops** (names/payloads only — not implemented, and none should be implemented until a real Unreal build actually needs them):

```ts
{ op: "UpdatePatchEcology"; patchId: string; vegetationCondition: EnvironmentalBand; hydrologyCondition: EnvironmentalBand; ecologicalPressure: number }
{ op: "SetRouteState"; routeId: string; traversable: boolean }
{ op: "StageCanonicalProjection"; regionId: string; canonicalEventId: string; status: CanonicalEventProjectionStatus; isApprovedCanon: boolean }
{ op: "UpdateGroupCohesion"; groupId: string; cohesion: number }
```
`UpdateGroupCohesion` deliberately overlaps `SetGroupIntent`'s own `cohesion` field — if `SetGroupIntent`'s wiring gap above gets closed instead, this one is redundant and should not also be added.

---

## 7. Transport contract

**Poll-based. No push transport exists anywhere in this codebase** — no WebSocket, no SSE, for any world-state change. Confirmed by direct inspection, and stated explicitly in `docs/LIVING_VRINDAVAN_UNREAL_58_READINESS_RECONCILIATION.md:74-78`. This pack does not fabricate one.

**Dev route (unauthenticated, guarded off in production):**
```
GET /api/dev/account/living-vrindavan/experience-snapshot?world_instance_id=living-vrindavan&dev_user=dev-inspector&since_tick=<int|omit>
```
(`app/api/dev/account/living-vrindavan/experience-snapshot/route.ts:12-24`) → `{ "snapshot": WorldExperienceSnapshot }`.

**Production route (Supabase-session-authenticated):**
```
GET /api/account/living-vrindavan/entry?sinceTick=<int|omit>
```
→ `{ "orientation": OrientationProjection }` — note this returns only the `OrientationProjection`, not the full `WorldExperienceSnapshot`.

**A real, confirmed inconsistency to design around, not silently normalize:** the dev route's query params are `since_tick`/`world_instance_id`/`dev_user` (snake_case); the production route's is `sinceTick` (camelCase). An Unreal adapter targeting both must not assume one casing convention.

**`since_tick`/`sinceTick` semantics:** caller-supplied, with **no server-side "last known tick" persistence for any visitor** (`LIVING_VRINDAVAN_BUILD_04_FINAL_REPORT.md:106-112`, confirmed still true). The Bridge, not Runtime, must remember `lastAppliedTick` across polls (Step 8, Section 8).

**Dev user semantics:** `dev_user` defaults to `"dev-inspector"` and is a plain string identity for the dev-only route — it is not a `VisitorId` type (none exists, Section 9) and carries no session.

**Poll cadence:** **not specified anywhere in the codebase.** Build 02 Phase 0 explicitly declines to mandate one; Build 06 Phase 0 only says its regeneration policy "tolerates poll-cadence latency," again without a number. This pack does not invent one either — an initial Unreal Bridge should pick a cadence empirically (2-5s is a reasonable, unverified starting point) and treat it as an adapter-owned tuning value, never a Runtime contract.

**Timeout / retry / resync / error semantics:** not specified by any existing route or doc. Section 22 proposes a model; it is new, not documented pre-existing behavior — labeled as such there.

**Version mismatch / stale tick handling:** there is no `worldVersion` check performed by any existing route today (the field exists on `WorldEmbodimentSnapshot` but no route branches on it). Section 21/22 propose behavior; again, new, not existing.

---

## 8. Initial handshake

1. **Unreal launches.**
2. **Runtime Bridge initializes.** Failure: if the Bridge module itself fails to load (missing config), block startup with a clear log — never proceed with a null transport.
3. **Bridge identifies `worldInstanceId`.** This is operator/config-supplied (e.g. `"living-vrindavan"`), never generated by Unreal (Section 9). Failure: missing config → block, do not guess a default.
4. **Bridge fetches initial snapshot** via `GET .../experience-snapshot?world_instance_id=<id>&dev_user=<bridge-identity>` (dev transport) or the authenticated production `entry` route. Failure: transport unavailable → enter fixture/offline mode (Section 23) if configured, else block with a visible error, never render a silently-empty world.
5. **Bridge validates schema/version.** Today there is no `schemaVersion` to check (Section 21 gap) — validation is necessarily structural only (required top-level keys present, `worldId` matches config). Failure: malformed JSON or missing required field → reject the snapshot, do not partially apply it, retry per Section 22.
6. **Bridge registers semantic IDs.** Every `locationId`/`entityId`/`groupId`/`ruleId` seen becomes a key in the Bridge's own `SemanticBindingTable` (Section 12) — Unreal Actor GUIDs are created *after* this, keyed by these strings, never the reverse.
7. **Bridge instantiates renderer regions/placeholders** — one `CreateRegion`-equivalent per `embodiment.current` + `embodiment.reachable[]` region, using the Bridge's own authored coordinate table (Section 10), not any transform Runtime sent.
8. **Bridge records `lastAppliedTick`** = `embodiment.simulationTick` from the snapshot just applied. This value lives ONLY in the Bridge; Runtime does not track it (Section 7).
9. **Bridge polls for delta/new snapshot** at its own chosen cadence, passing `lastAppliedTick` as `since_tick`/`sinceTick`.
10. **Bridge applies only newer state.** If a poll returns a snapshot/delta whose own tick is ≤ `lastAppliedTick`, discard it — never apply out-of-order state (Section 22, "stale tick").
11. **Bridge reports one `InteractionIntent`** (e.g. `visit-location`) constructed from player input, via whatever write path the production world exposes (today: the `interact` route family under `app/api/account/living-vrindavan/`, not yet read in full by this pack — flagged as a follow-up read, not assumed).
12. **Runtime responds** — either the applied result directly or (given the poll-only transport) nothing synchronous beyond an ack; the Bridge must poll again to observe the consequence, per Section 7's "no push" reality.
13. **Unreal refreshes/applies resulting state** on the next poll that reflects the intent's consequence — never assumes the intent already changed local state; local prediction, if any, is the Bridge's own responsibility and must be reconciled against the next real snapshot, not trusted.

---

## 9. Identity rules

| Identity | Real type | Survives restart? | Survives leave/return? | Renderer-local allowed? | May Unreal generate it? |
|---|---|---|---|---|---|
| `WorldId` | `string` (`runtime-contracts/ids.ts:21`) | Yes (Host-authored constant) | Yes | No | **Never** |
| `WorldInstanceId` | `= WorldId`, same string space (`world-persistence-contracts/ids.ts:12`) | Yes (persisted `WorldInstance` row) | Yes | No | **Never** |
| `WorldDefinitionId` | `string` | Yes | Yes | No | **Never** |
| `DomainId`/`SectorId`/`QuadrantId`/`PatchId`/`LocalPlaceId` | `string`, Host-authored static (`spatial-ecology-contracts/ids.ts:6-10`) | Yes (code-defined, not per-instance) | Yes | No | **Never** |
| `LocationId` | `string` (`runtime-contracts/ids.ts:22`) | Yes | Yes | No | **Never** |
| `EntityId` | `string`, Host-authored roster (`living-systems-contracts/ids.ts:6`) | Yes | Yes | No | **Never** |
| `GroupId` | `string` (`living-population-contracts`) | Yes (composed by population/group-formation logic, not a fixed roster) | Yes | No | **Never** |
| `EncounterRuleId` | `string`, Host-authored (closest real analogue to a mission-named "EncounterId") | Yes | Yes | No | **Never** |
| `EncounterRecordId` | `string`, **content-derived**: sha256 of `(worldId, ruleId, locationId, participantEntityIds, startTick)` (`encounterIdentity.ts:15-27`) | Yes | Yes | No | **Never** — it must be reproducible from the same inputs Runtime used |
| `canonicalEventId` | Plain `string` field inside `CanonicalEventIdentity` — **no standalone `CanonicalEventId` type exists** | Yes | Yes | No | **Never** |
| `activationId` | **content-derived**: sha256 of `(worldInstanceId, canonicalEventId, definitionContentHash, activationTick)` (`activationIdentity.ts:18-28`) | Yes | Yes | No | **Never** |
| `VisitorId` | **Does not exist as a type anywhere.** Visitors are addressed by `UserId`/`userId: string` — the real Supabase auth `user.id` | Yes (Supabase session, not this codebase's concern) | Yes | No | **Never** — Unreal must receive/forward the real signed-in user id, not mint its own |
| `CheckpointId`/`WorldOwnerId`/`WorldSystemEventId` | `string`, caller-supplied | Yes | Yes | No | **Never** (these are server/worker-process identities, irrelevant to a renderer) |

**What Unreal MAY create locally:** Actor GUIDs, Unreal object identifiers, any renderer-internal handle — but only ever as a **value keyed by** one of the semantic IDs above in the Bridge's `SemanticBindingTable` (Section 12), never as a replacement for it. If an Actor is destroyed and recreated, its new GUID must re-bind to the same unchanged semantic ID.

---

## 10. Coordinate boundary

**Confirmed, direct from Build 01/06:** Runtime carries **semantic topology and an abstract/normalized spatial layout** (`SpatialNode.transform`/`bounds` on `EmbodiedRegion`) — it does **not** carry authoritative real-world Unreal coordinates. The ~500m × 500m Vrindavan extent is an honest, explicitly-labeled **Host-operational fact** (`vrindavanBuildManifest.ts`'s `worldExtent`), never a Canon claim (`LIVING_VRINDAVAN_BUILD_01_FINAL_REPORT.md:39-41`).

**Vrindavan mapping boundary** (Build 02 Phase 0 §3, reconfirmed unchanged through Build 06 Phase 0):
- Origin: the Domain root (`vrindavan-domain`'s one Sector) at Unreal world-space `(0,0,0)`. No georeferencing.
- Units: 1 Unreal unit = 1 cm; 1 meter = 100 units.
- Orientation: `+X` = downstream direction of the Yamuna; `+Y` = perpendicular, riverbank-to-shore; `+Z` = up.
- Elevation: flat baseline, `z = 0` for all 4 Local Places in v1.
- Precision: `float`, not Unreal 5 LWC/`double` — 500m×500m does not need Large World Coordinates.
- **Transform ownership: a renderer-side constant table** (`VrindavanPatchLayout`, proposed name, not yet built) joins each `PatchId`/`LocationId` string to a real Unreal transform. **Runtime never carries this table or any value derived from it** — the `spatialNode.transform`/`bounds` fields in every fixture in this pack are Runtime's own abstract layout, explicitly NOT the numbers the Unreal adapter would actually use (see the fixture README).
- World Partition posture: default grid (~256m cells), no pre-subdivision; one always-loaded HLOD-0 cell over `patch-yamuna` (the hub); 3 streamed cells for the other 3 Patches.
- Explicit reminder carried forward from Build 02 Phase 0: *"Do not import Living Forest's larger sector-size convention here."*

**Living Forest boundary** — real data only: F01 (`forest-f01`, a Sector) = "1 mile × 1 mile (~640 acres / ~2.59 km²)"; 1 Quadrant defined so far (`forest-f01-nw`); 3 Patches (`patch-forest-p01/02/03`, ~1/3 of the Quadrant's nominal 40-acre-per-Patch convention each, per the Sector's own `nominalExtentDescription`). **No Unreal-side coordinate mapping for Forest exists yet in any doc** — this pack does not invent one. The extension strategy is the same pattern as Vrindavan's: a second, independent renderer-side constant table (e.g. `LivingForestPatchLayout`) keyed by the same semantic Patch/LocalPlace IDs, at whatever scale a real Forest build needs — Forest's own topology never needs to match Vrindavan's coordinate convention, and StudioK's spatial-ecology contracts remain identical either way (confirmed portable by Section 4's proof).

---

## 11. Renderer capability negotiation

Two real, distinct, non-overlapping capability contracts exist — reuse both, do not invent a third:

**`EmbodimentRendererCapabilities`** (`packages/world-embodiment-contracts/src/capability.ts:10-38`) — the one the Unreal adapter should advertise:
```ts
export interface EmbodimentRendererCapabilities {
  spatial3D: boolean
  ambientAudio: boolean
  spatialAudio: boolean
  animation: boolean
  particles: boolean
  dynamicLighting: boolean
  haptics: boolean
  vegetationInstances: boolean
  waterSurface: boolean
  largeWorldStreaming: boolean
}
```
A real Unreal 5.8 adapter would plausibly declare all of these `true` except `haptics` (device-dependent) and `largeWorldStreaming` (`false` at Vrindavan's 500m scale per Section 10; likely `true` for a future full-scale Forest build). Negotiation (`negotiateSensoryCues`/`negotiateRegionForCapabilities`, `capabilityNegotiation.ts:13-28`) only ever **drops** sensory cues a renderer can't realize — it never alters world truth, matching the architectural law.

**`RendererCapabilities`** (legacy, 2D/location-scoped, `rendererContract.ts:15-18`) — `supportsAmbientMotion`/`supportsSound`/`supportsReducedMotion`. The file's own header states a renderer using `WorldEmbodimentSnapshot` declares `EmbodimentRendererCapabilities` **in addition to, not instead of**, this one — Unreal should advertise both, not just the richer one, since `resolvePresentationPlan()` still consults the older one for `PresentationContext` (reduced-motion/sound preferences that are orthogonal to 3D-vs-2D capability).

No mission-suggested category (`supportsGroups`, `supportsCanonicalProjection`, `supportsInteractionAnchors`, `supportsWorldDelta`, `supportsLocalPCGRegeneration`, `supportsNiagara`, `supportsSpatialDebug`) exists in either real contract today. Given Section 6's canonical-projection gap and Section 5's fragmented delta wiring, `supportsCanonicalProjection` and `supportsWorldDelta` are the two most likely genuinely-needed additions once those two gaps are actually closed — but neither should be added speculatively ahead of that work.

---

## 12. Unreal adapter module plan (conceptual only — no `.uplugin` created)

| Module | First-greybox required? | Responsibility |
|---|---|---|
| `RuntimeTransport` | **Yes** | Polling HTTP client against Section 7's routes; owns retry/backoff (Section 22) |
| `SnapshotDecoder` | **Yes** | Parses `WorldExperienceSnapshot` JSON into Bridge-native structs; the ONLY place JSON shape knowledge lives |
| `SemanticBindingTable` | **Yes** | Section 9's map from semantic ID → Actor/handle; survives snapshot re-fetches |
| `WorldRegionManager` | **Yes** | Executes `CreateRegion`/region-scoped ops; owns `VrindavanPatchLayout` (Section 10) |
| `EnvironmentRenderer` | **Yes** (greybox: flat-color/skybox swap is enough) | `UpdateEnvironment`/`SetAtmosphere`/`SetWaterState`/`SetVegetationIntent` |
| `WaterRenderer` | Later build | Real water material/Niagara work — greybox can fold into `EnvironmentRenderer` |
| `VegetationRenderer` | Later build | Real PCG/foliage — greybox can fold into `EnvironmentRenderer` |
| `EntityRenderer` | **Yes** | `PlaceEntity`/`UpdateEntity`/`RemoveEntity`/`MoveEntityToRegion` |
| `GroupRenderer` | Later build | `SetGroupIntent` consumption — depends on Section 6's wiring gap closing first |
| `InteractionBridge` | **Yes** | `CreateInteractionAnchor` execution + constructing/sending `InteractionIntent`s (Section 20) |
| `CanonicalProjectionRenderer` | **Blocked** until Section 6/19's canonical-projection op exists | — |
| `VisitorContinuityRenderer` | Later build | Surfacing `ReturnRecognition`/`PlaceContinuity` facts as UI, not scene ops |
| `DebugOverlay` | Recommended for first greybox | Visualize `SemanticBindingTable` + `lastAppliedTick` — cheapest way to catch Section 22 failures early |
| `AssetRegistry` | **Yes**, minimal | Section 13's semantic-key → asset lookup, even if the table has only a handful of rows |
| `Telemetry` | Later build | — |

---

## 13. Asset registry contract

Runtime must never see `.uasset` paths, Blueprint class paths, material instance paths, PCG graph paths, or Niagara asset paths — confirmed clean by direct grep across every `packages/world-embodiment-*`, `packages/spatial-ecology-*`, and `lib/*Definition.ts` file. The chain, real naming convention carried forward from Build 02 Phase 0 / the older Fab-readiness package:

```
semantic concept (Runtime-emitted, already real)
        |
        v
Unreal-side registry (NOT YET BUILT — content-layer only, proposed)
        |
        v
renderer asset(s)
```

Naming convention: `DA_Vegetation_<Semantic>`, `DA_Atmosphere_<Semantic>`, `DA_EntityArchetype_<Name>`. Two concrete, real-semantic-value example rows (semantics are real fixture values from this pack; asset-side names are illustrative, per the source package's own caveat that "these op names are illustrative"):

| Semantic key (real) | Runtime source | Proposed registry key | Renderer asset(s) |
|---|---|---|---|
| `"riverbank-reeds"` | `VegetationPresentation.semantic` at `patch-yamuna` | `DA_Vegetation_RiverbankReeds` | PCG scatter graph + foliage set + material instances |
| `"avatark-population-cow"` | `EntityPresentation.archetypeId` (real constant `COW_ARCHETYPE_ID`, `vrindavanPopulationDefinition.ts:33`) | `DA_EntityArchetype_Cow` | Skeletal mesh + anim blueprint + group-proxy config |

Replacement semantics: swapping which Marketplace/Fab asset backs `DA_Vegetation_RiverbankReeds` is a registry-only, Unreal-side content edit — Runtime emits the same `"riverbank-reeds"` string forever, regardless of which asset currently answers it. This IS the mechanism that keeps Runtime asset-free; it should not be redesigned, only implemented.

---

## 14. Place / Patch binding

For Vrindavan: 4 real Local Places (`place-vrindavan-entry`, `place-yamuna`, `place-kadamba-grove`, `place-govardhan-path`), 1:1 with 4 Patches and 4 Locations, Yamuna as the hub (Section 4's fixture). For Forest: `place-forest-clearing`/`place-forest-stream`/`place-forest-pond`, 1:1 with `patch-forest-p01/02/03`.

```
semantic Patch/LocalPlace ID (Runtime-emitted, stable forever)
        |
        v
renderer region binding (Bridge's own SemanticBindingTable entry)
        |
        v
optional Unreal Actor/Volume/World Partition cell placement (Section 10's layout table decides this — NOT a 1:1 requirement)
```

**Explicitly not equated:** a semantic region is not a streaming cell. Section 10 already fixed Vrindavan's World Partition posture (1 always-loaded HLOD-0 cell at `patch-yamuna`, 3 streamed cells for the rest) — that is a renderer-side performance decision layered *on top of* the 4 semantic Patches, not a redefinition of them. A future re-tuning of cell boundaries must never require a Runtime change.

---

## 15. Entity binding

```
EntityId (e.g. "avatark-population-cow-1", "deer-1" — stable, Host-authored)
        |
        v
RendererEntityHandle (Bridge-internal, Section 9's SemanticBindingTable)
        |
        v
Unreal Actor / ISM / HISM / Mass representation — renderer's choice, may change build to build
```

Representation may legitimately differ by scale/performance (an individual Actor for 2 cows, an ISM or Mass agent for a hypothetical future herd of 200) — but semantic identity (`EntityId`) must stay stable regardless. **Unreal Actor existence is never equivalent to entity existence**: `RemoveEntity` means "Runtime no longer asserts this entity is here," and the Bridge may choose to keep an Actor alive briefly for a despawn animation — that is a purely local rendering decision, not a re-negotiation with Runtime.

---

## 16. Group / population binding

Real example: `avatark-population-cow-herd` (kind `"herd"`, members `avatark-population-cow-1`/`-2`), `deer-herd-1` (kind `"herd"`, members `deer-1`/`deer-2`). `GroupState` remains the sole runtime truth for membership; `SetGroupIntent`/`UpdateGroupCohesion` (Section 6) only ever carry direction/cohesion, never membership deltas — membership changes surface as individual entity `groupId` field changes, not a group-level op. Renderer strategy (individual Actors vs. instanced vs. Mass vs. an aggregate flock proxy) is capability-driven (Section 11) and may vary per build without any Runtime change.

---

## 17. Environment mapping

Using Build 06 Phase 0's real `SeasonEnvironmentalEnvelope` (`temperatureBand`, `precipitationBand`, `humidityBand`, `hydrologyBaselineBand`, `vegetationActivityBand`, `animalActivityBand`, all `EnvironmentalBand = "low"|"moderate"|"high"`) and the real day-phase enum (`DayPhase = "DAWN"|"MORNING"|"MIDDAY"|"AFTERNOON"|"DUSK"|"EVENING"|"NIGHT"`, 14 ticks/cycle for Vrindavan, 8 for Forest):

```
season + day phase + environmental bands (Runtime-emitted, semantic)
        |
        v
EnvironmentPresentation (atmosphere/water/vegetation semantic + band, Runtime-emitted — already renderer-neutral)
        |
        v
UnrealCommand (UpdateEnvironment, or SetAtmosphere/SetWaterState/SetVegetationIntent — Section 5's two-shape caveat applies)
        |
        v
Unreal atmosphere/material/water/PCG parameters — via the Section 13 asset registry, never a direct numeric mapping
```

No final art values are named anywhere in this chain — only semantic strings (`"warm-flowering-vasanta"`, `"flowing-riverbank"`) and 3-value bands. This pack does not add a 4th layer; `EnvironmentPresentation` already IS the semantic presentation-intent layer the mission asks for.

---

## 18. Leave / return continuity (flagship)

Exact sequence, grounded in the real Build 04 arrival/continuity model and the real Forest vertical-slice proof (`livingForestVerticalSlice.test.ts:255-305`):

1. Visitor enters → Bridge fetches initial snapshot (Section 8, steps 1-8).
2. Visitor explores → Bridge sends `InteractionIntent`s (`visit-location`, `select-encounter`, `begin-reflection`); Runtime validates and applies each (Section 20).
3. Visitor leaves → Bridge sends `leave-world`; **the durable world instance is NOT paused** — ticks continue advancing per Runtime's own wake/catch-up model (Sprint 17's crash-recovery-adjacent machinery, Sprint 20's facade) regardless of whether any Bridge is polling.
4. World tick advances, state/memory changes — e.g. a season transition, a population relocation driven by memory (the real Forest proof: `deer-1` → `forest-pond` via seeded `PREVIOUS_RESOURCE_LOCATION` memory, `deer-2` → `forest-stream` via the raw default).
5. Visitor returns → Bridge fetches a fresh snapshot (never a delta — a delta requires unbroken continuity of polling, which an absent visitor cannot have; Section 22 treats a returning Bridge as effectively a fresh handshake at Section 8 step 4, not step 9).
6. `ArrivalDecision.reason` = `"RETURNING_TO_PRIOR_PLACE"`, `worldChangedSinceLastVisit: true`; `OrientationProjection.whatHasChanged.facts` carries the closed-vocabulary `ReturnRecognitionFact[]` (e.g. `"season_changed"`, `"population_relocated"` — the exact two fact types the real Forest test asserts).
7. Unreal presents the changed world — a full region re-render from the fresh snapshot, using `ReturnRecognitionFact`s only to decide *whether/how* to surface a "the world moved on" UI beat, never as data to compute the actual scene state from (the facts are semantic summaries, "never prose," per the source package's own comment — the scene state itself always comes from `embodiment`).

**What Unreal stores locally vs. what must come from Runtime:** Unreal may cache the previous snapshot, the `SemanticBindingTable`, and `lastAppliedTick` for its own reconciliation logic — but it must **never** derive "what changed" itself by diffing two locally-cached snapshots when Runtime already provides `ReturnRecognitionFact[]` for exactly that purpose, and it must **never** persist world truth beyond the current session (no local "world save file" — Runtime, via `WorldCheckpoint`/`DurableWorldState`, is the only durable store, per the architectural law).

---

## 19. Canon firewall

Unreal may render canonical presence **only** when the snapshot itself authorizes it — via `PlaceCanonicalPresence` (`{ canonicalEventId, status, isApprovedCanon }`, `placeContinuity.ts:21-30`) inside `place`/`nearbyPlaces`. The real fixture proof (Section 3/26): `canonical-event-govardhan-lifting` is Host-authored, explicitly **not** Approved Canon (`provenance.canonDocIds: []`, `isApprovedCanon: false`) — it appears in `nearbyPlaces[govardhan-path].canonicalPresence`, and `unrealFixtureValidation.test.ts` asserts it **never** appears inside any `UnrealCommand`, because no command carries canonical presence at all today (Section 6). This is not a coincidence to preserve carefully — it is the current, real, already-correct posture: the Canon firewall exists today by simple absence of a leak path, not by an enforced gate. **If `StageCanonicalProjection` (Section 6) is ever implemented, closing that gap must not accidentally open a new leak** — the op's `isApprovedCanon` field must be sourced only from Runtime's own `WorldInstanceCanonicalProjectionState`, never inferred or defaulted `true` by the adapter.

Unreal cannot, and this pack's proposed op deliberately gives it no mechanism to: create canonical events, alter canonical truth, advance canonical state independently, infer sacred meaning beyond the literal `status`/`isApprovedCanon` fields it's handed, or silently promote Host-authored content (`isApprovedCanon: false`) to look Canon-approved in presentation. Provenance fields Unreal should preserve/log verbatim if it ever logs canonical events at all: `canonicalEventId`, `status`, `isApprovedCanon` — and, if `StageCanonicalProjection` is built, `activationId` and `canonDocIds` from the source `WorldInstanceCanonicalProjectionState`/`CanonicalEventProvenance`.

---

## 20. Visitor intent return path

The real, complete union — 5 variants, no more (`interactionIntent.ts:17-84`):

| Unreal input (illustrative) | `InteractionIntent` variant | Runtime validation | Consequence |
|---|---|---|---|
| Player walks into a region's trigger volume | `{ type: "visit-location", userId, worldId, locationId }` | `isWellFormedInteractionIntent` (structural) + `validateInteractionIntent` (worldId matches definition, locationId exists in the world graph) | `ArrivalDecision` recomputed; next snapshot reflects new `place` |
| Player interacts with a `CreateInteractionAnchor`-spawned prop | `{ type: "select-encounter", userId, worldId, locationId, ruleId }` | Same + `ruleId` required | Encounter realization pipeline runs; may produce a `WorldEvent`/`HistoricalMarker` |
| Player opens a reflection UI at a reflection-capable location (Yamuna) | `{ type: "begin-reflection", userId, worldId, locationId, reflectionId, content? }` | Same + `reflectionId` required | Recorded via the private-reflection Host service; increments `visitor.reflectionCount` |
| Player exits the play session | `{ type: "leave-world", userId, worldId }` | Structural only | World continues ticking unattended (Section 18) |
| Player (re-)enters | `{ type: "enter-world", userId, worldId }` | Structural only | Triggers the arrival/orientation composition for this visitor |

**Unreal cannot directly mutate world truth** — every one of these 5 variants is a request, validated and applied entirely inside Runtime; the Bridge only ever learns the result on its next poll (Section 7/8). No 6th variant exists for, e.g., directly moving an entity or changing environment state from the client — by design, matching the architectural law.

---

## 21. Versioning

**Confirmed gap, stated plainly:** none of `WorldExperienceSnapshot`, `WorldEmbodimentDelta`, `InteractionIntent`, or `UnrealCommand` carries any version field today — no `schemaVersion`, no `version`, nothing. `embodiment.worldVersion` is the only version-shaped field reachable from the top-level snapshot.

Two **existing, real, deliberately-separate** versioning axes elsewhere in the codebase, worth aligning with rather than inventing a third:
```ts
export interface Versioned { schemaVersion: number }
export interface VersionedDefinition { version: number }
```
(`packages/runtime-contracts/src/version.ts:1-16`) — plus `ExperienceDescription.schemaVersion`, validated as the **string** literal `"1.0.0"` (`renderer-contracts/src/validation.ts:31-33`), which is inconsistent in *type* with the `number`-typed convention above. Any new version field this pack's follow-up work introduces should pick one of these two existing conventions explicitly and say which, rather than adding a third shape.

**Proposed compatibility rules** (new — there is no existing precedent to align beyond the two axes above, since neither one is wired to any of the wire-transport types yet):
- Same major → compatible, apply as normal.
- Unknown required field present in a newer payload → ignore it safely (never crash on an unrecognized key).
- New optional field → ignore safely if unrecognized (moot today, since Section 3 confirmed zero optional fields exist — this rule only matters once a version bump actually adds one).
- Minor version behind → apply as normal; the Bridge should log, not block.
- Major version mismatch (once a version field exists) → **resync**: discard local state, re-run the Section 8 handshake from step 4.
- Today, with no version field at all: the Bridge has no signal to detect a breaking schema change other than a `SnapshotDecoder` structural-parse failure (Section 22).

---

## 22. Error / recovery model

No adapter-specific error taxonomy exists yet (there is no adapter yet). This section is new, explicitly proposed rather than documented pre-existing behavior — grounded in the real error types Runtime's own persistence layer already raises (`StaleWorldStateVersionError`, `LeaseConflictError`, `WorldNotFoundError`, `IncompatibleWorldDefinitionError`, `CorruptCheckpointError`, `packages/world-persistence-contracts/src/index.ts:20-39`), which an adapter may see surface as an HTTP error response even though it should never construct or catch them directly.

| Error class | Log? | Retry? | Resync? | Fallback? | Block? |
|---|---|---|---|---|---|
| Transport unavailable | Yes | Yes, backoff | No | Fixture mode if configured (Section 23) | Only if no fixture configured |
| Invalid JSON | Yes | Yes (assume transient) | No | No | No, unless repeated N times |
| Schema/structural mismatch | Yes, loudly | No (won't self-correct) | **Yes** — treat as a version signal even without a real version field | No | Yes, until an operator updates the adapter |
| Unknown semantic ID (region/entity references an ID never seen in `CreateRegion`) | Yes | No | No | Skip that one command, continue applying the rest | No |
| Missing renderer profile / asset-registry miss (Section 13) | Yes | No | No | **Yes** — render a clearly-marked placeholder, never silently drop the entity/region | No |
| Asset load failure | Yes | No | No | Same placeholder fallback | No |
| Stale tick (Section 8 step 10) | Yes (debug only) | N/A | No | Discard the stale payload | No |
| Out-of-order update | Yes | No | No | Discard | No |
| Runtime restart (worldInstanceId still resolves but tick jumps backward) | Yes | No | **Yes** — full resync from Section 8 step 4 | No | No |
| `worldInstanceId` mismatch (response doesn't match request) | Yes, loudly | No | **Yes** | No | Yes, until resolved |
| Renderer exception (Unreal-side crash while applying a command) | Yes | No | No | Skip the offending command, keep polling | **No — must never propagate to or block Runtime** |

**Critical rule, restated because it's the one that matters most:** a renderer failure must never corrupt Runtime truth. Nothing in this pack's proposed model gives the Bridge any write path except the 5 `InteractionIntent` variants (Section 20) — there is structurally no way for a rendering bug to reach persisted state, only to produce a bad player-facing frame.

---

## 23. Offline / fixture mode

The two fixtures committed at `docs/fixtures/unreal/` (Sections 3-4) are exactly this mode's payloads. **Fixture mode must use the identical `SnapshotDecoder` as live mode** — there is no separate fake-renderer path proposed anywhere in this pack; the only difference is which `RuntimeTransport` implementation feeds the decoder (a file read vs. an HTTP poll). This mirrors the discipline this pack's own validation test already follows: `unrealFixtureValidation.test.ts` feeds the fixtures through the same real `translateToUnrealCommands` a live snapshot would go through, not a parallel test-only code path.

Purpose, unchanged from the mission brief: works with no Runtime endpoint reachable; deterministic editor testing; schema development against real shapes; automation (CI could run a headless Bridge against these fixtures with zero network access).

---

## 24. First Vrindavan integration test

**Input:** `GET /api/dev/account/living-vrindavan/experience-snapshot?world_instance_id=living-vrindavan` (Section 7), or `docs/fixtures/unreal/living-vrindavan.snapshot.example.json` in fixture mode for a UE-less dry run today.

**Expected Unreal output, first pass:**
- A coordinate frame at Section 10's ~500m × 500m scale, origin at the Domain root.
- 4 semantic Patch/Place placeholders bound to `vrindavan-entry`, `yamuna`, `kadamba-grove`, `govardhan-path` (never a 5th).
- A Yamuna placeholder distinguished as the hub (the only `reflectionCapable` location).
- Cow placeholder(s) at `yamuna` (`avatark-population-cow-1`/`-2`), bird-flock placeholder at `kadamba-grove` (`avatark-population-bird-flock-1`).

**Then:** Runtime advances from Vasanta toward Grīṣma (or otherwise changes known state — the real mechanism is Sprint 20's wake/catch-up tick advance, not something this pack triggers). Unreal receives the later state via its next poll. **Only targeted representation changes** apply — per Section 5, this means either a fresh `translateToUnrealCommands` full re-render (acceptable, if simpler) or, if the Bridge kept a prior `WorldEmbodimentSnapshot` to diff against, a `WorldEmbodimentDelta`-driven update via `translateEmbodimentDeltaToUnrealCommands` (no full-world rebuild). Both are real, valid, already-existing code paths — Section 5 flagged that they emit *different* op shapes for the same environment change, so the Bridge must handle both regardless of which path is chosen operationally.

**Then:** send one `visitor.select-encounter` intent at `yamuna-flowering-reflection`. Leave (`leave-world`). Advance the world (time passes; Runtime ticks unattended). Return (`enter-world`). Expected: `ArrivalDecision.reason === "RETURNING_TO_PRIOR_PLACE"`, `worldChangedSinceLastVisit === true`, and `ReturnRecognitionFact[]` populated — Section 18's flagship sequence, now concretely at Yamuna.

---

## 25. First Forest integration test

**Input:** `docs/fixtures/unreal/living-forest-f01.snapshot.example.json` (fixture mode — there is no live HTTP route for Forest yet, Section 4's honest gap).

**Proves, using the SAME bridge:** no new transport (still `RuntimeTransport` reading a file or, once built, an HTTP poll of the same shape); no new decoder (still `SnapshotDecoder` parsing `WorldExperienceSnapshot`); no Forest-specific adapter branch anywhere in `WorldRegionManager`/`EntityRenderer`/`InteractionBridge`; no new core snapshot schema (still the exact same TypeScript interface, verified by the exact same `tsc --noEmit` and the exact same `translateToUnrealCommands` call in `unrealFixtureValidation.test.ts`).

**Only content/layout/asset-registry mappings differ:** a `LivingForestPatchLayout` table instead of `VrindavanPatchLayout` (Section 10); `DA_EntityArchetype_Deer` instead of `DA_EntityArchetype_Cow` (Section 13); 3 places instead of 4 (Section 14). This is the concrete proof that StudioK is a world platform, not a Vrindavan engine — the exact claim Section 4 makes with a passing test behind it, not just prose.

---

## 26. Test harness plan

**What this pack actually implemented** (`lib/livingWorldExperience/unrealFixtureValidation.test.ts`, part of this repo's real `node --experimental-strip-types --test` suite, added to `package.json`'s `test` script):
- Structural/type-level decode: both fixtures assign to `WorldExperienceSnapshot` and pass `tsc --noEmit` (unknown/mismatched fields would fail the build).
- Identity mapping: asserts the exact 4 Vrindavan place IDs and the exact 3 Forest place IDs, no more, no fewer.
- Real-function translation: both fixtures' `embodiment` run through the actual `translateToUnrealCommands`, asserting real, non-empty, correctly-shaped output (`CreateRegion`, `PlaceEntity` for every known entity, `CreateInteractionAnchor` for a known encounter).
- Canon-firewall proof: asserts the non-Canon `canonical-event-govardhan-lifting` id never appears inside any produced `UnrealCommand`.
- Closed-vocabulary check: every `ReturnRecognitionFact.type` in both fixtures is a real value from the type's own union.

**What this pack deliberately did NOT implement, and why** (no zod/ajv/schema-validator infrastructure exists anywhere in this repository — confirmed by grep; building one would be a new core-contracts change, out of this pack's docs-and-fixtures-only mandate):
- Unknown-field tolerance, version mismatch, snapshot/delta ordering, duplicate-update idempotency, missing-asset-profile fallback, and renderer-failure isolation are all **Unreal Bridge-side** behaviors (Section 22) that cannot be meaningfully tested until the Bridge exists — they're specified in this pack, not implemented, because there's nothing to test yet.
- Leave/return sequence: already has real, passing coverage elsewhere in this same repo (`lib/livingWorldExperience/vrindavanFlagshipLeaveReturn.test.ts`, `lib/livingForest/livingForestVerticalSlice.test.ts`) — this pack's fixtures were deliberately built to mirror those exact real scenarios (Section 4/18) rather than duplicate their test coverage under a new name.

---

## 27. Acceptance matrix

Every row is graded against what is **actually true today**, not what will be true once UE 5.8 exists — no row below claims a live Unreal run that did not happen.

| # | Statement | Status |
|---|---|---|
| A | Initial snapshot accepted | **PROVEN (fixture)** — `unrealFixtureValidation.test.ts` |
| B | Identity table built | **PROVEN (fixture)** — same test asserts exact ID sets |
| C | Four Vrindavan places bound | **PROVEN (fixture)** |
| D | Forest F01/NW/P01-P03 binds through same decoder | **PROVEN (fixture)** — same `WorldExperienceSnapshot` type, same `translateToUnrealCommands` call |
| E | Environment state decoded | **PROVEN (fixture)** — `UpdateEnvironment` present in translated output for both |
| F | Entities decoded | **PROVEN (fixture)** — `PlaceEntity` present for every known entity, both worlds |
| G | Group state decoded | **PARTIAL** — `groupId` decodes onto entities (proven); `SetGroupIntent` itself is untested here, since its only real entry point (`translateGroupIntentToUnrealCommands`) takes a hand-built input this pack did not construct (Section 6 gap) |
| H | Canonical presence gated correctly | **PROVEN (fixture)** — asserted absent from `UnrealCommand` output |
| I | One delta applied | **NOT TESTED** — no delta-specific fixture/test built in this pack; `translateEmbodimentDeltaToUnrealCommands` itself has pre-existing coverage elsewhere in the repo, not exercised here |
| J | Stale delta rejected | **DESIGN ONLY** (Section 22) — no code exists to test |
| K | Duplicate delta idempotent | **DESIGN ONLY** — same |
| L | Visitor intent emitted | **NOT APPLICABLE YET** — no Bridge exists to emit one; the 5 real `InteractionIntent` variants and their validation are proven elsewhere in this repo's own test suite |
| M | Consequence observable | Same as L |
| N | Leave/return continuity | **PROVEN, but by pre-existing repo tests, not new ones** — `vrindavanFlagshipLeaveReturn.test.ts`, `livingForestVerticalSlice.test.ts`; this pack's fixtures mirror those exact scenarios (Section 18/24/25) |
| O | ReturnRecognition/PlaceContinuity surfaced | **PROVEN (fixture)** — both fixtures carry real, non-empty `ReturnRecognitionFact[]` matching the real test scenarios they're drawn from |
| P | Renderer failure isolated | **DESIGN ONLY** (Section 22) — no Bridge exists to fail |
| Q | Asset registry replacement works | **DESIGN ONLY** (Section 13) — no registry built yet |
| R | Runtime contains zero Unreal asset references | **PROVEN** — confirmed clean by direct grep across every embodiment/spatial-ecology/definition file, restated in Section 13 |

---

## 28. Deliverables

- `docs/STUDIOK_UNREAL_58_INTEGRATION_CONTRACT_PACK.md` (this document)
- `docs/fixtures/unreal/living-vrindavan.snapshot.example.json`
- `docs/fixtures/unreal/living-forest-f01.snapshot.example.json`
- `docs/fixtures/unreal/README.md` (fixture provenance — what's real vs. hand-composed, field by field)
- `lib/livingWorldExperience/unrealFixtureValidation.test.ts` (new — genuinely exercises real repo code against both fixtures)
- One-line addition to `package.json`'s `test` script registering the new test file (no other change to that file)

No `.uasset`, `.umap`, or any binary asset. No new core contract type. No modification to any file under `packages/*-contracts` or `packages/*-runtime`.

---

## 29. Git discipline

Branch: `feature/studiok-unreal-integration-contract-pack`, created from `feature/studiok-living-world-kernel-vertical-slice` @ `23fa307` in an isolated worktree (`/home/user/workspace/avatark-platform-web-unreal-contract-pack`) — the source worktree for that branch was never modified. No Build 01-06 branch, no RC3 branch, no Unreal/GPU-handoff branch, and no prior kernel-vertical-slice commit was touched. Only the 5 files in Section 28 were added or changed.

---

## 30. Summary

See the chat response accompanying this pack for the full 15-point final report. In brief: the snapshot is `WorldExperienceSnapshot` (already embedding `WorldEmbodimentSnapshot`) — no new type introduced. Transport is the existing dev/production poll routes (Section 7), no push transport fabricated. The 11-op `UnrealCommand` union is real and fully emitted, but split across 3 uncoordinated functions with a genuine environment-op-shape inconsistency (Section 5/6) and a real, product-relevant canonical-projection gap (Section 6/19). Identity is 100% plain-string, with `VisitorId`/standalone `EncounterId`/`CanonicalEventId` types confirmed absent (Section 9). Both sample payloads are real-ID-grounded and pass both `tsc --noEmit` and a real translation through unmodified repo code (Section 26). The biggest genuine blocker for a real UE 5.8 build is not anything in this pack — it's the still-pending GCP Windows/NVIDIA workstation.
