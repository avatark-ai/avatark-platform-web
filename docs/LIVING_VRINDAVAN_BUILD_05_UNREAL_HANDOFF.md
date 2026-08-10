---
status: DOCS-ONLY -- no Unreal project, no implementation, no purchase, no core-Runtime change
base: feature/living-vrindavan-build-04 @ 20abf24 (Builds 01-04, all CLOSED, verified against origin)
reconciles: feature/living-vrindavan-unreal-58-fab-readiness @ 2fcb3a3 (see LIVING_VRINDAVAN_UNREAL_58_READINESS_RECONCILIATION.md)
branch: feature/living-vrindavan-build-05-gpu-handoff
---

# Living Vrindavan Build 05 -- Unreal 5.8 GPU Handoff

Build 05 is the **first real Unreal 5.8 world embodiment / greybox**. Its first implementation
session happens on a future Windows/NVIDIA GPU workstation, not this one. This document is the
exact preparation for that session: what changed since the pre-Build-04 readiness package, the
smallest real end-to-end proof to build, the exact ordered runbook, the asset-shopping gate, and
objective acceptance criteria. Nothing executable is created here.

See `docs/LIVING_VRINDAVAN_UNREAL_58_READINESS_RECONCILIATION.md` for the full section-by-section
reconciliation of the prior readiness package. This document assumes that reconciliation's
conclusions and does not repeat its evidence in full.

---

## 1. Build 04 reconciliation, summary

(Full detail: reconciliation doc §1.)

1. **Production embodiment richness** -- still open, unaffected by Build 04. An Unreal client
   through the production translator path still receives Sprint 8-level richness only.
2. **Runtime transport** -- partially established. A real, dev-only, unauthenticated HTTP+JSON
   route (`GET /api/dev/account/living-vrindavan/experience-snapshot`) now exists and is usable as
   a poll-based fixture by any HTTP client, including an Unreal `HttpModule` client. No push
   transport, no non-browser production auth.
3. **`worldInstanceId` convention** -- confirmed stable and pre-existing: `'living-vrindavan'`
   (`WORLD_ID` constant), reused by Build 04, not reinvented.
4. **Experience snapshot shape** -- `WorldExperienceSnapshot` (arrival, orientation, place
   continuity, nearby places, recent world changes, plus the exact unmodified
   `WorldEmbodimentSnapshot` as `embodiment`) is real, tested, and is the object Unreal should
   consume. Everything outside `embodiment` is real but renderer-neutral with no rendering
   decision made yet.
5. **`UnrealCommand` coverage** -- confirmed still insufficient for Patch/Route/Place-Continuity/
   Orientation/`ReturnRecognition` presentation. Zero code change to `unrealCommand.ts` since
   Build 02. Candidate additive ops are named in §5 below, not implemented.

---

## 2. Old readiness package reconciliation, summary

(Full detail: reconciliation doc §2.) Of the old package's sections: 9 rows STILL VALID unchanged,
2 rows RESOLVED (fully or partially), 3 rows SUPERSEDED (transport-dependent bridge/checklist
details), 1 row DEFERRED (embodiment-path convergence, correctly not attempted), 0 rows BLOCKED.
No STOP gate (old §P) has been triggered. The repository plan (§B), LFS policy (§C), greybox plan
(§E), World Partition plan (§F), PCG plan (§G), Yamuna plan (§H), asset matrix (§I), marketplace
framework (§J), and asset registry design (§K) all carry forward **unchanged** into this document
(§7-§8) rather than being re-derived -- Build 04 introduced no fact that bears on any of them.

---

## 3. Build 05 architecture

