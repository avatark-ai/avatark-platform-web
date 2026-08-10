---
build: living-vrindavan-build-04
status: VERIFIED
base: feature/living-vrindavan-build-03 @ 155dfc6 (Builds 01-03, all CLOSED, verified against origin before this build began)
---

# Living Vrindavan Build 04 -- Final Report

## 0. Reconciliation

See `docs/LIVING_VRINDAVAN_BUILD_04_RECONCILIATION.md`, written before any implementation began. Summary
of what it found real vs. provisional vs. newly needed: the spatial hierarchy, Sprint 20 runtime
facade, Canon discipline, and living-population observation surface were all already real and
required zero new engine capability. Arrival was, in fact, a one-line fallback chain, not a policy.
`ReturnRecognition` (Sprint 11) and Sprint 16's own territory/route fields were already fully computed
by the existing presentation-projection onion but silently dropped at its own flattening step -- the
single highest-leverage integration point this build found, and the first thing it fixed.

## 1. What this build actually added

1. Two new, portable, renderer-neutral packages -- `@avatark/world-experience-contracts` and
   `@avatark/world-experience-runtime` -- implementing:
   - **Arrival policy** (`arrivalDecision.ts`): `FIRST_EVER_VISIT` / `RETURNING_TO_PRIOR_PLACE` /
     `CANON_DIRECTED_ENTRY` / `STALE_PRIOR_LOCATION_FALLBACK` / `SAFE_FALLBACK_ENTRY`, plus a
     `worldChangedSinceLastVisit` flag -- covers all seven scenarios mission §D named, as five closed
     reasons and one flag rather than seven ad hoc branches.
   - **Experience Graph** (`experienceGraph.ts`): 13 stages, 25 branching transitions, deliberately
     non-linear (`ORIENTATION`/`CONTINUED_EXPLORATION` each have 3+ legitimate next stages; `DEPARTURE`
     is reachable from 6 different stages). Descriptive only -- consulted, never enforced against the
     autonomous simulation.
   - **Canonical-scope resolution** (`canonicalScope.ts`): resolves a canonical event's own authored
     `CanonicalEventProjectionScope` (WORLD/DOMAIN/SECTOR/QUADRANT/PATCH/LOCAL_PLACE/ENTITY_SET) down to
     concrete LocationIds, using only the static `SpatialGrammar` already passed in -- zero sibling-
     runtime dependency, zero invented scope semantics.
   - **Place Continuity** (`placeContinuity.ts`, contracts + runtime): identity, spatial hierarchy,
     environmental condition, day phase, season, occupancy, nearby entities, nearby destinations
     (with Route awareness), active rhythms, encounter opportunities, Canon-safe canonical presence,
     remembered consequences (historical markers), privacy-safe visitor history, and presentation
     hints -- pure recombination over already-resolved inputs, never a new query.
   - **Orientation** (`orientation.ts`): the five mission-named semantic questions, each a direct read
     of a composed Place Continuity view -- no HUD spec, no UI decision.
   - **World Experience Snapshot** (`worldExperienceSnapshot.ts`): the Unreal-handoff aggregate,
     embedding the exact, unmodified `WorldEmbodimentSnapshot` shape Build 02's own
     `translateToUnrealCommands` already accepts.
