---
status: implemented, verified
base: feature/living-vrindavan-build-06-phase0-pcg-environment @ af361b5 (Builds 01-06 Phase 0, all CLOSED, verified against origin before this work began)
---

# StudioK Living World Kernel -- Vertical Slice: Architecture & Reconciliation

Living Vrindavan Builds 01-06 Phase 0 are the first fully-realized StudioK Living World. This
document reconciles that real code against the mission's own request -- a renderer-neutral,
SECOND-world proof that Unreal Engine 5.8 will eventually be a physical-embodiment adapter, never
the owner of world truth -- and records exactly what already existed vs. what this vertical slice
adds.

**Architectural law preserved throughout**: `Living World -> Domain -> Sector -> Quadrant -> Patch
-> Microhabitat/Local Place -> Entity` is a StudioK semantic hierarchy, never equated anywhere in
this work with an Unreal World Partition cell, PCG grid, HLOD level, streaming cell, or Landscape
component. Core world state (`SharedWorldState`, `LivingEntityState`, `SpatialGrammar`) is
metric/geospatial-free and renderer-neutral by construction -- confirmed by direct inspection, not
assumed.

---

## 1. What already existed (do not duplicate)

Direct source inspection, before any implementation began, found:

1. **~26 generic `@avatark/*` runtime/contract packages** already implement the full kernel: causal
   environment (`living-systems-*`), spatial addressing (`spatial-ecology-*`), population/behavior
   (`living-population-*`), day-phase/routines (`living-rhythms-*`), relationships
   (`social-ecology-*`), long-horizon evolution (`world-adaptation-*`), encounter realization
   (`encounter-realization-*`), visitor participation (`participation-*`), world/entity memory
   (`world-memory-*`), durable persistence (`world-persistence-*`), renderer-neutral embodiment
   (`world-embodiment-*`), and the richer experience/orientation layer (`world-experience-*`).
2. **Ten of these packages already carry their own `livingForest*Portability.test.ts` fixture**
   (spatial-ecology-runtime, living-population-runtime, participation-runtime, world-memory-runtime,
   world-adaptation-runtime, encounter-realization-runtime, social-ecology-runtime,
   world-persistence-runtime, world-experience-runtime, canonical-event-runtime) -- each
   independently proving its own functions do not hardcode Living Vrindavan identity. **One gap was
   found and closed** (§4): `living-rhythms-runtime` had no such fixture.
3. **No real Host-layer Living Forest world existed anywhere** -- confirmed by exhaustive grep of
   `lib/`, `app/`, and every `packages/*/src/*.ts` (excluding `*.test.ts`): zero non-test reference
   to "Living Forest," "F01," "NW," or "P01" as a world identity. Every `lib/*Definition.ts` and
   `lib/*/hostService.ts` file in the repository is Vrindavan-wired, most at MODULE SCOPE (module-
   level constants like `VRINDAVAN_SPATIAL_GRAMMAR`, `LIVING_VRINDAVAN_DEFINITION` baked directly
   into `lib/spatialEcology/hostService.ts`, `lib/worldPersistence/durableSnapshot.ts`,
   `lib/canonicalEvents/hostService.ts`). This is a real, previously-named, honest limitation
   (Build 02's own finding, reconfirmed unchanged through Build 04's reconciliation): "Living
   Forest / other Living Worlds remain portability-proof-only at the Host layer."
4. `lib/livingWorldHost/hostService.ts` (the Runtime v1 facade -- `wakeLivingWorld`,
   `createWorldInstance`, `getWorldSnapshotForVisitor`, `getEmbodimentSnapshotForVisitor`,
   `queryHealth`) is itself already generic, `worldInstanceId`-parameterized, with zero Vrindavan
   import. It is the FUNCTIONS IT DELEGATES TO that are Vrindavan-hardcoded, not this facade file
   itself.

**Conclusion**: the generic kernel is real, tested, and portable at the pure-function level. The
one real, previously-flagged gap is an actual composed, end-to-end SECOND WORLD proving the
composition itself -- not just each isolated function -- is portable, and demonstrating this
mission's own required narrative arc. That gap analysis is what this vertical slice fills.

---

## 2. What this vertical slice adds

A single new, self-contained module, **`lib/livingForest/`** (4 files, ~450 lines), plus one
closed package-level gap:

