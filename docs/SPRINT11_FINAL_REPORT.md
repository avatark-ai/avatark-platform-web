# Sprint 11 — Emergent Encounters & World Memory: Final Report

**As of:** 2026-08-09. Branch `feature/sprint11-world-memory`, off
`feature/sprint10-living-population` @ `5f0922f`. Not merged to RC3, no
database migration applied. Verify against `git log` before trusting
anything below.

## 1. Repo / branch / commit

`avatark-platform-web`, branch `feature/sprint11-world-memory`. See
commit list below (written just before the final commit).

## 2. Packages/modules created

- `packages/world-memory-contracts` — `WorldEvent`/`WorldEventCategory`,
  `WorldConsequence`, `EntityMemoryEntry`, `HistoricalMarker`/
  `HistoricalCondition`, `EncounterHistoryEntry`, `ReturnRecognition`,
  `MemorySignificance`/`RetentionTier`/`MemoryRetentionPolicy`,
  `MemoryProvenance`/`CausalReference`, and four repository interfaces.
  Zero implementations.
- `packages/world-memory-runtime` — significance filter, WorldEvent
  derivation, Entity Memory derivation, memory-influenced-behavior
  bridge, emergent-encounter resolution, encounter-history tracking,
  ReturnRecognition computation, a retention/compaction reference
  policy, and four reference in-memory repositories. 49 tests.
- `lib/worldMemory/` (Host layer, additive) — `singleton.ts`,
  `vrindavanMemoryDefinition.ts` (significance config + one emergent
  rule), `hostService.ts` (`wakeWorldWithMemory`, `getReturnRecognition`,
  `getEmergentEncounterOpportunities`, `getEmbodimentWithHistory`).
- Small, additive extensions to Sprint 10's own packages: `PopulationEvent`
  type + `populationEvents` field on `AdvancePopulationSimulationResult`
  (`living-population-contracts`/`-runtime`); an optional `MemoryHint`
  param on `selectBehavior`; an optional `memoryHintByEntityId` param on
  `advancePopulationForWorld`/`wakeWorldWithPopulation`
  (`lib/livingPopulation/hostService.ts`).
- `lib/renderer/webMemoryRenderer.ts` — minimal diagnostic label
  mapping, no prose.
- `supabase/migrations/028_world_memory.sql` — prepared, unapplied
  schema (4 new tables; documents source-of-truth vs derived fields).

## 3. State/memory ownership map

All six domains stayed structurally distinct (docs/SPRINT11_GROUND_TRUTH.md
has the full map): Shared World State and Entity/Living State are
unchanged, exclusively owned by Sprint 9/10's own Host modules. Entity
Memory and World Memory are new, owned by `lib/worldMemory/`. Visitor
Meaningful Memory (`VisitorWorldMemory`) is untouched. Protected
Canonical Narrative remains read-only, get-only, with no write path
added anywhere this sprint (statically re-verified).

## 4. World Event model

`WorldEvent{id, worldId, tick, category, locationId, participantEntityIds,
causalReferences, consequences, significance, retentionTier, provenance,
occurredAt}`. Ten categories (`SEASON_TRANSITION` through
`LOCATION_CONDITION_CHANGED`). World Memory never re-derives simulation
facts itself — `deriveWorldEvents` reacts to plain, already-structured
deltas the Host layer builds from Sprint 7/9/10's own outputs.

## 5. Significance model

`evaluateSignificance(candidate, config)` — a deterministic, per-category
switch, zero randomness, zero LLM involvement. Season transitions and
group formation/dispersal are always `LANDMARK`; environmental/resource/
location changes are `MEANINGFUL` only on an actual scarcity-crossing or
availability flip; population movement is `MEANINGFUL` only for a
group-level relocation, never routine individual movement; bare activity
transitions are never significant alone. Scarcity bands are
world-grammar configurable (`SignificanceConfig`), not hardcoded —
proven by a dedicated test using a non-default config.

## 6. Causal provenance model

`CausalReference{kind, ref}` (e.g. `{kind:"band", ref:"hydrologyBand:low"}`)
and `MemoryProvenance{derivedFromEventIds, derivationRule,
causalReferences}` — structured data only, never a prose explanation
string. Every derived `WorldEvent`/`EntityMemoryEntry` carries its own
provenance back to the events/consequences that produced it.

## 7. World Memory model

