# Sprint 13, Phase 0 — Ground Truth / Ownership Report

Branch `feature/sprint13-living-rhythms`, off `feature/sprint12-social-ecology`
@ `f16a6e0`. Written before any Sprint 13 code.

## Ownership map

- **SharedWorldState/WorldClock** (Sprint 7) — owned exclusively by
  `lib/worldPersistence/hostService.ts`. Unchanged; `tick` remains the
  only authoritative time value. Sprint 13 adds a NEW, purely-derived
  "day phase" projection of `tick` (see below) — never a second clock,
  never wall-clock time.
- **RhythmPhase/RhythmSchedule** (Sprint 10) — PER-ARCHETYPE, asynchronous
  activity cycles (`cow` ticksPerCycle=8, `bird-flock` ticksPerCycle=6),
  already exists, unchanged. This is NOT what Sprint 13's "day phase"
  means — Sprint 13's day phase is ONE shared, world-level projection of
  `tick`, the same for every entity in the world, analogous to how
  `SeasonState` is one shared value, not per-archetype.
- **LivingEntityState/EntityBehaviorState/GroupState** (Sprint 7/10) —
  owned by `lib/livingPopulation/hostService.ts`. Unchanged in mechanism;
  additively extended (optional `dayPhase`/`routineWindow` params on
  `selectBehavior`, mirroring Sprint 11/12's own `memoryHint`/
  `socialContext` precedent).
- **RelationshipState/FamiliarityState/SeparationState/HomeRange**
  (Sprint 12) — owned by `lib/socialEcology/`. Unchanged; Social
  Interaction Opportunity (Sprint 13) reads these by reference, never
  duplicates them.
- **WorldEvent/EntityMemory** (Sprint 11) — owned by
  `lib/worldMemory/hostService.ts`. Extended the same additive way every
  prior sprint has: new candidate inputs into the SAME
  `deriveWorldEvents`/`deriveEntityMemoryEntries` pipeline, only if a
  genuinely new significant category is needed.
- **Protected Canonical Narrative** — untouched, read-only, no write
  path added (statically re-verified, same as every prior sprint).

## Key design decisions

1. **Day phase is a NEW, world-shared abstraction, not a reuse of
   Sprint 10's `RhythmPhase`.** `RhythmSchedule` is deliberately
   per-archetype and asynchronous (a cow's own 8-tick cycle has no
   relationship to a bird-flock's 6-tick cycle). Day phase must be ONE
   value every entity in the world observes identically at a given tick
   — the same category of shared truth as `SeasonState`. A new
   `DayPhaseSchedule{ticksPerCycle, entries}` type (structurally
   identical shape to `RhythmSchedule`, semantically a WORLD-level
   singleton rather than a per-archetype config) and a pure
   `resolveDayPhase(schedule, tick)` function (structurally identical to
   `resolveRhythmPhase`) live in a new `living-rhythms-contracts`/
   `-runtime` package pair, never inside `living-population-*` (which
   stays scoped to per-entity behavior, not world-level time semantics).
2. **Resource Opportunity formalizes, and deliberately restates, an
   existing rule — the same documented duplication posture Sprint 11's
   own `computeLocationConditionsByCategory` already used.**
   `perception.ts`'s water/vegetation-availability gating
   (`hydrologyBand !== "low"`, `vegetationActivityBand !== "low"`) stays
   exactly as is — Sprint 13 never touches `perception.ts`. A new,
   generic `resolveResourceOpportunities` function in
   `living-rhythms-runtime` restates the SAME causal rule (for reuse by
   Place Occupancy/Routine/renderer diagnostics, which have no reason to
   depend on `living-population-runtime` internals) and extends it with
   two new `ResourceTag` categories (`"rest"`, `"corridor"`, additive to
   the existing closed union) plus their own restrained, single-band
   causal gates. This is a second, independent implementation of a
   similar rule, not a shared library extraction — deliberate, matching
   precedent, not an oversight.
3. **PlaceOccupancy is always resolved fresh from authoritative living
   state — never a stored parallel truth.** It has no repository, no
   `save` method; it is a pure function of `(populationEntities, groups,
   locationId, tick)`, exactly the same posture Sprint 10's own
   `PopulationSnapshot` already established for "population state."
4. **PlaceRhythm is a BOUNDED aggregate, not an event log.** "Do not
   create telemetry exhaust" (Phase 10's own instruction) rules out
   storing one row per tick per location. Instead, `PlaceRhythmProfile`
   is a small, fixed-shape counter — one integer per
   `(locationId, dayPhase, occupancyLevel)` triple — incrementally
   updated (never replayed from history), bounded by construction (the
   triple space itself is small and finite: N locations × 7 day phases ×
   5 occupancy levels).
5. **Social Interaction Opportunity reuses Sprint 12's own
   `RelationshipState`/`SocialPerception` facts directly — no new
   relationship mechanic.** It is a pure derivation (co-location +
   relationship + rhythm/routine compatibility → a semantic category
   from a closed vocabulary: `approach`/`remain_near`/`follow`/`gather`/
   `avoid`/`rest_together`), never dialogue, never prose, never an LLM
   call.
6. **GroupRoutineIntent is a Host-composed READ, not a new mutation of
   `GroupState`.** Group-level routine tendency ("this herd rests
   together at dusk") is derived from the group's own members' rhythm/
   routine state at read time — it never writes back into `GroupState`
   itself, avoiding a second group-intent authority alongside Sprint
   10's own `advanceGroupState`/`targetLocationId` mechanism.

## What Sprint 13 extends (additively) vs never touches

Extended (new optional params only, zero behavior change for any
existing caller who doesn't pass the new argument): `selectBehavior`
(`living-population-runtime`) gains optional `dayPhase`/`routineWindow`.

Never touched: `advanceWorldSimulation` (Sprint 7), `wakeWorld`/
`durableWorldStateRepository` (Sprint 9), `advancePopulationSimulation`'s
own tick-loop structure, `resolvePerception`'s own resource-gating logic,
`GroupState`'s own shape or `advanceGroupState`'s own mechanism (Sprint
10), `deriveWorldEvents`'s existing candidate-building branches beyond
one new category if genuinely warranted (Sprint 11), any
`social-ecology-*` package internals (Sprint 12, read by reference only).

## No conflict found

No genuine architectural or canon conflict blocks Sprint 13. The two new
`ResourceTag` values and their location assignments (`rest` on Kadamba
Grove, `corridor` on Govardhan Path) are Host-layer, non-canonical,
restrained semantic tags on already-Approved locations — the same
judgment-call posture Sprint 10 used for the original resource tags
themselves. Proceeding.