| File | Role |
|---|---|
| `definition.ts` | Pure content: spatial grammar (Sector F01/Quadrant NW/Patches P01-P03), seasons, encounter rule, resource affordances, behavior profile, rhythm schedule, day-phase schedule + routine window, significance config. Zero engine logic -- the same category of artifact `lib/*/vrindavanXDefinition.ts` already is. |
| `repositories.ts` | Fresh, isolated in-memory repository sets, reusing each generic package's OWN `InMemory*Repository` class -- no new persistence mechanism invented. |
| `hostService.ts` | Host-layer composition: wires Living Forest's own content into `advancePopulationSimulation`, `resolveEncounterRealization`/`deriveConsequences`, `deriveWorldEvents`/`deriveEntityMemoryEntries`, `resolveWorldSnapshot`, and `resolveParticipationAuthorization` -- mirroring the EXACT layering convention every `lib/*/hostService.ts` file already holds for Vrindavan, but as an entirely new, parallel file touching nothing existing. |
| `embodiment.ts` | Calls the unmodified `resolveWorldEmbodiment` (Sprint 8) with Living Forest's own naming/spatial-layout/experience-description content -- the renderer-neutral presentation projection the mission's pipeline names as its final step. |
| `livingForestVerticalSlice.test.ts` | The end-to-end proof (§3). |
| `packages/living-rhythms-runtime/src/livingForestRhythmsPortability.test.ts` | Closes the one identified cross-package gap (§4). |

**Why a new parallel file set instead of parameterizing the existing Vrindavan Host files**:
every existing `lib/*/hostService.ts` bakes its world's content in as a module-level constant
(`VRINDAVAN_SPATIAL_GRAMMAR`, `LIVING_VRINDAVAN_DEFINITION`, etc.). Refactoring those files to
accept a world-definition parameter is a real, separately-scoped, cross-cutting change touching
Vrindavan's own closed-build production code paths -- exactly the kind of "changing a closed build
unexpectedly" this mission's own STOP gates warn against. Building a parallel, additive Host-layer
module for the second world instead:

- Never modifies Build 01-06 Phase 0's code (`git status --short` confirmed clean throughout).
- Still proves the real thing that matters: the SAME generic runtime functions, called with
  DIFFERENT world content, produce a coherent, correct second world.
- Leaves the "parameterize the existing Host layer to accept ANY world definition" refactor
  correctly named as future work (§6), not silently done as a side effect of this slice.

---

## 3. The proof, end to end (`livingForestVerticalSlice.test.ts`, 8 tests)

Matches the mission's own required arc, each arrow backed by a real, unmodified generic function
call (never a scripted per-step branch):

```
morning world state (canopy-wet, tick 0/1)          -- createFreshForestSharedState + advanceForest
        |
environmental/resource conditions                    -- SharedWorldState.environment (unmodified engine)
        |
visitor enters patch -> encounter opportunity         -- computeForestEncounterOpportunities (read at
        |                                                arrival, before any tick advances)
encounter realization (REALIZED, not guaranteed)      -- resolveEncounterRealization (a companion test
        |                                                proves the SAME function also returns EXPIRED)
consequence                                           -- deriveConsequences
        |
world/entity/place memory                             -- deriveWorldEvents + deriveEntityMemoryEntries
        |
entity rhythm + movement toward water                 -- advanceForest (MORNING routine bonus + thirst
        |                                                pressure genuinely outscores REST/GRAZE)
future behavior changes (memory -> divergent choice)  -- isolated proof (§5): a seeded
        |                                                PREVIOUS_RESOURCE_LOCATION entry changes
        |                                                which of TWO water sources gets chosen
renderer-neutral presentation projection              -- resolveWorldEmbodiment (Sprint 8, unmodified,
        |                                                same function already backing Vrindavan's own
        |                                                Unreal translation path)
leave                                                  -- InMemoryWorldLeaseRepository.release
        |
world evolves while away (season crosses to drought)  -- advanceForest + resolveTicksToApply (real
        |                                                catch-up planning, not a wall-clock read)
return                                                 -- lease re-acquire
        |
Place Continuity/ReturnRecognition-equivalent facts    -- computeReturnRecognition (season_changed +
                                                           population_relocated facts, real)
```

Plus two determinism proofs: identical seed+state run twice produces identical output, and N ticks
in one call equals N sequential single-tick calls -- the same catch-up-vs-live-stepping equivalence
Sprint 9's causal engine already proves, now demonstrated across the FULL composed chain (causal
environment + population + memory) this vertical slice adds on top of it.

