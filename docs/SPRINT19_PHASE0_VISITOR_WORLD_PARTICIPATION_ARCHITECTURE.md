---
sprint: 19
phase: 0
title: Visitor <-> Living World Participation Architecture
status: PROPOSED — SUBJECT TO IMPLEMENTATION RECONCILIATION
base: feature/sprint14-encounter-realization @ 085e169
depends_on_phase0:
  - Sprint 16 Phase 0 (feature/sprint16-phase0-spatial-architecture @ c67820e) — spatial scope, unresolved
  - Sprint 18 Phase 0 (feature/sprint18-phase0-canonical-events @ 47cb0e1) — canonical projection seam
  - Sprint 17 Phase 0 (feature/sprint17-phase0-long-horizon-evolution @ 8018899) — wake-chain crash-recovery gap, STOP gate #1
---

# Sprint 19 Phase 0 — Visitor ↔ Living World Participation

Architecture/specification preparation only. No production code, no migration execution, no
merge. Every contract sketch is **PROPOSED — SUBJECT TO IMPLEMENTATION RECONCILIATION**.
Forked from the Sprint 14 tip (`085e169`), the same completed-authoritative base Sprint 16
and Sprint 18 Phase 0 used — not from any unfinished Sprint 15/16/17/18 implementation.

## 0. The Question This Answers

> What must Sprint 19 eventually build so that a human can genuinely participate in a
> Persistent Living World without becoming an unrestricted author of world truth?

Five domains must never collapse into one:

1. **Shared world truth** — owned by Living Systems, authoritative, single-writer per field.
2. **Persistent entity state** — owned by the relevant simulation subsystem (population,
   social ecology, rhythms), never a visitor.
3. **Visitor meaningful-memory** — the visitor's own contextual record of a shared world,
   owned by the visitor's identity, never mutated by anyone else.
4. **Private reflection** — the visitor's own interpretive content, never read by the
   simulation as an input.
5. **Protected canonical narrative** — StudioK-authored, immutable, gated not written.

---

## 1. Ground Truth (verified against the Sprint 14 tip, not assumed)

**Visitor identity has no session concept — it is just a `UserId`.** There is no
`VisitorContext` type. What exists is `VisitorContextProjection` on `WorldSnapshot`
(`packages/living-systems-contracts/src/snapshot.ts:38`):
`{ userId, lastLocationId, meaningfulEncounterCount, reflectionCount }`, rebuilt fresh on
every snapshot resolution (`packages/living-systems-runtime/src/snapshotResolver.ts:52`)
from a plain `userId`. No device/socket/renderer-session identity is modeled anywhere —
which is exactly the posture §7 (Presence) needs, already true today without Sprint 19
having to invent it.

