# Sprint 10 — Persistent Living Population & Behavior: Final Report

**As of:** 2026-08-09. Branch `feature/sprint10-living-population`, branched
from `feature/sprint9-persistent-world` @ `6a01161`. Not merged to RC3, no
database migration applied. Verify against `git log` before trusting
anything below.

## 1. Repo / branch / commit

`avatark-platform-web`, branch `feature/sprint10-living-population`. See
commit list below (this report is written just before the final commit).

## 2. Packages/modules created

- `packages/living-population-contracts` — needs, rhythm, behavior
  profile, perception, behavior/movement intent, `EntityBehaviorState`/
  `GroupState` + repository interfaces, `EncounterOpportunity`,
  `PopulationSnapshot`, `WorldLocationGraph`. Zero implementations, zero
  renderer objects.
- `packages/living-population-runtime` — rhythm resolution, deterministic
  need evolution, bounded perception, utility-based behavior selection,
  world-graph-legal movement resolution, herd/flock group dynamics, the
  population tick loop (composing Sprint 7's `advanceWorldSimulation`
  unmodified), reference in-memory repositories. 49 tests.
- `lib/livingPopulation/` (Host layer, additive) — `vrindavanPopulationDefinition.ts`
  (the two neutral archetypes, resource tags, rhythm schedules, location
  graph), `singleton.ts`, `hostService.ts` (seed/read/advance/wake/
  embodiment/Unreal-group-commands), `embodimentBridge.ts`.
- Extensions (additive, backward-compatible) to Sprint 8's
  `@avatark/world-embodiment-contracts`/`-runtime`: `EntityPresentation`
  gained `movementSemantic`/`movementTargetLocationId`/`groupId`;
  `resolveWorldEmbodiment` gained `additionalEntityPresentationsByLocation`;
  `UnrealCommand` gained `MoveEntityToRegion`/`SetGroupIntent` +
  optional `groupId` on `PlaceEntity`/`UpdateEntity`.
- One new dev-only route (`.../persistence/population-embodiment`) and a
  restrained diagnostic line added to the existing `LivingSystemsSnapshotView`
  component.
- `supabase/migrations/027_living_population_state.sql` — prepared,
  unapplied schema (2 new tables; entity identity itself reuses migration
  026's own `living_entity_state` table, no duplicate).

## 3. Population state model

`PopulationSnapshot { worldId, tick, entities: PopulationEntitySnapshot[],
groups: GroupState[], encounterOpportunities }` — always resolved fresh
from `EntityBehaviorState`/`GroupState`/`LivingEntityState`, never itself
a second store (`resolvePopulationSnapshot`, mirroring Sprint 7's own
`resolveWorldSnapshot`).

## 4. Entity archetype model

Two neutral, non-narrative, capability-tagged archetypes for Living
Vrindavan — `avatark-population-cow` (herd, @ yamuna) and
`avatark-population-bird-flock` (flock, @ kadamba-grove) — deliberately
**not** part of the StudioK-vendored systems artifact; a Host-layer,
easy-to-remove judgment call explicitly authorized by this sprint's own
mission text ("cow, calf, bird... where supported"). The two *existing*
StudioK-Approved archetypes (`riverbank-vegetation`, `ambient-bird-flock`)
are completely untouched, still driven by Sprint 7's own
`advanceEntityLifecycle`. Capabilities: `can_move`, `can_graze`,
`can_drink`, `can_rest`, `can_group`, `can_forage`, `can_flock`.

## 5. Needs model

Four dimensions (`hunger`, `thirst`, `rest`, `social`), pressure in
`[0, 1]`, `NeedDefinition{baselinePressurePerTick, thresholds.urgentAbove}`.
Deterministic evolution: satisfied → falls by a fixed relief amount;
unsatisfied → rises by baseline × a genuine environmental multiplier
(temperature for thirst, vegetation activity — inversely — for hunger).
Proven NOT a label swap: `needsEvolution.test.ts`'s two causal tests, and
`populationSimulation.test.ts`'s season-level proof (Grīṣma thirst >
Vasanta thirst for identical elapsed ticks).

## 6. Rhythm model

`RhythmSchedule{ticksPerCycle, entries: {phase, startFractionOfDay}[]}`,
resolved by `tick % ticksPerCycle` — a pure function of logical tick,
never wall-clock time (proven: same tick always yields the same phase,
`rhythm.test.ts`). World-specific schedules (cow: 8-tick cycle; bird
flock: 6-tick cycle) configure the same generic resolver.

## 7. Perception model

`EntityPerception` — current + reachable locations (from the world
graph), local environment, water/vegetation availability (gated by
causal band against a static resource tag, never a raycast or renderer
query), nearby entities, group id, available encounter rule ids (reusing
`resolveAvailableEncounters` unmodified). Proven: the *same* tagged
location genuinely stops offering water once hydrology degrades — no tag
or location changed (`perception.test.ts`).

## 8. Behavior-selection model

