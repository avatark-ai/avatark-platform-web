# Sprint 13 — Living Rhythms & Place Occupancy: Final Report

**As of:** 2026-08-09. Branch `feature/sprint13-living-rhythms`, off
`feature/sprint12-social-ecology` @ `f16a6e0`. Not merged to RC3, no
database migration applied. Verify against `git log` before trusting
anything below.

## 0. Continuation note

This sprint was interrupted mid-implementation and resumed from the
exact working-tree state left behind: `packages/living-rhythms-contracts`
and `packages/living-rhythms-runtime` were already fully implemented
(day phase, routine, group routine, place occupancy, place rhythm,
resource opportunity, social interaction opportunity — all with tests
except `socialInteractionResolution.ts`), `ResourceTag` already carried
`"rest"`/`"corridor"`, and `docs/SPRINT13_GROUND_TRUTH.md` (Phase 0) was
already written. That work was treated as authoritative and preserved
unmodified. This report covers everything completed from that point
forward: the missing test, behavior-selection integration, the
`lib/livingRhythms/` Host layer, embodiment integration, the web
renderer touch, dependency-boundary enforcement, the prepared migration,
and full regression.

## 1. Repo / branch / commit

`avatark-platform-web`, branch `feature/sprint13-living-rhythms`. See
commit list below (written just before the final commit).

## 2. Packages/modules created or completed

- `packages/living-rhythms-contracts` — `DayPhaseScheduleId`/
  `RoutineDefinitionId`, `DayPhase`/`DayPhaseScheduleEntry`/
  `DayPhaseSchedule` + `orderedDayPhases`, `ResourceOpportunity`,
  `RoutineWindow`/`DailyRhythmDefinition`, `GroupRoutineIntentType`/
  `GroupRoutineIntent`, `OccupancyLevel`/`PlaceOccupancy`,
  `PlaceRhythmCount`/`PlaceRhythmProfile`/`PlaceRhythmRepository`,
  `SocialInteractionCategory`/`SocialInteractionOpportunity`. 2 tests
  (pre-existing).
- `packages/living-rhythms-runtime` — `resolveDayPhase`,
  `resolveResourceOpportunities`, `resolveRoutineWindow`/
  `resolveRoutineBonus`, `resolveGroupRoutineIntent`,
  `resolvePlaceOccupancy`, `typicalOccupancyLevel`/
  `InMemoryPlaceRhythmRepository`, `resolveSocialInteractionOpportunities`.
  40 tests (34 pre-existing + 6 new: `socialInteractionResolution.test.ts`,
  the one resolver left untested at the interruption point).
- `lib/livingRhythms/` (Host layer, additive, new this sprint) —
  `vrindavanRhythmsDefinition.ts` (a world-shared `DayPhaseSchedule`,
  per-archetype `DailyRhythmDefinition`s for cow/bird-flock, reusing the
  new `"rest"`/`"corridor"` `ResourceTag`s on Kadamba Grove/Govardhan
  Path), `singleton.ts` (`InMemoryPlaceRhythmRepository`),
  `hostService.ts` (`wakeWorldWithRhythms`, `getPlaceOccupancy`,
  `getGroupRoutineIntent`, `getResourceOpportunities`,
  `getSocialInteractionOpportunities`, `getEmbodimentWithRhythms`). 7
  tests.
- `lib/renderer/webRhythmsRenderer.ts` — fixed label-mapping for
  `DayPhase`/`OccupancyLevel`/`GroupRoutineIntentType`/
  `SocialInteractionCategory`, no prose. 7 tests.
- Small, additive extensions: `ResourceTag` gained `"rest"`/`"corridor"`
  (`living-population-contracts`, pre-existing at interruption);
  `Kadamba Grove`/`Govardhan Path` resource-affordance assignments
  extended in place (`lib/livingPopulation/vrindavanPopulationDefinition.ts`,
  new this sprint — the one place Sprint 10 already assigns per-location
  tags, no second mechanism); `selectBehavior` gained optional
  `dayPhase`/`routineWindow` params plus locally-declared, structurally-
  compatible `DayPhaseInput`/`RoutineWindowInput` types
  (`living-population-runtime`, 5 new tests in `behaviorSelection.test.ts`);
  `advancePopulationSimulation`/`AdvancePopulationSimulationParams`
  gained optional `resolveDayPhaseForTick`/`routineEntriesByArchetypeId`
  pass-through params (3 new integration tests in
  `populationSimulation.test.ts`); `advancePopulationForWorld`/
  `wakeWorldWithPopulation` (`lib/livingPopulation/hostService.ts`),
  `wakeWorldWithMemory` (`lib/worldMemory/hostService.ts`), and
  `wakeWorldWithSocialEcology` (`lib/socialEcology/hostService.ts`) each
  gained the same two trailing optional pass-through params, mirroring
  Sprint 12's own `relatedEntityIdsByEntityId`/
  `homeRangeLocationIdsByOwnerId` precedent exactly.