---

## 4. The one closed cross-package gap: `living-rhythms-runtime`

Of the ten generic runtime packages with their own Living Forest portability fixture, exactly one
had none: `living-rhythms-runtime` (day-phase resolution, routine window/bonus, resource-opportunity
derivation). `packages/living-rhythms-runtime/src/livingForestRhythmsPortability.test.ts` (4 tests)
closes it, mirroring every sibling package's own fixture style and header-comment convention. No
production code in that package changed.

---

## 5. Content-authoring finding: `memoryHint`'s divergence, finally observable

Living Vrindavan's own Build 03 final report named `resolvePreferredResourceLocation` /
`selectBehavior`'s `preferMemoryOrFirst` bridge as "currently unobservable" -- not broken, simply
never exercised, because every one of Vrindavan's real resource tags maps to exactly one location
(1:1). Living Forest's own content (authored fresh for this slice) deliberately gives BOTH
`forest-stream` and `forest-pond` the `"water"` tag. Test H seeds one entity with a
`PREVIOUS_RESOURCE_LOCATION` memory entry (representing history from before this session's own
simulated window -- as legitimate as any other piece of authored initial state) pointing at
`forest-pond`; an otherwise-identical entity with no such entry still resolves the raw deterministic
default (`forest-stream`). This is the first place in the repository this already-live-wired bridge
has ever been shown to diverge. **Zero new runtime code** -- a content-authoring choice only.

---

## 6. Deliberately NOT implemented

- **Parameterizing the existing Vrindavan `hostService.ts` files to accept an injected world
  definition.** A real, valuable, separately-scoped refactor -- out of this vertical slice's own
  scope per the STOP-gate discipline above.
- **Social ecology (relationships/familiarity) for Living Forest.** Not required by this mission's
  own pipeline; already has its own real portability proof at the package level
  (`livingForestSocialEcologyPortability.test.ts`); adding a Host-layer wiring for it here would be
  unrequested scope expansion.
- **World adaptation (long-horizon evolution) for Living Forest.** Confirmed not required for a
  single-session vertical slice (Agent research, and matches the package's own stated scope:
  multi-tick/multi-visit accumulation, not day-one behavior). Already has its own portability proof.
- **A full `WorldExperienceSnapshot` (arrival/orientation/place-continuity, Build 04's own richer
  Vrindavan layer) for Living Forest.** This mission's own pipeline stops at "renderer-neutral
  presentation projection" (the `WorldEmbodimentSnapshot` level); `@avatark/world-experience-*`'s
  own portability is already proven by its existing `livingForestExperiencePortability.test.ts`.
  Building a second, Host-layer-wired copy of that richness would not serve this mission's stated
  goal.
- **Canon/canonical-event machinery for Living Forest.** Living Forest has no real StudioK Canon
  authority (unlike Vrindavan's Approved `STK-CAN-*` docs) -- inventing one would violate this
  mission's own STOP gate ("Canon authority is ambiguous"). `SeasonDefinition.canonId` uses a
  deliberately fictional placeholder (`"STK-CAN-999"`), never treated as an Approved-Canon claim
  anywhere downstream.
- **An Unreal project, `.uasset`/`.umap` files, or any renderer-specific implementation.** Explicitly
  out of scope per the mission's own instruction; nothing in this work required or attempted it.
- **A real network/HTTP transport or dev route for Living Forest.** The mission's own proof is
  satisfied entirely through direct, in-process function calls (matching how every existing
  `*Portability.test.ts` in this repository already proves genericity) -- no Next.js route was
  needed or added.
- **Any change to Runtime v1 core.** No genuine blocking defect was found during this reconciliation
  that would require one.

---

## 7. Renderer boundary, restated

```
Runtime semantic (Living Forest's own, real, tested)
        |
        v
resolveWorldEmbodiment (Sprint 8, unmodified engine)
        |
        v
WorldEmbodimentSnapshot (renderer-neutral, real)
        |
        v
[future] Unreal semantic bridge / mock renderer / any other adapter
```

Verified by direct inspection: the serialized `WorldEmbodimentSnapshot` this slice produces
contains no `UObject`/`AActor`/Blueprint/Unreal-specific string anywhere (asserted directly in
test C-F). No Living Forest content leaks a `.uasset` path, Niagara reference, or any renderer
asset identity -- the exact same invariant every prior Vrindavan build already held.
