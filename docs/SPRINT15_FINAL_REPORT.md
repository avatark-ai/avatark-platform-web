# Sprint 15 — World Adaptation & Emergent Futures: Final Report

**As of:** 2026-08-09. Branch `feature/sprint15-world-adaptation`, off
`feature/sprint14-encounter-realization` @ `7c54cb9`. Not merged to
RC3, no database migration applied. Verify against `git log` before
trusting anything below.

## 1. Repo / branch / commit

`avatark-platform-web`, branch `feature/sprint15-world-adaptation`.
See the final commit (created immediately after this report, per this
program's own one-commit-per-sprint convention) for the exact hash.

## 2. Mission reconciliation

Sprint 14 is treated as authoritative ground truth per its own final
report and `docs/SPRINT14_GROUND_TRUTH.md`. This sprint composes,
never rewrites: zero lines changed in any `packages/living-systems-*`,
`living-population-*`, `world-memory-*`, `social-ecology-*`,
`living-rhythms-*`, `encounter-realization-*`, `world-persistence-*`,
or `world-embodiment-*` package, and zero lines changed in any prior
sprint's `lib/*/hostService.ts`. The entire diff is additive: two new
packages, one new `lib/worldAdaptation/` Host module, one extension to
`lib/runtimeKernel/dependencyBoundaries.test.ts`, one new migration
file, and two registration lines (`package.json`'s dependency/test
lists, `run-platform-migrations.js`'s `MIGRATION_ORDER`).

## 3. Packages/modules created

- `packages/world-adaptation-contracts` — `AdaptationDomain`,
  `AdaptationSignal`/`AdaptationSignalKind`, `AdaptationPressure`/
  `AdaptationPressureRepository`, `AdaptationRule`/
  `AdaptationEffectTemplate`, `AdaptationDecision`, `AdaptationEffect`
  (closed, tagged union, one variant per domain, no universal mutable
  property bag) /`AdaptationEffectRepository`, `WorldAdaptationResult`.
  4 tests. Depends on only `runtime-contracts` and
  `world-memory-contracts` (for `CausalReference`/`WorldId` reuse) —
  narrower than every sibling `*-contracts` package in this domain.
- `packages/world-adaptation-runtime` — `deriveAdaptationSignals`
  (pure), `accumulateAdaptationPressure` (pure, decay-then-accumulate),
  `evaluateAdaptationRule` (pure, tier derivation),
  `deriveAdaptationEffect` (pure, closed per-domain switch),
  `deriveAdaptationEffectId` (content-derived, restated per the
  established `deriveEncounterRecordId`/`deriveMemoryRecordId`
  pattern), `runWorldAdaptation` (pure orchestrator, self-guarding
  replay idempotency), `InMemoryAdaptationPressureRepository`/
  `InMemoryAdaptationEffectRepository`. 24 tests (12 unit + 4
  repository + 2 signal-derivation + 2 identity + 4 Living Forest
  alternate-world portability — includes 2 extra cross-cutting tests
  beyond the raw file count). Depends on only `runtime-contracts`,
  `world-memory-contracts`, and its own contracts package — zero
  sibling-runtime dependency, enforced statically.
- `lib/worldAdaptation/` (Host layer, additive) — `singleton.ts`,
  `vrindavanAdaptationDefinition.ts` (`VRINDAVAN_ADAPTATION_RULES`,
  `findAlternateLocationForCategory`), `hostService.ts`
  (`applyWorldAdaptation`, `wakeWorldWithAdaptation`,
  `getWorldAdaptationEffects`, `getEmbodimentWithAdaptation`). 18 tests
  across `hostService.test.ts`, `scenarios.test.ts`,
  `multiInstance.test.ts`, `emergentFuturesFork.test.ts`, and
  `adaptationRulesInvariants.test.ts`.
- `lib/runtimeKernel/dependencyBoundaries.test.ts` — extended with a
  World Adaptation boundary block (7 new tests: allowed-deps x2,
  React/Unreal-token scan, zero-protected-narrative-reference, and a
  new multi-visitor-law check — no prior boundary block checked for
  `VisitorWorldMemory` references; this sprint adds that check for
  itself since it is the sprint the mission's own "MULTI-VISITOR LAW"
  section is written against).
- `supabase/migrations/032_world_adaptation.sql` — prepared, unapplied
  schema (2 new tables: `adaptation_pressure`, `adaptation_effects`).

**1451/1451 tests passing** (1398 Sprint 5-14 baseline + 53 new).
`npm run typecheck` clean. `npx eslint` clean on every new/changed
file.

## 4. Adaptation model

`AdaptationSignal → AdaptationPressure → AdaptationRule (data) →
AdaptationDecision → AdaptationEffect → WorldAdaptationResult`, exactly
the mission's own six-type list. `AdaptationRule` is DATA
(`lib/worldAdaptation/vrindavanAdaptationDefinition.ts`), never a
branch inside `world-adaptation-runtime` — proven by
`livingForestAdaptationPortability.test.ts` running the identical
`deriveAdaptationSignals`/`runWorldAdaptation` functions against a
wholly different, synthetic rule set with zero core-package changes.

Five rules, one per mission-required demonstration category (A-E) —
deliberately not one per every conceivable domain × kind combination.
`GROUP` domain and several effect kinds (`RESOURCE_AVAILABILITY_CONSEQUENCE`,
`ROUTINE_SELECTION_BIAS`, `AFFINITY_BIAS`, `HABITUAL_OCCUPANCY`,
`USE_PRESSURE`, `MOVEMENT_TENDENCY`, etc.) are modeled in the closed
union but not exercised by any Vrindavan rule this sprint — reserved
vocabulary, the same "prove the mechanism, not exhaust the design
space" posture Sprint 13/14's own technical debt already used for
`REMEMBERED`/`SUPERSEDED`.

## 5. Bounded accumulation / determinism / decay

`AdaptationPressure.value` accumulates from signal weights and decays
by `rule.decayPerTick × elapsedTicks` (floored at 0), evaluated lazily
at the next wake that produces a signal for that exact subject — never
a background per-tick sweep over every subject that ever existed.
`AdaptationDecision.tier = floor(value / threshold)`; an
`AdaptationEffect` fires only once `tier > 0`, with a content-derived
id encoding `(worldId, ruleId, subjectId, tier)` — the SAME "recompute
the identical id, look it up before doing any work" idempotency
mechanism `EncounterRecord` already established one sprint earlier.
Proven: `worldAdaptation.test.ts`'s own "a single realized-encounter
signal never crosses a threshold-3 rule alone" and "bounded
accumulation across three separate wakes crosses the threshold"
tests, plus the decay-floor and decay-recovery tests.

## 6. Consequence application boundary

Three textually separate layers, matching Sprint 14's own precedent:
`deriveAdaptationSignals` (pure) → `runWorldAdaptation` (pure) →
application, which happens ONLY at the Host layer
(`lib/worldAdaptation/hostService.ts`'s own `applyAdaptationEffect`),
never inside a runtime package. Every applied effect goes through an
EXISTING, already-proven write boundary — never a new mutation
authority:

- **ENTITY** (`RESOURCE_PREFERENCE_BIAS`) → a real `EntityMemoryEntry`
  (`type: "PREVIOUS_RESOURCE_LOCATION"`) appended directly to the
  EXISTING `entityMemoryRepository` — the SAME repository/type Sprint
  11/14 already write to, read back by the SAME unmodified
  `resolvePreferredResourceLocation → memoryHint → selectBehavior`
  bridge Sprint 14 §14 proved. Provenance is honestly attributed
  (`derivationRule: "adaptation.<ruleId>"`), distinguishing an
  adaptation-driven entry from a raw per-encounter one.
- **RELATIONSHIP** (`INTERACTION_LIKELIHOOD_BIAS`) → Social Ecology's
  own sole write boundary, `applyEncounterEvidence`
  (`lib/socialEcology/hostService.ts`, unmodified, called exactly as
  Sprint 14 itself calls it) — never a second relationship-mutation
  path.
- **PLACE** (`RESOURCE_PRESSURE`, rule D) → the SAME entity-memory
  bridge as the ENTITY case, but biasing entities present at a
  persistently-scarce location toward a Host-resolved alternate
  (`findAlternateLocationForCategory`).
- **PLACE** (`ENCOUNTER_ELIGIBILITY`, rule C) and **WORLD_POSSIBILITY**
  (`ENCOUNTER_WEIGHT_BIAS`, rule E's own persisted half) — computed and
  durably persisted (`adaptationEffectRepository`, queryable via
  `getWorldAdaptationEffects`/`getEmbodimentWithAdaptation`) but
  **deliberately not yet wired into any further live system this
  sprint** — an honest scope deferral, the same posture Sprint 14 §11
  used for place-rhythm integration. See §8 for how requirement E's
  own concrete, *consumed* proof is satisfied instead.

Idempotency: `adaptationEffectRepository.append` only performs the
write-boundary call on a genuinely NEW (non-`duplicate_ignored`)
effect — a replayed/duplicate effect id never re-triggers
`applyEncounterEvidence` or a second `EntityMemoryEntry` append.

## 7. Causal order

Preserved exactly:
`wakeWorldWithAdaptation` calls `wakeWorldWithEncounterRealization`
(Sprint 14, unmodified) first, then derives/applies adaptation from
THIS wake's freshly-`CONSEQUENCES_APPLIED` records
(`completionTick === afterTick`, excluding pre-existing records from
an earlier wake) plus a fresh `resolveResourceOpportunities` read (Living
Rhythms, unmodified). No backward shortcut exists: adaptation never
reads anything Sprint 7-14 haven't already authoritatively produced
for this exact wake.

## 8. Encounter-future adaptation (requirement E), consumed proof

Rather than adding a new input parameter to Sprint 14's own
`resolveEncounterRealization` (which would be a modification to a
Sprint 14 system, out of scope), this sprint reuses an input that
function ALREADY reads: `relationshipBand`. Rule B's own
`INTERACTION_LIKELIHOOD_BIAS` effect is applied through
`applyEncounterEvidence`, which authoritatively raises the REAL
`RelationshipState.band` Social Ecology owns. Because Sprint 14's own
Host wake re-derives `relationshipBand` fresh from live
`RelationshipState` on every call, a LATER opportunity between the
same pair is scored higher by the SAME, completely unmodified
`resolveEncounterRealization` — concretely proven by `scenarios.test.ts`'s
own SCENARIO E (`resolveEncounterRealization` called directly, twice,
identical params except `relationshipBand: "WEAK"` vs `"ESTABLISHED"`,
flipping `EXPIRED → REALIZED`) and reproven end-to-end in the
Emergent Futures fork test (§10).

## 9. Vrindavan reference scenarios (A-E)

All five pass in `lib/worldAdaptation/scenarios.test.ts`:

- **A (Entity):** repeated realized-encounter involvement crosses rule
  A's threshold; a real `EntityMemoryEntry` is written; `resolvePreferredResourceLocation`
  reads it back unchanged.
- **B (Relationship):** repeated encounter evidence crosses rule B's
  threshold; `RelationshipState.band` is raised through the real
  `applyEncounterEvidence`/`deriveRelationshipBand` pipeline — no
  adaptation-specific band override exists; the resulting band is
  exactly what Social Ecology's own function computes from the
  evidence.
- **C (Place):** repeated encounter involvement at a place produces a
  persisted, queryable `PLACE/ENCOUNTER_ELIGIBILITY` effect (honest
  scope deferral on further consumption — §6).
- **D (Resource-driven):** a persistently-unavailable
  `(location, category)` pair accrues bounded resource pressure with
  zero hardcoded Vrindavan branch inside the engine; the CURRENT
  Vrindavan seed offers no second location for any resource category
  yet, so the "bias entities toward an alternate" write boundary
  fires zero times against the real seed today (a genuine, documented,
  current-grammar-dependent finding — proven separately at the
  pure-function level against a synthetic multi-provider affordance
  set in `adaptationRulesInvariants.test.ts`).
- **E (Encounter-future):** see §8.

## 10. Emergent Futures fork proof (the central acceptance proof)

`lib/worldAdaptation/emergentFuturesFork.test.ts`: WORLD A and WORLD B
are two fresh Vrindavan world instances sharing the identical grammar
and deterministic initial conditions (their first organic wake
realizes the identical set of rules, asserted explicitly). From that
shared starting point:

- WORLD A lives through repeated realized-encounter history for a
  fork-scoped entity and relationship; WORLD B lives through a single,
  one-off instance of each.
- Result: WORLD A's entity carries an adaptation-driven resource
  preference WORLD B's does not (**entity behavior** differs); WORLD
  A's relationship band is raised while WORLD B's otherwise-identical
  relationship stays exactly where it started (**relationship state**
  differs); the identical marginal encounter opportunity REALIZES in
  WORLD A and EXPIRES in WORLD B, through the completely unmodified
  `resolveEncounterRealization` (**available encounters** differ).

All three divergences hold while both worlds share the same world
grammar, the same Protected Canon (untouched, never referenced), and
the same simulation laws (zero Sprint 7-14 modification).

## 11. World neutrality

`packages/world-adaptation-runtime/src/livingForestAdaptationPortability.test.ts`
runs `deriveAdaptationSignals`/`runWorldAdaptation` — the exact same
functions Vrindavan's Host layer calls — against a synthetic deer-herd/
forest-clearing rule set. Zero occurrence of "vrindavan," "yamuna,"
"cow," "krishna," or any season/franchise token in either new
package's source (verified by direct grep, zero matches, and by the
dependency-boundary test's own React/Unreal-token scan pattern
extended for this domain).

## 12. Renderer neutrality

Neither `world-adaptation-contracts` nor `world-adaptation-runtime`
contains any React/Next.js/Unreal-specific token
(`dependencyBoundaries.test.ts`'s own new token-scan test). No renderer
widening occurred: `getEmbodimentWithAdaptation`
(`lib/worldAdaptation/hostService.ts`) wraps Sprint 14's own
`WorldEmbodimentSnapshotWithEncounterRealization` — Host-level
composition ONLY, `@avatark/world-embodiment-contracts`/`-runtime` held
at their existing width for a FIFTH consecutive sprint.

## 13. Persistence / migration status

**Nothing applied.** `supabase/migrations/032_world_adaptation.sql` —
2 new tables (`adaptation_pressure`, `adaptation_effects`), RLS
read-only for authenticated clients, registered in
`run-platform-migrations.js`'s `MIGRATION_ORDER` for traceability only,
same posture as migrations 023/026-031. The migration script itself
was never run. `RelationshipEvidence`/`EntityMemoryEntry` require no
schema change — migrations 028/029 already store the relevant fields
as jsonb/existing columns.

## 14. Multi-visitor law

`applyWorldAdaptation`/`wakeWorldWithAdaptation` take no
visitor/user parameter anywhere in their signatures — adaptation
signals derive exclusively from shared world/entity/relationship state
a Host-process wake already resolved, never from `VisitorWorldMemory`.
`dependencyBoundaries.test.ts`'s own new test statically confirms zero
reference to `VisitorWorldMemory` anywhere in either new package or
`lib/worldAdaptation/hostService.ts`.

## 15. Idempotency / replay

`hostService.test.ts`'s own replay test: waking the identical later
instant twice produces zero additional `AdaptationPressure`/
`AdaptationEffect` — `runWorldAdaptation`'s own self-guarding replay
check (`existing.lastUpdatedTick >= tick` skips that subject entirely)
combined with `adaptationEffectRepository.append`'s own
idempotent-by-id guard (which gates every write-boundary call) provide
two independent layers, mirroring Sprint 14's own two-layer discipline
(content-derived id + sole-writer boundary).

## 16. World instance isolation

`lib/worldAdaptation/multiInstance.test.ts`: two world instances
accumulating pressure for the IDENTICAL subject id show zero bleed
(instance A crosses a threshold from repeated history; instance B,
sharing the same subject id but only one encounter, does not) — proven
both via direct `applyWorldAdaptation` calls and via two organic
`wakeWorldWithAdaptation` calls.

## 17. Architectural invariant results (mission's own 12-item acceptance list)

1. Authoritative state boundaries preserved — **HOLDS** (§3/§6: every
   write flows through an EXISTING sole-writer boundary).
2. Canon remains immutable — **HOLDS** (§14; zero reference to
   protected-narrative or canonical-narrative state anywhere in this
   domain, statically enforced).
3. Consequence → adaptation chain works — **HOLDS** (§9, scenarios
   A-E).
4. Adaptation is deterministic — **HOLDS** (§5; pure arithmetic rules
   throughout, zero randomness/LLM call).
5. Replay is idempotent — **HOLDS** (§15).
6. Accumulated history can affect future behavior — **HOLDS** (§8/§9/§10).
7. Same checkpoint can produce divergent legitimate futures — **HOLDS**
   (§10, the Emergent Futures fork proof).
8. Private visitor memory cannot mutate shared adaptation — **HOLDS**
   (§14).
9. World instances remain isolated — **HOLDS** (§16).
10. Renderer neutrality remains intact — **HOLDS** (§12).
11. Alternate-world fixture works without core changes — **HOLDS**
    (§11).
12. No regression of Sprint 7-14 architecture — **HOLDS** (1451/1451
    tests passing, including every Sprint 5-14 test unchanged; zero
    line changed in any Sprint 7-14 package or Host file).

## 18. Technical debt discovered / honest scope deferrals

1. Rule D's own "bias entities toward an alternate location" write
   boundary fires zero times against the REAL Vrindavan seed today,
   because no resource category currently has a second providing
   location (`yamuna`→water, `kadamba-grove`→vegetation/shelter/rest,
   `govardhan-path`→gathering/corridor — each category maps to exactly
   one location). The mechanism itself is proven independently against
   a synthetic affordance set. A future sprint adding a second location
   for any category (a Vrindavan-grammar decision, not this sprint's
   to make) would make this fire for real.
2. `PLACE/ENCOUNTER_ELIGIBILITY` (rule C) and
   `WORLD_POSSIBILITY/ENCOUNTER_WEIGHT_BIAS` (rule E's persisted half)
   are computed, persisted, and queryable, but not yet consumed by
   `resolveEncounterRealization`'s own inputs or by opportunity
   generation — an honest, documented deferral (§6), the same posture
   Sprint 14 §11 already used. Requirement E's own concrete, consumed
   proof runs entirely through the relationship-band path instead
   (§8).
3. `GROUP` domain and several effect kinds
   (`RESOURCE_AVAILABILITY_CONSEQUENCE`, `ROUTINE_SELECTION_BIAS`,
   `AFFINITY_BIAS`, `HABITUAL_OCCUPANCY`, `USE_PRESSURE`,
   `MOVEMENT_TENDENCY`, `SOCIAL_AFFINITY`/`SOCIAL_AVOIDANCE`,
   `GROUP_PARTICIPATION_BIAS`, `ROUTINE_PREFERENCE`,
   `LOCATION_PREFERENCE`) are modeled in the closed union but
   unexercised by any Vrindavan rule this sprint — reserved
   vocabulary, matching Sprint 13/14's own precedent for
   `REMEMBERED`/`SUPERSEDED`.
4. The legacy `select-encounter` InteractionIntent
   (`lib/worldEmbodiment/intentDispatcher.ts`, Sprint 14's own debt #1)
   remains untouched and out of scope for this sprint too.

## 19. Blockers / governance gates

None. No genuine architectural or canon conflict arose. No new
StudioK Canon or Specification was created or needed — every fixture
used already-Approved Vrindavan grammar (`yamuna`, `kadamba-grove`, the
seeded cow herd/bird flock, the two real `EncounterRule` ids) or a
wholly fictional Living Forest fixture, plus fork-scoped synthetic ids
(`fork-entity`, `fork-relationship-a/b`) that mint no new canonical
content. StudioK repos were not touched.

## 20. Recommendation for Sprint 16

(a) Wire `PLACE/ENCOUNTER_ELIGIBILITY` and
`WORLD_POSSIBILITY/ENCOUNTER_WEIGHT_BIAS` into opportunity generation
or realization scoring, now that both are proven end-to-end as
persisted, deterministic facts (§18 debt #2). (b) If a future
Vrindavan-grammar decision adds a second resource-affording location
for any category, rule D's own entity-bias write boundary becomes live
against real data with zero engine change (§18 debt #1). (c) Consider
a `GROUP` domain rule once a concrete, non-redundant group-level
signal is identified — deliberately not invented this sprint for its
own sake. Ask before assuming which.

WORLD ADAPTATION & EMERGENT FUTURES FOUNDATION VERIFIED — READY FOR SPRINT 16