Four bounded query methods (`listSince`/`listByLocation`/`listByEntity`/
`listByCategory`/`listRecent`) over an idempotent, append-only store —
explicitly NOT current world state, NOT the raw `WorldSystemEventRecord`
stream, NOT Experience Registry, NOT Visitor Memory. Reference
implementation (`InMemoryWorldEventRepository`) dedupes by content-derived
id.

## 8. Entity Memory model

Five entry types (`PREVIOUS_RESOURCE_LOCATION` through
`RECENT_ENCOUNTER_INVOLVEMENT`) — ecological/behavioral continuity only;
no emotion, personality, belief, or LLM content anywhere in the type or
its derivation. Bounded to the 5 most recent entries per
`(entityId, type)` in the reference repository (proven by a dedicated
test appending 10 and observing the bound).

## 9. Memory-influenced behavior result

**PASSED, bounded and legality-preserving.** `selectBehavior` gained an
optional `memoryHint` — a remembered resource location wins over the
perception-default "first reachable" pick, but ONLY among locations
perception has *already* deemed viable this tick; a memory hint
pointing at a location perception never granted is proven to be
silently ignored (`behaviorSelection.test.ts`). `wakeWorldWithMemory`
resolves each entity's own hint from stored `EntityMemoryEntry` records
before every advance.

## 10. Consequence model

Five consequence types (`HISTORICAL_MARKER` through
`ENCOUNTER_ELIGIBILITY_CHANGE`), data-driven, attached directly on the
`WorldEvent` that produced them — no arbitrary callbacks, no
world-specific conditional logic inside the derivation engine itself
(the *only* world-specific input is the Host-supplied
`SignificanceConfig`/emergent-rule list).

## 11. Emergent encounter result

**PASSED.** `resolveEmergentEncounterOpportunities` is a second pass
over Sprint 7/10's own unmodified base computation — an opportunity
emerges only when a qualifying `WorldEventCategory` occurred at a
location within a configured tick window AND something is currently
present there; proven both for presence-without-history and
history-without-presence producing no emergence, and for the positive
case producing exactly one new opportunity, live-wired end to end via
`getEmergentEncounterOpportunities`.

## 12. Encounter-history model