**`VisitorWorldMemory` exists as a contract, but is deliberately *not* the real write path
today.** `packages/living-systems-contracts/src/visitorMemory.ts:11-22`:
```ts
export interface VisitorWorldMemory {
  userId: UserId; worldId: WorldId; lastLocationId: LocationId | null
  meaningfulEncounters: MeaningfulEncounterRef[]
  reflectionRefs: ReflectionRef[]; milestoneRefs: MilestoneRef[]
  updatedAtTick: number
}
```
Its repository (`repositories.ts:25-28`) has a plain `get`/`save` — full overwrite, no
append-only guarantee, structurally the **most permissive** of the three sibling patterns
this codebase uses (contrast `ProtectedNarrativeStateRepository`'s get-only shape, and
`ExperienceEventRepository`'s append-only shape). Critically: `lib/livingSystems/
visitorMemoryProjection.ts:30-53` does **not use this repository** — it derives the identical
shape as a pure, read-time projection over already-existing `WorldState`/`ExperienceEvent`
data, with a comment explaining the repository is "a legitimate reference implementation for
a future world with no existing state," deliberately unused today "to avoid duplicate
persistence." **This is the load-bearing fact for §6/§7**: the actual firewall against
arbitrary visitor-memory mutation today isn't an access-control rule on the repository — it's
that nothing in the live code path ever calls `.save()` on it at all. Sprint 19 must decide
whether to keep it that way (derive-only, no direct writer) or tighten the contract itself so
the guarantee doesn't depend on "nobody happens to call save." **Recommendation: keep it
derive-only** — see §7.

**Cross-visitor isolation is real and tested.** `lib/livingSystems/orchestrator.test.ts:59-79`
— two visitors, independent `visitorContext.lastLocationId`, shared season/weather/ecology,
explicit "no cross-user bleed" assertion.

**`InteractionIntent` already models exactly the mission's named actions**, and is already
renderer-neutral: `packages/world-embodiment-contracts/src/interactionIntent.ts:17-52` is a
discriminated union — `EnterWorldIntent | LeaveWorldIntent | VisitLocationIntent |
BeginReflectionIntent | SelectEncounterIntent` — each a plain `{type, userId, worldId,
...ids}` record. Header comment: intent "expresses what the visitor requested — it never
mutates world state itself." `SelectEncounterIntent` today deliberately produces **no
persisted state change** — Sprint 7 modeled encounters as affordances, and selecting one
only validates current availability. **This is Sprint 19's primary integration gap**: the
intent for "respond to an encounter" exists, but nothing wires it to Sprint 14's
`resolveEncounterRealization`/`deriveConsequences` yet. Closing that gap, not inventing a new
intent vocabulary, is the core of §13/§15.

**`intentDispatcher` is already the single, two-layer choke point.**
`lib/worldEmbodiment/intentDispatcher.ts`: `dispatchInteractionIntent(intent, kernel):
Promise<{ok, error?}>` — (1) structural validation, (2) world-definition + live-state
legality validation (catches `InvalidWorldTransitionError` as a rejection, not a throw). Real
API route `app/api/account/living-vrindavan/interact/route.ts` is session-authenticated and
**overwrites `userId` from the authenticated session, never trusting a client-supplied
value** (explicit comment). A parallel `app/api/dev/...` mirror exists, unauthenticated,
clearly dev-only. Both funnel through the same dispatcher — no duplicated validation logic to
drift out of sync.

**No code path was found that trusts client input as world truth.**
`lib/renderer/webWorldSystemsRenderer.ts` is a presentation-only leaf with no write path and
no import by any contract/runtime package.

**Domain → sole writer, confirmed by exhaustive grep** (this is the concrete backing for
§15/§16):

| Domain | Type | Sole writer | Location |
|---|---|---|---|
| World events | `WorldEvent` | 3 Host sites, always after `deriveWorldEvents` | `lib/{worldMemory,socialEcology,encounterRealization}/hostService.ts` |
| Entity memory | `EntityMemoryEntry` (append-only) | same 3 sites, always after `deriveEntityMemoryEntries` | ditto |
| Relationship state | `RelationshipState` | `applyEncounterEvidence` — confirmed the *only* cross-package write path; internal writes stay inside one file | `lib/socialEcology/hostService.ts:341` (+`:24`,`:160` internal) |
| Place occupancy | `PlaceOccupancy` | **no repository, no writer at all** — pure read-time projection over population state | `packages/living-rhythms-runtime/src/placeOccupancyResolution.ts:35` |
| Encounter records | `EncounterRecord` | `wakeWorldWithEncounterRealization` | `lib/encounterRealization/hostService.ts:137,172` |

`EncounterOpportunity` (`packages/living-population-contracts/src/encounterOpportunity.ts:
11-17`: `{ ruleId, locationId, category, contributingEntityIds, tick }`) and `EncounterRecord`
(`packages/encounter-realization-contracts/src/encounterRecord.ts:41-72`) both have **zero
visitor field** today, and a visitor "has no `EntityId` of their own in the population
roster" (explicit comment, `lib/socialEcology/hostService.ts:287-291`). This shapes §13.

**Sprint 17 Phase 0 landed during this session** (`feature/sprint17-phase0-long-horizon-
evolution` @ `8018899`, after this document's research phase had already begun) and found a
**real, unfixed crash-recovery correctness gap in the existing Sprint 9-14 composed wake
chain**, not merely a design proposal: `wakeWorld()` (`lib/worldPersistence/hostService.ts`)
bumps `WorldLifecycleRecord.lastActiveAt = now()` **before** the layers chained after it
(`wakeWorldWithPopulation` → `...WithMemory` → `...WithSocialEcology` → `...WithRhythms` →
`...WithEncounterRealization`) have run. If the process crashes after `wakeWorld` returns but
before a later layer persists, a retry recomputes `ticksElapsed` from the already-bumped
`lastActiveAt` and silently loses those ticks for every layer after the crash point — "this
is not hypothetical... it simply has never been exercised by a test." Sprint 17's proposed
fix moves the "time has been claimed" marker to the **outermost** composed layer (a new
"last fully-evolved tick" marker, bumped once, only after the entire chain succeeds) rather
than the innermost one. **This is directly load-bearing for §20/§28/§38 below**: if
`ParticipationRecord` realization is ever invoked as part of, or alongside, this same
composed wake chain, it inherits the identical risk until Sprint 17's fix lands — Sprint 19
must not assume today's per-layer `lastActiveAt` semantics are crash-safe to build on as-is.

**World-neutrality is a real, proven property, not an aspiration** — four independent
"Living Forest" fixtures exist and pass through **unmodified** engine code: causal simulation
(`packages/living-systems-runtime/src/otherWorldGrammar.test.ts`, Sprint 7), persistence/
checkpoint (`packages/world-persistence-runtime/src/livingForestPortability.test.ts`,
Sprint 9), population (`packages/living-population-runtime/src/
livingForestPopulationPortability.test.ts`, Sprint 10), and embodiment/Unreal-translation
(`packages/world-embodiment-runtime/src/alternateWorldEmbodiment.test.ts`, Sprint 8). Each
carries a comment confirming the exercised engine file contains no franchise-specific string.
(`packages/living-world-runtime/src/fixtures/sampleWorlds.ts` is a *weaker*, name-only
catalog placeholder for all five worlds — not evidence of causal portability by itself; the
four tests above are the real proof.)

---

## 2. Ownership Model

```
┌─────────────────────────────────────────────────────────────────┐
│ LIVING SYSTEMS — authoritative shared world truth                │
│   owns: environment, entities, relationships, occupancy,         │
│         encounters, consequences, world memory, adaptation,      │
│         canonical projection state (Sprint 18)                   │
│   visitor write surface: NONE — only through authorization gate  │
└─────────────────────────────────────────────────────────────────┘
                     ▲                              │
        (validated,  │                              │ (WorldSnapshot /
     authorized      │                              │  EmbodimentSnapshot,
     consequence)     │                              │  renderer-neutral)
                     │                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ AUTHORIZATION GATE — intentDispatcher + preconditions (§4-5)     │
│   the ONLY door from visitor intent into shared world truth       │
└─────────────────────────────────────────────────────────────────┘
                     ▲                              │
                     │ VisitorIntent (proposal)      │
┌─────────────────────────────────────────────────────────────────┐
│ VISITOR-OWNED DOMAIN                                              │
│   VisitorContextProjection (presence, read-time, §8)              │
│   VisitorWorldMemory-shaped projection (meaningful-memory, §7)    │
│   Private reflection (never read by simulation, §6)               │
└─────────────────────────────────────────────────────────────────┘
                     ▲
                     │ input / interaction
┌─────────────────────────────────────────────────────────────────┐
│ RENDERER — Web today, Unreal future — presentation only, untrusted│
└─────────────────────────────────────────────────────────────────┘
```

Restated from §0/§34's five-way distinction: **StudioK Canon** sits outside this diagram
entirely, reachable only through Sprint 18's guarded read/authorized-projection surface —
never through this diagram's authorization gate at all (§24).

---

## 3. Defining Participation

Not modeled as an enum — modeled as **which stage of an existing pipeline an interaction
touches**, since the pipeline (intent → validate → realize → consequence → memory → snapshot)
already exists and already has the right seams:

| Concept | What it is | Existing seam |
|---|---|---|
| **OBSERVATION** | Reading a snapshot | `WorldSnapshot`/`EmbodimentSnapshot` resolution (§10) |
| **NAVIGATION** | Changing where the visitor is | `VisitLocationIntent`/`EnterWorldIntent`/`LeaveWorldIntent` (§9) |
| **PRESENCE** | The world's minimal knowledge that a visitor exists, here, now | `VisitorContextProjection` (§8) |
| **SELECTION** | Perceiving an available, not-yet-acted-on opportunity | `EncounterPresentation` / available-encounter listing (§13) |
| **PARTICIPATION** | The umbrella: any intent-driven interaction, read or write | The whole `InteractionIntent` union |
| **ACTION** | An intent that, once validated, can produce a shared-world consequence | `SelectEncounterIntent` → realization (§13, §15) |
| **REFLECTION** | Visitor-authored interpretive content | `BeginReflectionIntent` → private-domain storage only (§6) |
| **CONSEQUENCE** | Simulation-derived, bounded, closed-union effect | `EncounterConsequence` (unchanged, §15) |
| **MEMORY** | Durable record — split three ways: world memory (shared), entity memory (entity-owned), visitor meaningful-memory (visitor-owned) | §16 |

Participation is therefore not a new taxonomy bolted on top — it is a *name* for where in the
existing pipeline a given `InteractionIntent` variant lands.

---

## 4. Visitor Action Classification (refined against real `InteractionIntent`)

| Class | Mission concept | Real contract today | Gap |
|---|---|---|---|
| A. READ-ONLY | Observe | `WorldSnapshot`/`EmbodimentSnapshot` fetch — not even an `InteractionIntent` variant, a separate read API | none |
| B. NAVIGATIONAL | Move/visit/leave/return | `EnterWorldIntent`, `LeaveWorldIntent`, `VisitLocationIntent` | none — fully implemented |
| C. PRIVATE | Reflect/journal | `BeginReflectionIntent` | storage target needs an explicit private-domain repository, not `ExperienceEvent`/`VisitorWorldMemory` (§6) |
| D. PARTICIPATORY | Authorized world action | **no dedicated intent variant exists yet** | this is the real net-new surface Sprint 19 must design (§13) |
| E. ENCOUNTER RESPONSE | Respond to an opportunity | `SelectEncounterIntent` exists but is validate-only, not realization-wired | closing this wire-up *is* class D, not a separate class — see §13 |
| F. CANON-ADJACENT | Participate around a canonical event | no contract exists; composes with Sprint 18's `MandatedFact`/`CanonicalEventProjection` | §23 |

**Finding**: classes D and E collapse into one real gap. There is no need for a `D` intent
type distinct from a generalized `SelectEncounterIntent`; the fix is wiring, not a new
taxonomy branch (§13).

---

## 5. Authorization Boundary

```
VisitorIntent (InteractionIntent — existing contract, unchanged)
        │
        ▼
Structural validation           (existing: isWellFormedInteractionIntent)
        │
        ▼
World-definition validation      (existing: validateInteractionIntent)
        │
        ▼
ParticipationAuthorization       (PROPOSED, additive — §13)
        │   — is this visitor, at this location, in this world instance,
        │     permitted to act on this specific rule/opportunity right now?
        ▼
World Preconditions              (PROPOSED, declarative — §14)
        │
        ▼
Permitted Action → existing resolveEncounterRealization (Sprint 14, unmodified)
        │
        ▼
Existing Consequence machinery (Sprint 14, unmodified — §15)
        │
        ▼
Persistent World State (via the sole-writer table, §1/§16)
```

The visitor never writes `SharedWorldState`/`LivingEntityState`/`WorldMemory`/relationship/
place/adaptation/protected-narrative state directly — reconfirmed true today (§1: zero write
paths found), and Sprint 19 adds no new one. `ParticipationAuthorization` is the only new
gate; everything below it in the diagram is 100% Sprint 14 reuse.

---

## 6. Private Reflection Firewall

`BeginReflectionIntent` today validates and (per `ExperienceEvent`'s `reflection.created`
type) records only that a reflection *occurred* — `ExperienceEvent.metadata` is explicitly
flat primitives (`packages/experience-registry/src/types.ts`), which already structurally
discourages dumping prose there, but does not forbid it. **Recommendation, additive, not yet
built**: reflection *content* (the actual "I think the river is sad" text) belongs in a
private-domain store the simulation never reads from — not `ExperienceEvent.metadata`, not
`VisitorWorldMemory`. Concretely:

```ts
// PROPOSED — a repository the simulation runtime never imports, structurally
// (enforced the same way as dependencyBoundaries.test.ts enforces protected-narrative
// write-absence: regex-scan living-systems-runtime, encounter-realization-runtime,
// world-adaptation-runtime, social-ecology-runtime for any import of this module)
interface PrivateReflectionRepository {
  append(userId: string, worldId: string, content: string, occurredAt: number): Promise<ReflectionRef>
  listByUser(userId: string, worldId: string): Promise<ReflectionEntry[]>
  // no read-by-world, no read-by-entity, no cross-user listing
}
```

`ReflectionRef` (already declared as a field type on `VisitorWorldMemory.reflectionRefs`)
is the correct boundary object: the *fact that a reflection exists* may cross into visitor
meaningful-memory as an opaque reference; the *content* never does, and never reaches
`WorldEvent`/`EntityMemoryEntry`/any shared-truth table. This mirrors §1's finding almost
exactly — `MeaningfulEncounterRef`/`ReflectionRef`/`MilestoneRef` on `VisitorWorldMemory` are
already opaque refs, not inlined content, so the pattern already exists; Sprint 19 only needs
to make sure reflection *content itself* never gets stored anywhere the simulation can read.

**Invariant, stated plainly**: no simulation resolver (`resolveWorldSnapshot`,
`resolveEncounterRealization`, `deriveConsequences`, `runWorldAdaptation`) may take reflection
content as an input parameter, ever. Enforced structurally the same way the existing
dependency-boundary tests enforce protected-narrative write-absence (§1, Layer 3).

---

## 7. Visitor Meaningful-Memory

Reuse `VisitorWorldMemory`'s *shape* (`lastLocationId`, `meaningfulEncounters`,
`reflectionRefs`, `milestoneRefs`, `updatedAtTick`) exactly as authored in Sprint 7 — no new
fields proposed. Per §1's finding, **keep it derive-only**: the projection continues to be
computed fresh from `WorldState`/`ExperienceEvent`/`EncounterRecord` (now also
`ParticipationRecord`, §13), never written via `VisitorWorldMemory.save()` directly by any
new Sprint 19 code path. This closes the latent gap §1 identified (a permissive `save()`
existing but unused) by policy *and* by the same structural test technique used elsewhere:
assert no Sprint 19 runtime module ever calls `VisitorWorldMemoryRepository.save`.

Explicitly **not** introduced, per the mission's prohibition: psychological profiling,
engagement scoring, hidden personality inference, manipulation scores, behavioral
surveillance. `meaningfulEncounterCount`/`reflectionCount` (already on
`VisitorContextProjection`) are the ceiling of what's tracked — plain counts, not derived
sentiment or engagement metrics.

---

## 8. Presence

Already correctly minimal today (§1): `VisitorContextProjection { userId, lastLocationId,
meaningfulEncounterCount, reflectionCount }`, rebuilt per snapshot request, with **no
session/socket/connection object anywhere in it**. Sprint 19 adds nothing here beyond
formalizing that this remains the ceiling: presence answers "is this visitor in this world,
at this location, right now" and nothing about *how* they're connected. A renderer
disconnect is a renderer fact, never a world-truth fact — `EnterWorldIntent`/
`LeaveWorldIntent` remain the only events that change presence, and neither is inferred from
transport-layer state.

---

## 9. Navigation

Composes with `VisitLocationIntent` (existing, unmodified) and, at the addressable-unit
level, with `LocationId` (existing). Above that, Sprint 16 Phase 0 proposes a
`Domain → Sector → Quadrant → Patch → Local Place` containment hierarchy over `LocationId`
(`SPRINT16_PHASE0_SPATIAL_ARCHITECTURE.md`, `c67820e`) — **not adopted here**, since it is
itself an unimplemented Phase 0 proposal. Sprint 19's navigation model commits only to:

- Visitor location is always a `LocationId` today; a future `LocalPlaceId` (Sprint 16) would
  be a 1:1 bridge over the same identifier space, per that document's own §"Patch vs Local
  Place" section, not a parallel identity.
- Reachability/transition legality is **already validated** by
  `validateInteractionIntent`/the underlying world-graph state machine
  (`InvalidWorldTransitionError`) — Sprint 19 does not need to re-derive this, only continue
  routing through it.
- No Vrindavan sub-geometry is invented here; Living Vrindavan today authorizes exactly the
  locations already in its vendored world artifact (§1 of Sprint 18 Phase 0 documents this
  same ingestion pipeline).

**SUBJECT TO SPRINT 16 RECONCILIATION**: once Sprint 16 closes, `VisitLocationIntent.
locationId` may need a sibling `localPlaceId`-aware variant, or may not, depending on whether
Sprint 16 keeps `LocationId` as the sole addressable unit (as its own doc currently implies
for a 1-Sector world like today's Vrindavan) or introduces finer addressing later.

---

## 10. Observation

Read-only, first-class, and — per §1 — already implemented as a plain snapshot fetch (not an
`InteractionIntent` at all, deliberately: reading isn't a proposal to change anything, so it
doesn't need to pass through the authorization gate). `WorldSnapshot`/`EmbodimentSnapshot`
already expose environment, entities, place conditions (via `PlaceOccupancy`, always a fresh
projection — §1), available encounters (Sprint 7's `resolveAvailableEncounters`), and —
composing with Sprint 18 — authorized canonical projections once that architecture lands.

**Retention justification, explicit**: the only observation-shaped counters retained today
are `meaningfulEncounterCount`/`reflectionCount` on `VisitorContextProjection`, and those are
counts of *participatory* events (encounters realized, reflections begun), not of raw
observation. **Sprint 19 does not propose retaining a log of what a visitor merely looked
at.** Observation causes zero mutation, full stop — this is proof A in §38.

---

## 11. Authorized World Action

```
Visitor observes available encounter (Sprint 7's resolveAvailableEncounters, unchanged)
        │
        ▼
Visitor sends SelectEncounterIntent  (existing contract; today validate-only)
        │
        ▼
intentDispatcher: structural + world-definition validation (existing, unchanged)
        │
        ▼
ParticipationAuthorization: is this ruleId/locationId currently in this visitor's
available-encounters list, right now, per a freshly-resolved snapshot?  (PROPOSED, §13)
        │
        ▼
Permitted Action → resolveEncounterRealization (Sprint 14, UNMODIFIED — treats the
        visitor-triggered opportunity exactly like an emergent one; see §13 for how the
        visitor is represented without needing an EntityId)
        │
        ▼
deriveConsequences → existing closed EncounterConsequence union (UNMODIFIED)
        │
        ▼
World/entity/place/relationship memory changes via the existing sole-writer table (§1/§16)
        │
        ▼
Future behavior may change via Sprint 15's Adaptation (unmodified integration, §15)
```

The visitor chooses; the world (via unmodified Sprint 14 machinery) determines legitimate
consequences. Nothing in this pipeline is new engine — only the authorization step and the
wiring from `SelectEncounterIntent` into it.

---

## 12. Explicitly Prohibited: No Generic Command Console

No `setWorldState`, `setEntityState`, `changeWeather`, `makeEntityHappy`, `spawnEncounter`,
`triggerCanonEvent`, or any structurally similar arbitrary-mutation entry point. Every
visitor-facing write path in this document terminates in `resolveEncounterRealization` /
`deriveConsequences` — functions that already refuse to construct anything outside the closed
`EncounterConsequence` union (§1, Sprint 18 Phase 0 §16 restates the same discipline). There
is no second, more permissive path being proposed anywhere in this document.

---

## 13. Participation Opportunity: Reuse, Not a Competing Mechanism

**Verified finding (§1)**: `EncounterOpportunity` has zero visitor dimension and is
structurally entity/population-driven (`contributingEntityIds: EntityId[]`) — and a visitor
"has no `EntityId` of their own in the population roster" (explicit existing comment).
Forcing a visitor into `EntityId` space to reuse `EncounterOpportunity` unmodified would be
the wrong kind of reuse — it would corrupt population accounting for the sake of contract
sharing.

**Resolution — additive, minimal, reuses everything else**: a visitor-triggered
participation does not need to *be* an `EncounterOpportunity`. It needs to reference the
*same* Sprint-7-resolved availability (`ruleId`, `locationId`, `category` — already exposed
to the visitor today via `EncounterPresentation`, `packages/world-embodiment-contracts/src/
encounterPresentation.ts`) and produce a **sibling** record to `EncounterRecord`:

```ts
// PROPOSED — additive sibling to EncounterRecord, same package family
// (encounter-realization-contracts), NOT a modification to EncounterOpportunity/EncounterRecord
interface ParticipationRecord {
  id: ParticipationRecordId          // content-derived, same hash discipline as
                                       // deriveEncounterRecordId (§21)
  worldId: WorldId
  userId: UserId                      // the one new identity dimension EncounterRecord lacks
  ruleId: EncounterRuleId             // SAME identity space as EncounterOpportunity — reused,
  locationId: LocationId              // not reinvented
  category: EncounterCategory
  startTick: number
  status: EncounterRealizationStatus  // SAME closed union — no new lifecycle vocabulary
  causalReferences: CausalReference[]
  protectedNarrativeGateOpen: boolean // SAME defense-in-depth gate, re-checked identically
  worldEventId: WorldEventId | null
}
```

Realization reuses `resolveEncounterRealization` **unmodified** by constructing its existing
input shape from the visitor's chosen rule instead of from population co-presence — the
resolver itself has no idea whether its causal inputs came from an entity or a visitor
selection, and per §1's finding this function is already pure/deterministic over its inputs,
so this requires no resolver change, only a different caller.

Most consequences land on the **entity or place the visitor interacted with**, not on the
visitor — e.g. a `WORLD_MEMORY` consequence's `RESOURCE_PREFERENCE` targets the affected
entity's `EntityId`, and `LOCATION_HISTORY_MARKER` targets a place, neither of which needs the
visitor to hold an `EntityId`. The visitor's role is captured only in
`ParticipationRecord.causalReferences`, which is exactly what `CausalReference` already
exists for (§1, Sprint 18 Phase 0 §23 uses the identical pattern for canonical events). **The
closed `EncounterConsequence` union itself is not extended.**

---

## 14. Preconditions

Declarative, world-grammar-authored, not hardcoded to Vrindavan — reusing the same "closed
vocabulary, data-driven rule" discipline Sprint 15's `AdaptationRule` and Sprint 7's
`EncounterRule` already establish:

```ts
// PROPOSED — closed union
type ParticipationPrecondition =
  | { kind: "LOCATION_MATCHES"; locationId: LocationId }
  | { kind: "RULE_CURRENTLY_AVAILABLE"; ruleId: EncounterRuleId } // re-checks Sprint 7 gating
  | { kind: "SEASON_EQUALS"; seasonId: string }
  | { kind: "RELATIONSHIP_BAND_AT_LEAST"; relationshipId: RelationshipId; band: RelationshipBand }
  | { kind: "PROTECTED_NARRATIVE_GATE_OPEN" } // same gate as §1's defense-in-depth check
  | { kind: "VISITOR_MEMORY_HAS_MILESTONE"; milestoneRef: string } // reads VisitorWorldMemory,
                                                                     // never writes it
```

Every precondition kind reads existing, already-authoritative state. None reference private
reflection content (§6's invariant holds here specifically).

---

## 15. Consequence Pipeline

Unchanged from Sprint 14, restated for clarity:

```
ParticipationRecord (REALIZED)
        │
        ▼
deriveConsequences   (packages/encounter-realization-runtime — UNMODIFIED)
        │
        ▼
existing WORLD_MEMORY / RELATIONSHIP domain fan-out (UNMODIFIED)
        │
        ▼
World Memory / Entity Memory / Relationship state (via existing sole-writer functions)
        │
        ▼
Sprint 15 Adaptation (consumes WorldEvent.causalReferences — no new coupling, per Sprint 18
                       Phase 0 §17's identical finding for canonical events)
        │
        ▼
Future opportunities/behavior
```

No second consequence engine is created. This is the same conclusion Sprint 18 Phase 0
reached for canonical events, and it holds for the identical reason: the existing engine
already treats "what caused this" as a `causalReferences` trail, not a hardcoded source type.

---

## 16. Consequence Ownership

| Domain | Owner | May visitor write directly? |
|---|---|---|
| Shared world truth (environment, clock) | Living Systems | No |
| Entity state / entity memory | Population / World Memory runtime | No |
| Relationship state | Social Ecology (`applyEncounterEvidence` only) | No |
| Place state | Living Rhythms (derived only, no writer at all) | No |
| Protected narrative state | StudioK, gated by Sprint 7/14's two-layer check | No — not even Living Systems can write it (§1) |
| `ParticipationRecord` | Encounter Realization (new sibling table, same package family) | No — visitor proposes via intent, runtime realizes |
| Visitor meaningful-memory | Derived projection over the above (§7) | No — read-derived, never visitor-authored |
| Private reflection content | Visitor, via `PrivateReflectionRepository` (§6) | Yes — this is the one domain the visitor genuinely owns |

Only the last row is visitor-writable, and it is structurally invisible to every simulation
resolver (§6).

---

## 17. Refusal / Invalid Action

Reuses `intentDispatcher`'s existing two-rejection-path pattern (§1) exactly, extended with
one more check:

1. Structural malformation → reject (existing).
2. World-definition/location doesn't exist → reject (existing).
3. Live-state legality (e.g. world-graph transition illegal) → reject via
   `InvalidWorldTransitionError` catch (existing).
4. **New**: `ParticipationAuthorization` precondition failure (rule no longer available,
   entity moved away, canonical gate closed, stale snapshot — §18) → reject with a semantic
   reason drawn from `CausalReference`-shaped data (e.g.
   `{ kind: "ruleId", ref: "no-longer-available" }`), never a raw exception leaking internal
   state.

Every rejection path returns `DispatchResult { ok: false, error }` **before** any write
occurs — matching `deriveConsequences`' existing behavior of deriving zero consequences for
non-REALIZED status (§1, Sprint 18 Phase 0 §16's "no consequence for non-terminal states"
finding, generalized to the authorization step one level up). No partial mutation is
structurally possible because every write in the sole-writer table only fires after a
`REALIZED` status, and status is only set at the end of a fully-validated resolution.

---

## 18. Stale Intent

The mission's scenario — visitor sees opportunity A, world advances, visitor then selects A —
is handled by **re-resolving live availability at dispatch time, not trusting the client's
snapshot age**. `intentDispatcher`'s existing `select-encounter` handling already
"re-resolves the live snapshot and checks the rule is in `availableEncounters` before
acknowledging" (§1) — this exact mechanism generalizes to `ParticipationAuthorization`: it
always checks *current* `resolveAvailableEncounters` output and *current* `PlaceOccupancy`
(itself always freshly derived, §1), never a value cached from when the opportunity was first
observed. No explicit version-number/ETag scheme is required for this check specifically,
because the check is naturally idempotent-safe by re-deriving from scratch each time —
consistent with `PlaceOccupancy` having no persisted state to go stale in the first place.

Where an explicit version guard *is* still needed: the underlying `DurableWorldStateRepository.
conditionalSave` (`expectedVersion` optimistic-lock pattern, Sprint 9 — verified in Sprint 18
Phase 0's research) already exists and is reused unmodified for the actual persistence write
at the bottom of the pipeline (§27).

---

## 19. Multi-Visitor Participation

- **Shared world consistency**: every visitor reads the same `WorldState`/`PlaceOccupancy` —
  no per-visitor world fork.
- **Independent visitor memory**: `VisitorContextProjection`/`VisitorWorldMemory` projection
  is keyed by `(userId, worldId)` and tested for zero cross-bleed (§1).
- **Simultaneous/conflicting actions**: two visitors selecting the same encounter rule at the
  same location/tick resolve via `ParticipationRecord`'s content-derived id (§21) plus the
  existing `DurableWorldStateRepository.conditionalSave` optimistic lock (§18) — the second
  writer's conditional save fails on version mismatch and is told to re-resolve, exactly the
  existing Sprint 9 conflict-not-overwrite behavior, never a silent double-application.
- **First-valid realization**: whichever `ParticipationAuthorization` check passes first (at
  the current version) wins; the other visitor's stale intent is rejected per §17/§18, and can
  retry against fresh state.
- **No cross-user memory bleed**: already proven (§1).

---

## 20. Visitor Leaves Mid-Interaction

Three distinct states, never conflated:

```
INTENT SENT  →  ACCEPTED (passed structural + authorization checks)  →  REALIZED (consequence derived)  →  PERSISTED
```

If the visitor disconnects between INTENT SENT and REALIZED, nothing has been written yet —
per §17, no write occurs before a `REALIZED` status is reached, and `REALIZED` is only set
inside the same server-side call that goes on to derive and persist consequences. There is no
"accepted but not yet realized" durable state to leave dangling: `dispatchInteractionIntent`
is a single request/response call, not a multi-step saga, so a disconnect after the response
was already sent (but consequences already persisted) is simply a completed action the
visitor didn't see the confirmation for — safe, because §21's idempotency guarantee means a
retry (if the client resends) cannot double-apply it.

---

## 21. Idempotency

Reuses the **one existing identity discipline** (Sprint 9/11/14's SHA-256 content-hash +
PK/append-idempotent-repository pattern, re-verified during Sprint 18 Phase 0's research) —
not a new scheme:

```ts
// PROPOSED — mirrors deriveEncounterRecordId exactly, with userId added to the hash input
function deriveParticipationRecordId(
  worldInstanceId: WorldInstanceId,
  userId: UserId,
  ruleId: EncounterRuleId,
  locationId: LocationId,
  startTick: number,
): ParticipationRecordId {
  // sha256(worldInstanceId | userId | ruleId | locationId | startTick)
}
```

A double-click, reconnect, or renderer resend recomputes the identical id and hits the
existing record — per §1's confirmed pre-check-then-work ordering (`deriveEncounterRecordId`
is checked *before* any work runs), the same must hold here: no consequence derivation runs
until the id lookup confirms no prior `ParticipationRecord` exists.

---

## 22. World Advances While Visitor Is Absent

Sprint 17 Phase 0 landed during this session (`8018899`) with the real wake-chain composition
(§1) — this section now composes with its actual proposed shape rather than a placeholder:

```
visitor leaves (LeaveWorldIntent, existing)
        │
        ▼
world continues — existing Sprint 9 dormancy/wake, deferred-computation model: the world does
NOT tick in the background, it computes what would have happened once, on next wake
        │
        ▼
next wake (by any actor — a returning visitor, another visitor, or an admin/dev trigger) runs
the composed catch-up chain (§1: wakeWorld -> ...Population -> ...Memory -> ...SocialEcology
-> ...Rhythms -> ...EncounterRealization), across Sprint 17's proposed EvolutionWindows
        │
        ▼
other visitors / autonomous simulation may produce ParticipationRecord/EncounterRecord
consequences during that catch-up (existing pipelines, §13/§15)
        │
        ▼
Sprint 15 Adaptation may bias future behavior (existing, unmodified)
        │
        ▼
visitor returns (EnterWorldIntent, existing) → triggers or observes the wake above → fetches
current WorldSnapshot, which already reflects everything above — no special-casing needed,
because WorldSnapshot resolution has never depended on visitor continuity (§1: rebuilt fresh
from userId every time)
```

Visitor meaningful-memory (§7) remains the visitor's own contextual projection and is
unaffected by how much the world changed while they were away — it does not need to "catch
up" to anything, because it was never a copy of world state to begin with (§1's `derive-only`
finding is exactly what makes this trivial rather than requiring new machinery).

**Load-bearing caveat, not a placeholder anymore**: per §1, the wake chain this section
depends on has a real, unfixed crash-recovery gap — `lastActiveAt` is claimed before the
composed chain finishes, so a crash mid-catch-up silently loses ticks for every layer after
the crash point. If a visitor's return triggers this same wake chain (the natural
implementation choice — `EnterWorldIntent` handling almost certainly calls the same
`wakeWorld`-rooted path other actors use), then a crash during that catch-up has the same
silent-tick-loss exposure `ParticipationRecord` realization would inherit if it runs inside
the chain rather than strictly after it completes. **Sprint 19 implementation must sequence
`ParticipationRecord` realization strictly after Sprint 17's proposed "last fully-evolved
tick" marker is committed** (or after today's `lastActiveAt`, until that fix lands), never
inside the same crash window the gap describes — otherwise a crash between wake-catch-up and
participation-realization could apply a visitor's consequence against a world state that
silently skipped ticks it should have evolved through first.

---

## 23. Canonical Event Participation

Composes with Sprint 18 Phase 0's `MandatedFact`/`CanonicalEventProjection` (`47cb0e1`)
without modifying it. A visitor may:

- observe a canonical projection's consequences via `WorldSnapshot` (same as any other world
  fact),
- have a `ParticipationRecord` whose `category` happens to coincide with a location/tick a
  canonical event also touches,
- privately reflect on it (§6 — never mutates Canon or the projection),

but a visitor's `ParticipationAuthorization` (§13) is checked against the **same**
`protectedNarrativeGateOpen`/`NARRATIVE_GATE_OPEN` condition Sprint 18 Phase 0 defines
(§14 there) — a visitor cannot cause, accelerate, block, or reinterpret a
`CanonicalEventActivationCondition` by any action, reflection, or `VisitorWorldMemory`
milestone. `MandatedFact`s (Sprint 18 §10) are never inputs a visitor intent can satisfy or
falsify — they are StudioK-authored and evaluated independently of any visitor's presence.

---

## 24. Canon-Adjacent Freedom

```
Protected canonical event (Sprint 18: immutable MandatedFacts, occurrence/outcome)
        │
        ▼ (bounded, authored projection scope — Sprint 18 §11)
Permitted surrounding world:
   - where the visitor stands (§9, ordinary VisitLocationIntent — unaffected by Canon)
   - which non-canonical entity/place the visitor interacts with (§13, ordinary
     ParticipationRecord)
   - what legitimate local consequences follow (§15, ordinary EncounterConsequence)
   - what the visitor remembers (§7, ordinary derived VisitorWorldMemory)
```

No actual Vrindavan Canon is authored here (per instruction). The mechanism is: a
`CanonicalEventProjection`'s `MandatedFact`s constrain a bounded set of semantic facts; every
fact *not* mandated remains ordinary simulation, and ordinary simulation is exactly what §13's
`ParticipationRecord` pipeline already governs. No new mechanism is needed beyond composing
the two already-designed boundaries.

---

## 25. Renderer Neutrality

`ParticipationRecord`, `ParticipationPrecondition`, and `ParticipationAuthorization` (§13-14)
contain only ids, enums, and `CausalReference`-shaped provenance — no React/DOM/Unreal/
Blueprint/Niagara/Sequencer type, matching the existing discipline verified in `interactionIntent.
ts`'s header comment and Sprint 18 Phase 0's §21/§25. Renderer adapters translate raw input
(click, gesture, proximity trigger) into an `InteractionIntent` **before** it ever reaches
`intentDispatcher` — the dispatcher itself already has no renderer awareness (§1).

---

## 26. Web / Unreal Semantic Parity

A Web "select" button and an Unreal proximity/gesture trigger must both terminate in the
*same* `SelectEncounterIntent { type, userId, worldId, ruleId }` before reaching
`intentDispatcher` — the dispatcher cannot distinguish their origin, and per §1's finding, it
never receives renderer-specific data anyway. World consequence is therefore identical by
construction, not by convention: there is exactly one `resolveEncounterRealization` call path
regardless of renderer, mirroring Sprint 18 Phase 0's §22 "Unreal never becomes a source of
truth" finding and reusing the same `unrealCommandTranslator.ts` seam for the *output* side
(snapshot → presentation).

---

## 27. Participation Receipt

**Reuse, don't duplicate**: `ParticipationRecord` (§13) already carries everything the
mission's candidate receipt fields ask for — `id` (action identity), `worldId`
(worldInstanceId), `userId` (visitor context reference), its own `id` again (realized
participation id), `status` (result), `causalReferences` (consequence references),
`protectedNarrativeGateOpen`/gate provenance. The one field it does *not* have today is a
before/after world version pair — **proposed addition**, following Sprint 9's existing
`stateVersion` field on `DurableWorldStateRepository`:

```ts
// additive fields on ParticipationRecord, PROPOSED
worldVersionBefore: number
worldVersionAfter: number | null   // null until CONSEQUENCES_APPLIED
```

No separate "receipt" type is introduced — `ParticipationRecord` itself, minus any reflection
content (which it never held in the first place, §6), is safe to return to the requesting
renderer as the receipt.

---

## 28. World Versioning

Reuses `DurableWorldStateRepository.conditionalSave`'s existing `expectedVersion` optimistic
lock (Sprint 9, verified during Sprint 18 Phase 0 research) unmodified. A `ParticipationRecord`
is evaluated against the version read at `ParticipationAuthorization` time (§14/§18); its
consequence-application write uses that same version as `expectedVersion`; a mismatch (another
consequence landed first) fails the conditional save and the caller re-resolves from fresh
state — never a silent overwrite. After a successful write, `worldVersionAfter` (§27) records
the new version, and the next `WorldSnapshot` a renderer fetches reflects it — no separate
versioning scheme for participation than the one persistence already has.

---

## 29. Security / Trust Boundary

Restated as an explicit chain, matching what §1 verified is *already true* in the real API
routes today, extended with the one new step this document adds:

```
Renderer/client proposes InteractionIntent (untrusted — server overwrites userId from session,
                                              per the existing route's explicit comment, §1)
        │
        ▼
Server: structural + world-definition + live-state validation (existing, unchanged)
        │
        ▼
Server: ParticipationAuthorization + preconditions (NEW, §13-14, still server-side only)
        │
        ▼
Server: resolveEncounterRealization + deriveConsequences (existing, unchanged)
        │
        ▼
Server: persist via conditionalSave (existing, unchanged)
        │
        ▼
Renderer receives resulting WorldSnapshot/ParticipationRecord — never asked to compute or
supply a consequence itself
```

No new trust boundary is introduced; §13's `ParticipationAuthorization` is simply inserted
into an already-server-side-only chain.

---

## 30. Vrindavan Reference Scenario (existing mechanics/fixtures only)

```
Visitor sends EnterWorldIntent (existing)
        → intentDispatcher validates, enters Vrindavan
Visitor sends VisitLocationIntent (existing)
        → validated against the vendored world artifact's location graph (existing,
          Sprint 18 Phase 0 §4 ingestion pipeline)
Visitor fetches WorldSnapshot (existing)
        → observes current environment/entities/PlaceOccupancy (all existing, freshly
          derived, §1)
Sprint 7's resolveAvailableEncounters exposes an EncounterPresentation for a
narrative-permitted rule at this location (existing, unmodified)
Visitor sends SelectEncounterIntent (existing contract, newly wired per §13)
        → ParticipationAuthorization re-resolves live availability (§18) — passes
        → resolveEncounterRealization runs (Sprint 14, UNMODIFIED) — REALIZED
        → deriveConsequences (UNMODIFIED) — e.g. a WORLD_MEMORY consequence targeting the
          entity involved, or a LOCATION_HISTORY_MARKER for the place
        → existing sole-writer functions apply it (§1/§16) — entity memory, world memory,
          relationship state (if the interaction involved a relationship-bearing entity) all
          update through their existing single writers
Visitor sends LeaveWorldIntent (existing)
World continues: Sprint 9 dormancy/wake, deterministic catch-up, Sprint 15 Adaptation may
bias future behavior from the WorldEvent's causalReferences (existing, unmodified)
Visitor returns (EnterWorldIntent, existing)
        → VisitorWorldMemory projection (derived, §7) still shows lastLocationId,
          meaningfulEncounters including this one, reflectionRefs unaffected
        → WorldSnapshot reflects legitimate consequence + whatever else evolved while absent
Protected Canon: untouched throughout — no MandatedFact, ProtectedNarrativeStateRepository
write, or gate state was ever in this scenario's write path
```

No mythology, dialogue, or Canon was invented — every step names an existing type/function
verified during this session's research, plus the one additive `ParticipationRecord` wiring
from §13.

---

## 31. Living Forest Reuse Proof

Grounded in the four real fixtures verified this session (not hypothetical): `otherWorldGrammar.
test.ts` (Sprint 7, causal simulation), `livingForestPortability.test.ts` (Sprint 9,
persistence), `livingForestPopulationPortability.test.ts` (Sprint 10, population), and
`alternateWorldEmbodiment.test.ts` (Sprint 8, embodiment/Unreal translation) — each already
proves the engine layers Sprint 19 composes with are world-neutral. Sprint 19's own contracts
(`ParticipationRecord`, `ParticipationAuthorization`, `ParticipationPrecondition`) reference
only `WorldId`/`LocationId`/`EncounterRuleId`/`EntityId`/`CausalReference` — the same
world-neutral identifier types those four fixtures already exercise. A fifth fixture,
following the identical pattern (a `living-forest` world definition exercising
`resolveEncounterRealization` via a visitor-originated `ParticipationRecord` instead of an
emergent `EncounterOpportunity`), would prove Sprint 19's addition is equally world-neutral —
proof Q in §38. No Sprint 19 contract contains "vrindavan," "cow," "calf," "river," or any
other franchise-specific string.

---

## 32. Other World Reuse (Stillness, Symphony, Forge)

The core deliberately does not assume ecology, animals, or mythology (per §31/§32 of the
mission and this document's own §12 prohibition). What each of these worlds needs from
Sprint 19 is only:

- an authored `EncounterRule`/opportunity vocabulary meaningful to that world's own grammar
  (Living Stillness: presence/stillness-duration-gated rules; Living Symphony: a musical/
  structural-state-gated rule; Living Forge: a creation/transformation-state-gated rule),
- a `LocationId` graph meaningful to that world,
- and `EncounterCategory`/`ParticipationPrecondition` values authored per-world (both are
  already open/data-driven, not fixed enums baked into the runtime — same discipline as
  Sprint 7's `EncounterRule` and Sprint 15's `AdaptationRule`).

`ParticipationRecord`/`ParticipationAuthorization` never reference "animal," "grazing," or
any ecology-specific concept — they reference `EncounterRuleId`/`LocationId`/
`EncounterCategory`, which are already opaque, world-authored identifiers. No implementation
is proposed for any of these three worlds here, per instruction — only the observation that
nothing in this document's contracts would need to change to support them.

---

## 33. No Game-Mechanic Leakage

None of the following appear anywhere in this document's proposed contracts, and none are
introduced: XP, points, loot, inventory, health bars, quests, achievements, leaderboards,
combat, streaks, reward loops. `ParticipationRecord.status` reuses the existing
`EncounterRealizationStatus` union (`REALIZING/REALIZED/CONSEQUENCES_APPLIED/REMEMBERED/
EXPIRED/BLOCKED/SUPERSEDED`) — deliberately not a "quest state," "mission progress," or
"reward tier" vocabulary.

---

## 34. Privacy Boundary

Shared-world persistence (`WorldEvent`, `EntityMemoryEntry`, `RelationshipState`,
`ParticipationRecord`) never contains reflection prose — reflection content lives exclusively
in `PrivateReflectionRepository` (§6), which no simulation resolver imports. `WorldEvent.
causalReferences` records *that* a `userId`'s participation caused a consequence (needed for
explainability, §35) but never *why* the visitor says they did it, or what they privately
felt about it. Data minimization holds by construction: the sole-writer table (§1/§16) simply
has no column for reflection text anywhere in its chain.

---

## 35. Explainability / Provenance

For any visitor-caused shared-world change, answerable without exposing private content:

| Question | Answered by |
|---|---|
| What changed? | `EncounterConsequence` / resulting `WorldEvent`/`EntityMemoryEntry` |
| Why was the visitor allowed to do it? | `ParticipationAuthorization` result + `ParticipationPrecondition`s evaluated (§14) |
| What authoritative state existed before? | `worldVersionBefore` (§27) |
| Which action was realized? | `ParticipationRecord.id` (§13/§21) |
| Which consequence rule applied? | `causalReferences` chain (existing `CausalReference` primitive, reused throughout) |
| What state changed afterward? | `worldVersionAfter` (§27) + the sole-writer table's resulting rows |

No question above requires reading `PrivateReflectionRepository`.

---

## 36. Package / Module Plan

**Recommendation: additive to the existing `encounter-realization-*` package family, not a
new top-level domain**, since `ParticipationRecord` is a sibling of `EncounterRecord`, not a
new causal engine:

```
packages/encounter-realization-contracts/src/participationRecord.ts   (NEW file, existing package)
packages/encounter-realization-contracts/src/participationAuthorization.ts (NEW file)
packages/encounter-realization-runtime/src/participationAuthorization.ts   (NEW file — pure fn)
packages/encounter-realization-runtime/src/participationIdentity.ts        (NEW file — deriveParticipationRecordId)
```

Plus one genuinely new, narrowly-scoped package for the one domain that has no existing
owner:

```
packages/private-reflection-contracts/   (NEW — PrivateReflectionRepository, §6)
packages/private-reflection-runtime/     (NEW — minimal; likely just validation, no resolvers)
```

**Why not a `visitor-participation-contracts`/`-runtime` pair** (the mission's suggested
default): almost everything Sprint 19 needs is either (a) already implemented
(`InteractionIntent`, `intentDispatcher`, `VisitorContextProjection`,
`VisitorWorldMemory`-as-projection) or (b) a minimal sibling addition to
`encounter-realization-*` (§13). Creating a new top-level package would duplicate ownership
of the realization/consequence machinery this document deliberately reuses. The only
genuinely new *domain* (not just new *files*) is private reflection storage, which gets its
own minimal package because — per §6's invariant — it must be structurally unreachable from
every existing runtime package, which is easiest to guarantee as a separate package with no
inbound dependency from any `*-runtime` package.

`lib/participation/hostService.ts` (Host-composed integration, following the `lib/
encounterRealization/hostService.ts` precedent) is where `ParticipationAuthorization` wiring
and the replay/multi-visitor proofs (§38) belong.

---

## 37. Persistence / Migration Posture (prepared only, not executed)

- `participation_records` table, mirroring `encounter_records`' existing shape (Sprint 14's
  migration, not modified here): PK = `deriveParticipationRecordId`'s hash, `worldInstanceId`
  + `userId` columns indexed for §7's derived-projection queries, RLS read-only for
  authenticated except the owning `userId` (narrower than `world_events`' world-scoped-only
  RLS, since this table carries a `userId` column world truth tables don't).
- `private_reflections` table, **owner-only RLS**, no service-role read path needed by any
  simulation Host service (enforced by §6's "no runtime import" invariant — if a migration
  ever grants the Host service role read access to this table, that itself is a Sprint 19
  invariant violation worth flagging in review).
- No migration touches `world_events`, `entity_memory_entries`, `relationship_state`, or any
  existing shared-truth table — `ParticipationRecord`'s consequences flow through those
  tables' existing insert paths unchanged.

All of the above are **prepared descriptions only** — no `supabase/migrations/*.sql` file is
created or executed by this Phase 0 document.

---

## 38. Acceptance-Test Matrix (design only)

| Proof | Design | Reuses existing pattern from |
|---|---|---|
| A. Observation causes no shared mutation | Fetch `WorldSnapshot` N times, assert `worldVersion` unchanged and no new `WorldEvent` rows | trivial — no existing precedent needed, snapshot resolution has no write path today |
| B. Private reflection causes no shared mutation | `BeginReflectionIntent` with arbitrary content; assert zero rows in any shared-truth table, only `PrivateReflectionRepository` gains an entry | dependency-boundary regex scan (§6), extended to this new repository |
| C. Valid authorized action produces legitimate consequence | End-to-end `SelectEncounterIntent` → `ParticipationRecord` REALIZED → expected `WorldEvent`/`EntityMemoryEntry` | `lib/encounterRealization/hostService.test.ts` pattern |
| D. Invalid action produces zero mutation | Precondition failure → assert zero writes anywhere | §17's "no write before REALIZED" |
| E. Stale action is rejected | Advance world tick between snapshot fetch and intent send; assert re-resolution catches it | §18 |
| F. Retry does not duplicate consequence | Resend identical intent twice; assert one `ParticipationRecord`, exact consequence counts (not just "no crash") | `hostService.test.ts` replay test's "2 events not 4" style assertion |
| G. Visitor leaves and returns with meaningful memory intact | Full leave/return cycle; assert `VisitorWorldMemory` projection unchanged by absence duration | §7, §22 |
| H. World changes while visitor is absent | Advance world via unrelated actor while visitor absent; assert visitor's next `WorldSnapshot` reflects it | Sprint 9 dormancy/wake, unmodified |
| I. Two visitors see same shared truth | Both fetch `WorldSnapshot`; assert identical shared fields | existing orchestrator no-cross-bleed test's shared-field assertion, inverted |
| J. Two visitors retain separate meaningful-memory | Both participate differently; assert independent `VisitorWorldMemory` projections | `orchestrator.test.ts:59-79` directly |
| K. Conflicting simultaneous actions resolve deterministically | Two visitors target the same rule/location/tick; assert exactly one `ParticipationRecord`, one loses via conditional-save conflict | Sprint 9 `conditionalSave` conflict test pattern |
| L. Protected Canon cannot be rewritten | Attempt a `ParticipationAuthorization` bypass of `protectedNarrativeGateOpen`; assert BLOCKED regardless of causal inputs | `encounterRealizationResolution.test.ts:26-29` verbatim pattern |
| M. Renderer cannot directly mutate world state | Fuzz `intentDispatcher` inputs with attempted state fields; assert only well-formed `InteractionIntent` fields are ever read | structural validation, existing |
| N. Web and Unreal semantic intent produce equivalent consequence | Same `SelectEncounterIntent` payload via both adapter paths; assert identical `ParticipationRecord` | `alternateWorldEmbodiment.test.ts` "one Living World, two embodiments" pattern |
| O. worldInstanceId isolation | Two world instances, same visitor, same rule; assert zero id-set intersection | `multiInstance.test.ts` verbatim pattern |
| P. Checkpoint/replay equivalence | Checkpoint mid-participation-pipeline, recover, replay; assert identical `ParticipationRecord` set. **Must specifically include a crash injected between wake-catch-up completing and participation-realization starting**, exercising Sprint 17's identified `lastActiveAt` premature-claim gap (§1/§22) — the existing Sprint 9-14 test suite has never exercised this window | Sprint 9 `recoverAuthoritativeState` pattern, extended with Sprint 17's newly-identified crash point |
| Q. Living Forest alternate-world proof | Same `ParticipationRecord` pipeline against a `living-forest` fixture | §31 — new fixture, same 4-fixture family |
| R. Private reflection content never enters shared-world persistence | Grep-style structural test: no shared-truth table schema contains a reflection-content column; no shared-truth row's data matches injected reflection content | dependency-boundary test technique, extended |

---

## 39. Architectural Invariants

All 20 restated, each anchored to where it is enforced:

1. Living Systems owns authoritative shared-world truth — sole-writer table, §1/§16.
2. Visitor intent is a proposal, not truth — `InteractionIntent` never has an `apply()`, §1.
3. Renderer input is untrusted — server overwrites `userId`, §1/§29.
4. Private reflection cannot mutate shared world state — §6, structural dependency-boundary test.
5. Visitor meaningful-memory is separate from shared world state — derive-only `VisitorWorldMemory`, §7.
6. Protected Canon remains separately guarded — Sprint 7/14's two-layer gate, unmodified, reused identically in §23.
7. Every shared-world mutation requires an authorized semantic mechanism — §5's authorization boundary, no bypass.
8. Existing consequence machinery is reused — §15, zero new consequence engine.
9. Visitor actions are revalidated against current world state — §18.
10. Participation is idempotent — §21, content-hash + pre-check-then-work.
11. Failed/invalid participation produces no partial mutation — §17.
12. Multiple visitors share world truth but not private memory — §19.
13. worldInstanceId isolation is absolute — §31/§38 proof O, reused pattern.
14. Renderer neutrality is preserved — §25.
15. Web/Unreal input may differ physically but semantic intent is renderer-neutral — §26.
16. World evolution continues independently of visitor presence — §22.
17. World grammar defines permissible participation — §32, no hardcoded ecology/mythology.
18. Runtime must not invent missing Canon — §23/§24, Canon-adjacent freedom mechanism only.
19. Runtime must not invent arbitrary game mechanics — §33.
20. Shared-world consequences remain causally explainable — §35.

---

## 40. Collision Audit

| Existing Concept | Sprint 19 Requirement | Integration Method | Why No Duplicate Mechanism |
|---|---|---|---|
| `InteractionIntent` | Visitor action vocabulary | Reused verbatim; `SelectEncounterIntent` gets wired to realization, no new intent type added | Already models exactly enter/leave/visit/reflect/select; adding a new type would fragment the union for no reason |
| `VisitorWorldMemory` | Visitor meaningful-memory | Kept as a projection shape only; writer path stays absent by policy (§7) | Repository already exists; the fix is discipline (don't call `.save()`), not a new contract |
| `ExperienceRegistry` | Recording that participation/reflection occurred | `reflection.created`/`world.location_visited` event types reused unchanged | Open vocabulary already accommodates new event types without a schema change |
| `EncounterOpportunity` | Source of visitor-selectable rules | Read-only reference (`ruleId`/`locationId`/`category`), never mutated or extended with a visitor field | Adding a visitor dimension to an entity/population-scoped type would corrupt its existing invariants (§13) |
| `EncounterRecord` | Template for participation record shape | `ParticipationRecord` is an additive sibling in the same package, reusing `EncounterRealizationStatus`/`CausalReference` | A visitor genuinely lacks an `EntityId`, so it cannot literally *be* an `EncounterRecord`; a sibling avoids forcing a bad fit |
| `EncounterRealization` (`resolveEncounterRealization`) | Deciding whether a visitor's chosen action succeeds | Called unmodified, fed a `ParticipationRecord`-derived input shape | Function is already pure/input-shape-agnostic; no resolver change needed |
| World Memory (`deriveWorldEvents`) | Recording participation consequences | Unmodified; `ParticipationRecord`'s `causalReferences` flow through the existing pipeline | Same "closed union, existing writer" discipline as Sprint 18 Phase 0 §15 |
| Entity Memory | Recording entity-side effects of participation | Unmodified — visitor participation is just another `causalReferences` source | No new entity-memory-entry type needed |
| Place/Rhythm state | Occupancy visibility during participation | Read-only input to `ParticipationAuthorization`; never written by a visitor action | `PlaceOccupancy` already has no writer at all — nothing to protect against, by construction |
| World Adaptation | Future-behavior bias from participation consequences | `WorldEvent.causalReferences` already sufficient, per Sprint 18 Phase 0's identical §17 finding | No new signal kind needed in Sprint 15's closed `AdaptationSignal` vocabulary |
| Protected Narrative | Gating canon-adjacent participation | Same `protectedNarrativeGateOpen` check, re-evaluated at `ParticipationAuthorization` time (§23) | The two-layer defense-in-depth gate already generalizes to any caller, by design (§1) |
| `WorldSnapshot` / `EmbodimentSnapshot` | Observation surface | Unmodified; `VisitorContextProjection` already carries the right presence fields (§8) | No new snapshot field required for observation itself |
| World persistence / checkpoint / replay | Versioning and replay-safety for participation | Reuses `conditionalSave`/`expectedVersion` and checkpoint/recovery unmodified (§28, §38 proof P) | Same reasoning as Sprint 18 Phase 0's §12/§14 — one identity/versioning discipline, not a fourth |

The goal throughout is composition: exactly two genuinely new contract families
(`ParticipationRecord`/`ParticipationAuthorization` as encounter-realization siblings, and
`PrivateReflectionRepository` as a wholly new but narrowly-scoped domain), everything else is
reuse.

---

## 41. Unresolved Questions / STOP Gates

1. **STOP — Sprint 17's crash-recovery finding (§1/§22) needs explicit sign-off before Sprint
   19 implementation begins**, not just before Sprint 17's own implementation. It is a real
   correctness gap in already-shipped, tested Sprint 9-14 code, and Sprint 19's
   `ParticipationRecord` realization is a *new* consumer of the same wake chain — implementing
   participation before this gap is fixed (or explicitly sequenced around, per §22's caveat)
   would let the gap silently corrupt visitor-caused consequences too, not just autonomous
   world evolution.
2. **Sprint 16 Phase 0's spatial hierarchy is itself unimplemented** — §9's navigation section
   deliberately does not adopt `LocalPlaceId` yet.
3. **Whether `VisitorWorldMemory`'s repository `.save()` method should be removed from the
   contract entirely** (rather than merely left unused by policy) is a real open design
   question — §7 recommends keeping it derive-only by discipline plus a structural test, but
   an alternative is to narrow the interface itself to match `ProtectedNarrativeStateRepository`'s
   get-only shape. Recommend resolving this before implementation, since "unused by policy" is
   weaker than "impossible by shape," and this codebase otherwise strongly prefers the latter.
4. **Whether a genuinely new `PrivateReflectionRepository` package is worth its own package
   boundary versus living inside `experience-registry`** as a second, non-append-only table —
   the mission's explicit "must never enter shared-world persistence" requirement argues for
   physical package separation (easier to structurally enforce zero imports from
   `*-runtime` packages), but this trades off against introducing a fifth-ish
   persistence-owning package for one repository. Flagged for implementation-time review.
5. **`ParticipationPrecondition`'s closed union (§14) is Sprint-19-invented**, not confirmed
   against any StudioK authoring vocabulary — same caveat Sprint 18 Phase 0 raised for its own
   `CanonicalEventActivationCondition` union.
6. This document was produced while Sprint 15 (adaptation) is still mid-implementation and
   Sprint 17 has not started. **§15's "no new coupling needed" claim and §22 must be
   re-verified against those sprints' actual closing state before implementation begins.**

---

SPRINT 19 PHASE 0 — VISITOR ↔ LIVING WORLD PARTICIPATION ARCHITECTURE READY — AWAITING PREREQUISITE SPRINT CLOSURES
