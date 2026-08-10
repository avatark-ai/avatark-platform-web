---
build: living-vrindavan-build-02
phase: implementation-part-1
status: PART 1 COMPLETE -- PART 2 (reqs 8-12, acceptance proofs A-J, final report) COMPLETE, see docs/LIVING_VRINDAVAN_BUILD_02_FINAL_REPORT.md
base: feature/living-vrindavan-build-01 @ 7b6c759, merged with feature/living-vrindavan-build-02-phase0 @ 8c96d5d
---

# Living Vrindavan Build 02 -- Part 1 Notes

## The "two embodiment read paths" finding -- reconfirmed, still real, post-Build-01

Direct source scan (`grep` for every real, non-test call site of both functions across `lib/` and
`app/`) confirms Phase 0's §2 finding is **still true** after Build 01:

- `getEmbodimentSnapshotForVisitor` (`lib/livingWorldHost/hostService.ts`) is called by:
  `lib/worldEmbodiment/embodimentOrchestrator.ts` (production), and
  `app/api/dev/account/living-vrindavan/world-inspection/route.ts` (Build 01 Part 2's own new dev
  diagnostic route). **Build 01 Part 2 also used the poorer path** -- confirmed directly, not
  assumed.
- `getEmbodimentWithCanonicalEvents` (`lib/canonicalEvents/hostService.ts`) has **zero** real
  call sites outside its own test files, before this Part 1's work.

## Resolution: Option A, at the level Build 02 owns

A new file, `lib/livingWorldEmbodiment/vrindavanPresentationProjection.ts`, exports
`projectVrindavanPresentation` -- pure composition over `getEmbodimentWithCanonicalEvents`
exclusively. It flattens the real 7-layer onion (base(8/10) -> history(11) -> social(12) ->
rhythms(13) -> encounterRealization(14) -> adaptation(15) -> spatialEcology(16) ->
canonicalEvents(18)) into one object, re-exporting every field unmodified -- no value is
recomputed, no repository is queried directly, no widening of
`@avatark/world-embodiment-contracts` (holding the same line every sprint since 10 has held).

**Did NOT touch**: `embodimentOrchestrator.ts`, the production `embodiment-snapshot` route, or
Sprint 20's `getEmbodimentSnapshotForVisitor`/`getWorldSnapshotForVisitor`. Retrofitting the real
production route to read the richer chain is a materially larger, separate decision (it would
need the same care Sprint 20 Part B applied to the singleton cutover -- concurrency/lease
implications, and confirming no real caller depends on the poorer shape) that this Part is not
scoped to force through. This is a legitimate, explicit "left for Part 2 or a human decision"
outcome, not an oversight -- named here per the mission's own permission to leave this open if a
real retrofit isn't safely in scope.

**No third embodiment truth was created.** `vrindavanPresentationProjection.ts` is additive,
depends on exactly one existing function, and could be deleted with zero effect on any other
file.

## Reqs 1-7, real status

| Req | Status | Evidence |
|---|---|---|
| 1. Build 01 state consumed | **PROVEN** | `createWorldInstance` (Sprint 20 real facade) seeds the instance the projection then reads from. |
| 2. Spatial hierarchy -> presentation, deterministic | **PROVEN** | `patchEcology` carries exactly the 4 real Canon-authorized-location patches (`lib/spatialEcology/vrindavanSpatialDefinition.ts`, Sprint 16) -- test asserts the exact patch-id set, not just a count. |
| 3. Entity renderer-neutral identity | **ALREADY REAL, reconfirmed** | The real seeded cow (`avatark-population-cow-1`, Sprint 10) carries a stable `EntityPresentation` through the flattened base region -- Sprint 8's contract, unmodified. |
| 4. Environmental state -> presentation | **ALREADY REAL, reconfirmed** | `current.environment` (water/vegetation/atmosphere, Sprint 7/8) is present and real-Vasanta-envelope-derived. |
| 5. Ecology/resource state -> presentation | **PROVEN (the real gap the poorer path had)** | `patchEcology`'s real Sprint 16 fields (`resourceAvailability`, `presentEntityIds`) differ between Yamuna and Kadamba Grove at world-init -- reconfirms Build 01 Part 1's own spatial-differentiation finding, now proven reachable through the presentation layer specifically, which it was not before this file existed. |
| 6. Population/occupancy -> presentation | **PROVEN (the real gap)** | `rhythms.placeOccupancy` (Sprint 13), reachable through this projection for the first time. |
| 7. Day-phase/rhythm -> presentation | **PROVEN (the real gap)** | `rhythms.dayPhase` (Sprint 13), same object, same first-time reachability. |

Reqs 3/4 were never actually missing -- the BASE `WorldEmbodimentSnapshot` (Sprint 8/10) already
carries entity identity and environment, and the poorer path already returns it. The real,
load-bearing gap Phase 0 found was reqs 5/6/7 (ecology, population/occupancy, rhythm) -- all three
live only in wrapper layers the poorer path never reaches. This Part 1's one new file closes
exactly that gap, nothing more.

## Canon discipline held

No 5th location. No new mythology. `canonicalProjections` is presented as a real, honestly-empty
array at tick 0 (no canonical event has activated on a freshly-seeded instance) -- not faked with
a placeholder. The Govardhan-lifting fixture was not touched or referenced in this Part; Part 2's
own canonical-presence work should continue Build 01's precedent (`yamuna-narrative-gate`).

## What genuinely renders per-domain (webXRenderer convention) is incomplete

`lib/renderer/` has `webEmbodimentRenderer.ts`, `webWorldSystemsRenderer.ts`,
`webMemoryRenderer.ts`, `webSocialEcologyRenderer.ts`, `webRhythmsRenderer.ts`,
`webEncounterRealizationRenderer.ts`, `webExperienceRenderer.ts` -- but **no**
`webSpatialEcologyRenderer.ts`, `webAdaptationRenderer.ts`, or a canonical-events equivalent.
Sprints 15/16/18 never got a dedicated web-renderer summarize function for their own layer. This
Part 1 did not build one (out of scope for reqs 1-7, which only required the DATA to reach a
presentation-shaped object, not a full per-domain renderer file matching every prior sprint's
convention) -- named here as real, additive Part 2/Build 03 scope if a richer Web reference view
than Build 01's existing `world-inspection` route is wanted.

## Test count

1667 (Build 01 baseline) -> 1668 (+1: `lib/livingWorldEmbodiment/vrindavanPresentationProjection.test.ts`).
`tsc --noEmit` clean. `eslint` clean on both new files. Full `npm test` run: 1668/1668 passing,
zero regressions.

## Environment note

This worktree (`avatark-platform-web-vrindavan-build-02`) had **no `node_modules`** when this
Part began -- a fresh git worktree does not inherit it. `pnpm install` (the real, correct package
manager per `package.json`'s `packageManager` field) succeeded in ~4 seconds with zero errors,
zero version conflicts. A prior, unrelated task's report of a `pnpm`/`zod` version-mismatch
install failure did not reproduce here and is not a real, ongoing issue in this repository.