`EncounterHistoryEntry{status: AVAILABLE|RESOLVED|NO_LONGER_AVAILABLE}`,
tracked by diffing two ticks' own opportunity sets
(`trackEncounterHistory`) — current-tick availability itself is still
entirely Sprint 7/10's own computation. `RESOLVED` is modeled and has a
dedicated builder (`recordEncounterResolved`) reusing Sprint 8's
existing non-mutating select-encounter check as its trigger, though this
sprint wires and unit-tests the mechanism without adding a new live
route call site for it (see §28, technical debt #2).

## 13. ReturnRecognition model

`computeReturnRecognition(worldId, userId, sinceTick, currentTick,
eventsSince)` — a fixed `WorldEventCategory -> ReturnRecognitionFactType`
mapping, aggregated (never duplicated per-event), zero prose anywhere
in the type or its computation. `getReturnRecognition` is the one live
Host entry point, backed entirely by `worldEventRepository.listSince`.

## 14. Historical-continuity proof

**PASSED end to end** (`lib/worldMemory/hostService.test.ts`'s own
dedicated test): a visitor "arrives" at tick 0, "leaves," the world
advances unobserved past Vasanta's `minDurationTicks`, Vasanta → Grīṣma
fires, the transition is recorded as `WorldEvent`, and the visitor's own
`ReturnRecognition` against tick 0 correctly reports `season_changed`
matching the world's own current, correct Grīṣma state.

## 15. Divergent-history proof

**PASSED.** Two world instances sharing the identical grammar/config
(same archetypes, same significance rules, same emergent rules) but
given different elapsed wall-clock time before their own first wake
produce genuinely different `WorldEvent` sequences (one stays in
Vasanta with zero season events; the other reaches Grīṣma with one) —
`assert.notDeepEqual` on the two instances' own histories, both derived
through the identical, unmodified engine.

## 16. Canonical-protection result

**PASSED.** No table in the prepared migration touches protected
narrative state; no method call anywhere in `world-memory-runtime` or
`lib/worldMemory/` touches a narrative write method (there is none on
the interface to call) — statically re-verified by an extension of the
existing dependency-boundary test, and behaviorally proven by a
dedicated full-cycle test.

## 17. Visitor-memory separation

**PASSED, explicitly.** World Memory accumulates with literally zero
visitor parameter anywhere in its own derivation or storage path — a
brand-new visitor who "never visited before" still observes the world's
full accumulated `ReturnRecognition` against tick 0, proving World
Memory ("this occurred in the world") is never conflated with Visitor
Memory ("this visitor experienced X").

## 18. Multi-visitor result

**PASSED.** Two visitors' own `ReturnRecognition` calls are computed
against each visitor's own `sinceTick`, independently, while both
observe the identical `currentTick` (shared world truth) — proven with
Visitor A departing at an earlier tick than Visitor B, each correctly
seeing a different (or equal-or-greater) amount of history relative to
their own departure point, never cross-contaminated.

## 19. Persistence/checkpoint integration

Every new repository (`WorldEventRepository`, `EntityMemoryRepository`,
`HistoricalMarkerRepository`, `EncounterHistoryRepository`) is idempotent
by content-derived id, the same discipline Sprint 9 established for
`WorldSystemEventRecord`. A dedicated test proves World Memory recorded
by one `wakeWorldWithMemory` call is independently queryable afterward,
unaffected by intervening reads — the "recovery" proof this sprint's
reference (in-memory) adapters can actually exercise. No table in the
prepared migration is redundant: `entity_memory_entries`/
`historical_markers` are documented as *derived-but-durably-stored*
(never re-derived from `world_events` on every read), while
`encounter_history_entries` and `world_events` are the source of truth
for their own domains (migration's own header comment spells out
exactly which).

## 20. Replay/idempotency result

**PASSED at both the pure-function and Host-integration levels.**
`worldEventDerivation.test.ts`/`replayIdempotency.test.ts` prove deriving
from the identical interval twice produces identical ids and, once
appended, zero duplicate rows (`M`, never `M+M`). `hostService.test.ts`'s
own "waking twice at the identical instant" test proves the live Host
path: zero elapsed ticks between two wakes means zero new candidate
events, so nothing is even offered for (re-)append.

## 21. Retention/compaction contract

`RetentionTier = RECENT|DURABLE|LANDMARK|COMPACTABLE`. `LANDMARK`
significance always starts and stays `LANDMARK` (never ages, never
compacts). Everything else ages `RECENT → DURABLE → COMPACTABLE` on a
configurable tick schedule (`MemoryRetentionPolicy`). `compactWorldEvents`
is a reference pass proving the *contract* (which events are eligible)
— not a real archival pipeline; explicitly not implemented as
production infrastructure, per the mission's own scope guard.

## 22. Embodiment integration

**Host-level composition only** — `WorldEmbodimentSnapshotWithHistory`
wraps an unmodified `WorldEmbodimentSnapshot` with a `history` field
(`recentWorldChanges`, `historicalMarkers`, `returnRecognition`,
`encounterHistoryState`). Neither `@avatark/world-embodiment-contracts`
nor `-runtime` gained any new dependency on World Memory — a deliberate
choice to avoid widening that contract a second time (Sprint 10 already
widened it once for population).

## 23. Renderer-neutrality result

**PASSED.** Statically enforced (dependency-boundary extension: zero
React/Next.js/Unreal tokens in either new package's source). The one Web
renderer touch (`webMemoryRenderer.ts`) is a fixed label-mapping module
producing short phrases from closed vocabularies — never a paragraph,
never "While you were away...".

## 24. Alternate-world reuse proof

**PASSED, zero core changes.** `livingForestMemoryPortability.test.ts`
runs the fictional deer-herd fixture through significance filtering,
`WorldEvent` derivation (including a `LANDMARK` season transition and a
`MEANINGFUL` group relocation), Entity Memory derivation, emergent
encounter resolution, and `ReturnRecognition` — the exact same functions
Vrindavan uses. No file in `world-memory-runtime` mentions "forest,"
"vrindavan," "cow," or "bird."

## 25. Migrations prepared/applied status

**Nothing applied.** `supabase/migrations/028_world_memory.sql` — 4
tables, RLS read-only for authenticated clients on all four (world-truth,
not visitor-owned), registered in `run-platform-migrations.js`'s
`MIGRATION_ORDER` for traceability only, same posture as migrations
023/026/027. The migration script itself was never run.

## 26. Focused tests + regression result

**1195/1195 passing** (1120 Sprint 5-10 baseline + 75 new/extended
Sprint 11 tests: 1 contracts + 49 world-memory-runtime + 3 population-event
extensions + 8 Host-level `lib/worldMemory` integration tests + 5 web
renderer + ~9 dependency-boundary extensions). `npm run typecheck` clean.
`npm run lint` clean except pre-existing, untouched findings (verified by
grep — zero lint issues introduced by any Sprint 11 file). No targeted
test was skipped; the full existing suite was re-run once at the end
specifically because this sprint's changes touched shared boundaries
(`EntityPresentation`-adjacent Sprint 10 files, `advancePopulationSimulation`'s
own result shape) that warranted the one full-suite confirmation the
mission's own Phase 25 anticipates, rather than assuming targeted tests
alone were sufficient.

## 27. Architectural invariants

All 23 hold. The ones with dedicated new proof this sprint:
- **#1-#5** (current state ≠ World Memory ≠ WorldSystemEvent stream ≠
  Entity Memory ≠ Visitor Memory) — structurally distinct types/stores,
  §17 proves the Visitor/World distinction behaviorally.
- **#6** (Protected Canon ≠ emergent history) — §16.
- **#7** (simulation creates state; history observes consequences) —
  `deriveWorldEvents` never mutates simulation state, only reads deltas.
- **#8** (renderer cannot create authoritative history) — no renderer
  code path anywhere calls `worldEventRepository.append`.
- **#9** (visitor absence does not stop world history) — every
  `wakeWorldWithMemory` call in this sprint's own tests runs with zero
  visitor present at all.
- **#10/#11** (entity memory influences behavior only through bounded
  deterministic rules; cannot bypass legality) — §9.