Fixed candidate list (`DRINK`/`GRAZE`/`REST`/`SOCIALIZE`/`MOVE_TO_RESOURCE`/
`FOLLOW_GROUP`/`RETURN_TO_GROUP`/`REMAIN`) → capability+availability
eligibility filter → utility = need pressure + rhythm-phase bonus +
group-cohesion baseline → highest score wins, fixed-order tie-break. No
behavior tree framework, no LLM, no dialogue, no personality simulation.
Proven deterministic (`behaviorSelection.test.ts`'s own identical-input
test) and proven that urgent needs override a mismatched rhythm phase.

## 9. Movement model

Semantic only (`MoveToLocation`/`Remain`/`FollowGroup`/`ApproachResource`/
`ReturnToGroup`, target is a `LocationId`, never coordinates). Legality
is checked explicitly against the world graph — an illegal target throws
`IllegalMovementError` rather than silently teleporting
(`movementResolution.test.ts`).

## 10. Herd/flock model

`GroupState{memberEntityIds, locationId, targetLocationId, cohesion}` —
cohesion is the observable fraction of members at the group's own
location; direction is a deterministic majority vote across members who
individually chose to approach a resource; the group relocates once a
majority physically arrives. No renderer-level boids, no individual
trajectory (`groupDynamics.test.ts`).

## 11. Environment → behavior causal proof

`populationSimulation.test.ts`'s dedicated test: identical elapsed ticks,
Vasanta vs Grīṣma, produce measurably different thirst pressure — through
the *full* pipeline (perception availability gating + need-pressure
multiplier), not a mocked unit. Vasanta → Grīṣma still transitions
correctly through the population-integrated causal engine.

## 12. Lifecycle model

Population entities' `LivingEntityState.lifecyclePhase` is written
directly by the behavior engine each tick (`DORMANT`/`RESTING`/`ACTIVE`/
`MOVING`, derived from the selected `BehaviorType` — never a season-label
swap) — and **only** for the population roster. `advanceEntityLifecycle`
(Sprint 7) is never called for these entities; the two vendored
archetypes keep using it exactly as before. No reproduction/birth/death/
predation/disease/aging was added.

## 13. Persistence integration

Population entity identity/location/coarse-lifecycle reuses Sprint 7's
own `LivingEntityStateRepository` (unmodified class), a second, disjoint
roster in a separate repository instance from the vegetation roster.
`EntityBehaviorState`/`GroupState` get two new reference in-memory
repositories (`InMemoryEntityBehaviorStateRepository`/
`InMemoryGroupStateRepository`) and a prepared, unapplied migration
(`027_living_population_state.sql`). No renderer state, no animation, no
renderer-only coordinates persisted anywhere.

## 14. Catch-up result

**PASSED**, at two levels: (a) `populationSimulation.test.ts` proves one
call of N ticks equals N calls of 1 tick, byte for byte, for the full
population pipeline; (b) `lib/livingPopulation/hostService.test.ts`
proves `wakeWorldWithPopulation` drives Sprint 9's own world catch-up and
Sprint 10's population catch-up with the *same* tick count from the *same*
starting state, reaching identical `sharedState` in both — SharedWorldState
itself is written exactly once, by Sprint 9's own `wakeWorld`, never by
population.

## 15. Multi-visitor consistency result

**PASSED.** Population has no visitor parameter at all — the strongest
possible form of "no per-user duplicate population." Two independent
`getPopulationSnapshot` reads of the same world instance are `deepEqual`
(`hostService.test.ts`), and two different world instances remain fully
independent.

## 16. Encounter integration

`computeEncounterOpportunities` combines population presence at a
location with Sprint 7's own `resolveAvailableEncounters`, unmodified —
population contributes *presence*, never a new encounter type, never a
canon mutation. Protected narrative remains read-only throughout
(re-verified: no write-method call exists anywhere in
`living-population-runtime`, statically enforced).

## 17. Embodiment integration

**PASSED.** `EntityPresentation` extended with three nullable fields
(byte-identical output for every pre-Sprint-10 caller); `resolveWorldEmbodiment`
gained one optional param merging population presentations into the
current/reachable regions it already builds. Integration-tested end to
end: `lib/livingPopulation/embodimentBridge.test.ts` shows cows at yamuna
and birds at kadamba-grove appearing in the correct regions of the *same*
`WorldEmbodimentSnapshot`, each carrying its own group id.

## 18. Renderer adapter result

Web: one restrained diagnostic line added to `LivingSystemsSnapshotView`
(movement/group summary, shown only when present). Unreal: two new
headless commands (`MoveEntityToRegion`, `SetGroupIntent`) plus optional
`groupId` on the existing entity commands — zero Unreal classes/assets
anywhere, statically enforced by the existing forbidden-token test.

## 19. Delta reconciliation result

Existing `diffWorldEmbodiment`/`translateEmbodimentDeltaToUnrealCommands`
required no changes — they already operate generically over whatever
fields an `EntityPresentation` carries, so the three new fields flow
through the existing ADD/UPDATE/REMOVE/UNCHANGED machinery without
modification. `unrealCommandTranslator.test.ts` proves a population
entity with a movement target produces both `PlaceEntity` and
`MoveEntityToRegion`.

## 20. Alternate-world reuse proof