- `lib/runtimeKernel/dependencyBoundaries.test.ts` — extended with the
  Living Rhythms boundary block (6 new tests).
- `supabase/migrations/030_living_rhythms.sql` — prepared, unapplied
  schema (1 new table, `place_rhythm_profiles`); registered in
  `run-platform-migrations.js`'s `MIGRATION_ORDER` for traceability only.

## 3. State/memory ownership map

Full map in `docs/SPRINT13_GROUND_TRUTH.md`. Summary: `SharedWorldState`/
`WorldClock` (Sprint 7), `RhythmPhase`/`RhythmSchedule` (Sprint 10),
`LivingEntityState`/`EntityBehaviorState`/`GroupState` (Sprint 7/10),
`RelationshipState`/`FamiliarityState`/`SeparationState`/`HomeRange`
(Sprint 12), and `WorldEvent`/`EntityMemory` (Sprint 11) are all
unchanged, exclusively owned by their existing Host modules. Day phase
is a NEW, world-shared, purely-derived projection of `tick` — never a
second clock. `PlaceRhythmProfile` is the ONE genuinely new piece of
durable state this sprint introduces; every other new mechanism
(`ResourceOpportunity`, `RoutineWindow`/`GroupRoutineIntent`,
`PlaceOccupancy`, `SocialInteractionOpportunity`) is a pure, resolved-
fresh-every-call derivation with no repository of its own. Protected
Canonical Narrative remains read-only, get-only, with no write path
added anywhere this sprint, and `living-rhythms-runtime`'s own source
contains zero occurrences of `protectedNarrative` at all (the same
strongest-form invariant Sprint 12 established).

## 4. Key design decisions

Six genuinely new architectural calls, each documented with its
reasoning in `docs/SPRINT13_GROUND_TRUTH.md`: (1) day phase is a NEW,
world-shared abstraction, structurally identical to but never a reuse
of Sprint 10's per-archetype `RhythmPhase`; (2) `ResourceOpportunity`
deliberately restates (never shared-library-extracts) `perception.ts`'s
own water/vegetation gating rule, extended with two new categories;
(3) `PlaceOccupancy` is always resolved fresh, never a stored parallel
truth; (4) `PlaceRhythmProfile` is a bounded, fixed-shape counter, never
an event log; (5) `SocialInteractionOpportunity` reuses Sprint 12's own
relationship/separation facts directly, no new relationship mechanic;
(6) `GroupRoutineIntent` is a Host-composed READ, never a second
group-intent authority alongside `advanceGroupState`. A seventh,
implementation-level call made while completing the sprint:
`selectBehavior`'s new `dayPhase`/`routineWindow` params are
LOCALLY-DECLARED types (`DayPhaseInput`/`RoutineWindowInput`),
structurally compatible with but never imported from
`living-rhythms-contracts` — `living-population-runtime` gains zero new
package dependency, mirroring `MemoryHint`/`SocialContext`'s own
established decoupling precedent from Sprint 11/12 exactly. The routine
bonus arithmetic inside `behaviorSelection.ts` is consequently a second,
independent restatement of `resolveRoutineBonus`, the same "restatement,
not extraction" posture decision 2 already established, applied in the
opposite dependency direction.

## 5. Day phase model

`DayPhaseSchedule{id, ticksPerCycle, entries: {phase, startFractionOfDay}[]}`,
resolved by the pure `resolveDayPhase(schedule, tick)` — cycle-relative
position, the entry whose `startFractionOfDay` is the largest one at or
below that fraction. Vrindavan's own schedule
(`lib/livingRhythms/vrindavanRhythmsDefinition.ts`) uses all seven
`DayPhase` values across a 14-tick cycle — longer than either archetype's
own asynchronous rhythm cycle (cow: 8, bird-flock: 6), a documented,
easily-retuned Host-layer judgment call reflecting that this is the
world's own shared day, not an individual archetype's activity loop.

## 6. Routine model