2. Two additive fields on Build 02's own `VrindavanPresentationState`/`projectVrindavanPresentation`
   (`lib/livingWorldEmbodiment/vrindavanPresentationProjection.ts`): `history` (recentWorldChanges/
   historicalMarkers/**returnRecognition**/encounterHistoryState -- all already computed by the
   existing onion, simply never surfaced past this one flattening step) and `territoryPressures`/
   `routeStates` (same story, Sprint 16's own fields). Plus `worldVersion`, needed to faithfully
   reconstruct a complete `WorldEmbodimentSnapshot` for the Unreal-handoff snapshot. Zero new engine
   capability; all ten pre-existing tests against this file still pass unmodified.
3. Vrindavan-specific Host-layer composition (`lib/livingWorldExperience/`): wires the two generic
   packages to the real Sprint 1-20 + Build 01-03 machinery -- the real `WorldRuntime` singleton (for
   per-visitor prior position), the real spatial grammar/topology (for direct-neighbor destinations and
   canonical-scope resolution), the real Build 03 microhabitat/vegetation-archetype content (for
   presentation hints), and the extended presentation projection (for everything else). Follows the
   exact composition convention every prior `vrindavan*.ts` Host file already uses.
4. Two new routes, following the exact existing conventions: `app/api/account/living-vrindavan/entry`
   (production, Supabase-authenticated, GET-only, returns the real Orientation) and
   `app/api/dev/account/living-vrindavan/experience-snapshot` (dev-only diagnostic, returns the full
   World Experience Snapshot).

## 2. Mission requirements, real status

| § | Requirement | Status | Evidence |
|---|---|---|---|
| B | Experience Graph | **PROVEN** | `experienceGraph.test.ts` -- non-linear, branching, reachability-complete |
| C | Place Continuity | **PROVEN** | `placeContinuity.test.ts` (generic) + `vrindavanPlaceContinuity.test.ts` (real, proofs E/F/G/H) |
| D | Entry & Arrival | **PROVEN** | `arrivalDecision.test.ts` (generic, all 7 scenarios) + `vrindavanArrival.test.ts` (real, proofs A/B/C/D) |
| E | Orientation | **PROVEN** | `orientation.test.ts` (generic) -- all 5 semantic questions, no HUD spec |
| F | Local Movement & Destinations | **PROVEN** | `vrindavanPlaceContinuity.test.ts` proof E -- real Sprint 16 topology, direct-neighbor only, Route-aware |
| G | Living Presence | **PROVEN** | `vrindavanPlaceContinuity.test.ts` proof F -- real seeded population observed, never manufactured |
| H | Leave/Return flagship | **PROVEN** | `vrindavanFlagshipLeaveReturn.test.ts` -- real, no mocks, proofs I/J |
| I | World memory vs visitor memory vs shared presentation | **PROVEN** | `vrindavanWorldExperienceSnapshot.test.ts` proof K -- real cross-visitor isolation |
| J | Canonical presence | **PROVEN** | `vrindavanPlaceContinuity.test.ts` proof H + `placeContinuity.test.ts`'s Approved-vs-Host-fixture proofs |
| K | Unreal handoff contract | **PROVEN** | `vrindavanWorldExperienceSnapshot.test.ts` proof N -- existing unmodified translator accepts it |
| L | Determinism & replay | **PROVEN** | `worldExperienceSnapshot.test.ts` (generic) + `vrindavanWorldExperienceSnapshot.test.ts` proof L |
| M | Portability | **PROVEN, with the same honest limitation Build 02 already named** | `livingForestExperiencePortability.test.ts` -- zero world-identity branching in either new package; the Host-layer composition files ARE Vrindavan-wired by the same pre-existing convention Build 02's own proof I already found, not a Build 04 regression |

## 3. Acceptance proof matrix (A-N)

| Letter | Statement | Test |
|---|---|---|
| A | First visitor entry -> real Approved entry location | `vrindavanArrival.test.ts` |
| B | Returning visitor entry | `vrindavanArrival.test.ts` |
| C | Valid prior-place restoration | `vrindavanArrival.test.ts` |
| D | Stale prior-place fallback | `arrivalDecision.test.ts` + `vrindavanArrival.test.ts` (real known-location set) |
| E | Nearby-place discovery | `vrindavanPlaceContinuity.test.ts` |
| F | Living population visibility | `vrindavanPlaceContinuity.test.ts` |
| G | Environmental/rhythm visibility | `vrindavanPlaceContinuity.test.ts` |
| H | Canon-safe presence | `vrindavanPlaceContinuity.test.ts` + `placeContinuity.test.ts` |
| I | Leave -> world evolves -> return | `vrindavanFlagshipLeaveReturn.test.ts` |
| J | Same-world continuity | `vrindavanFlagshipLeaveReturn.test.ts` |
| K | Visitor privacy isolation | `vrindavanWorldExperienceSnapshot.test.ts` |
| L | Deterministic semantic projection | `worldExperienceSnapshot.test.ts` + `vrindavanWorldExperienceSnapshot.test.ts` |
| M | Living Forest portability | `livingForestExperiencePortability.test.ts` |
| N | Unreal snapshot/translation compatibility | `vrindavanWorldExperienceSnapshot.test.ts` |

All fourteen proofs are real, passing tests against real composed functions -- none asserted
narratively without a corresponding executable check, and none require a mock for the core continuity
proof (I/J use the real durable world-persistence family, real wake/advance mechanics, real seeded
population).

## 4. Honest findings

1. **`sinceTick` remains caller-supplied.** No per-visitor "last known tick" persistence exists
   anywhere in this codebase (`WorldState`, the per-visitor position record, tracks `lastVisitAt` as a
   timestamp, never a tick). `projectVrindavanPresentation` already established this exact convention
   in Build 02; Build 04's own arrival/orientation/snapshot functions all accept `sinceTick: number |
   null` the same way. A real client would need to remember its own last-seen tick and pass it back
   (the new `entry`/`experience-snapshot` routes both accept it as an optional query param) -- a real,
   named limitation, not new debt this build introduced.
2. **Living Vrindavan's own real, closed 4-location grammar gives no organic way to produce a
   genuinely stale prior location** (`WorldRuntime` validates every stored location against the real
   definition). Proof D is therefore demonstrated by calling the exact same `resolveArrivalDecision`
   function Vrindavan's own Host layer calls, against a deliberately stale location -- the identical
   mechanism, not a weaker substitute -- rather than fabricating a false end-to-end scenario Vrindavan's
   own content cannot organically produce.
3. **The flagship test's own cow may genuinely relocate to Kadamba Grove during the absence** (Build
   03's own real, seeded behavior, reconfirmed here, not a bug). Entity-continuity is checked across the
   current place and its own real neighbors, the same breadth Build 03's own leave/return proof already
   uses, rather than assuming the herd stays put.
4. **The Sprint-7-singleton-vs-durable-family split, named in the reconciliation doc, is used exactly as
   found, not merged.** Per-visitor position (`WorldRuntime.currentLocationId`) and shared simulation
   truth (the durable `worldInstanceId` family) remain two distinct systems Build 04's arrival policy
   composes together, matching how every existing production route already does the same thing.
5. **A known, pre-existing flake reappeared during full-suite runs**:
   `lib/worldEmbodiment/embodimentOrchestrator.test.ts`'s "Phase 17: two visitors at the same logical
   world time..." test (`vasanta` vs `grishma` mismatch) -- confirmed, by `git status --short` showing
   this file untouched by Build 04, and by 5/5 passes when run in isolation, to be the exact same
   pre-existing flake Build 02's own final report already named (introduced in Sprint 8, unrelated to
   any build's own changes). It failed in 2 of 5 full-suite runs during this build's own verification
   (higher than Build 02's own "once"), plausibly because Build 04's own ~58 additional tests add real
   wall-clock duration to the suite, making the test's own unmocked, real-`Date.now()`-based two-call
   same-instant assertion (no injected clock) marginally more likely to straddle a tick boundary under
   process load -- but the root defect (real-time sensitivity in a test that never injects a clock) is
   entirely pre-existing, and fixing that test's own design is out of this build's scope, exactly as
   Build 02 already judged.

## 5. Test counts

- Baseline (Build 03 final, re-verified before this build began): 1691/1691.
- After Build 04: **1749/1749** (+58: 6 experience-graph, 8 arrival-decision, 8 canonical-scope, 5
  place-continuity, 5 orientation, 4 world-experience-snapshot, 2 Living-Forest-portability (generic
  packages) + 5 dependency-boundary + 4 real Vrindavan arrival + 6 real Vrindavan place-continuity + 3
  real Vrindavan snapshot + 1 real flagship leave/return (Host layer)).
- Zero regressions from any Build 04 change. Full suite run 5 times in this build for confidence: 3
  clean (1749/1749), 2 with the single pre-existing Phase 17 flake named in §4.5 above and nowhere else.
- `tsc --noEmit`: clean, full repo. `eslint`: identical to the pre-existing baseline (7 errors / 7
  warnings, all in files this build never touched -- `LivingWorldDetailView.tsx`,
  `adminGrants.test.ts`, `queries.test.ts`, `vrindavanPopulationDefinition.ts`,
  `acceptInvitation.test.ts`, `mockAdapters.ts`, `ProfileTab.tsx`, `snapshot.test.ts`); zero new
  findings from any Build 04 file.
- `avatark-platform-web-vrindavan-build-01`, `-02`, `-03`, `-03-phase0`, `-rc3-validation`,
  `-sprint16-impl`, `-sprint17-phase0`, `-sprint18-phase0`, `-sprint19-phase0`, and `-sprint20-impl`
  worktrees all confirmed untouched (`git status --short` clean, at their known, previously-verified
  commits) throughout this build.

## 6. Known limitations

1. `sinceTick`/return-recognition threading is caller-supplied (§4.1) -- a real per-visitor
   "last-known-tick" persistence mechanism is a genuine, separate feature, not built here.
2. Patch/LocalPlace/Route-level `UnrealCommand` vocabulary remains open (Build 02's own named gap,
   unchanged by Build 03 or Build 04) -- see §7 below.
3. Every Build 01/02/03 known limitation not superseded above (group-relocation vote-counting scope;
   `memoryHint`'s currently-unobservable divergence; production-route retrofit; missing per-domain Web
   renderers; Living Forest Host-layer portability's real `createWorldInstance` prerequisite) remains
   open and unaffected by this build.
4. No database migration was required or created. This build's own new content lives entirely in the
   existing in-memory reference adapters and plain TypeScript definition files.

## 7. Unreal Readiness Report

1. **What data Unreal can consume today**: the exact, unmodified `WorldEmbodimentSnapshot` (current +
   reachable `EmbodiedRegion`s, entities, encounters, transitions) via the existing, unmodified
   `translateToUnrealCommands` -- proven again in this build (proof N) against this build's own
   `WorldExperienceSnapshot.embodiment` field specifically.
2. **What remains renderer-neutral**: everything else in `WorldExperienceSnapshot` -- arrival,
   orientation, place continuity (patch ecology, territory, routes, occupancy, rhythms, canonical
   presence, remembered consequences, presentation hints), nearby places, and recent world changes.
   None of it is Unreal-shaped; all of it is real repository-typed data a renderer decides how to use.
3. **What translation layer Build 02 already provides**: `translateToUnrealCommands`/
   `translateEmbodimentDeltaToUnrealCommands`/`translateGroupIntentToUnrealCommands` (Sprint 8/10),
   producing `CreateRegion`/`UpdateEnvironment`/`SetAtmosphere`/`SetWaterState`/`SetVegetationIntent`/
   `PlaceEntity`/`UpdateEntity`/`RemoveEntity`/`MoveEntityToRegion`/`SetGroupIntent`/
   `CreateInteractionAnchor` commands -- unmodified, still authoritative.
4. **What APIs/contracts are ready**: `composeVrindavanWorldExperienceSnapshot` (one function, one
   call, real data); the generic `@avatark/world-experience-contracts`/`-runtime` packages, portable to
   any future Living World; the dev `experience-snapshot` route for manual inspection today.
5. **What is still missing before first Unreal greybox**: Patch/LocalPlace/Route-level `UnrealCommand`
   vocabulary (item 2 below); an actual Unreal project (none exists, none created here, per mission
   constraint); a real decision on how `nearbyPlaces`/presentation hints/canonical presence should
   drive greybox placement, sound, or lighting -- all real data exists, no rendering DECISION has been
   made, correctly, since that decision belongs to whoever builds the first greybox.
6. **Marketplace/Fab asset categories that WILL be required** (once greybox work starts): generic
   riverbank/grove/open-ground/path-corridor environment kits matching the 4 real habitat types
   (`threshold`/`riverbank`/`grove`/`corridor-path`); a small cow archetype and a small bird-flock
   archetype (2 individuals each, per Build 01's own real population); ambient
   vegetation/water/atmosphere shader/particle packs matching the `EnvironmentalBand`
   (low/moderate/high) vocabulary already in the snapshot.
7. **What must NOT be purchased yet, because world semantics are not stable**: anything tied to a
   specific canonical-event visual (only one Host-authored fixture exists, `canonDocIds: []`, explicitly
   not Approved Canon -- purchasing art for it would risk building around content that may never
   become Approved); anything tied to Patch/Route-level command vocabulary that does not exist yet
   (item 2); anything tied to sensory-intent taxonomy (Build 03's own named, un-authored gap).
8. **What can be represented initially with primitives/greybox geometry**: all 4 real locations (simple
   blocked-out volumes matching `SpatialBounds`/`SpatialTransform`, already real, if trivial, geometry);
   the 4 seeded entities (capsules/primitives with the real `animationSemantic`/`movementSemantic`
   intent strings driving simple placeholder motion); the 3 real topology edges and 1 real Route
   (simple line/corridor markers) -- everything the existing translator already emits commands for.

## 8. Recommended Build 05

1. Decide and implement a real per-visitor "last-known-tick" persistence mechanism (limitation §6.1) --
   the actual prerequisite for `worldChangedSinceLastVisit`/Orientation's `whatHasChanged` to work
   without a client supplying its own `sinceTick`.
2. Extend `UnrealCommand` with Patch/LocalPlace/Route-level vocabulary (limitation §6.2) if/when an
   actual Unreal integration project starts -- the Unreal Readiness Report above names exactly what
   greybox work this would unblock.
3. Every Build 01/02/03 blocker not superseded by this build (§6.3) remains open in the same priority
   order those builds' own reports already established.

---

LIVING VRINDAVAN BUILD 04 VERIFIED — WORLD EXPERIENCE & PLACE CONTINUITY FOUNDATION READY