**PASSED, zero core changes.** `livingForestPopulationPortability.test.ts`
runs a fictional two-member deer herd through needs, rhythm, perception,
behavior selection, movement, group dynamics, and the season-transition
causal chain — the exact same functions Vrindavan uses. No file in
`living-population-runtime` mentions "forest," "vrindavan," "cow," or
"bird."

## 21. Tests/result

**1120/1120 passing** (996 Sprint 5-8 baseline + 55 Sprint 9 + 69 new
Sprint 10 tests, net of one dependency-boundary suite extended in place).
`npm run typecheck` clean. `npm run lint` clean except pre-existing,
untouched findings (verified by grep — zero lint issues in any Sprint 10
file beyond one intentionally-unused parameter warning matching this
codebase's own existing `_value`-prefix convention). No Playwright was
run or added — Sprint 10 introduced no new visitor-facing UI route (the
one diagnostic line added is inside an existing, already-covered
component reading an already-existing prop shape), so Sprint 8's own
62/62 baseline remains the relevant, unmodified coverage.

## 22. Architectural invariants

All 16 hold:
- **#1/#2** (Living Systems remains authoritative; population creates no
  competing shared-world state) — SharedWorldState is written exactly
  once per advance, exclusively by Sprint 9's own `wakeWorld`/
  `advanceWorld`; population only ever reads it, proven in
  `hostService.test.ts`'s tick-equality assertion.
- **#3** (renderer cannot mutate population state directly) — population
  exposes no renderer-facing mutation path at all; the only writes are
  `advancePopulationForWorld`/seed, both Host-internal.
- **#4/#5** (no Unreal/React dependency in core) — statically enforced,
  `dependencyBoundaries.test.ts`.
- **#6** (entity identity survives persistence/recovery) — population
  entities persist via Sprint 7's own `LivingEntityStateRepository`;
  identity (`entity.id`) never regenerated across ticks.
- **#7** (catch-up deterministic) — §14.
- **#8/#9** (environment causally affects behavior; not a label swap) —
  §11.
- **#10** (visitor memory separate from entity state) — population never
  imports or reads `VisitorWorldMemory`.
- **#11** (protected narrative read-only) — §16.
- **#12** (multi-visitor shared truth identical) — §15.
- **#13** (world graph drives movement legality) — §9.
- **#14** (renderer receives semantic intent, not ownership) — `MovementIntent`/
  `UnrealCommand` carry region ids and semantics only, never coordinates
  or direct state handles.
- **#15** (Sprint 5-9 compatibility) — the two vendored archetypes'
  existing tests, and every Sprint 7/8/9 test file, pass unmodified;
  `EntityPresentation`'s extension is additive and defaults to `null`.
- **#16** (alternate-world fixture, zero core changes) — §20.

## 23. Migrations prepared/applied status

**Nothing applied.** `027_living_population_state.sql` prepared and
registered in `run-platform-migrations.js`'s `MIGRATION_ORDER` for
traceability only (same posture as migrations 023/026) — the migration
script itself was never run, no credentials exist in this environment to
do so safely.

## 24. Technical debt

1. `initialVrindavanPopulationEntities`'s `worldInstanceId` parameter is
   currently unused (entity ids are fixed strings, not yet
   instance-namespaced) — fine for the single-instance case this sprint
   exercises; a real multi-instance Vrindavan population would need
   instance-qualified entity ids, deferred deliberately (out of this
   sprint's scope, matching Sprint 9's own instance-model boundary).
2. The population-aware embodiment route is dev-only; whether the real,
   authenticated `/api/account/living-vrindavan/embodiment-snapshot`
   route should switch from Sprint 7/8's in-memory singleton to the
   Sprint 9/10 durable+population path is a product decision this sprint
   does not make unilaterally (same posture Sprint 9 took with its own
   durable routes).
3. `VRINDAVAN_LOCATION_GRAPH`'s undirected reinterpretation of the
   StudioK-authored directed `connections[]` is a Host-layer judgment
   call (documented in `docs/SPRINT10_GROUND_TRUTH.md`) — correct for
   this vertical slice's tree-shaped graph, would need revisiting for a
   denser future world graph.
4. Group formation is fixed at seed time (one herd, one flock) rather
   than dynamically re-clustering by proximity — sufficient to prove the
   architecture; dynamic re-grouping is a natural, deferred extension.

## 25. Blockers

None. No genuine architectural or canon conflict arose — the roster-split
decision (§4) is a documented judgment call, not a blocker, and is easy
to revisit.

## 26. Exact recommendation

Sprint 10 proves the full population/behavior pipeline end to end,
additively, without touching Sprint 7's causal engine or Sprint 9's
persistence/concurrency/lease machinery. The most direct Sprint 11
candidates: (a) a real StudioK governance pass to formally authorize (or
replace) the two neutral population archetypes this sprint added at the
Host layer, now that the architecture proving their value is complete;
(b) dynamic group formation/re-clustering; (c) extending encounter rules
to react to population presence more richly (still non-narrative). Ask
before assuming which.

PERSISTENT LIVING POPULATION FOUNDATION VERIFIED — READY FOR SPRINT 11