`RoutineWindow{dayPhase, eligibleActivities, preferredResourceTypes,
socialAffinity, restBias, movementBias}` per `DailyRhythmDefinition`,
one per archetype. `resolveRoutineWindow` is a plain day-phase lookup,
honest-defaulting to `null` for an unlisted phase (never an error).
`resolveRoutineBonus` is a small, deterministic nudge — zero for any
candidate not named in `eligibleActivities`, never large enough alone
to beat a genuinely urgent survival need (proven in
`behaviorSelection.test.ts`'s own "a routine bonus never overrides a
genuinely urgent, higher-pressure need" test). Vrindavan's cow routine
grazes/drinks in the morning and rests at dusk/night in Kadamba Grove's
new `"rest"` affordance; the bird flock gathers in the morning at
Govardhan Path's `"gathering"` affordance, travels its new `"corridor"`
affordance in the afternoon, and rests at dusk.

## 7. Group routine model

`GroupRoutineIntent{groupId, intent, targetLocationId, tick}`, one of
six (`REST_TOGETHER`/`MOVE_TO_RESOURCE`/`DISPERSE`/`GATHER`/
`FOLLOW_ROUTE`/`OCCUPY_PLACE`), resolved by
`resolveGroupRoutineIntent` — a majority-rule read over the group's own
members' CURRENT activities, deterministic, never a write back into
`GroupState`. Falls back to `DISPERSE` for an empty group and
`OCCUPY_PLACE` when no tendency has a majority. `lib/livingRhythms/hostService.ts`'s
`getGroupRoutineIntent` composes this fresh from the live population
snapshot on every call.

## 8. Place occupancy model

`PlaceOccupancy{locationId, tick, presentEntityIds, presentGroupIds,
entityCountsByArchetype, activityMix, occupancyLevel}`, one of five
levels (`QUIET`/`ACTIVE`/`GATHERING`/`DISPERSING`/`RESTING`), derived
from present-entity count and activity mix by `resolvePlaceOccupancy` —
no repository, no `save`, reconstructed fresh from authoritative
population/group state every call (the same posture Sprint 10's own
`PopulationSnapshot` established).

## 9. Place rhythm model

`PlaceRhythmProfile{worldId, locationId, counts: PlaceRhythmCount[],
lastUpdatedTick}` — a small, fixed-shape counter (at most 7 day phases
x 5 occupancy levels = 35 counters per location), incrementally
updated by `InMemoryPlaceRhythmRepository.recordObservation`, never
replayed from a growing history. `typicalOccupancyLevel` answers "which
occupancy level has been observed most often at a given day phase,"
with a deterministic tie-break (`OCCUPANCY_LEVEL_PRIORITY`) so replay
stays reproducible. `lib/livingRhythms/hostService.ts`'s
`wakeWorldWithRhythms` records one observation per occupied location on
every wake, guarded by the same `afterTick > lastUpdatedTick`
idempotent-replay convention every prior sprint's own evidence accrual
already uses — proven by a dedicated "PlaceRhythmProfile accumulates
across repeated wakes without double-counting a same-instant replay"
test.

## 10. Resource opportunity model

`ResourceOpportunity{locationId, category, available, tick}`, resolved
by `resolveResourceOpportunities` — a deliberate, documented restatement
of `perception.ts`'s own water/vegetation gating rule (never a
shared-library extraction), extended with two new categories: `"rest"`
(unavailable under high temperature) and `"corridor"` (unavailable
under high precipitation); `"gathering"` carries no environmental gate
at all. Vrindavan's Kadamba Grove now affords `"rest"` and Govardhan
Path now affords `"corridor"`, alongside their pre-existing tags — a
Host-layer, non-canonical assignment extending the exact place Sprint
10 already assigned resource tags, never a second mechanism.

## 11. Social interaction model

`SocialInteractionOpportunity{entityAId, entityBId, relationshipType,
category, locationId, tick}`, one of six categories
(`approach`/`remain_near`/`follow`/`gather`/`avoid`/`rest_together`),
resolved by `resolveSocialInteractionOpportunities` from Sprint 12's
own `RelationshipState`/separation facts directly — same-location pairs
resolve to `rest_together` (STRONG band) or `remain_near` (otherwise);
separated, non-co-located pairs resolve to `approach` at the more
distant entity's own location. `follow`/`gather`/`avoid` remain
reserved vocabulary for a future resolver with richer rhythm/routine-
compatibility inputs — this reference resolver proves the mechanism
with the two conditions already available (co-presence and
separation), never invents behavior it can't yet ground.

## 12. Behavior-selection integration result