```
Runtime truth (Sprint 1-20 + Build 01-04 onion, real, unmodified)
        |
        v
World/Experience snapshot                      <- composeVrindavanWorldExperienceSnapshot
  { arrival, orientation, place, nearbyPlaces,     (real, tested; embodiment field is the
    recentWorldChanges, embodiment }               EXACT unmodified WorldEmbodimentSnapshot)
        |
        v
Unreal semantic bridge (NEW, this build, engine-side only)
  - ConnectionManager: polls the dev experience-snapshot route (§1.2) in Build 05;
    push transport and production auth remain future work, not this build's scope
  - translateToUnrealCommands / translateEmbodimentDeltaToUnrealCommands (Build 02,
    UNCHANGED, real) for the `embodiment` field
  - direct read of place/orientation/arrival fields for anything the greybox chooses
    to represent WITHOUT a command op (see §5 -- no op exists yet for these)
        |
        v
500m x 500m Living Vrindavan greybox (§6)
        |
        v
4 real Patch/Local Place representations
  (patch-vrindavan-entry / patch-yamuna / patch-kadamba-grove / patch-govardhan-path,
   1:1 with place-vrindavan-entry / place-yamuna / place-kadamba-grove / place-govardhan-path)
        |
        v
Yamuna placeholder (hub of the real hub-and-spoke topology)
        |
        v
real seeded entity placeholders (2 cow, 2 bird-flock -- real archetype ids,
  avatark-population-cow-1/-2 and avatark-population-bird-flock-1/-2)
        |
        v
one real WorldEmbodimentDelta -> targeted Unreal update, no full rebuild
        |
        v
visible Unreal change
        |
        v
one real visitor InteractionIntent -> dispatchInteractionIntent (Sprint 8, unchanged)
        |
        v
Runtime consequence (real, persisted)
        |
        v
leave (visitor session ends)
        |
        v
return (new session, same worldInstanceId/userId)
        |
        v
Place Continuity / ReturnRecognition visible in the NEW WorldExperienceSnapshot
  (real Build 04 fields: place.returnRecognition-carrying history, territoryPressures,
   routeStates -- now surfaced, per Build 04's own highest-leverage fix)
```

**Runtime <-> Unreal boundary** (unchanged invariant from every prior build, restated because it
is the single most important property of this whole plan):

- Unreal never becomes authoritative world truth. No Actor GUID, World Partition cell, PCG seed,
  or save-game state is ever written back into Runtime.
- Entity position is never reported back continuously; Runtime only ever learns arrival at a
  `locationId` via the next snapshot.
- Streaming visibility (an unloaded World Partition cell) is never semantic presence
  (`PatchState.presentEntityIds`).
- No `UObject`/`AActor`/Blueprint-specific type is ever introduced into
  `packages/world-embodiment-*`, `packages/world-experience-*`, `packages/renderer-contracts`, or
  any `lib/*` Host file. If Build 05 implementation discovers a need for one, that is a STOP
  condition (§9), not a workaround to build around.

---

## 4. Build 05 exact implementation sequence

Ordered for the first real Unreal session, once the GPU workstation exists. Steps 1-6 restate the
prior package's own §M largely unchanged (repository/tooling setup does not depend on Build 04).
Steps 7 onward are updated where the reconciliation (§1-§2 above) changed what is actually known.

01. Install/verify Unreal Engine 5.8 (§8).
02. Install/verify the Visual Studio toolchain Unreal 5.8 requires (§8).
03. Install Git + Git LFS; run `git lfs install` before any clone.
04. Create the `living-vrindavan-unreal` repository (name and topology per §7 -- create it at
    this step, not before; per old-package STOP gate item 8, name in the repo's own first commit
    whether the `StudioKWorldCore` shared-plugin question was resolved or consciously deferred).
