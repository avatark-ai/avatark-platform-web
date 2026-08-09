# Sprint 17, Phase 0 — Long-Horizon World Evolution: Architecture / Specification

**Status:** architecture/specification preparation only. No runtime code, no migrations, no
modifications to Sprint 15, Sprint 16, or any shared runtime package. Branch:
`feature/sprint17-phase0-long-horizon-evolution`, forked from the completed Sprint 14 state
(`7c54cb9`, same base Sprint 16 Phase 0 used), in its own isolated worktree — neither the
concurrently-running Sprint 15 worktree nor the Sprint 16/Sprint 18 Phase 0 worktrees are touched.

Every fact below marked as "existing" was read directly from source in this worktree — primarily
`packages/world-persistence-contracts`, `packages/world-persistence-runtime`,
`packages/living-systems-{contracts,runtime}`, `packages/living-population-{contracts,runtime}`,
`packages/world-memory-{contracts,runtime}`, `packages/social-ecology-{contracts,runtime}`,
`packages/living-rhythms-{contracts,runtime}`, `packages/encounter-realization-{contracts,runtime}`,
`packages/world-embodiment-runtime`, and the Host wiring in `lib/worldPersistence/hostService.ts`,
`lib/livingPopulation/hostService.ts`, `lib/worldMemory/hostService.ts`,
`lib/socialEcology/hostService.ts`, `lib/livingRhythms/hostService.ts`,
`lib/encounterRealization/hostService.ts`. Sprint 15 (World Adaptation) and Sprint 16 Phase 0
(Spatial Ecology) are treated strictly as **proposed/unstable dependencies** — cited only for the
seam they will eventually need, never as load-bearing fact.

## The headline finding

**Before designing anything, this Phase 0 needs to correct its own mission framing on one point:**
the deterministic catch-up pipeline the mission brief asks Sprint 17 to "study" is not a single
Sprint 9 mechanism that stops at the causal environment — it is **already a fully composed,
six-layer chain spanning Sprints 9 through 14**, wired end-to-end, tick-exact, and already the
subject of per-sprint equivalence/replay proofs:

```
wakeWorld                         (Sprint 9  — world clock/season/environment/entity lifecycle)
  └─ wakeWorldWithPopulation      (Sprint 10 — population/behavior/movement/groups)
      └─ wakeWorldWithMemory      (Sprint 11 — world events/entity memory/return recognition)
          └─ wakeWorldWithSocialEcology  (Sprint 12 — relationships/familiarity/territory)
              └─ wakeWorldWithRhythms    (Sprint 13 — day phase/routines/place occupancy)
                  └─ wakeWorldWithEncounterRealization  (Sprint 14 — encounter records/consequences)
```

Each layer is additive Host-layer composition (`lib/<domain>/hostService.ts`), never a modification
of the layer beneath it — exactly the discipline every sprint's own ground-truth doc already claims
for itself. This means most of what the mission brief's §§1–3, 15–19 ask Sprint 17 to "design" is,
strictly, **already built** for short-to-medium absences. Sprint 17 Phase 0's real, honest job is
therefore threefold, and this document is organized around all three:

1. **Formalize** this already-composed chain as a single, named architecture (no existing document
   describes it end-to-end; each sprint's ground-truth doc only describes its own one-layer hop).
2. **Name the real gaps precisely**, verified against actual code, not invented ones. The most
   important is a genuine correctness gap in how elapsed time is "claimed" partway through the
   chain (§15/§16/§17) — a crash between two specific lines of existing code causes downstream
   layers to silently lose elapsed ticks. This is real, reproducible from the code read below, and
   is the single most load-bearing finding in this document.
3. **Design what does not yet exist**: Evolution Windows as an operational bounding/resumability
   concept (§4), extending checkpoint scope to the five layers it currently excludes (§17), and the
   temporal semantics needed for absences long enough to cross season boundaries or strain a single
   request's execution budget (§2, §25).

## 1. Ground truth (read directly from Sprint 7–14 source + Host wiring)

| Concern | Type / function | Package | What it actually does |
|---|---|---|---|
| Logical time | `WorldClock { worldId, tick, paused }` | `living-systems-contracts` | `tick` is the *only* authoritative time value; deliberately world-defined scale, no wall-clock mapping baked in |
| Wall-clock → ticks | `TickPolicy.ticksElapsed(lastAdvancedAtMs, nowMs)`, `fixedRateTickPolicy(msPerTick)` | `world-persistence-runtime/tickPolicy.ts` | Explicit seam: "the mapping from elapsed WALL-CLOCK time to how many LOGICAL ticks... is product policy, not core runtime semantics." The reference policy is `floor(elapsedMs / msPerTick)`. |
| Season | `SeasonDefinition { order, environmentalEnvelope, minDurationTicks, allowedNextSeasonIds }`, `SeasonState { currentSeasonId, enteredAtTick }` | `living-systems-contracts` | Transition legality is **data** (`allowedNextSeasonIds`), never a hardcoded rule; only 2 seasons are authored today (Vasanta, Grīṣma, per Canon) |
| Shared world state | `SharedWorldState { worldId, worldVersion, clock, season, environment }` | `living-systems-contracts` | The one aggregate every visitor shares |
| Environmental causal chain | `advanceWorldSimulation({ sharedState, seasonDefinitions, entityArchetypes, entities, ticks, seed, now })` | `living-systems-runtime/simulation.ts` | A **plain `for` loop, 0..ticks**, each iteration: advance clock by 1 → resolve season transition → derive weather → derive hydrology → derive ecology → step every entity's lifecycle via a seeded `deriveDeterministicVariation`. Events (`season.transitioned`, `entity.lifecycle_changed`, `clock.advanced`) are emitted only on real transitions — **not one event per tick** (already bounded). |
| Deterministic catch-up (world layer) | `computeDeterministicCatchUp(params)` | `world-persistence-runtime/catchUp.ts` | Calls `advanceWorldSimulation` with the *whole* elapsed tick count in one call. Its own comment states the load-bearing invariant: "a dormant world that comes back after wall-clock time has passed and an active world ticking forward in real time reach IDENTICAL states for the same (starting state, ticks, seed) — because both paths are the same function call." |
| Population catch-up | `advancePopulationSimulation({ ..., ticks })` | `living-population-runtime/populationSimulation.ts` | Its own `for` loop calls `advanceWorldSimulation({ ..., ticks: 1 })` **once per iteration** (not once for the whole batch) specifically so "every population decision this tick sees that EXACT tick's real environment" — the same catch-up/live equivalence Sprint 9 proved for the causal engine alone, extended here. |
| World lifecycle | `WorldLifecycleState = "DORMANT" \| "WAKING" \| "ACTIVE" \| "QUIESCING"`, transition table in `nextLifecycleState` | `world-persistence-{contracts,runtime}` | A closed transition table; illegal transitions return `null`, not a silent no-op. `ResourceTier` (`HOT`/`WARM`/`COLD`) is a **derived read**, never a second stored field. |
| Execution ownership | `WorldLease { ownerId, leaseVersion, expiresAt }`, `WorldLeaseRepository.acquire/renew/release` | `world-persistence-contracts` | TTL-based optimistic lease; `acquire` succeeds only if no lease exists or the existing one expired — otherwise a first-class `conflict` result naming the current holder |
| Optimistic concurrency | `ConditionalSaveResult<TState> = "saved" \| "conflict"` | `world-persistence-contracts` | Every durable state write is `expected version N → write N+1`; never last-write-wins |
| Durable events | `WorldSystemEventRecord extends WorldSystemEvent` with `eventId` (content-derived) + `sequence` (monotonic) | `world-persistence-contracts` | `append` is idempotent by `eventId`: a retried append of the same event returns `duplicate_ignored` with the *original* sequence, never a duplicate row |
| Checkpoint | `WorldCheckpoint { sharedState, entities, eventSequenceAsOf, reason }` | `world-persistence-contracts` | **Scope is exactly Sprint 7's `SharedWorldState` + `LivingEntityState[]` — nothing from Population/Memory/SocialEcology/Rhythms/EncounterRealization is included.** This is the single most important scoping fact for §17. |
| World Memory retention | `RetentionTier = "RECENT" \| "DURABLE" \| "LANDMARK" \| "COMPACTABLE"`, `MemoryRetentionPolicy { recentWindowTicks, durableWindowTicks }` | `world-memory-contracts/retention.ts` | Already a bounded-history *contract* (ages RECENT→DURABLE→COMPACTABLE by tick count); `LANDMARK` never ages/compacts; **Protected Canon has no tier at all — it is never stored as a `WorldEvent` in the first place.** |
| Place occupancy / rhythm | `PlaceOccupancy` (always derived fresh, no repository), `PlaceRhythmProfile` (a bounded `(locationId × dayPhase × occupancyLevel)` counter, "never an event log") | `living-rhythms-{contracts,runtime}` | Already the exact "bounded summary, not infinite log" posture §6 of this mission asks for |
| Territory (Sprint 12) | `HomeRange { preferredLocationIds }`, `PlaceAttachment` (derived) | `social-ecology-contracts` | Composes with Sprint 16 Phase 0's proposed `TerritoryClaim`/`TerritoryPressure` (§10 below) |
| Relationship/familiarity evidence | `RelationshipEvidence { coPresenceTicks, sharedGroupTicks, reunionCount, encounterCount? }`, `evolveRelationshipEvidence(current, coPresentThisTick, sharedGroupThisTick, ...)` | `social-ecology-{contracts,runtime}` | **Per-tick evidence accumulation** — whether two entities were co-present *this specific tick* is what increments the counter; there is no closed form that reconstructs this from a summary (§3, §6) |
| Encounter realization | `EncounterRecord { status, causalReferences, variationConsulted, ... }`, `resolveEncounterRealization` | `encounter-realization-{contracts,runtime}` | Idempotent via a **content-derived id** (`deriveEncounterRecordId(worldId, ruleId, locationId, participantEntityIds, startTick)`) looked up *before* any work — a replayed wake that recomputes the identical opportunity finds the existing record and does nothing further |
| Protected narrative | `ProtectedNarrativeMutationAttemptError`, a get-only repository | `world-persistence-contracts`, `living-systems-contracts` | The write path does not exist as a callable operation — enforced at the type/contract level, not by a runtime check that could be skipped |
| worldInstanceId isolation | `WorldInstanceId = WorldId` (same string space, Sprint 9), every repository keyed by it | all packages | Absolute since Sprint 9; nothing in Sprints 10–14 introduces an unscoped store |
| Renderer delta | `diffWorldEmbodiment(prev: WorldEmbodimentSnapshot, next: WorldEmbodimentSnapshot): WorldEmbodimentDelta` | `world-embodiment-runtime/embodimentDelta.ts` | A **two-snapshot diff** — the renderer boundary already never sees intermediate ticks, only before/after. This substantially pre-answers §21. |

## 2. Long-horizon time semantics

Reusing exactly the vocabulary already in the codebase (per the mission's own instruction not to
invent names where better ones exist):

| Term | Existing type | Meaning |
|---|---|---|
| **Simulation time** | `WorldClock.tick` | The only authoritative time value; world-defined scale |
| **Wall-clock time** | `Timestamp` (ISO-8601 string), consulted only via `now()` and `TickPolicy` | Never read directly by any causal function — always passed in |
| **Visitor session time** | out of scope of Living Systems entirely — owned by `@avatark/experience-registry`'s `ExperienceEvent`s (Sprint 7's own `systemEvent.ts` comment: explicitly *not* this) | Not a Sprint 17 concern |
| **Elapsed absence** | `TickPolicy.ticksElapsed(lastAdvancedAtMs, nowMs)`, currently computed once, inside `wakeWorld`, from `WorldLifecycleRecord.lastActiveAt` | See §15/§16 for why this single computation site is the architecture's central risk |
| **World age** | not currently modeled — `SharedWorldState.clock.tick` since world-instance creation is the closest existing proxy | **PROPOSED**, additive only: no change needed; "age" is just `clock.tick`, already available |
| **Season progression** | `SeasonState.enteredAtTick` + `SeasonDefinition.minDurationTicks`/`allowedNextSeasonIds` | Already fully general; §11/§12 |