**PASSED, bounded and legality-preserving.** `selectBehavior` gained
optional `dayPhase`/`routineWindow` — a candidate's routine bonus is
only ever applied when `routineWindow.dayPhase` matches the given
`dayPhase` exactly (an honest-default guard against a stale window,
proven by a dedicated test), is zero for any candidate not named in
`eligibleActivities`, and never overrides a genuinely urgent,
higher-pressure need (proven directly). `advancePopulationSimulation`
resolves the world-shared day phase fresh EVERY TICK inside its own
loop (never precomputed for a whole multi-tick catch-up batch, proven
by an integration test asserting `resolveDayPhaseForTick` is called
with each tick's own number) and each entity's own routine window fresh
from its own archetype's `routineEntriesByArchetypeId` entries. 5 new
`behaviorSelection.test.ts` tests plus 3 new `populationSimulation.test.ts`
integration tests, all passing; every pre-existing test in both files
still passes unmodified.

## 13. Embodiment integration result

**Host-level composition only, a third time.**
`WorldEmbodimentSnapshotWithRhythms` wraps Sprint 12's own (unmodified)
`WorldEmbodimentSnapshotWithSocialEcology` with a `rhythms:
LocationRhythmSummary` field (`dayPhase`, this location's
`PlaceOccupancy`, applicable `GroupRoutineIntent`s, this location's
`ResourceOpportunity`s). Neither `@avatark/world-embodiment-contracts`
nor `-runtime` gained any new dependency on Living Rhythms — no fourth
widening of that contract (Sprint 10 widened it once for population;
Sprint 11 declined to widen it again for memory; Sprint 12 held that
line for social ecology; Sprint 13 holds it a third time).

## 14. Renderer-neutrality result

**PASSED.** Statically enforced (dependency-boundary extension: zero
React/Next.js/Unreal tokens in either new package's source, §16 below).
The one Web renderer touch (`webRhythmsRenderer.ts`) is a fixed
label-mapping module from closed vocabularies (`DayPhase`/
`OccupancyLevel`/`GroupRoutineIntentType`/`SocialInteractionCategory`)
— never a paragraph, never a named character.

## 15. Canonical-protection result

**PASSED.** No table in the prepared migration touches protected
narrative state; `packages/living-rhythms-runtime`'s own source contains
zero occurrences of `protectedNarrative` at all (the strongest form of
the invariant, matching Sprint 12's own posture) — statically
re-verified by an extension of the existing dependency-boundary test.

## 16. Dependency-boundary extension result

**PASSED.** `living-rhythms-contracts` declares/imports at most
`runtime-contracts`/`living-systems-contracts`/`living-population-contracts`/
`social-ecology-contracts`; `living-rhythms-runtime` declares/imports at
most those four plus `living-rhythms-contracts`; neither depends on any
renderer/embodiment/persistence/memory/population-RUNTIME package, nor
`@avatark/account`; neither contains a React/Next.js/Unreal token; the
runtime package references protected narrative state nowhere at all.
`living-population-runtime` itself gains ZERO new dependency (its own
pre-existing "at most four allowed packages" test is untouched and
still passes) — the day-phase/routine coupling runs one way only, via
locally-declared structurally-compatible types, never a package import.
6 new tests, all passing, alongside every prior sprint's own boundary
tests (55 total in that one file, all green).

## 17. Migrations prepared/applied status

**Nothing applied.** `supabase/migrations/030_living_rhythms.sql` — 1
new table (`place_rhythm_profiles`), RLS read-only for authenticated
clients, registered in `run-platform-migrations.js`'s `MIGRATION_ORDER`
for traceability only, same posture as migrations 023/026/027/028/029.
The migration script itself was never run. No other Sprint 13 mechanism
needs a table — every other new type is a pure, resolved-fresh
derivation with no repository.

## 18. Focused tests + regression result

**1347/1347 passing** (1277 Sprint 5-12 baseline + 70 new/extended
Sprint 13 tests: 2 contracts (pre-existing, now wired into the root test
script) + 40 living-rhythms-runtime (34 pre-existing + 6 new
`socialInteractionResolution.test.ts`) + 7 `lib/livingRhythms` Host
integration + 7 web renderer + 5 `behaviorSelection.test.ts` extensions
+ 3 `populationSimulation.test.ts` integration extensions + 6
dependency-boundary extensions). `npm run typecheck` clean. `npm run
lint` clean except pre-existing, untouched findings (verified by
inspection — zero lint issues in any file this sprint added or
modified). Every prior sprint's own pre-existing test suite was
re-run unmodified and still passes, confirming every extension this
sprint made was genuinely additive.

## 19. Architectural invariants

All hold, restated from Sprint 12's own §26 plus this sprint's own new
proof points:
- **Domain separation** (Shared World State ≠ Entity/Population State ≠
  Entity/World Memory ≠ Social Ecology ≠ Visitor Memory ≠ Protected
  Canon), now including day phase/routine/place occupancy/place rhythm/
  resource/social-interaction as further distinct, non-competing
  derived facts — §3.
- **Protected Canon never gains a write path** — §15, the strongest
  form checked (zero references, not just zero writes).
- **Renderer/Unreal-neutral core** — §14.
- **No new cross-sprint coupling in the wrong direction** —
  `living-population-runtime` never depends on `living-rhythms-*`; the
  Host layer resolves day phase/routine before calling in, exactly as
  it already does for memory hints and social context — §4, §16.
- **Replay idempotency** — §9 (PlaceRhythmProfile's own
  same-instant-replay guard).
- **World-specific rules remain data-driven** — the day-phase schedule,
  per-archetype routines, and the two new resource-tag assignments are
  all Host-layer config (`lib/livingRhythms/vrindavanRhythmsDefinition.ts`,
  `lib/livingPopulation/vrindavanPopulationDefinition.ts`), never engine
  branches.
- **Sprint 7 causal engine / Sprint 9 persistence / Sprint 10 population
  engine / Sprint 11 memory engine / Sprint 12 social ecology remain
  authoritative, unmodified** — every extension this sprint made was an
  optional, backward-compatible field/param, each proven non-breaking
  by the full pre-existing test suites passing unmodified (§18).

## 20. Non-canonical Host-layer judgment calls (documented, easy to revisit)

1. `VRINDAVAN_DAY_PHASE_SCHEDULE`'s own `ticksPerCycle` (14) — an
   arbitrary-but-stable, easily-retuned Host-layer number, longer than
   either archetype's own rhythm cycle by design (§5).
2. The specific eligible activities/biases in each archetype's
   `DailyRhythmDefinition` (`lib/livingRhythms/vrindavanRhythmsDefinition.ts`)
   — a Host-layer content choice, not a canon requirement.
3. `"rest"` on Kadamba Grove and `"corridor"` on Govardhan Path — Host-
   layer, non-canonical semantic tags on already-Approved locations,
   the same judgment-call posture Sprint 10 used for the original
   resource tags themselves (carried over from the pre-interruption
   ground-truth decision, §11).
4. `selectBehavior`'s `DayPhaseInput`/`RoutineWindowInput` as locally-
   declared, structurally-compatible types rather than imports — an
   implementation-level decoupling choice, easy to revisit if a future
   sprint decides the coupling is worth taking on directly (§4).

## 21. Technical debt

1. `SocialInteractionCategory`'s `follow`/`gather`/`avoid` values remain
   modeled but unresolved by the reference `resolveSocialInteractionOpportunities`
   — reserved vocabulary for a future resolver with richer rhythm/
   routine-compatibility inputs (§11), the same "prove the mechanism,
   not exhaust the design space" scope Sprint 12's own single emergent-
   encounter rule already set as precedent.
2. Phase 17's `RESOLVED`-encounter debt (Sprint 12 §24, deferred twice
   already) remains untouched this sprint — out of scope, not
   forgotten.
3. `PlaceRhythmProfile` observations accumulate at most once per wake
   call (one observation per currently-occupied location at the
   after-wake tick), not once per simulated tick within a multi-tick
   catch-up — a deliberate, documented scope choice mirroring Sprint
   11/12's own before/after-only comparison discipline, not a bug.

## 22. Blockers

None. No genuine architectural or canon conflict arose, either before
or after the interruption.

## 23. Exact recommendation

Sprint 13 proves the full living-rhythms/place-occupancy pipeline end
to end, additively, without rewriting any prior sprint's engine,
creating a competing population or group-intent authority, or inventing
any canon. The most direct Sprint 14 candidates: (a) resolve
`follow`/`gather`/`avoid` with real rhythm/routine-compatibility inputs,
now that both `RoutineWindow` and `SocialInteractionOpportunity` exist
side by side (§21, technical debt #1); (b) wire `PlaceRhythmProfile`'s
`typicalOccupancyLevel` into a visitor-facing "this place feels
different at dusk" surface, now that the observation pipeline is proven
end to end; (c) revisit Phase 17's two-sprint-old `RESOLVED`-encounter
reconciliation (§21, technical debt #2), still the largest deferred
item in this whole domain. Ask before assuming which.

LIVING RHYTHMS FOUNDATION VERIFIED — READY FOR SPRINT 14