05. Establish `.gitattributes`/`.gitignore` (§7) BEFORE the first binary is committed.
06. Create `LivingVrindavan.uproject` (per §7's topology).
07. Create the `StudioKVrindavanRuntime` plugin skeleton (self-contained unless StudioK governance
    has by then extracted `StudioKWorldCore`).
08. Establish the Runtime/local-fixture connection: point the plugin's `ConnectionManager` at
    `GET http://<host>/api/dev/account/living-vrindavan/experience-snapshot?world_instance_id=living-vrindavan`
    -- this is now a REAL, tested route (§1.2), not a hypothetical fixture; no static JSON file
    needs to be hand-authored first, though one may be cached for offline iteration.
09. Ingest the first real `WorldExperienceSnapshot` payload; parse `embodiment` with the existing,
    unmodified `translateToUnrealCommands` logic ported/re-implemented on the Unreal side (the
    TypeScript function itself is not portable into Unreal C++; its INPUT/OUTPUT shapes are the
    real contract to port against).
10. Establish the 500m x 500m coordinate frame (origin at `vrindavan-domain`'s Sector, +X
    downstream per Yamuna's real orientation, +Y bank-to-shore, +Z up, float precision).
11. Establish World Partition (default grid cell, no pre-subdivision -- §7/old-package §F).
12. Create four semantic Patch volumes: `patch-vrindavan-entry`, `patch-yamuna`,
    `patch-kadamba-grove`, `patch-govardhan-path` (real ids, `lib/spatialEcology/vrindavanSpatialDefinition.ts`),
    each containing its own real 1:1 Local Place (`place-vrindavan-entry` etc.).
13. Create the Yamuna placeholder (primitive geometry/Water System stub, centered at
    `patch-yamuna`, the real topological hub -- every path routes through it).
14. Create paths/topology: exactly 3 edges (`vrindavan-entry<->yamuna`, `yamuna<->kadamba-grove`,
    `yamuna<->govardhan-path`), 1 Route (`route-govardhan-path`) -- no 4th edge, ever (Canon-confirmed,
    immutable; a 5th edge or Place is STOP gate §9.5).
15. Create the visitor spawn at `vrindavan-entry` (`entryLocationId`, real, confirmed by
    `vrindavanVisitorEntryNavigation.test.ts`).
16. Create cow/bird placeholders: 2 cow instances (`avatark-population-cow-1`/`-2`) and 2
    bird-flock members (`avatark-population-bird-flock-1`/`-2`, real seeded ids) -- primitive
    geometry, positioned per the snapshot's real `EntityPresentation.locationId`.
17. Process one real `WorldEmbodimentDelta` end to end: trigger a real Runtime change (e.g. via
    the dev `advance-clock` or `persistence/advance` route), re-poll the snapshot, diff against the
    previous one, apply ONLY the changed entity/region state -- no full scene rebuild.
18. Process `WorldExperienceSnapshot`/continuity information: read `place`/`arrival`/`orientation`
    fields directly (no `UnrealCommand` op exists for these yet, §5) and make ONE deliberate
    rendering decision for how the greybox represents at least one of them (e.g. a debug-text
    overlay of `orientation.whatHasChanged`, or a placeholder marker at each `nearbyPlaces` entry)
    -- explicitly a greybox-author decision, not a Runtime or Host-layer one.
19. Emit one real `InteractionIntent` (e.g. `VisitLocationIntent`) from the Unreal client via the
    dev `POST /api/dev/account/living-vrindavan/interact` route; confirm it reaches
    `dispatchInteractionIntent` unchanged and produces a real, persisted Runtime consequence.
20. Perform the leave/return continuity proof: end the session (stop polling), advance the
    Runtime clock independently (simulate real elapsed time via the dev clock-advance route),
    reconnect with the SAME `worldInstanceId`/`userId`, re-fetch the snapshot, and confirm
    `arrival.worldChangedSinceLastVisit` and/or `place`'s carried `ReturnRecognition` facts are
    both present in the payload AND visibly represented in the greybox (per step 18's own
    decision) -- this is the step Build 04 made real that the old readiness package could only
    gesture at.
21. Verify deterministic replay: the SAME snapshot payload, re-ingested a second time, produces
    the IDENTICAL Unreal-space transform/state -- no per-session randomization of placement.
22. Capture screenshots/logs of every step above, particularly steps 17 (visible delta) and 20
    (visible continuity).
23. Commit the first LFS-safe Unreal state to `living-vrindavan-unreal` -- LFS already active,
    `.gitattributes` already verified against actual committed binary types.

This is the smallest real end-to-end proof, matching every prior build's own "prove the mechanism,
not exhaust the design space" discipline. It is not full Build 05 scope.

---

## 5. `UnrealCommand` extension candidates (named, NOT implemented)

Per §1 item 5 and the reconciliation document, these are candidates for a FUTURE additive
extension to `packages/world-embodiment-contracts/src/unrealCommand.ts`, following the exact
precedent Sprint 10 already set (`MoveEntityToRegion`/`SetGroupIntent` added to Sprint 8's
original four ops). **None of these should be implemented until Build 05's greybox work actually
needs one and the exact shape is proven against real usage** -- naming them here is reconnaissance
for that future work, not a design commitment:

| Candidate op (illustrative name, not final) | Would carry | Backing contract |
|---|---|---|
| `UpdatePatchEcology` | `PatchState.ecologicalPressure`/`vegetationCondition` at Patch granularity | `packages/spatial-ecology-*` |
| `SetRouteState` | `RouteState` (open/closed/congested) for the one real Route | `resolveRouteState`, Sprint 16 |
| `StageCanonicalProjection` | Canon-safe canonical presence (with the `canonDocIds` provenance caveat carried through) | `WorldInstanceCanonicalProjectionState`, Sprint 18 |
| `UpdateGroupCohesion` | Population/social/rhythm detail beyond `SetGroupIntent`'s cohesion scalar | `getEmbodimentWithCanonicalEvents` composed chain |
| (no op proposed) | `ReturnRecognition`, Orientation | These may not belong as spatial-engine commands at all (§1.5) -- more likely a HUD/UI-layer read of the snapshot field directly. Flag this as an open design question for whoever builds step 18 above, not a gap to fill reflexively with a new op. |

STOP gate §9.7 applies: if the real translator proves insufficient AND the fix would require
Runtime redesign rather than an additive variant, stop and report rather than working around it.

---

## 6. Greybox specification

Unchanged from the old readiness package's §E, re-verified against current source (all ids,
counts, and topology facts confirmed live in this reconciliation, not merely re-cited):

- ~500m x 500m, primitive geometry only.
- 4 Patch volumes at the real hub-and-spoke layout: `yamuna` central; `vrindavan-entry`/
  `kadamba-grove`/`govardhan-path` each reachable only via `yamuna`; no direct edge between
  Kadamba Grove and Govardhan Path.
- Yamuna: simple spline/flat plane along the real riverbank orientation (+X downstream).
- Visitor spawn: single marker at `vrindavan-entry`.
- Entities: 2 cow primitives (`avatark-population-cow-1`/`-2`) at `yamuna`, 2 bird-flock
  primitives (`avatark-population-bird-flock-1`/`-2`) at `kadamba-grove` -- the real seeded
  population, never fabricated for the demo.
- One environmental state difference: a visible parameter change between Vasanta and Grishma at
  `yamuna` (`hydrologyCondition: moderate` vs `low`) -- the one real season pair Canon authorizes
  today.
- Flat baseline elevation (`z=0`) for all four Local Places -- no invented elevation claim.

No production art (§8).

---

## 7. Repository, LFS, and asset-registry design (carried forward unchanged)

Full detail in the old readiness package §B/§C/§K (STILL VALID per reconciliation §2) --
restated here only as a pointer, not re-derived:

- Dedicated `living-vrindavan-unreal` repository (not binaries in `avatark-platform-web`, not a
  monorepo merge).
- Content organized BY REGION, Source organized BY SYSTEM, mirroring Living Symphony's real
  `folder-standards.md` precedent.
- Git LFS by extension (`.uasset`, `.umap`, `.fbx`, `.wav`, `.flac`, `.png`, `.tga`, `.exr`,
  `.psd`, `.ttf`, `.otf`, `.mp4`, `.mov`); `.gitignore` for `Binaries/`/`Intermediate/`/`Saved/`/
  `DerivedDataCache/`.
- Asset registry: `semantic concept (Runtime-emitted) -> Unreal-side Data Asset registry (NEW,
  content-layer only) -> renderer asset`. Runtime never knows a `.uasset` path, Niagara system
  path, material instance, or skeletal mesh reference -- independently re-verified clean in this
  reconciliation (zero such reference anywhere in `packages/world-embodiment-*`,
  `packages/world-experience-*`, `packages/spatial-ecology-*`, or any `lib/*Definition.ts` file).

```
Runtime semantic
    |
    v
Unreal Asset Registry
    |
    v
Fab/custom asset
```

Never `Runtime semantic -> Fab asset path` directly.

---

## 8. GPU workstation runbook

Checklist for the future Windows/NVIDIA workstation -- nothing provisioned by this document:

- [ ] Windows (version matching Unreal 5.8's stated minimum support -- verify at install time)
- [ ] NVIDIA RTX vWS/display driver (version matching Unreal 5.8's release notes at install time)
- [ ] Unreal Engine 5.8 (Epic Games Launcher or source build)
- [ ] Visual Studio toolchain (version Unreal 5.8 requires -- verify at install time)
- [ ] Git
- [ ] Git LFS (`git lfs install`, verified BEFORE first clone)
- [ ] Epic/Fab account access for whoever will be shopping (§10) or authoring content
- [ ] Disk layout: dedicated volume/path for the Unreal project + `DerivedDataCache`
- [ ] Project workspace location decided (mirror this repo family's worktree convention where
      practical, adapted for Windows)
- [ ] Repo credentials (SSH key or PAT) provisioned for `living-vrindavan-unreal` once it exists
- [ ] Network connectivity test: confirm the workstation can reach this repository's dev server
      (`GET /api/dev/account/living-vrindavan/experience-snapshot`) over the network -- this is
      now a concrete, testable connectivity check (§1.2), not a placeholder item

Exact ordered procedure once the above is provisioned: §4, steps 01-23.

---

## 9. Asset procurement gate

**GREYBOX FIRST -> SHOP SECOND, unchanged.** Nothing purchased by this document or session.

Priority categories (carried forward from the old readiness package §I, re-verified unchanged by
Build 04):

- **P0** cattle + cattle animation -- highest genuine schedule risk, named consistently across
  three builds now (Build 02 Phase 0, the old readiness package, this document). A real,
  load-bearing, always-visible entity with no adequate long-term placeholder path. Flag to
  whoever owns asset procurement FIRST.
- **P1** terrain/ground materials (riverbank mud/grove soil/path dirt/threshold ground)
- **P1** riverbank vegetation (reeds, riverside grasses)
- **P1** Kadamba/grove vegetation (named-species authenticity pass -- Medium cultural sensitivity)
- **P1** grass/ground cover
- **P1** bird/flock representation (impostor/particle-viable even long-term, lower risk than
  cattle)
- **P2** atmospheric VFX (mist, dust, light shafts)
- **P2** environmental audio (river/grove/wind/pastoral motifs)
- **P3** ambient props (rural dressing)

**Trigger** (unchanged):

```
Unreal project boots
    -> Runtime Bridge connects (real dev fixture, §1.2 -- production transport still TBD)
    -> 500m x 500m greybox exists (§6)
    -> Yamuna/place alignment proven
    -> PCG parameter path proven
    -> exact gaps visible
    -> THEN shop
```

Cattle/bird category browsing (not purchasing) and Water System technique research MAY start
early, per the old readiness package's own §L -- no commitment cost. Everything else waits for the
greybox's own silhouette to exist.

---

## 10. Build 05 acceptance matrix

| Gate | Statement | Pass condition |
|---|---|---|
| A | Runtime snapshot received | Unreal client successfully ingests one real `WorldExperienceSnapshot` from the dev route |
| B | Deterministic semantic->Unreal mapping | Same snapshot, re-ingested, produces identical transform/state (step 21) |
| C | Four authorized places represented | `patch-vrindavan-entry`/`patch-yamuna`/`patch-kadamba-grove`/`patch-govardhan-path`, no 5th |
| D | Approved topology preserved | Exactly 3 edges + 1 Route, hub-and-spoke through `yamuna`, no Kadamba-Grove<->Govardhan-Path edge |
| E | Yamuna represented | Placeholder present at `patch-yamuna`, correct orientation |
| F | Entity placeholders bound to stable semantic IDs | 2 cow (`avatark-population-cow-1`/`-2`) + 2 bird-flock (`avatark-population-bird-flock-1`/`-2`), bound by string id, never an Actor GUID round-tripped to Runtime |
| G | One delta causes targeted visual change | Step 17: a single `WorldEmbodimentDelta` produces exactly the corresponding visible change |
| H | No full-world rebuild required for delta | Confirmed by inspection/log: only the changed entity/region updates, scene not reloaded |
| I | Visitor intent reaches Runtime | Step 19: `InteractionIntent` reaches `dispatchInteractionIntent` unchanged |
| J | Runtime consequence persists | The consequence is present in a SUBSEQUENT snapshot fetch, not just the immediate response |
| K | Visitor leaves | Session/polling stopped; Runtime clock advances independently |
| L | Visitor returns | New session, same `worldInstanceId`/`userId`, fresh snapshot fetched |
| M | `ReturnRecognition`/Place Continuity observable | Step 20: `arrival.worldChangedSinceLastVisit` and/or carried `ReturnRecognition` facts present in the payload AND visibly represented in the greybox per step 18's own rendering decision |
| N | Unreal remains non-authoritative | No Runtime write path exists other than `InteractionIntent`; confirmed by inspection, not merely assumed |
| O | No Unreal-specific type leaks into renderer-neutral Runtime | `packages/world-embodiment-*`, `packages/world-experience-*`, `packages/renderer-contracts`, all `lib/*` Host files grepped clean of `UObject`/`AActor`/Blueprint references |
| P | No invented Canon | All represented facts (topology, seasons, population counts, hydrology band) cited to real, Approved source; any new visual decision (step 18) carries no invented Canon claim |
| Q | LFS/source-control policy verified | `.gitattributes`/`.gitignore` in place and exercised BEFORE the first real binary commit (step 23) |

---

## 11. Risks

1. **Cattle asset risk** (named three builds running) -- the one category with no adequate
   long-term placeholder; start research early (§9), do not let it become a late-discovered
   blocker.
2. **Transport remains poll-based** -- if Build 05's greybox work reveals a genuine need for
   push-based delta delivery (e.g. multi-client sync), that is new scope beyond this handoff's
   proof, not something to improvise inside the greybox session.
3. **Production auth gap** -- the dev fixture route has no auth; if Build 05 (or a later build)
   needs a real signed-in visitor's data in Unreal, a non-browser auth story must be designed
   first (out of scope here).
4. **`UnrealCommand` extension temptation** -- concrete candidates now exist (§5); resist
   implementing them speculatively before the greybox's own step 18 proves which one is actually
   needed first.
5. **Two-embodiment-paths debt inherited, not created** -- Build 05 will only ever receive
   Sprint-8-level richness through the production route until a future build retires this finding;
   the dev route's richer `WorldExperienceSnapshot` is a workaround for greybox development, not a
   production-path fix.

---

## 12. STOP gates (carried forward, re-verified none triggered)

1. STOP if a future build materially changes `WorldExperienceSnapshot`/`WorldEmbodimentSnapshot`
   shape in a way this document's §1/§5 do not already anticipate as shape-independent.
2. STOP if `worldInstanceId` semantics become unclear (e.g. multi-instance addressing conflicts
   with the Sprint-7-singleton-vs-durable-family split named in §1.1).
3. STOP if a THIRD competing embodiment truth appears, beyond the two already named.
4. STOP if Unreal integration requires a core-Runtime Unreal type
   (`UObject`/`AActor`/Blueprint-specific reference) leaking into any renderer-neutral package or
   Host file.
5. STOP if approved place IDs cannot be reconciled -- a 5th Local Place, a new
   Kadamba-Grove<->Govardhan-Path edge, or any topology fact contradicting the real, Approved
   graph.
6. STOP if Canon fixture provenance becomes ambiguous -- specifically the
   `canonical-event-govardhan-lifting` fixture's Host-authored (not Approved) status, or any new
   canonical-event fixture introduced without the same honest caveat.
7. STOP if the real translator (`unrealCommandTranslator.ts`/`unrealCommand.ts`) proves
   insufficient AND the fix would require Runtime redesign rather than an additive variant.
8. STOP (coordination, not blocking) if `living-vrindavan-unreal` is created before the
   `StudioKWorldCore` extraction question is either resolved by StudioK platform governance or
   explicitly, consciously deferred -- name the choice in the new repository's own first commit.
9. STOP if implementation needs a genuine push transport or non-browser production auth before
   this handoff's own minimal proof (§4) is complete -- that is new scope, not a workaround.

---

## 13. Exact next command for the future GPU workstation

Once the Windows/NVIDIA workstation is provisioned and this repository is cloned there:

```
Follow docs/LIVING_VRINDAVAN_BUILD_05_UNREAL_HANDOFF.md §4 (steps 01-23) in order.
Start by verifying network reachability to:
  GET /api/dev/account/living-vrindavan/experience-snapshot?world_instance_id=living-vrindavan
against this repository's dev server, BEFORE installing Unreal Engine.
```

---

LIVING VRINDAVAN BUILD 05 GPU HANDOFF READY — WAITING FOR WINDOWS/NVIDIA UNREAL 5.8 WORKSTATION