- **#12/#13** (World Memory survives checkpoint/recovery; replay is
  idempotent) — §19/§20.
- **#14** (multi-visitor history shared) — §18.
- **#15** (return recognition visitor-specific) — §18.
- **#16/#17/#18** (no canon write path; Unreal-free; Web/React-free) —
  §16, §23.
- **#19** (world-specific rules remain data-driven) —
  `SignificanceConfig`/`EmergentEncounterRule` are both Host-supplied
  config, not engine branches.
- **#20** (alternate-world fixture, zero core changes) — §24.
- **#21/#22/#23** (Sprint 7 causal chain / Sprint 9 persistence / Sprint
  10 population engine remain authoritative, unmodified) — Sprint 7's
  `advanceWorldSimulation`, Sprint 9's `wakeWorld`/`durableWorldStateRepository`,
  and Sprint 10's `advancePopulationSimulation` core logic were not
  rewritten; only additive, backward-compatible fields/params were added
  (`populationEvents`, `memoryHintByEntityId`), each proven non-breaking
  by the full pre-existing Sprint 9/10 test suites passing unmodified.

## 28. Technical debt

1. `EncounterHistoryEntry`'s `RESOLVED` status has a builder
   (`recordEncounterResolved`) and is unit-tested, but no live route
   currently calls it from the real `select-encounter` InteractionIntent
   path — wiring that specific trigger was deferred given this sprint's
   already-large scope; the mechanism is proven, the live call site is
   not yet connected.
2. `computeLocationConditionsByCategory` in `lib/worldMemory/hostService.ts`
   restates the same water/vegetation-availability band rule
   `@avatark/living-population-runtime`'s own `perception.ts` already
   has — a deliberate duplication (World Memory must not depend on
   population-RUNTIME internals, per this sprint's own dependency-direction
   decision) rather than an oversight, but worth a shared-constants
   extraction if a third consumer of this exact rule appears.
3. `compactWorldEvents` is a reference contract, not a scheduled job —
   nothing currently calls it in the live Host path; a future sprint
   would need to decide when/how often compaction actually runs.
4. The one emergent-encounter rule shipped
   (`avatark-population-recent-arrival-kadamba-grove`) is a single
   illustrative example, not a curated set — proving the mechanism, not
   exhausting its design space.

## 29. Blockers

None. No genuine architectural or canon conflict arose.

## 30. Exact recommendation

Sprint 11 proves the full memory/history pipeline end to end,
additively, without rewriting Sprint 7's causal engine, replacing Sprint
9's persistence, or creating a competing population engine. The most
direct Sprint 12 candidates: (a) wire `EncounterHistoryEntry.RESOLVED`
into the live `select-encounter` route (technical debt #1); (b) a real
compaction scheduler exercising the `compactWorldEvents` contract
against actual elapsed time; (c) expand the emergent-encounter rule set
now that the mechanism is proven. Ask before assuming which.

EMERGENT WORLD MEMORY FOUNDATION VERIFIED — READY FOR SPRINT 12