**New vocabulary this document proposes, deliberately matching the mission's own tentative names
where they don't collide with anything existing:**

```
tick                    -- existing, WorldClock.tick
  ↓
day-phase               -- existing, living-rhythms-contracts DayPhase (Sprint 13)
  ↓
evolution window        -- PROPOSED (§4) -- a bounded run of N ticks through the full composed chain
  ↓
epoch                   -- PROPOSED, descriptive only -- "the sequence of evolution windows applied
                           since the last checkpoint," never itself a stored/authoritative concept
```

An "epoch" is *not* a new time unit alongside tick/season — it is a bookkeeping label for "how far
one wake has progressed," useful for progress reporting (§14) and nothing else. The only
authoritative time value in the entire system remains `tick`, exactly as Sprint 7 established.

## 3. Do not simulate every second — what the codebase already proves, and what it doesn't

**What already holds, verified from code (§1):** catch-up is *not* naive re-simulation from tick
zero — it is a single bounded call (`computeDeterministicCatchUp`/`advancePopulationSimulation`,
etc.) that accepts an explicit `ticks: number` and executes exactly that many logical steps, once,
regardless of how much wall-clock time elapsed to produce that count. There is no "replay every
intermediate day" anywhere in the current design — the causal engine has never worked that way.

**What does NOT already hold, and is this Phase 0's actual contribution:** "exactly `ticks` logical
steps" is still **O(ticks)** work — a real `for` loop that executes once per tick, all the way
through six composed layers. For Vrindavan's current scale (4 locations, ~4 entities, an 8-tick cow
cycle) this is trivially cheap even for a month-long absence (a few hundred iterations). It stops
being free once either (a) tick granularity is fine relative to absence length, or (b) entity/rule
counts grow the way Living Forest's spatial grammar implies they will (§23) — the loop body's cost
is `O(entities)` per tick in the population/social/rhythm layers, and `O(locations × rules)` in the
encounter-opportunity layer.

**Where exact per-tick stepping is required, and cannot be aggregated away** (this is a stricter
answer than "some things can obviously be summarized" — the actual causal coupling in this codebase
is tight enough that most downstream state depends on the literal per-tick sequence, not just the
final value):

| System | Why exact stepping is required |
|---|---|
| Weather → hydrology → ecology (Sprint 7) | Hydrology is explicitly a function of weather *history*, not the season baseline (`HydrologyState`'s own comment: "may lag or differ from the current season's hydrologyBaselineBand — that gap is exactly what makes hydrology a real causal consequence of weather history"). Skipping ticks discards the lag itself. |
| Entity lifecycle phase transitions (Sprint 7) | Gated by `deriveDeterministicVariation`, a seeded value keyed by `(worldId, worldVersion, tick, locationId, seasonId)` — a genuine per-tick, per-entity resolution, not a monotonic accumulator that could be closed-formed |
| Population behavior/movement selection (Sprint 10) | `selectBehavior`/`resolveMovementIntent` run against that exact tick's `EntityPerception`, which depends on that exact tick's environment and other entities' exact positions — the whole point of Sprint 10's own "once per tick, never once for the whole batch" design |
| Relationship/familiarity evidence (Sprint 12) | `coPresenceTicks`/`sharedGroupTicks` are counters that increment only when co-presence is *actually true that tick* — this is ground-truth evidence, not a derived statistic; summarizing it would fabricate history |
| Encounter realization / consequence (Sprint 14) | Resolves against the *actual* environmental/population/protected-narrative state at the tick an opportunity existed; this is also directly adjacent to the Canon firewall (§13) — approximating it risks manufacturing or erasing an encounter that the real per-tick conditions would or wouldn't have allowed |
| World Memory provenance (Sprint 11) | A `WorldEvent`/`HistoricalMarker`'s content-derived id and `CausalReference` chain are anchored to the tick they actually occurred at; there is nothing to back-fill after the fact without breaking identity/idempotency |

**Where nothing needs to be "aggregated" because it was never stepped in the first place** —
this is the existing, and correct, escape hatch: `PlaceOccupancy`, `PlaceAttachment`,
`HistoricalCondition`, and Sprint 16 Phase 0's proposed `TerritoryPressure`/`PatchState` are all
**derived fresh from current authoritative state, on read, with no repository**. They do not need a
windowing story at all — after catch-up completes, they are computed once, against the final state,
exactly as today.

**The honest conclusion:** Sprint 17 should not chase "safe aggregation" as a computation shortcut
for the causal core — the coupling is too tight and the mission's own §13 (Canon firewall) makes
approximation of encounter-adjacent state actively dangerous. The real lever for "don't simulate
every second" is **operational, not mathematical**: bound how much of the O(ticks) work happens per
wake invocation (§4), checkpoint between bounds so a long catch-up is resumable and crash-safe
(§17), and — as the one legitimate computational shortcut — detect genuine steady states (§4's
"quiescence" note) rather than aggregate history that isn't actually steady.

## 4. Evolution windows

```ts
// PROPOSED — SUBJECT TO RECONCILIATION WITH SPRINT 15/16
export type EvolutionWindowId = string   // content-derived, see §16

export interface EvolutionWindow {
  id: EvolutionWindowId
  worldInstanceId: WorldInstanceId
  startTick: SimulationTick
  ticks: number                 // bounded -- never "advance forever" (mirrors WorldClock's own
                                 // existing SimulationWindow discipline, extended here)
  reason: "scheduled_bound" | "season_boundary" | "checkpoint_interval" | "quiescence_detected"
}

export interface EvolutionWindowResult {
  windowId: EvolutionWindowId
  endTick: SimulationTick
  seasonTransitionsCrossed: number   // 0, 1, or more -- see §12
  quiescent: boolean                 // true if no entity/population/social/rhythm/encounter state
                                      // changed during this window (see below)
}
```

An evolution window is **purely a scheduling/bounding unit** — it carries no world-specific content
(no Vrindavan location, no Forest sector) and is not a renderer concept. A window is applied by
calling the *existing* composed chain (§1's six layers) with `ticks: window.ticks`, exactly as
`wakeWorld`/`wakeWorldWithPopulation`/etc. already do — a window changes nothing about *how* ticks
are computed, only *how many are attempted before returning control* (to checkpoint, to report
progress, or to respect a request time budget).

**Window boundaries, in priority order:**
1. A hard cap (`scheduled_bound`) — e.g. "advance at most 5,000 ticks per wake invocation,"
   protecting against unbounded work inside one HTTP/function call (§25).
2. A season boundary (`season_boundary`) — stop the window exactly at a season transition tick so
   the resulting checkpoint's `SeasonState` is never mid-transition, and so §12's multi-crossing
   logic can process one transition at a time with a clean provenance record per crossing.
3. A checkpoint interval (`checkpoint_interval`) — a product-tunable cadence (e.g. every N ticks or
   every simulated day) purely to bound crash-recovery blast radius (§17).
4. **Quiescence** (`quiescence_detected`) — the one legitimate computational shortcut: if, after
   evaluating a window, `EvolutionWindowResult.quiescent` is true (no lifecycle phase changed, no
   population entity moved or changed activity, no relationship evidence incremented, no encounter
   opportunity existed) for the *entire* window, a subsequent identical window over unchanged inputs
   is guaranteed to also be quiescent — the runtime may skip literally re-executing it and instead
   record "N further ticks elapsed with no state change," a claim it can prove on demand by
   re-running one tick if ever challenged (never a claim it makes without having verified at least
   one full window). This is detection of an actual fixed point, not summarization of a changing
   one — it never applies to windows that crossed a season boundary or produced any event.

No world-specific grammar (Vrindavan's 4 locations, Forest's 16 patches) appears in
`EvolutionWindow` — it is as reusable across worlds as `SimulationWindow` (Sprint 7) already is.

## 5. Causal accumulation

The existing chain (already enforced by the composition in §1, not a new invention) is:

```
season/time → weather → hydrology → ecology → entity lifecycle
                                                      │
                                                      ▼
                          population behavior/movement/groups (Sprint 10)
                                                      │
                                                      ▼
                    relationship/familiarity/territory evidence (Sprint 12)
                                                      │
                                                      ▼
                        place occupancy/rhythm/routine (Sprint 13)
                                                      │
                                                      ▼
                    encounter opportunity → realization → consequence (Sprint 14)
                                                      │
                                                      ▼
                              world memory / entity memory (Sprint 11)
```

*(Note: Sprint 11's Host wiring — `wakeWorldWithMemory` — sits between Population and Social
Ecology in call order, per §1's headline chain, even though World Memory's own *content* — durable
records of what already happened — is conceptually a sink at the end of this diagram. Both are
true simultaneously: Sprint 11 provides `memoryHintByEntityId` as an *input* to later ticks'
behavior selection (a documented Sprint 11 seam into Sprint 10's engine), while also recording
history as an output. Sprint 17 does not need to resolve this into a strict DAG — the existing
composition order is already causally sound; a Local Place's history influencing later
behavior is exactly the kind of "changed future behavior" the mission brief wants preserved.)*

The mission's own example — "several dry days must produce lower water availability → vegetation
stress → changed animal movement → changed place occupancy → different encounter opportunity" — is
**already mechanically true today**, tick by tick, through the existing composed chain: `hydrology`
(Sprint 7) gates `waterAvailable`/`reachableWaterLocationIds` in `EntityPerception` (Sprint 10,
`perception.ts`), which is what `selectBehavior`/`resolveMovementIntent` act on, which changes
`PlaceOccupancy` (Sprint 13), which is one of the inputs `resolveAvailableEncounters`'s presence
check ultimately reflects (Sprint 7/10's own `computeEncounterOpportunities`). Sprint 17 adds
nothing new to this chain — it only needs to ensure the *window* boundary never truncates it
mid-causal-step (§4's season-boundary and checkpoint-interval window reasons already guarantee
this, since a window always completes a whole number of ticks through the *entire* composed chain,
never a partial layer).

## 6. Temporal history vs. current state

| Domain | Retained as history | Summarized/bounded | Mechanism (existing, reused) |
|---|---|---|---|
| Weather/hydrology/ecology | No history at all — only the current resolved `EnvironmentalState` | N/A — it's a single current value by design (Sprint 7) | none needed |
| Entity lifecycle | Transitions only, as `WorldSystemEvent`s (`entity.lifecycle_changed`) | Yes — one event per *transition*, never per tick | existing `WorldSystemEventRecord` |
| Place occupancy | None — always derived fresh | N/A | existing `PlaceOccupancy` (no repository) |
| Place rhythm pattern | A fixed-shape counter, `(locationId × dayPhase × occupancyLevel)` | Yes, by construction — "the triple space itself is small and finite" | existing `PlaceRhythmProfile` (Sprint 13) |
| Relationship/familiarity evidence | Cumulative counters (`coPresenceTicks`, etc.), not an event log | Yes — bounded to a handful of numeric fields per relationship pair | existing `RelationshipEvidence` |
| Encounter/consequence history | One `EncounterRecord` per realized/rejected attempt + `EncounterHistoryEntry` coarse breadcrumbs | Partially — `EncounterRecord` grows per real instance, not per tick | existing (Sprint 11/14); no new bounding needed at current scale |
| World events/entity memory | Tiered: `RECENT → DURABLE → LANDMARK`/`COMPACTABLE` | **Yes, already a designed contract** (`MemoryRetentionPolicy`) | existing `retention.ts` (Sprint 11) — Sprint 17 reuses this verbatim, never redefines it |
| Territorial pressure | None — always derived fresh from `HomeRange` | N/A | Sprint 16 Phase 0's proposed `TerritoryPressure` (derived, no repository) |

**Sprint 17 introduces no new history-retention mechanism.** World Memory's existing tiered
retention contract already generalizes to long-horizon absences — a month of dormancy simply ages
more events from `RECENT` to `DURABLE`/`COMPACTABLE` under the exact same policy that already
governs a visitor's active session. The one gap worth naming: `MemoryRetentionPolicy`'s window
sizes are expressed in **ticks**, and a long absence can cross many ticks in one catch-up — nothing
currently verifies that compaction correctly processes a large tick delta in one pass rather than
assuming it is only ever called incrementally. This is listed as an acceptance-test item (§28, row
M) rather than a redesign, since the retention *policy* itself needs no change.

## 7. Entity aging / lifecycle

No new dimension is introduced. The existing `LivingEntityState.lifecyclePhase` (a world-authored
string vocabulary, e.g. dormant/budding/flowering/seeding for `riverbank-vegetation`) already *is*
the aging mechanism, and it already composes correctly with long horizons — `advanceWorldSimulation`
steps it once per tick regardless of whether those ticks come from live play or catch-up. What
composes with it, unchanged:

- **Resource condition** — the existing `ecology.vegetationActivityBand`/`animalActivityBand`
  (world-global today, Patch-scoped once Sprint 16 lands) already gates lifecycle progression via
  `advanceEntityLifecycle(entity, archetype, ecology, variationValue, tick)`.
- **Home range / routine / relationship / group membership** — each already has its own catch-up
  path (Sprints 10/12/13, §1). Nothing in Sprint 17 needs to touch any of them; long-horizon
  evolution of an entity's home range attachment, routine window, or relationship band is *already*
  exactly what a multi-tick `advancePopulationSimulation`/social-ecology catch-up call produces.

**No health/energy-like world state is authorized beyond `NeedState` (Sprint 10's `hunger`/
`thirst`/`rest`/`social` dimensions).** Sprint 17 does not invent one. This is listed explicitly in
§29's invariants (#15: missing world grammar must not be invented by runtime).

## 8. Population evolution

Movement, dispersion, aggregation, routine changes, and resource-driven relocation are **all
already produced** by the existing `advancePopulationSimulation`/`selectBehavior`/
`resolveMovementIntent`/`advanceGroupState` functions run across the elapsed tick count — nothing
new is required for these to "evolve over longer horizons"; they already do, mechanically, the
moment `ticks` is large instead of small.

**Explicitly NOT authorized, and Sprint 17 Phase 0 does not introduce them:** birth, death,
reproduction, disease, predation. No `EntityArchetype`, `EntityBehaviorProfile`, or Canon artifact
read during this research authorizes a population-size-changing mechanism of any kind — entity
rosters today are fixed at seed time (`initialVrindavanPopulationEntities`). These are named here
only as **future world-grammar capabilities**, gated on an explicit StudioK authorization, exactly
the posture the mission brief itself demands ("Do not silently introduce... if not already
authorized").

## 9. Place evolution

Composes with Sprint 16 Phase 0's proposed `PatchState`/`LocalPlaceDefinition`, and reuses Sprint
11–13's existing primitives rather than creating a second Place Memory system, per the mission's
own explicit instruction:

- "Frequently occupied" / "temporarily quiet" — already exactly `PlaceRhythmProfile`'s
  `(locationId, dayPhase, occupancyLevel)` counters (Sprint 13); a long absence simply accumulates
  more counter increments under the same bounded contract.
- "Resource-rich" / "resource-stressed" — already exactly `resolveResourceOpportunities` over
  `LocationResourceAffordance` + current `EnvironmentalState` (Sprint 13), and — once Sprint 16
  lands — its proposed Patch-grain derivation (Sprint 16 Phase 0, §14 of that document).
- "Social gathering tendency" / "animal congregation tendency" — already exactly
  `SocialInteractionOpportunity` (Sprint 13) and `PlaceRhythmProfile`'s `occupancyLevel` distribution
  over time, both already bounded, both already reusable without modification.

Sprint 17 adds **zero new place-state types**. It only needs to confirm (acceptance test, §28 row
M) that these bounded aggregates behave correctly when a single catch-up call advances them by a
large tick delta in one pass rather than the many small increments they were originally exercised
against.

## 10. Territory evolution

Composes with Sprint 16 Phase 0's proposed spatial hierarchy
(`Domain → Sector → Quadrant → Patch → Local Place`), which is itself **not yet implemented** — this
section describes the seam, not new Sprint 17 machinery. Long-horizon propagation of water
condition, vegetation pressure, animal movement, and resource availability *across* Sector/Quadrant
boundaries is already Sprint 16 Phase 0's own §14 ("Hydrology/ecology spatial propagation model"):
Patch-level conditions are a **stateless transform of the one world-global `EnvironmentalState`**,
which is exactly the value Sprint 17's evolution windows advance. In other words: once Sprint 16
lands, a long-horizon catch-up window that advances `EnvironmentalState` by N ticks automatically
produces correct Patch-level propagation for free, because Patch state was designed (Sprint 16 §14)
to always be derived fresh from the current `EnvironmentalState`, never separately stepped. Sector
boundaries remain purely operational (Sprint 16's own explicit constraint); nothing in a long-horizon
window is scoped by Sector/Quadrant — a window advances the *whole* world instance's tick count,
and every Patch derives its own condition from that same single advance.

## 11. Season progression

`SeasonDefinition.allowedNextSeasonIds` + `minDurationTicks` + `SeasonState.enteredAtTick` are
**already sufficient** for the causal engine to process a transition — `resolveSeasonTransition`
(called once per tick, inside `advanceWorldSimulation`'s existing loop) already checks legality
generically, never hardcoding "vasanta → grishma." A long-horizon evolution window (§4) that spans a
season boundary is handled by the *existing* per-tick loop with **zero new logic**: the loop already
detects `season.currentSeasonId !== seasonBefore` on whichever tick the transition legitimately
occurs and emits `season.transitioned` there. Sprint 17's only contribution is the window-boundary
policy in §4 (stop a window exactly at a detected transition, so the checkpoint written between
windows is never mid-transition) — a scheduling nicety, not a new causal capability.

**Only Vasanta and Grīṣma are authored today.** Sprint 17 Phase 0 does not author the remaining
seasons, and the engine requires no changes to accept them later — `allowedNextSeasonIds` already
generalizes to an N-season cycle exactly as written.

## 12. Multiple season crossings

Because `advanceWorldSimulation`'s loop calls `resolveSeasonTransition` **once per tick**, a single
catch-up call that spans, say, 3 season durations already processes each crossing individually, in
order, on the correct tick, emitting one `season.transitioned` event per crossing — this needs no
new mechanism, only verification (§28, row C/K). The one real constraint: with only two seasons
authored and `allowedNextSeasonIds` likely forming a short cycle between them, a very long absence
will legitimately oscillate Vasanta↔Grīṣma repeatedly. This is expected, correct behavior given
today's Canon — Sprint 17 does not treat it as a bug, and does not author a third season to make the
cycle "more realistic."

## 13. Canonical narrative firewall

This is the mission's most safety-critical requirement, and the good news is that it is **already
structurally enforced, not merely policy**:

- `ProtectedNarrativeMutationAttemptError` exists as a named error type (`world-persistence-contracts/errors.ts`),
  and — per the Sprint 16 Phase 0 research and this session's own reading of
  `living-systems-contracts/protectedNarrative.ts` — the protected-narrative repository is
  "get-only by construction." There is no write operation to accidentally call, long-horizon or
  otherwise.
- Every place the composed catch-up chain touches protected narrative state
  (`protectedNarrativeStateRepository.get(...)`, read in `lib/encounterRealization/hostService.ts`
  and `lib/livingPopulation/hostService.ts`) is a **read**, used only as an eligibility gate on
  `resolveAvailableEncounters`/encounter realization — never as a trigger that could *author* an
  event.
- Sprint 18 Phase 0 (a sibling, concurrent Phase-0 architecture, `feature/sprint18-phase0-canonical-events`,
  itself unstable/unmerged and not treated as ground truth here) independently arrived at the same
  posture: Canon flows one direction only (`CANON → Projection Eligibility → Authorized Activation →
  Living-World Projection`), and the simulation "only ever judges eligibility to project, never
  truth." Sprint 17's long-horizon evolution sits entirely on the eligibility side of that boundary.

**What Sprint 17 must explicitly guarantee, stated as an invariant (also §29 #9):** an
`EvolutionWindow` (§4), no matter how many ticks it spans or how it is bounded, is defined to touch
*only* `SharedWorldState`, `LivingEntityState[]`, population/social/rhythm/memory/encounter state —
never protected narrative state, and never a call path that could reach the (nonexistent) write
operation. Because the write path does not exist as a callable operation anywhere in the dependency
graph these packages import from, this is not a "policy to remember" — it is a "there is nothing to
call." Long-horizon evolution can change *the environmental and social conditions surrounding* a
future canonical event (weather, water level, who is near a location, whether an encounter rule's
*non-narrative-protected* variant fires) — it can never generate, resolve, or rewrite the event
itself.

## 14. Dormant vs. active world

Reusing `WorldLifecycleState` exactly as it exists (`DORMANT`/`WAKING`/`ACTIVE`/`QUIESCING`) — the
mission's suggested `CATCHING_UP`/`READY` terms map onto the *existing* `WAKING`/`ACTIVE` states
respectively, and Sprint 17 does not introduce new lifecycle states. What Sprint 17 *does* need,
because of §4's bounded windows: a way to represent "still waking, but making bounded progress"
across more than one request/invocation, without inventing a fifth lifecycle state:

```ts
// PROPOSED — additive, read-only progress projection layered over the EXISTING WorldLifecycleState,
// never a new stored state (same "derived, never a second field" discipline as ResourceTier).
export interface WakeProgress {
  worldInstanceId: WorldInstanceId
  state: WorldLifecycleState        // still exactly DORMANT | WAKING | ACTIVE | QUIESCING
  targetTick: SimulationTick        // the tick a full catch-up would reach
  currentTick: SimulationTick       // the tick reached so far (may equal targetTick)
  windowsRemaining: number
}
```

A world with zero visitors is `DORMANT` (durable state persisted, `ResourceTier: COLD`) and requires
no execution at all until something calls `wakeWorld` — this is already true today and needs no
change; "legitimate temporal evolution while dormant" is, correctly, *deferred computation*: the
world doesn't tick in the background, it computes what *would have* happened, once, on next wake.
This is the mission's own framing ("without requiring continuous high-frequency simulation") and it
is already exactly how Sprint 9 was built.

## 15. Wake/catch-up pipeline (as it actually is, refined against real code)

```
load durable state (implicit in loadOrSeedDurableWorldState -- "whatever durable form it was left in")
    ↓
acquire execution lease (WorldLeaseRepository.acquire -- conflict if another owner holds it)
    ↓
transition lifecycle DORMANT/QUIESCING -> WAKING
    ↓
compute ticksElapsed from WorldLifecycleRecord.lastActiveAt  ◄── see the gap below
    ↓
┌─── for each EvolutionWindow (§4) within ticksElapsed ───┐
│  advance causal environment + entity lifecycle (Sprint 7/9, existing, exact)  │
│  advance population/behavior/movement/groups (Sprint 10, existing, exact)     │
│  advance world/entity memory hints (Sprint 11, existing)                     │
│  advance relationships/familiarity/territory (Sprint 12, existing, exact)    │
│  advance day phase/routines/place occupancy (Sprint 13, existing)            │
│  resolve encounter opportunities -> realization -> consequence (Sprint 14)   │
│  (PROPOSED, §17) checkpoint this window's full state across all six layers  │
└───────────────────────────────────────────────────────────────────────────┘
    ↓
persist final durable state (conditionalSave, optimistic-concurrency-checked)
    ↓
bump WorldLifecycleRecord.lastActiveAt = now(), state -> ACTIVE
    ↓
produce WorldSnapshot / WorldEmbodimentSnapshot (existing, unchanged)
    ↓
diffWorldEmbodiment(prev, next) -- renderer receives a DELTA, never a tick replay (existing, §21)
```

**The gap, precisely:** today, step "bump `lastActiveAt`" happens **inside `wakeWorld` itself**
(`lib/worldPersistence/hostService.ts`, immediately after the Sprint 7/9 layer's own catch-up and
checkpoint are persisted) — *before* the caller (`wakeWorldWithPopulation`, and everything chained
after it) has run at all. Read literally from the code:

```ts
// lib/worldPersistence/hostService.ts, wakeWorld() -- existing code, unmodified
const active = nextLifecycleState(waking ?? currentState, "catch_up_complete") ?? "ACTIVE"
await worldLifecycleRepository.save({ worldInstanceId, state: active, lastActiveAt: now(), lastCheckpointTick: ... })
return { lifecycleState: active, state: finalState, ticksApplied: ticksElapsed, catchUpDurationMs: ... }
```

```ts
// lib/livingPopulation/hostService.ts, wakeWorldWithPopulation() -- existing code, unmodified,
// runs AFTER the above has already returned and already committed lastActiveAt = now()
const stateBeforeWake = await getWorldState(worldInstanceId, now)
const world = await wakeWorld(worldInstanceId, ownerId, now)   // <-- lastActiveAt already bumped here
const population = await advancePopulationForWorld(worldInstanceId, stateBeforeWake.sharedState, world.ticksApplied, ...)
```

If the process crashes **after** `wakeWorld` returns but **before** `advancePopulationForWorld`
persists (and the same is true for every layer after it — Memory, SocialEcology, Rhythms,
EncounterRealization each depend on the *same* `world.ticksApplied` from the *same* `wakeWorld`
call), a retry re-enters at `wakeWorld`, which recomputes `ticksElapsed` from the **already-bumped**
`lastActiveAt` — and gets back a number at or near zero. Population (and everything chained after
it) then "catches up" by zero ticks, **silently and permanently losing the ticks that were already
spent on the causal-environment layer** before the crash. This is not hypothetical — it follows
directly from reading the two functions above; it simply has never been exercised by a test, because
no test in Sprints 9–14 crashes the process between these two specific calls.

This is Sprint 17's single most important design correction (also driving §16/§17/§29 invariant
#7): **the "time has been claimed" boundary must move to the outermost composed layer, not the
innermost one.** Concretely, Sprint 17 should introduce one new authoritative marker —
"last fully-evolved tick," bumped **once**, only after the *entire* composed chain (today ending at
Encounter Realization) has successfully persisted — and `wakeWorld`'s own `lastActiveAt` bump either
moves to that outermost point, or (backward-compatibly) is superseded by a Sprint-17-owned
equivalent that every layer checks instead. This is described structurally in §16 rather than as a
modification to Sprint 9's code (Sprint 17 Phase 0 does not modify shared packages); the actual fix
is implementation-phase work, gated on this finding being accepted.

## 16. Idempotency

Existing mechanisms, reused verbatim, are already strong:

- **Event append** — `DurableWorldSystemEventRepository.append` is idempotent by content-derived
  `eventId`; a duplicate append returns `duplicate_ignored` with the original `sequence`.
- **Encounter records** — `deriveEncounterRecordId(worldId, ruleId, locationId,
  participantEntityIds, startTick)` is looked up *before* any realization work; a replay that
  recomputes the identical record finds it and does nothing further.
- **Checkpoint save** — `conditionalSave` is optimistic-concurrency-checked; a stale write becomes a
  named `conflict`, never a silent overwrite.
- **Lease release** — explicitly idempotent ("no-op if already gone").

**What is not yet idempotent, per §15's finding:** the *composition* of "elapsed ticks" across the
six layers is idempotent only when the whole chain completes atomically in one process lifetime. The
proposed fix (§15, formalized here):

```ts
// PROPOSED — SUBJECT TO RECONCILIATION -- describes the corrected ownership, not a code change made
// in this Phase 0
export interface EvolutionHorizon {
  worldInstanceId: WorldInstanceId
  // The tick through which EVERY composed layer (world, population, memory, social,
  // rhythms, encounter-realization) has been durably, successfully advanced -- bumped
  // exactly once, by the outermost composed wake function, only after every inner
  // layer's own persistence has succeeded. This -- not WorldLifecycleRecord.lastActiveAt --
  // is what a retried wake should consult to compute `ticksElapsed`.
  lastFullyEvolvedTick: SimulationTick
  lastFullyEvolvedAt: Timestamp
}
```

An `EvolutionWindow`'s own `id` (§4) should be content-derived exactly like `EncounterRecordId` —
e.g. `hash(worldInstanceId, startTick, ticks)` — so that re-attempting the *same* window (say, after
a crash mid-window) is naturally a no-op wherever a layer already checks for existing derived
records (Encounter Realization already does this; Population/Memory/SocialEcology/Rhythms currently
rely on "recompute-and-overwrite from the same starting state produces the same result," which is
*only* safe once §15's ordering fix lands — otherwise a retry recomputes from a *different* starting
point than the crashed attempt did, defeating idempotency even for pure-overwrite state).

## 17. Crash recovery

Composing existing mechanisms, plus the one addition §15/§16 identify:

| Crash point | Existing behavior | Sufficient? |
|---|---|---|
| Mid-lease-acquire | `acquire` either succeeds or returns `conflict`; no partial lease state possible | Yes |
| Mid-Sprint-7/9-catch-up, before `conditionalSave` | Durable state untouched; retry recomputes the identical result from the identical starting checkpoint (pure function) | Yes |
| **Between `wakeWorld` returning and any downstream layer persisting** | **Silently loses elapsed ticks for every layer after the crash point (§15)** | **No — this is the finding** |
| Mid-Encounter-Realization, after some records already saved | Each `EncounterRecord`'s content-derived id is checked before re-deriving; already-saved records are found and skipped | Yes |
| Mid-window, before that window's own checkpoint (§4/§17 proposal below) | Depends on whether intermediate checkpoints exist — see below | Only once §17's proposal lands |

**Checkpoint scope must expand.** Today's `WorldCheckpoint` (§1) captures only `SharedWorldState` +
`LivingEntityState[]` — Population's entities/behaviorStates/groups, Memory's events/markers,
SocialEcology's relationships/homeRanges, Rhythms' place-rhythm profiles, and EncounterRealization's
records are each durable via their *own* repositories, saved incrementally by their own hostService
functions, but **never captured together in one atomic checkpoint**. For a short catch-up this is
fine (the whole chain runs in one request); for a long, multi-window catch-up (§4) that might span
many windows and multiple checkpoint intervals, a crash between windows needs a *consistent* joint
snapshot to resume from — otherwise a resumed catch-up could restart Population from window 3's
starting point while World Memory is still at window 2's. Proposed, additive only (no shared-package
modification in Phase 0):

```ts
// PROPOSED — SUBJECT TO RECONCILIATION -- an ADDITIVE wrapper, never a change to WorldCheckpoint's
// own existing shape (§19 of Sprint 16 Phase 0 already established this "additive field" discipline)
export interface LongHorizonCheckpoint {
  worldCheckpoint: WorldCheckpoint          // exactly as it exists today, unmodified
  populationSnapshotAt: SimulationTick      // "population state is valid as of this tick"
  memorySnapshotAt: SimulationTick
  socialEcologySnapshotAt: SimulationTick
  rhythmsSnapshotAt: SimulationTick
  encounterRealizationSnapshotAt: SimulationTick
  // All five MUST equal worldCheckpoint's own tick for this to represent a fully-consistent
  // resumable point; a checkpoint where they differ is a valid intermediate state (some layers
  // ahead of others) but resuming from it must re-run only the lagging layers for the gap ticks,
  // never re-run layers that are already ahead.
}
```

This does not require a new repository if each domain's existing repository already stores state
keyed by `worldInstanceId` with an implicit "as of the world's current tick" meaning (true for
Population/SocialEcology/Rhythms today) — `LongHorizonCheckpoint` can be a **read-time composition**
of "what tick does the durable state currently reflect," not a new write path, provided §15's
ordering fix ensures every layer's persisted state and the shared clock's tick never diverge for
longer than one crash window.

## 18. Multi-visitor consistency

Already solved by the existing `WorldLease` mechanism (§1): if two visitors arrive at approximately
the same moment, both requests attempt `worldLeaseRepository.acquire`; exactly one succeeds, the
other receives a `LeaseConflictError`/`conflict` result naming the current holder. Both subsequently
read the *same* durable `SharedWorldState`/entities/population/etc. once the winning wake completes
— "both visitors observe the same shared world truth" is a direct consequence of `SharedWorldState`
being the single durable record every read resolves from, not a per-visitor copy. Visitor
meaningful-memory (`VisitorWorldMemory`, Sprint 7) remains keyed by `(userId, worldId)` and was never
part of the lease/lifecycle contention in the first place.

**One real edge case worth naming, surfaced by §15's finding:** `WorldLeaseRepository.acquire`'s own
contract ("succeeds if no lease exists, or the existing lease expired") does not special-case "the
same owner re-acquiring their own still-valid lease." A legitimate retry by the *same* owner (e.g. a
client-side timeout retry) mid-wake would receive a `conflict` naming itself as the holder — not
incorrect, but not obviously handled by every caller either. Sprint 17 should treat "how a legitimate
same-owner retry re-enters an in-progress wake" as a named acceptance scenario (§28, row D) rather
than assume `renew` is always what a caller reaches for.

## 19. Multi-instance consistency

Nothing new. `WorldInstanceId = WorldId` (Sprint 9) and every repository read/written by the composed
chain — `LivingEntityStateRepository`, `PopulationEntityStateRepository`, `RelationshipRepository`,
`WorldCheckpointRepository`, `WorldLeaseRepository`, all of them — is keyed by it. §4's
`EvolutionWindow` and §16's `EvolutionHorizon` are both explicitly scoped by `worldInstanceId` in
their own proposed shapes; two instances of identical Vrindavan grammar evolving independently
requires no new isolation mechanism, exactly as Sprint 9 already guarantees for everything else.

## 20. Renderer neutrality

No proposed type in this document (`EvolutionWindow`, `EvolutionWindowResult`, `WakeProgress`,
`EvolutionHorizon`, `LongHorizonCheckpoint`) contains an Actor, Blueprint, Niagara, PCG, World
Partition, Level, or GameObject reference. Every one composes existing renderer-neutral types
(`WorldInstanceId`, `SimulationTick`, `WorldLifecycleState`, `WorldCheckpoint`). Long-horizon
evolution produces exactly the same `WorldSnapshot`/`WorldEmbodimentSnapshot` shapes Sprint 8
already defined; nothing about "how much time passed" changes what a renderer adapter receives.

## 21. Renderer catch-up presentation

**Already substantially solved.** `diffWorldEmbodiment(prev: WorldEmbodimentSnapshot, next:
WorldEmbodimentSnapshot)` (Sprint 8) computes a delta between exactly two snapshots — there is no
code path anywhere in `world-embodiment-runtime` that replays intermediate ticks to a renderer; a
renderer asking "what changed since I last looked" already only ever receives before/after, never
a blow-by-blow. Several existing hostService functions already thread a `sinceTick: number | null`
parameter (`getEmbodimentWithRhythms`, `getEmbodimentWithSocialEcology`,
`getEmbodimentWithHistory`, `getEmbodimentWithEncounterRealization`) specifically to resolve "the
snapshot as of my last known tick" for exactly this diff. Sprint 17 adds no new renderer-facing
concept — it only needs to confirm (acceptance test, §28 row I) that this `sinceTick` resolution
still works correctly when the tick gap is very large (a month of absence) rather than the small
gaps it has been exercised against so far. The authoritative-history-vs-presentation-compression
boundary the mission brief asks to be preserved is therefore **already architecturally guaranteed**
by the fact that `diffWorldEmbodiment` only ever sees two `WorldEmbodimentSnapshot`s — it structurally
cannot "know" whether one tick or ten thousand elapsed between them, which is exactly the invariant
being asked for.

## 22. Vrindavan reference proof (future acceptance scenario — not implemented)

Using only currently-authorized Vrindavan ground truth (the same 4-location star topology from
Sprint 16 Phase 0's own proof, plus the 2 authored seasons):

```
Visitor leaves during Vasanta, at tick T, world instance "living-vrindavan-A"
    ↓
world transitions ACTIVE -> QUIESCING -> DORMANT (existing lifecycle, unmodified)
    ↓
wall-clock time passes (days/weeks) -- no process is executing against this instance
    ↓
visitor returns; a request calls wakeWorldWithEncounterRealization(worldInstanceId, ownerId, now)
    ↓
ticksElapsed computed once (existing TickPolicy, §15's fix ensures this is computed correctly even
  if a prior wake attempt partially crashed)
    ↓
one or more EvolutionWindows (§4) applied, each running the FULL existing six-layer composed chain:
  - weather/hydrology/ecology advance causally tick by tick (existing, Sprint 7)
  - riverbank-vegetation's lifecyclePhase may progress (dormant -> budding -> ...) if ecology
    conditions and its own deterministic variation cross a threshold (existing, Sprint 7)
  - the Host-layer cow herd (yamuna) and bird flock (kadamba-grove) continue their existing
    rhythm-schedule-driven behavior selection every tick (existing, Sprint 10)
  - IF a dry stretch occurs: waterAvailable at yamuna drops, cow herd's MovementIntent shifts
    toward ApproachResource at a reachable alternative (existing, Sprint 10) -- exactly Sprint 16
    Phase 0's own §26 proof scenario, now happening across a real elapsed absence instead of a
    single hypothetical tick
  - PlaceOccupancy/PlaceRhythmProfile at each of the 4 locations reflect the accumulated pattern
    (existing, Sprint 13)
  - IF the elapsed ticks cross Vasanta's minDurationTicks with an allowed transition available:
    season.transitioned to Grīṣma fires on the correct tick, mid-catch-up (existing, Sprint 7,
    §11/§12 -- no new logic)
  - relationship evidence between herd members accumulates co-presence ticks; any realized
    encounter opportunities at any of the 4 locations resolve to a terminal EncounterRecord status,
    exactly as they would have if a visitor had been present the whole time (existing, Sprint 14)
    ↓
final durable state persisted; checkpoint(s) written per window (existing + §17 proposal)
    ↓
visitor's OWN VisitorWorldMemory (Sprint 7) is untouched by any of the above -- it is keyed
  separately by (userId, worldId) and was never part of the shared-state catch-up
    ↓
visitor returns to the SAME world instance identity (worldInstanceId unchanged), sees a
  LEGITIMATELY DIFFERENT shared world (different season possibly, different water level, different
  herd position, different relationship bands), while:
    - protected canonical narrative state is provably untouched (§13 -- no write path exists)
    - the renderer receives a single diffWorldEmbodiment delta, not a replay (§21)
```

Every step above cites an existing, already-implemented mechanism. Nothing in this scenario requires
new Sprint 17 runtime code beyond the window-boundary/horizon-marker corrections in §4/§15/§16/§17.

## 23. Living Forest reuse proof (future acceptance fixture — not implemented)

Using Sprint 16 Phase 0's own Forest fixture (F01, 4 Quadrants, 16 Patches — no Forest artifacts
exist in this repo; this remains illustrative): the same six-layer composed chain, the same
`EvolutionWindow`/`EvolutionHorizon` types, run against a **different** `SeasonDefinition` set (a
forest's own season grammar, not Vasanta/Grīṣma), a **different** `EntityArchetype` roster (forest
fauna, not cow/bird-flock), and Sprint 16 Phase 0's own Patch-grain spatial propagation instead of a
single-location star graph. Nothing in `EvolutionWindow`, `EvolutionHorizon`, or
`LongHorizonCheckpoint` (§4/§16/§17) names Vrindavan, a season id, an archetype id, or a location
id — the reuse claim to prove (not proven in this Phase 0) is that the identical long-horizon
machinery, differing only in the `SeasonDefinition[]`/`EntityArchetype[]`/`SpatialGrammar` data it is
handed, produces a correct multi-week catch-up for a world with 4x the spatial units and a
potentially much larger population — this is precisely where §25's cost model needs real numbers
(entity count × Patch count × rule count), which Vrindavan's 4-entity scale cannot exercise.

## 24. Other Living World portability (Stillness / Symphony / Forge)

`WorldClock.tick`'s own header comment already anticipates this: "a natural-cycle unit for Living
Vrindavan, a slower symbolic unit for Living Stillness, a rhythm/cycle unit for Living Symphony, a
process/stage unit for Living Forge." The abstraction boundary that makes long-horizon evolution
portable to worlds without literal weather/ecology is exactly the same one Sprint 7 already drew:
**`EnvironmentalState`'s three sub-states (`weather`/`hydrology`/`ecology`) are one particular
world's causal content, not a universal ontology — nothing in `WorldClock`, `SeasonDefinition`,
`WorldLifecycleState`, `WorldLease`, `WorldCheckpoint`, or this document's proposed
`EvolutionWindow`/`EvolutionHorizon` types reads or requires weather/hydrology/ecology to exist.**
A world whose "long-horizon evolution" means something else entirely (Living Stillness's
"symbolic unit" progression, Living Forge's "process/stage" progression) still has a
`WorldClock.tick`, still has a `SharedWorldState`-shaped aggregate (whatever its own equivalent
`environment` field contains), and still composes through the identical
lease/lifecycle/checkpoint/window machinery — because that machinery was already built,
world-content-agnostic, in Sprint 9. What each Living World's *own* grammar defines is: what a tick
means, what its `SeasonDefinition`-equivalent progression grammar is (if any — Living Forge's
"process/stage" framing may not need seasons at all), and what its own causal chain from tick to
consequence looks like. Sprint 17 Phase 0 does not implement any of these worlds; it only confirms
that nothing proposed here forecloses them.

## 25. Computational cost model

**Per-tick cost, from the actual loop bodies read in §1:** `advanceWorldSimulation`'s inner loop is
O(1) causal-band derivation + O(entities) lifecycle stepping. `advancePopulationSimulation`'s inner
loop is O(entities) perception/behavior-selection, calling the former with `ticks: 1` each
iteration. Downstream layers (relationship evidence, place occupancy, encounter opportunity/
realization) are each roughly O(entities) to O(entities × rules) per tick. **No layer performs I/O
per tick** — every durable write happens once, after the full `ticks`-length batch completes (a
deliberate, already-correct design choice worth preserving, not revisiting).

**Continuous simulation vs. deterministic catch-up, conceptually:**

| | Continuous simulation | Deterministic catch-up (existing + Sprint 17 windowing) |
|---|---|---|
| CPU while dormant | Nonzero, forever, for every instance | **Zero** — nothing executes until a wake request arrives |
| CPU on wake | N/A (never dormant) | O(ticksElapsed × entities × rules), bounded per-window by §4 |
| Storage | Continuous state writes | One durable write per meaningful transition (existing), plus one checkpoint per window (§17) |
| Concurrent dormant instances | Cost scales with instance count regardless of visitation | **Cost is zero for un-visited instances** — this is the entire point of the DORMANT/`COLD` tier (§1) |
| Wake latency | N/A | Proportional to `ticksElapsed`; bounded by §4's `scheduled_bound` window reason so no single request can be made arbitrarily slow by an arbitrarily long absence |
| Checkpoint frequency | Irrelevant (state is always "current") | A direct dial: more frequent checkpoints (§4's `checkpoint_interval` reason) trade storage writes for smaller crash-recovery/resume blast radius (§17) |

**Where the real cost risk lives, honestly stated:** not in any single Vrindavan-scale wake (§3
already established this is cheap at 4 entities), but in **the product of (a) number of dormant
instances that all wake around the same time, (b) how large `ticksElapsed` typically gets before a
wake occurs, and (c) how large entity/rule counts get for richer worlds like Forest (§23).** §4's
`scheduled_bound` window reason is the direct lever for (b)/(c) — it converts "one huge synchronous
wake" into "several bounded, independently-checkpointed, resumable windows," which is what makes
"potentially very large numbers of persistent world instances" (the mission's own framing) tractable:
worst-case latency per *request* is capped by the window size, not by how long a given world instance
was left alone.

## 26. Package/module plan

Following the existing `-contracts`/`-runtime` pairing, and — per the mission's own instruction —
**not** touching any Sprint 7–14 package:

```
packages/
  long-horizon-contracts/        # NEW -- Sprint 17
    src/
      evolutionWindow.ts          # EvolutionWindow, EvolutionWindowResult (§4)
      evolutionHorizon.ts         # EvolutionHorizon (§16) -- the corrected "time claimed" marker
      longHorizonCheckpoint.ts    # LongHorizonCheckpoint (§17)
      wakeProgress.ts              # WakeProgress (§14)
      index.ts

  long-horizon-runtime/          # NEW -- Sprint 17 (implementation phase, not Phase 0)
    src/
      windowPlanner.ts            # partitions a ticksElapsed count into EvolutionWindow[] per §4's
                                   #   boundary rules (hard cap / season boundary / checkpoint
                                   #   interval); calls into EXISTING per-layer advance functions,
                                   #   invents no new causal math
      quiescenceDetection.ts      # implements §4's fixed-point shortcut, conservatively (never
                                   #   applied across a season boundary or any event-producing window)
      horizonTracking.ts          # reads/writes EvolutionHorizon per §16, the corrected ordering fix
      index.ts
```

Both packages depend only on the existing `world-persistence-{contracts,runtime}`,
`living-systems-contracts`, and (read-only, as types) the domain contracts of Sprints 10–14 — never
on Sprint 15's or Sprint 16's still-unstable packages. `long-horizon-runtime` does not call any
Sprint 10–14 *runtime* function directly except through the exact same Host-layer composition
pattern (`wakeWorldWith*`) already established — it orchestrates the *order* and *bounding* of that
existing chain, it does not reimplement any step of it.

## 27. Persistence / migration posture

No migration is proposed or executed in Phase 0, matching the project-wide posture already
established (Sprint 16 Phase 0 §24: no real database migration exists anywhere in this program yet).
If/when a real database is introduced, Sprint 17's own footprint would be:

- `EvolutionHorizon` — one small durable record per `worldInstanceId`, replacing (or sitting
  alongside, additively, during a transition) `WorldLifecycleRecord.lastActiveAt`'s current role as
  the "time already claimed" marker. **worldInstanceId-scoped**, matching every other repository.
  Reversible: dropping it reverts to today's (flawed, per §15) single-marker behavior, not a data
  loss.
- `LongHorizonCheckpoint` — either a genuinely new table, or (preferred, since it needs no new
  storage) a **read-time composition** over the five existing domains' own current-tick metadata,
  requiring no migration at all if each domain's durable records already carry an implicit "as of
  which tick" fact (true today for every domain read in §1).
- No change whatsoever to `WorldCheckpoint`'s own existing shape, `WorldSystemEventRecord`, or any
  Sprint 7–14 repository interface.

## 28. Acceptance-test matrix (for the eventual implementation phase, not run now)

| # | Scenario | Given | When | Then |
|---|---|---|---|---|
| A | Short absence | a world dormant for a few ticks' worth of wall-clock time | wake occurs | identical result to N live ticks (existing equivalence proof, re-confirmed) |
| B | Multi-day absence | a world dormant long enough to span multiple `EvolutionWindow`s | wake occurs | all six layers reach the same state as if applied in one uncapped call (§4's windowing must be transparent to the result) |
| C | Season boundary crossing | absence spans one `minDurationTicks` boundary with a legal `allowedNextSeasonIds` transition | wake occurs | exactly one `season.transitioned` event, on the correct tick, window boundary placed there (§4, §11) |
| D | Retry/idempotency, including same-owner re-entry | a wake request is retried (network retry, or the §18 same-owner-lease edge case) | retried | no double-advancement, no double consequence, `EvolutionHorizon` (§16) prevents re-claiming already-evolved ticks |
| E | Crash during catch-up | process crashes between `wakeWorld` returning and a downstream layer persisting (§15's exact scenario) | the world is next woken | **no ticks are lost** — this is the regression test for §15's fix; must fail against today's unmodified code and pass once §15/§16 land |
| F | Two simultaneous visitors waking one world | two wake requests arrive concurrently | processed | exactly one performs catch-up (lease-gated, existing); both observe identical resulting shared state |
| G | Two independent world instances | two `WorldInstanceId`s of the same definition | both accumulate absence and wake | neither's state or checkpoint history affects the other (existing isolation, re-confirmed at long horizon) |
| H | Protected Canon unchanged | any absence length, any number of windows | wake occurs | protected narrative state is byte-identical before/after (§13) — provable by the fact that no write path exists, not merely by observation |
| I | Renderer receives final state without full replay | a long, multi-window catch-up completes | a renderer requests `sinceTick` resync | `diffWorldEmbodiment`/`sinceTick` resolution returns one delta, exercised at a tick gap orders of magnitude larger than existing tests use (§21) |
| J | Living Forest alternate-world fixture | Forest `SeasonDefinition`/`EntityArchetype`/Sprint-16-`SpatialGrammar` fixture (§23, hypothetical) | the same long-horizon machinery runs | correct catch-up with zero Forest-specific branches in `long-horizon-runtime` |
| K | Deterministic replay | a checkpoint + its subsequent `WorldSystemEventRecord`s | replayed | reconstructs identical state to a live run over the same ticks, extended to cover multiple season crossings (§12) — the existing Sprint 9/14 replay proof, run at long-horizon scale |
| L | Checkpoint equivalence | a `LongHorizonCheckpoint` (§17) taken mid-absence vs. one taken by never pausing | both used to resume/verify | identical final state — this is the correctness bar for expanding checkpoint scope |
| M | Bounded history/storage | a very long absence (large tick delta) processed in one catch-up | `MemoryRetentionPolicy` compaction and `PlaceRhythmProfile` counters are evaluated | both remain correct and bounded when advanced by a single large delta, not just many small increments (§6, §9) |

## 29. Architectural invariants

1. Living Systems remains authoritative world truth. *(unchanged, Sprint 7 invariant, reaffirmed)*
2. Long-horizon evolution composes the existing six-layer chain (§1); it is not a second engine —
   every proposed type in this document is a scheduling/bookkeeping wrapper around existing
   `advance*`/`wakeWorldWith*` functions, never a reimplementation of any of them.
3. World evolution continues conceptually without visitors — as deferred computation, resolved once
   on next wake, never as background execution (§14).
4. Continuous high-frequency execution is not required — a `DORMANT` world instance costs zero CPU
   (§25).
5. Catch-up is deterministic — already proven per-layer (§1's cited equivalence comments); Sprint
   17's windowing (§4) must not weaken this (a windowed catch-up must equal an unwindowed one, §28
   row B).
6. Catch-up is replayable — existing `WorldSystemEventRecord`/checkpoint mechanism, extended in
   scope only (§17), never in kind.
7. Catch-up is idempotent — true today only within a single uninterrupted process lifetime; §15/§16
   name the precise gap and the precise fix required to make it true across crashes too.
8. Causal provenance is preserved — no aggregation shortcut in this document ever substitutes a
   summary for an actual per-tick derivation of anything with evidentiary or identity significance
   (§3, §6).
9. Protected Canon cannot be generated by elapsed time — structurally true because no write
   operation to protected narrative state exists in the dependency graph any composed layer can
   reach (§13).
10. Visitor meaningful-memory remains separate from shared world state — `VisitorWorldMemory` is
    untouched by anything in this document; it was never part of the lease/lifecycle/catch-up
    contention (§18, §22).
11. worldInstanceId isolation is absolute — every proposed type is scoped by it (§19).
12. Renderer state never becomes world truth — unchanged (§20).
13. Renderer neutrality remains intact — no proposed type references a renderer object (§20).
14. Spatial hierarchy does not create artificial ecological boundaries — inherited unchanged from
    Sprint 16 Phase 0 §10/§14; long-horizon evolution advances one world-global `EnvironmentalState`
    that every Patch derives from, never a per-Sector simulation.
15. Missing world grammar must not be invented by runtime — no season, archetype, or population
    mechanism (birth/death/disease/predation) is authored or assumed by this document (§7, §8, §11).
16. Long-horizon history must remain bounded — reuses Sprint 11's existing tiered retention
    contract verbatim (§6); no new unbounded log is introduced anywhere in this document.
17. Existing Sprint 7–14 mechanisms are reused, not duplicated — every proposed type in §4/§14/§16/§17
    is additive scaffolding around functions and contracts that already exist; none reimplements
    causal logic.

## 30. ASCII architecture

```
                    WALL / ELAPSED TIME
                            │
                            ▼
                     WORLD CLOCK  (existing, WorldClock.tick)
                            │
                            ▼
              ┌─────────────────────────────┐
              │   EVOLUTION PLANNER (NEW)    │   long-horizon-runtime/windowPlanner.ts
              │   partitions ticksElapsed    │   -- bounding only, invents no causal math
              │   into EvolutionWindow[]     │
              └──────────────┬───────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                                ▼
   EvolutionHorizon (NEW, §16)         EvolutionWindow[] (NEW, §4)
   "time already claimed" --            each window bounded by hard cap /
   fixes the §15 crash gap              season boundary / checkpoint interval /
                                         quiescence
              │                                │
              └───────────────┬────────────────┘
                               ▼
   ┌───────────────────────────────────────────────────────────────────┐
   │        EXISTING SIX-LAYER COMPOSED CAUSAL CHAIN (unmodified)        │
   │                                                                     │
   │  wakeWorld (Sprint 7/9: season/weather/hydrology/ecology/lifecycle) │
   │      └─ wakeWorldWithPopulation (Sprint 10: behavior/movement/groups)│
   │          └─ wakeWorldWithMemory (Sprint 11: events/entity memory)   │
   │              └─ wakeWorldWithSocialEcology (Sprint 12: relationships/│
   │                  familiarity/territory)                             │
   │                  └─ wakeWorldWithRhythms (Sprint 13: day phase/      │
   │                      routines/place occupancy)                      │
   │                      └─ wakeWorldWithEncounterRealization            │
   │                          (Sprint 14: opportunity -> realization ->   │
   │                          consequence)                                │
   └───────────────────────────────────────────────────────────────────┘
                               │
                 ┌─────────────────────────────┐
                 │   PROTECTED CANON BOUNDARY    │   READ-ONLY, no write operation exists
                 │   (guarded, structurally      │   anywhere in the reachable dependency
                 │   unreachable for writes)     │   graph (§13) -- not merely policy
                 └─────────────────────────────┘
                               │
                               ▼
              WORLD / ENTITY MEMORY  (Sprint 11, tiered retention, existing)
                               │
                               ▼
              WORLD ADAPTATION  (Sprint 15 -- SEAM ONLY, not implemented/depended on)
                               │
                               ▼
              SPATIAL PROPAGATION  (Sprint 16 Phase 0 -- PROPOSED, not implemented)
                               │
                               ▼
              LongHorizonCheckpoint (NEW, §17) -- joint consistency marker
              over the SIX EXISTING durable stores, no new storage required
              if §15's ordering fix lands
                               │
                               ▼
                    WORLD SNAPSHOT / EMBODIMENT SNAPSHOT  (existing, Sprint 8/9)
                               │
                               ▼
              diffWorldEmbodiment(prev, next)  (existing, Sprint 8) -- renderer
              ALWAYS receives a two-snapshot delta, never a tick replay (§21)
                               │
                               ▼
                       RENDERER ADAPTERS  (Web / future Unreal)
```

## Unresolved questions / STOP gates

1. **STOP — §15's crash-recovery finding needs explicit sign-off before implementation.** It is a
   real correctness gap in already-shipped, tested code (not a hypothetical Sprint 17 risk), and
   fixing it means moving where `lastActiveAt`-equivalent bookkeeping lives — from Sprint 9's
   `wakeWorld` to the outermost composed layer. This is a meaningful change in *ownership*, even
   though Phase 0 proposes it as purely additive (`EvolutionHorizon` superseding, not deleting,
   `WorldLifecycleRecord.lastActiveAt`'s role). Confirm this reframing is acceptable before Sprint 17
   implementation begins.
2. **Quiescence detection (§4) needs a stricter formal definition before implementation** — "no
   state changed" must be checked across literally every layer (entity lifecycle, population
   position/activity, relationship evidence, place occupancy counters, encounter opportunities) or
   the shortcut silently reintroduces the exact "summarize instead of derive" risk §3 argues against.
   Phase 0 recommends implementing it last, and only with a regression test proving a quiescent
   window and a non-quiescent window of identical length produce identical final state.
3. **Sprint 15's adaptation seam is unnamed.** Per the mission's own instruction, no Sprint 15 type
   is assumed; §24's "World Adaptation" box in the diagram is a placeholder for reconciliation after
   Sprint 15 closes, consistent with Sprint 16 Phase 0's own §15.
4. **Sprint 16's spatial types are proposed, not implemented.** §10/§14/§23's references to
   `PatchState`/`SpatialGrammar` describe composition with a *design*, not working code; this
   document does not depend on Sprint 16 having landed, only on its architecture being internally
   consistent (which this session re-verified by reading the actual Sprint 16 Phase 0 doc, not just
   citing it from memory).
5. **The `WorldLeaseRepository.acquire` same-owner-retry edge case (§18)** is a real, if minor,
   ambiguity in existing Sprint 9 behavior surfaced by this research, not something Sprint 17 must
   fix — but it should be an explicit acceptance-test scenario (§28 row D) rather than discovered
   later in production.
6. **Tick-granularity-to-wall-clock policy remains entirely a product decision** (`TickPolicy`,
   Sprint 9's own deliberate seam) — Sprint 17 does not propose a specific rate; §25's cost model is
   expressed in ticks, not days, precisely because how many ticks a month of absence represents is
   not this Phase 0's decision to make.
7. **No database migration exists project-wide** (Sprint 16 Phase 0 §24's finding, re-confirmed
   here) — §27 assumes this remains true; confirm before implementation that no parallel decision to
   introduce real persistence has been made elsewhere in the program.

---

**SPRINT 17 PHASE 0 — LONG-HORIZON WORLD EVOLUTION ARCHITECTURE READY — AWAITING DEPENDENCY CLOSURE**
