---
sprint: 18
phase: 0
title: Canonical Event Integration Architecture
status: PROPOSED — SUBJECT TO IMPLEMENTATION RECONCILIATION
base: feature/sprint14-encounter-realization @ 085e169
---

# Sprint 18 Phase 0 — Narrative Presence & Canonical Event Integration

This document is architecture/specification preparation only. It contains no production
code and modifies no runtime package. Every contract sketch below is explicitly
**PROPOSED — SUBJECT TO IMPLEMENTATION RECONCILIATION**. Naming, field shapes, and package
boundaries will be re-derived against the real Sprint 15/16/17 implementations once they
close.

All examples use neutral synthetic identifiers (`canonical-event-alpha`,
`authored-arrival-event`, `protected-transition-event`) rather than Living Vrindavan
mythology, per the governing instruction: this is architecture, not storytelling. Where
Living Vrindavan is named, it is named only as *one* consumer of a world-neutral engine.

---

## 0. The Central Law

> **CANON IS AUTHORED. WORLD RESPONSE IS SIMULATED.**

A Persistent Living World must never generate, rewrite, contradict, erase, reinterpret, or
manufacture protected canonical narrative truth. Everything in this document exists to keep
that law true under concurrency, replay, crash recovery, multi-world-instance divergence,
and long-horizon adaptation — not merely under the happy path.

---

## 1. Current Protected Narrative Ground Truth

Verified by direct inspection of the Sprint 14 tip (`085e169`), not assumed:

- **`ProtectedNarrativeProjection`** (`packages/living-systems-contracts/src/protectedNarrative.ts`)
  is an opaque, read-only projection: `{ worldId, episodeRef, sceneRef, resolved }`. Living
  Systems never interprets `episodeRef`/`sceneRef` — it only carries them through.
  `resolved: false` is the honest default meaning "no real canonical-narrative system is
  wired up yet."
- **`ProtectedNarrativeStateRepository`** has exactly one method: `get(worldId)`. No
  `save`/`put`/`set`/`update`/`mutate` method exists on the interface at all — protection is
  enforced by the *shape* of the contract, not a policy comment.
- It enters **`WorldSnapshot`** (`packages/living-systems-contracts/src/snapshot.ts`) as a
  frozen field: `readonly protectedNarrative: Readonly<ProtectedNarrativeProjection>`,
  composed by `resolveWorldSnapshot()` in `packages/living-systems-runtime/src/snapshotResolver.ts`,
  which receives it as an **input parameter** — nothing downstream of the simulation
  produces it.
- Encounter gating is **two independent layers**, not one:
  - Layer 1 (Sprint 7, potential layer): `resolveAvailableEncounters` filters
    `narrative-protected` rules by `protectedNarrative.resolved`.
  - Layer 2 (Sprint 14, realization layer): `resolveEncounterRealization` **re-checks the
    same condition as a hard, unconditional gate**, explicitly documented as "defense in
    depth... so a future caller that ever constructs an `EncounterOpportunity` outside that
    gate still cannot realize a narrative-protected encounter." This gate overrides every
    causal score, proven by a test that maximizes all causal inputs and still asserts
    `BLOCKED`.
  - Layer 3 (structural): `dependencyBoundaries.test.ts` regex-scans runtime source for any
    write-shaped call (`protectedNarrative\w*\.(save|put|set|write|mutate|update)\(`) across
    five runtime packages, and asserts two packages (`social-ecology-runtime`,
    `living-rhythms-runtime`) never reference protected narrative at *all*.
- **Provenance is already two distinct concepts, kept apart on purpose:**
  `MemoryProvenance` (`derivedFromEventIds`, `derivationRule`, `causalReferences`) names
  which *simulation input* produced a memory record. `WorldSnapshotProvenance`
  (`worldArtifactSpecId`, `systemsArtifactSpecId`, `canonDocIds`) names which *StudioK
  artifact* was read. The codebase's own comment: "a completely different concept." Sprint 18
  must add a third without collapsing it into either.
- **Sprint 6's `experience-registry`** provides an append-only `ExperienceEvent` log, but it
  is strictly single-actor, self-reported (`ExperienceActor { userId, role? }`,
  `findByUser` only) — there is no world-scoped, actor-independent event shape today. It has
  no "witnessing" concept; it only has "a user did/experienced X."
- **Identity/idempotency discipline is a single pattern, implemented twice, never a third
  way:** `deriveWorldSystemEventId` (Sprint 9, `world-persistence-runtime`) and
  `deriveMemoryRecordId` (Sprint 11, `world-memory-runtime`) both compute a SHA-256 hash over
  ordered, JSON-stable content fields plus a `positionInBatch` disambiguator, feeding an
  append-idempotent repository whose SQL table enforces the same id as a primary key.
  `encounter-realization-runtime`'s `deriveEncounterRecordId` follows the identical pattern.
  **Sprint 18 must reuse this exact scheme, not invent a fourth.**
- **Consequences are a closed, bounded tagged union**, not an open bag:
  `EncounterConsequence = { domain: "WORLD_MEMORY"; ... } | { domain: "RELATIONSHIP"; ... }`.
  Non-terminal statuses (`EXPIRED`, `BLOCKED`) derive **zero** consequences — this is
  structurally enforced, not just conventional. Each domain forwards into an existing
  single-writer pipeline (`deriveWorldEvents`, Social Ecology's `applyEncounterEvidence`)
  rather than creating a parallel mutation authority.
- **Sprint 15 (world-adaptation)** is mid-implementation, uncommitted, in the neighboring
  worktree: a pure `Signal → Pressure → Decision → Effect` pipeline, with a
  `WORLD_POSSIBILITY` effect domain explicitly meant to represent "changed future
  possibilities." Its `AdaptationSignal.causalReferences` already imports
  `CausalReference` from `world-memory-contracts` — the same provenance primitive Sprint 18
  will use.
- **Sprint 16 (spatial ecology)** had produced no artifacts at research time beyond the
  pre-existing Sprint 8 `SpatialNode` (a flat parent/child location graph, explicitly *not* a
  scene graph, with an existing warning against inventing parallel spatial identities beyond
  `LocationId`); it landed its own Phase 0 architecture doc
  (`SPRINT16_PHASE0_SPATIAL_ARCHITECTURE.md`, `c67820e`) proposing a
  `Domain → Sector → Quadrant → Patch → Local Place` hierarchy during this same session
  (see §18). Both are Phase 0 proposals, so spatial-scope design here remains provisional.
- **StudioK Canon ingestion is one-way, build-time vendoring, already carrying most of an
  identity/provenance scheme:** `studiok-canon → studiok-specifications (Approved spec JSON)
  → manually re-vendored into lib/livingWorldRuntime/vendor/*.json → manifest.json (pinned
  git tag/commit + sha256 checksum) → artifactIngestion.ts verifies the checksum at module
  load and throws on mismatch`. Each vendored artifact already embeds a `provenance` block:
  `{ canonDocIds, canonVersion, specId, specVersion, generatedAt }`. There is no live
  cross-repo import and no runtime write path back into `studiok-specifications` or
  `studiok-canon`.

This is the ground truth Sprint 18 extends. Nothing above is being changed by this document.

---

## 2. Ownership Model

```
┌───────────────────────────────────────────────────────────────────────────┐
│ STUDIOK (authoring, external to this repo)                                │
│   owns: Canon, canonical event DEFINITION, protected narrative facts,     │
│         narrative constraints, canonical provenance chain                 │
│   write surface into runtime: NONE (build-time vendoring only)            │
└───────────────────────────────────────────────────────────────────────────┘
                                   │  (one-way, checksum-verified vendoring)
                                   ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ LIVING SYSTEMS (this repo's simulation)                                   │
│   owns: simulation, environment, entities, relationships, occupancy,      │
│         encounter realization, consequences, world memory, adaptation,    │
│         emergent history, canonical-event PROJECTION/ACTIVATION state     │
│   write surface into Canon: NONE — structurally absent, not just unused   │
└───────────────────────────────────────────────────────────────────────────┘
                                   │  (semantic, renderer-neutral snapshot/delta)
                                   ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ RENDERER (Web today, Unreal future)                                       │
│   owns: presentation only — color, geometry, animation asset, audio asset │
│   write surface into Living Systems: interaction intents only            │
└───────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ VISITOR                                                                   │
│   owns: interaction choices, private reflection / experience-registry     │
│         entries about themselves                                         │
│   write surface into Canon or world truth: NONE                          │
└───────────────────────────────────────────────────────────────────────────┘
```

No layer below StudioK can promote anything into Canon. This is re-asserted per-domain in
§14 (Narrative Invariants).

---

## 3. Four Ownership Domains (never collapsed)

| # | Domain | Owner | Mutability | Existing analogue |
|---|---|---|---|---|
| 1 | **Canon Definition** | StudioK | Immutable, authored | `studiok-canon` → `studiok-specifications` Approved artifacts |
| 2 | **Canonical Event Instance / Activation** | Living Systems (projection only, not authorship) | Write-once per (event, world instance); records *that* and *when* an authorized event legitimately entered a world instance | New — no existing analogue; nearest sibling is `EncounterRecord` |
| 3 | **World Consequence** | Living Systems (simulation) | Fully mutable, simulation-owned | `EncounterConsequence`, `AdaptationEffect` |
| 4 | **World Memory** | Living Systems (world-memory-runtime) | Append-only, durable | `WorldEvent`, `HistoricalMarker` |

Domain 1 is never represented redundantly inside domains 2–4. Domain 2 stores only an
*identity + activation state + provenance pointer back to* domain 1 — never a copy of
canonical content.

---

## 4. Canon Definition Model

A **`CanonicalEventDefinition`** is authored StudioK content, ingested through the exact
same one-way vendoring pipeline already used for world/systems/experience artifacts (§1).
It is not new infrastructure — it is a new *artifact kind* flowing through the existing
`artifactIngestion.ts` → `manifest.json` checksum-verification mechanism.

```
studiok-canon (STK-CAN-###, Approved)
        │
        ▼
studiok-specifications (STK-SPEC-###, Approved, dependsOn: [STK-CAN-###])
        │  e.g. a spec for "canonical-event-alpha"
        ▼
vendor/<world>.canonical-events.json   (new artifact kind, same manifest.json entry shape:
                                         artifactId, specId, specVersion, canonDocIds,
                                         canonVersion, pinnedTag/pinnedCommit, checksum)
        │
        ▼
artifactIngestion.ts::verifyArtifactIngestion()   (re-hash on load, throw on mismatch —
                                                    unchanged mechanism, new artifact kind)
        │
        ▼
CanonicalEventDefinition (runtime-facing, PROPOSED)
```

`CanonicalEventDefinition` is **never mutable at runtime**. There is no repository write
method for it, mirroring `ProtectedNarrativeStateRepository`'s get-only shape exactly.

---

## 5. Canonical Event Identity

Per-instruction, identity must not depend on renderer object, Unreal actor, UI route, DB row
identity alone, LLM-generated identifier, visitor session, or world tick alone.

**PROPOSED**: `CanonicalEventIdentity` is a two-part key:

```ts
// PROPOSED — SUBJECT TO IMPLEMENTATION RECONCILIATION
interface CanonicalEventIdentity {
  /** Stable, StudioK-authored slug. Same lifetime as the Canon artifact's own ID taxonomy
   *  (id-taxonomy.schema.json: "once assigned, an ID is never reassigned or renumbered"). */
  canonicalEventId: string // e.g. "canonical-event-alpha"
  /** The exact vendored artifact this identity is bound to — content hash, not a version
   *  number alone, so a re-vendor that changes bytes without bumping specVersion cannot
   *  silently redefine identity underneath an already-activated event. */
  definitionContentHash: string // sha256, from manifest.json's existing checksum field
}
```

This reuses fields StudioK ingestion **already produces** (`manifest.json`'s `artifactId` +
`checksum`) — no new authoring surface, no new identity scheme. A canonical event's identity
is therefore anchored in the same provenance chain as the rest of Canon, not invented by the
runtime.

`CanonicalEventIdentity` alone identifies *the authored event*, globally, across every world
instance. It says nothing about whether, when, or how it has projected anywhere — that is
§6–§11.

---

## 6. Projection Eligibility (not truth)

```
CanonicalEventDefinition (StudioK truth — never evaluated for "is it true")
        │
        ▼
Projection Eligibility  ← evaluates ONLY: is this world instance, right now,
        │                  in a state where an already-true event may legitimately
        │                  enter it?
        ▼
Authorized Activation
```

There is **no second path**. The runtime never asks "should this become Canon?" — only "is
Canon's already-authored event eligible to project here, now?" This mirrors the existing
`resolved: boolean` flag on `ProtectedNarrativeProjection`, generalized: eligibility is a
gate on *entry*, never a judgment on *truth*.

```ts
// PROPOSED
interface CanonicalEventEligibility {
  canonicalEventId: string
  worldInstanceId: WorldInstanceId
  eligible: boolean
  reasons: CausalReference[] // reuses @avatark/world-memory-contracts CausalReference,
                              // the same structured-provenance atom used everywhere else
}
```

---

## 7. Activation Semantics

Bounded, deterministic, authored conditions only — evaluated against **legitimate** world
state, never against emergent state that could accidentally satisfy or fail to satisfy a
required condition (see §9 for the required/optional/presentation split, which exists
precisely to prevent an emergent condition from erasing a required event).

Authored condition kinds (closed vocabulary, matching the repo's existing "closed
vocabularies everywhere" discipline — see Sprint 15's `AdaptationEffect` domains):

```ts
// PROPOSED — closed union, StudioK-authored, never simulation-authored
type CanonicalEventActivationCondition =
  | { kind: "WORLD_TIME_AT_LEAST"; tick: number }
  | { kind: "SEASON_EQUALS"; seasonId: string }
  | { kind: "SEQUENCE_POSITION"; afterCanonicalEventId: string }
  | { kind: "LOCATION_REACHED"; locationId: LocationId } // SUBJECT TO SPRINT 16 RECONCILIATION
  | { kind: "WORLD_INSTANCE_PHASE"; phase: string }
  | { kind: "NARRATIVE_GATE_OPEN"; gateId: string } // e.g. protectedNarrative.resolved-style gate
```

All condition kinds reference facts the runtime can observe deterministically. None
reference "has X entities encountered Y" or other emergent-history facts as a *sufficiency*
condition for a **required** event — see §9.

---

## 8. Projection Lifecycle

```
AUTHORIZED → ELIGIBLE → ACTIVATED → PROJECTING → COMPLETED
                                          │
                    (optional, if authored)
                                          ▼
                                     DEFERRED → (re-evaluated later) → ACTIVATED
DORMANT  (authored but not yet reachable in this world instance's timeline at all)
```

- **AUTHORIZED**: the event exists in Canon; true globally, independent of any world
  instance.
- **DORMANT**: authored, but this world instance hasn't yet reached any state where
  eligibility is even evaluated (e.g. before `WORLD_TIME_AT_LEAST`).
- **ELIGIBLE**: eligibility conditions hold for this world instance right now.
- **ACTIVATED**: an eligible event has been authorized to project — the write that makes
  this durable is the idempotency-critical one (§12).
- **PROJECTING**: consequences are actively being derived/applied.
- **DEFERRED**: eligible but an authored constraint temporarily withholds activation (e.g.
  a `NarrativeConstraint`, §10, requires a precondition not yet met). Never used to imply
  Canon changed — only that *this world instance's* projection is paused.
  **PROPOSED, only if the reconciled Sprint 7/14 narrative-gate vocabulary needs it —
  do not add if `NARRATIVE_GATE_OPEN` already covers the case.**
- **COMPLETED**: consequences fully derived and durably recorded.

This lifecycle names a **projection into a world instance**, never a state of Canon itself.
Naming deliberately parallels `EncounterRealizationStatus`'s
`REALIZING → REALIZED → CONSEQUENCES_APPLIED → REMEMBERED` (with `EXPIRED`/`BLOCKED`/
`SUPERSEDED` siblings) — Sprint 18 should reconcile exact names with that precedent rather
than diverge for no reason.

---

## 9. Required vs Optional vs Presentation-Conditional

Explicit categories, only introduced because the mission calls out the risk of an emergent
condition erasing a required event:

| Category | Meaning | Emergent state may... |
|---|---|---|
| **REQUIRED CANONICAL EVENT** | Must eventually activate in every world instance that reaches its authored activation window. Eligibility conditions for a REQUIRED event must be restricted to non-emergent, monotonically-reachable facts (world time, sequence position, phase) so it cannot be starved. | ...influence *when within the window* and *how it's presented*, never *whether* it occurs. |
| **OPTIONAL AUTHORIZED CANONICAL PROJECTION** | Authored, but StudioK marks it as legitimately skippable for a given world instance (e.g. instance-specific narrative branch). | ...may be part of eligibility itself. |
| **WORLD-DEPENDENT PRESENTATION CONDITION** | Not an eligibility gate at all — governs only *how* an already-activated event's consequences present (e.g. which entities are described as present), never *whether* it activates. | ...freely determines this; it's simulation's normal job. |

**STOP GATE**: this three-way split is proposed by Sprint 18, not found in existing Canon
terminology. If StudioK's actual authoring model (in `studiok-specifications`) already has an
equivalent distinction under different names, that vocabulary wins and this section is
relabeled, not re-architected.

---

## 10. Mandated Fact vs Simulated Consequence

This is the mechanism that keeps a "genuinely living world" honest while still honoring
authored story.

```ts
// PROPOSED
interface CanonicalEventProjection {
  activationId: string // see §12 for derivation
  canonicalEventId: string
  worldInstanceId: WorldInstanceId
  mandatedFacts: MandatedFact[]      // StudioK-authored, non-negotiable
  scope: CanonicalEventProjectionScope // §11 / SUBJECT TO SPRINT 16 RECONCILIATION
}

// A mandated fact is a semantic assertion, never a renderer instruction.
// "ENTITY MUST BE PRESENT" is mandated fact-shaped; "RENDER ENTITY AT XYZ" is not.
type MandatedFact =
  | { kind: "PARTICIPANT_PRESENT"; participantRef: string }
  | { kind: "LOCATION_ACTIVE"; locationId: LocationId } // SUBJECT TO SPRINT 16 RECONCILIATION
  | { kind: "ENVIRONMENTAL_STATE"; stateRef: string }
```

Everything **not** listed as a `MandatedFact` is a **simulated consequence** — resolved by
the *existing* systems (encounter realization, social ecology, adaptation), exactly as
today. The projection contract never grows a second consequence engine; it only ever hands
semantic stimuli to the systems that already own consequence derivation (§16).

---

## 11. World-Instance Projection State (isolation)

**Global Canonical Identity** (§5) is single, shared, immutable. **World-Instance
Canonical Projection State** is per-instance, mutable-by-projection-only:

```ts
// PROPOSED
interface WorldInstanceCanonicalProjectionState {
  worldInstanceId: WorldInstanceId
  canonicalEventId: string
  status: CanonicalEventProjectionStatus // §8
  activatedAtTick: number | null
  completedAtTick: number | null
}
```

World instance A having `COMPLETED` and world instance B having `DORMANT` for the *same*
`canonicalEventId` is not two Canons — it is one Canon with two independent projection
histories, exactly the same relationship `EncounterRecord`'s per-world-instance isolation
already proves for encounters (multi-instance test: zero id-set intersection between
instances, independent tick/time divergence). Sprint 18 reuses that proof shape verbatim
(§28, proof E).

`CanonicalEventProjectionScope` (spatial extent) is explicitly
**SUBJECT TO SPRINT 16 RECONCILIATION**. Sprint 16 Phase 0 landed mid-way through this
session's research (`docs/SPRINT16_PHASE0_SPATIAL_ARCHITECTURE.md`, commit `c67820e`, its
own Phase 0 — not implemented either) proposing a `Domain → Sector → Quadrant → Patch →
Local Place → LocationId` containment hierarchy (`DomainId`, `SectorId`, `QuadrantId`,
`PatchId`, `LocalPlaceId`), with every level above Patch a pure `CONTAINS` grouping and
Patch/LocalPlace state always *derived* rollups, never an independent second causal engine —
the identical "no second engine" discipline this document applies throughout. A plausible
future shape, **not adopted yet, pending that architecture's own closure**:

```ts
// PROPOSED, ILLUSTRATIVE ONLY — SUBJECT TO SPRINT 16 RECONCILIATION
type CanonicalEventProjectionScope =
  | { level: "WORLD" }
  | { level: "DOMAIN"; domainId: string }   // Sprint 16 DomainId, once finalized
  | { level: "SECTOR"; sectorId: string }   // Sprint 16 SectorId
  | { level: "QUADRANT"; quadrantId: string } // Sprint 16 QuadrantId
  | { level: "PATCH"; patchId: string }     // Sprint 16 PatchId
  | { level: "LOCAL_PLACE"; localPlaceId: string } // Sprint 16 LocalPlaceId
  | { level: "ENTITY_SET"; entityIds: string[] }
```

Phase 0 commits only to the semantic requirement: *a canonical event must not automatically
affect every entity everywhere unless its authored scope says so.* The concrete type is not
adopted until Sprint 16 closes, since both architectures are still Phase 0 and neither is
authorized to lock the other's contract.

---

## 12. Idempotency

Reuses the **one existing identity discipline** verified in §1, not a new one:

```ts
// PROPOSED — mirrors deriveWorldSystemEventId / deriveMemoryRecordId / deriveEncounterRecordId
function deriveCanonicalActivationId(
  worldInstanceId: WorldInstanceId,
  canonicalEventId: string,
  definitionContentHash: string,
  activationTick: number,
): string {
  // sha256(worldInstanceId | canonicalEventId | definitionContentHash | activationTick)
}
```

The activation write is `INSERT ... ON CONFLICT (activationId) DO NOTHING`-shaped — the
exact pattern `world_system_events` and `world_events` already use. A retry, duplicate
request, renderer reconnect, or replayed batch can never activate the same event twice in
the same world instance, because the id is computed and checked **before** any consequence
work runs (mirroring `deriveEncounterRecordId`'s pre-check-then-work order, not
work-then-dedupe).

---

## 13. Persistence

`CanonicalEventProjection` and `WorldInstanceCanonicalProjectionState` are durable rows,
analogous to `world_events`/`historical_markers` (Sprint 11's migration 028): PK = the
derived `activationId`, RLS read-only for authenticated clients, writes only via the Host's
service-role path — the same access-control shape already applied to every world-truth
table since migration 026.

**Canon itself is never persisted redundantly inside these tables.** Only
`canonicalEventId` + `definitionContentHash` (a pointer) is stored — never the mandated
facts' authored source text, never a copy of the spec JSON. This mirrors §1's finding that
`WorldSnapshotProvenance` stores `canonDocIds`, not canon content.

---

## 14. Checkpoint / Replay

Given the same world checkpoint + the same canonical projection schedule + the same
deterministic inputs, the resulting authoritative world state must reproduce — exactly
Sprint 9's existing determinism guarantee (`advanceWorldSimulation` as a pure function of
`(state, ticks, seed)`), extended by one additional pure input: **the ordered list of
already-completed `activationId`s as of the checkpoint tick**.

```
WorldCheckpoint (existing, Sprint 9)
   + canonicalProjectionHistory: activationId[]   (NEW field, append-only, ordered by tick)
```

Recovery re-evaluates eligibility/activation deterministically forward from the checkpoint,
skipping any `activationId` already present in `canonicalProjectionHistory` — never
re-deriving consequences for it. This is additive to `recoverAuthoritativeState`
(`world-persistence-runtime/checkpoint.ts`), not a parallel recovery path.

---

## 15. World Memory Integration

A completed canonical projection produces a `WorldEvent` through the **existing**
`deriveWorldEvents` pipeline (Sprint 11), tagged with a new but structurally identical
category, e.g. `category: "CANONICAL_EVENT_OCCURRED"`, carrying
`causalReferences: [{ kind: "canonicalEvent", ref: canonicalEventId }, ...]`. No new
world-memory storage engine is created — see collision audit (§27, row: World Memory).

World memory can therefore answer "did canonical event E occur in this world instance, and
when" — but it **cannot** promote anything into Canon (§14 invariant list), because
`WorldEvent`/`HistoricalMarker` already have no write path back toward
`ProtectedNarrativeStateRepository` or the vendored Canon artifacts, and Sprint 18 adds none.

---

## 16. Sprint 14 Consequence Integration

Reuse, not duplication. `CanonicalEventProjection`'s mandated facts become **inputs** to the
existing pipelines:

```
CanonicalEventProjection.mandatedFacts
        │
        ▼
  semantic world stimuli  (e.g. PARTICIPANT_PRESENT becomes an EncounterOpportunity
        │                  input, or a presence constraint consulted by behavior selection —
        │                  exact wiring is an implementation-phase decision)
        ▼
existing encounter-realization-runtime / social-ecology-runtime / living-rhythms-runtime
        │
        ▼
EncounterConsequence (existing closed union, unchanged) → deriveWorldEvents / applyEncounterEvidence
```

`EncounterConsequence`'s domain union is **not extended** with a `"CANONICAL"` branch — a
canonical-event-triggered encounter is still just an `EncounterConsequence`, indistinguishable
downstream from an emergent one except by its `causalReferences` trail back to the
`activationId`. This is deliberate: it is the mechanism that keeps §9's "simulated
consequence" honestly simulated, and it is why Sprint 18 needs no "special canonical world
engine."

---

## 17. Sprint 15 Adaptation Integration Seam

Verified from the (in-progress, uncommitted) Sprint 15 worktree: `AdaptationSignal` already
carries `causalReferences: CausalReference[]` sourced from `world-memory-contracts`. A
canonical event's resulting `WorldEvent` (§15) is therefore **already** a valid
`AdaptationSignal` source with zero new coupling — Sprint 15's `Signal → Pressure →
Decision → Effect` pipeline does not need to know a signal originated from a canonical
projection versus an emergent encounter. The seam is: *canonical events terminate at
WorldEvent; Adaptation begins at WorldEvent; Sprint 18 does not reach past that boundary.*

**Invariant re-stated**: Adaptation may bias future entity/relationship/place/group behavior
and even future `WORLD_POSSIBILITY` effects — it may never gain a write path toward
`CanonicalEventDefinition`, `ProtectedNarrativeStateRepository`, or the vendored Canon
artifacts. Sprint 18 adds no such path, and none exists today.

---

## 18. Sprint 16 Spatial Integration Seam

Sprint 16's own worktree began empty (verified at research time) and landed its Phase 0
architecture doc (`SPRINT16_PHASE0_SPATIAL_ARCHITECTURE.md`, `c67820e`) during this same
session — itself an unimplemented spec, not runtime code. It proposes a
`Domain → Sector → Quadrant → Patch → Local Place` containment hierarchy over the existing
`LocationId` addressable unit, with an explicit non-duplication discipline (every level's
state is a derived rollup, never an independently-simulated value) that matches this
document's own §16 "no second engine" posture almost exactly.

`CanonicalEventProjectionScope` (§11) therefore has a *plausible* future shape (sketched in
§11) but is **not adopted** here — both Sprint 16 and Sprint 18 are Phase 0 architecture
passes running concurrently, and per this session's explicit instructions, neither is
authorized to treat the other's unstable proposal as load-bearing. The requirement stands
regardless of which concrete hierarchy lands: a canonical event's spatial scope must be
expressible at whatever granularity Sprint 16 finalizes (world-wide down to a single local
place or entity set), and must never default to "everywhere" implicitly.

---

## 19. Sprint 17 Long-Horizon Integration Seam

Not implemented here — documented as a seam only, per instruction. The relevant future
sequence:

```
visitor leaves
   → world continues (existing Sprint 9 dormancy/wake + deterministic catch-up)
   → canonical event becomes ELIGIBLE, then ACTIVATED, entirely independent of visitor
     presence (§6–§8 have no visitor precondition anywhere)
   → consequences persist via existing World Memory / Adaptation pipelines (§15–§17)
   → visitor returns later, wakes the world instance (existing Sprint 9 wake path),
     and observes consequences already present in WorldSnapshot / world memory
```

Sprint 18 Phase 0's only obligation to Sprint 17 is that nothing above depends on
visitor session state — verified true: `CanonicalEventEligibility`,
`CanonicalEventActivationCondition`, and `WorldInstanceCanonicalProjectionState` reference
only world-instance and tick state, never a visitor/session id.

---

## 20. Visitor Witness Boundary

Two facts, never one:

```ts
// PROPOSED
// Fact A — world-scoped, actor-independent, already covered by §11/§15
interface WorldInstanceCanonicalProjectionState { /* ...as above... */ }

// Fact B — visitor-scoped, per-actor, NEW shape needed (experience-registry today is
// single-actor "I did X" only — see §1 finding — so this cannot just be an ExperienceEvent
// with a different `type` string; it needs the world-fact as a linkable target)
interface VisitorCanonicalEventWitness {
  userId: string
  canonicalEventId: string
  worldInstanceId: WorldInstanceId
  activationId: string // links back to Fact A, never duplicates its content
  witnessedAtTick: number
}
```

A world may complete a canonical projection while zero visitors are present (Fact A exists,
no Fact B records exist yet). A visitor arriving afterward experiences the *consequences*
(via `WorldSnapshot`/world memory) without ever producing a `VisitorCanonicalEventWitness` —
witnessing and consequence-exposure are not the same thing either. Visitor reflection
(`experience-registry`'s existing `reflection.created` event type) may reference Fact B, but
per §14's invariant list, no volume of visitor reflection can promote anything into Canon —
`ExperienceEventRepository` already has no such write path, and Sprint 18 adds none.

---

## 21. Renderer Boundary

Core contracts (§4–§12) contain no React, CSS, DOM, Unreal Actor, UObject, Blueprint,
Sequencer, Level Sequence, World Partition, Niagara, animation asset, or audio asset —
verified by pattern-matching this document's own contracts against §1's finding that the
existing renderer-neutral discipline (`entityPresentation.ts`, `sensoryCue.ts`,
`unrealCommand.ts`) expresses **intent strings**, never engine references. A
`MandatedFact` (§10) is exactly this kind of intent: `PARTICIPANT_PRESENT` says nothing
about coordinates, meshes, or camera; a renderer adapter decides all of that.

`CanonicalEventProjection`'s eventual presentation surface should be expressed as a
`SensoryCue`/`EncounterPresentation`-shaped output (§1, `packages/world-embodiment-contracts`)
— reusing those types rather than inventing parallel ones, since they already model
"authored semantic cue distinct from raw rendering."

---

## 22. Unreal Adapter Implications

`unrealCommandTranslator.ts` already proves the seam: `WorldEmbodimentSnapshot/Delta` (semantic)
→ `UnrealCommand[]` (generic engine-facing op vocabulary), a pure, headless, engine-dependency-free
transform. A canonical-event projection plugs into the **same** seam —
`translateCanonicalEventProjectionToUnrealCommands(projection): UnrealCommand[]` — or, more
likely, requires no new function at all if mandated facts are first lowered into the existing
`EntityPresentation`/`EncounterPresentation`/`SensoryCue` shapes before reaching the
translator. Unreal never becomes a source of canonical truth: it receives the same semantic
projection the Web adapter receives (§28, proof F), and has no path back into
`CanonicalEventDefinition` any more than it has one into `ProtectedNarrativeStateRepository`
today.

---

## 23. Provenance

A **third**, explicitly distinct provenance concept, alongside the two already established
in §1 (never collapsed into either):

```ts
// PROPOSED
interface CanonicalEventProvenance {
  canonDocIds: string[]      // same field shape as WorldSnapshotProvenance.canonDocIds
  specId: string             // e.g. "STK-SPEC-###"
  specVersion: number
  definitionContentHash: string // §5
}
```

`MemoryProvenance` continues to name *simulation inputs*. `WorldSnapshotProvenance`
continues to name *which artifact a snapshot was rendered from*. `CanonicalEventProvenance`
names *which authored Canon document and spec a specific canonical event traces to* —
attached to `CanonicalEventProjection`, never merged into the other two structs.

---

## 24. Security / Authority Invariants

Restated explicitly, each mapped to an existing or proposed structural enforcement:

| Invariant | Enforcement |
|---|---|
| Canon cannot be mutated by runtime | `CanonicalEventDefinition` repository has no write method (§4), mirroring `ProtectedNarrativeStateRepository` |
| World memory cannot promote an event into Canon | `WorldEvent`/`HistoricalMarker` repositories already have no write path toward Canon; none added |
| Visitor memory cannot promote an event into Canon | `ExperienceEventRepository` has no such path; `VisitorCanonicalEventWitness` (§20) only links, never authors |
| Encounter realization cannot promote an event into Canon | Existing `EncounterConsequence` closed union unmodified (§16) |
| Adaptation cannot promote an event into Canon | Sprint 15's `AdaptationEffect` domains stop at entity/relationship/place/group/world-possibility; none reach Canon (§17) |
| Renderer cannot promote an event into Canon | Renderer receives semantic projection only, one-directional (§21–§22) |
| LLM/model output cannot promote an event into Canon | `CanonicalEventIdentity` explicitly excludes LLM-generated identifiers (§5); no authoring surface exists in runtime at all |
| Emergent history cannot overwrite Canon | `WorldInstanceCanonicalProjectionState` is per-instance and additive-only; Global Canonical Identity (§5) is never written by it (§11) |
| Canonical event projection cannot silently broaden canonical meaning | Mandated facts (§10) are a closed, StudioK-authored set per event; the runtime cannot add a `MandatedFact` variant without a Canon/spec change |

Extended with a dependency-boundary test, following the existing
`dependencyBoundaries.test.ts` pattern: regex-scan `canonical-event-runtime` and every
runtime package it touches for any write-shaped call against
`canonicalEventDefinition\w*\.(save|put|set|write|mutate|update)\(` — same mechanism, new
subject.

---

## 25. Proposed TypeScript Contracts (summary index)

All are **PROPOSED — SUBJECT TO IMPLEMENTATION RECONCILIATION**. Full shapes appear inline
above; this is the index StudioK/implementation review should work from:

- `CanonicalEventIdentity` (§5)
- `CanonicalEventEligibility` (§6)
- `CanonicalEventActivationCondition` (§7, closed union)
- `CanonicalEventProjectionStatus` (§8, lifecycle union)
- `MandatedFact` (§10, closed union)
- `CanonicalEventProjection` (§10)
- `CanonicalEventProjectionScope` (§11, deferred — SUBJECT TO SPRINT 16 RECONCILIATION)
- `WorldInstanceCanonicalProjectionState` (§11)
- `VisitorCanonicalEventWitness` (§20)
- `CanonicalEventProvenance` (§23)
- `deriveCanonicalActivationId(...)` (§12, function, not a type)

Deliberately **not** proposed: `CanonicalEventResult`, `CanonicalEventLifecycle` as
separate types from what's listed above — the mission's candidate-concept list is broader
than what the existing repository's conventions justify; several candidates collapse into
`CanonicalEventProjection` + `WorldInstanceCanonicalProjectionState` rather than each
warranting a distinct type. Naming should be reconciled with StudioK/implementation review
before Sprint 18 implementation begins, not treated as final.

---

## 26. Proposed Package / Module Ownership

**Recommendation: two new packages, following the existing `*-contracts` / `*-runtime`
split used by every other domain in this codebase** (`encounter-realization-contracts/
-runtime`, `world-adaptation-contracts/-runtime`, `world-memory-contracts/-runtime`):

```
packages/canonical-event-contracts/   (types only, §4-§13, §20, §23 — no logic)
packages/canonical-event-runtime/     (eligibility evaluation, activation, projection
                                        orchestration, idempotent id derivation — logic only,
                                        no I/O, mirroring every existing *-runtime package)
```

**Why not extend `packages/narrative-runtime`**: verified in §1 that `narrative-runtime` is
a generic, franchise-agnostic branching-narrative engine (Season/Episode/Scene/Beat) with no
concept of protection or Canon at all — it is a *future consumer* of canonical events
(e.g. a canonical event could drive narrative-runtime state transitions), not their source
of truth. Merging them would conflate "how a branching story plays out" with "whether an
authored fact is permitted to enter a world," which is exactly the collapse this mission
prohibits.

**Why not extend `packages/living-systems-contracts`**: `ProtectedNarrativeProjection`
correctly stays there as the *opaque carrier* Living Systems already uses — canonical event
logic is a new orchestration layer *above* it, not a modification to it. Living Systems
continues to only ever `get()` a projection; it does not need to know eligibility/activation
mechanics live one layer up.

`lib/canonicalEvents/hostService.ts` (Host-composed integration, analogous to
`lib/encounterRealization/hostService.ts`) is where world-instance-scoped orchestration and
the replay/multi-instance proofs (§28) belong — matching where Sprint 14's own integration
tests live (`lib/`, not inside the contracts/runtime packages).

---

## 27. Collision Audit

| Existing Owner | Sprint 18 Requirement | Integration Method | Why No Duplicate Engine |
|---|---|---|---|
| Sprint 6 Experience Layer (`experience-registry`) | Visitor witness records | Add `VisitorCanonicalEventWitness` as a new, world-fact-linkable shape; do not repurpose `ExperienceEvent` (§20) | `ExperienceEvent` is structurally single-actor/self-reported; extending it would force a world-scoped fact through an actor-scoped shape. New shape is a link, not a new log. |
| Sprint 7 Protected Narrative Projection (`living-systems-contracts`) | Source of narrative-protected gating | Consume `ProtectedNarrativeProjection.resolved` unchanged as one possible `CanonicalEventActivationCondition` input (`NARRATIVE_GATE_OPEN`); never modify the contract | The get-only repository shape already provides everything Sprint 18 needs; adding a write path would violate §14/§24 invariants for no gain |
| Sprint 9 Persistence (`world-persistence-*`) | Checkpoint/replay determinism, idempotent event ids | Extend `WorldCheckpoint` with `canonicalProjectionHistory` (§14); reuse `deriveWorldSystemEventId`'s hash pattern verbatim for `deriveCanonicalActivationId` | Same hash-and-PK discipline already proven correct three times (Sprint 9, 11, 14); a fourth scheme would fragment idempotency guarantees |
| Sprint 11 World Memory (`world-memory-*`) | Record that a canonical event occurred | New `WorldEvent` category (`CANONICAL_EVENT_OCCURRED`) through existing `deriveWorldEvents` | `WorldEvent`/`HistoricalMarker` already model "durable record of an occurrence with provenance"; a parallel event-log would duplicate significance/retention machinery for no reason |
| Sprint 14 Encounter Realization (`encounter-realization-*`) | Turn mandated facts into consequences | Mandated facts become inputs to existing resolvers; `EncounterConsequence` union stays closed and unmodified (§16) | The closed-union + non-REALIZED-derives-zero pattern is exactly the "bounded consequence derivation" this mission asks for — already built, only needs new *inputs*, not a new *engine* |
| Sprint 15 Adaptation (`world-adaptation-*`, in progress) | Canonical consequences must be able to bias future behavior | `WorldEvent` (§15) is already a valid `AdaptationSignal` source via `causalReferences`; no new coupling required (§17) | Adaptation's signal intake is already provenance-typed generically; canonical origin is just another `causalReferences` entry, not a new signal kind |
| Sprint 16 Spatial Ecology (proposed, not yet materialized) | Projection scope | `CanonicalEventProjectionScope` left as an explicit unresolved type (§11, §18) | No spatial hierarchy exists yet to integrate against; guessing one risks producing a second, competing spatial identity — the exact anti-pattern Sprint 8's own `spatial.ts` comments already warn against |
| `narrative-runtime` | Branching-story playback | Treated as a *downstream consumer*, not a dependency of canonical-event contracts (§26) | Conflating "story playback" with "authorization to exist" is the central collapse this mission prohibits |
| StudioK Canon/spec repositories | Canonical event definition and provenance | New artifact kind (`*.canonical-events.json`) through the existing vendoring pipeline (§4); no new ingestion mechanism | `artifactIngestion.ts` and `manifest.json` already generalize across artifact kinds; a second ingestion path would fork a mechanism that's deliberately minimal by design |

---

## 28. Acceptance-Test Matrix (design only — not implemented here)

| Proof | Design | Reuses existing test pattern from |
|---|---|---|
| A. Canon Immutability | Attempt every write-shaped call against `CanonicalEventDefinition`'s repository at the type level (should not compile) and via the dependency-boundary regex scan (§24) | `dependencyBoundaries.test.ts` |
| B. Authorized Projection | Given an eligible event, activate once; assert `WorldInstanceCanonicalProjectionState.status` reaches `COMPLETED` exactly once and `activationId` is stable across repeated eligibility re-checks | `encounterRealizationResolution.test.ts` determinism assertions |
| C. Replay Safety | Wake the same world instance twice at the identical tick with the same eligible event; assert deep-equality of `WorldInstanceCanonicalProjectionState`, exact consequence/WorldEvent counts (not just "no crash") | `lib/encounterRealization/hostService.test.ts` replay test (§1 finding: asserts "2 events not 4") |
| D. Visitor Absence | Activate + complete a projection with zero `VisitorCanonicalEventWitness` records; later attach a witness record; assert Fact A (§20) is unchanged by Fact B's arrival | New — no direct precedent, but mirrors world-memory's existing separation of world-owned vs visitor-owned tables (migration 026/028 RLS split) |
| E. Different World Responses | Two world instances, same `canonicalEventId`, divergent prior emergent history (different entity locations/relationships); activate the same event in both; assert consequences differ while `CanonicalEventProvenance` and `CanonicalEventIdentity` are byte-identical in both | `lib/encounterRealization/multiInstance.test.ts` (zero id-set intersection + independent tick divergence) |
| F. Renderer Parity | Feed the same `CanonicalEventProjection` through the Web presentation path and `translateToUnrealCommands`-style path; assert both derive from the identical semantic snapshot | `unrealCommandTranslator.ts`'s existing "one Living World, two possible embodiments" proof |
| G. World Neutrality | Run the full activation → projection → consequence → memory pipeline against a neutral synthetic fixture (`canonical-event-alpha` in a non-Vrindavan world definition), asserting no Vrindavan-specific type or string appears anywhere in `canonical-event-contracts`/`canonical-event-runtime` | Sprint 14's `livingForestAdaptationPortability`-style fixture pattern (seen already in Sprint 15's in-progress work) |

---

## 29. Implementation Sequence (proposed, not started)

1. `canonical-event-contracts` package: types only (§25), reviewed against StudioK's actual
   authoring vocabulary before naming is finalized.
2. New artifact kind + `manifest.json` entry shape for canonical events (§4), reusing
   `artifactIngestion.ts` unchanged apart from a new type-guard.
3. `canonical-event-runtime`: eligibility evaluation, `deriveCanonicalActivationId`,
   activation state machine (§7, §8, §12) — pure functions, no I/O, mirroring every existing
   `*-runtime` package's test-first discipline.
4. `lib/canonicalEvents/hostService.ts`: world-instance orchestration, checkpoint field
   extension (§14), wiring into existing `deriveWorldEvents` (§15) and encounter-realization
   inputs (§16).
5. Dependency-boundary test extension (§24).
6. Acceptance proofs A–G (§28), starting with A/B/C (single-instance) before D/E
   (multi-instance/visitor-absence), since D/E depend on infrastructure C already exercises.
7. Sprint 16 reconciliation pass on `CanonicalEventProjectionScope` once a spatial hierarchy
   exists.
8. Sprint 17 reconciliation pass on long-horizon absence semantics (§19) once that sprint
   defines its own contracts.

This sequence is not authorized to begin under this Phase 0 instruction. It is recorded so
a future implementation instruction can start from an agreed plan rather than re-deriving
one.

---

## 30. Unresolved Questions / STOP Gates

1. **§9's REQUIRED/OPTIONAL/PRESENTATION-CONDITIONAL split** is Sprint-18-proposed
   vocabulary, not confirmed StudioK terminology. **STOP** until reconciled with
   `studiok-specifications`' actual authoring model, or an authorized StudioK contact
   confirms no such distinction is needed.
2. **`CanonicalEventProjectionScope`** (§11, §18) cannot be finalized until Sprint 16
   produces an actual spatial hierarchy. Currently a deliberate placeholder.
3. **Whether canonical events need a `DEFERRED` lifecycle state (§8)** depends on whether
   `NarrativeConstraint`-style preconditions (mission's suggested concept) turn out to be
   needed at all, or whether `NARRATIVE_GATE_OPEN` activation conditions (§7) already cover
   every real case. Recommend deferring this type until a concrete authored scenario
   requires it — do not add speculative lifecycle states.
4. **Whether `MandatedFact` needs an environmental-state variant beyond the sketch in §10**
   depends on what StudioK actually intends to author as "environment responds where
   authorized" per the mission's example — no existing environmental-consequence contract
   in this codebase currently models authored (as opposed to emergent) environmental change.
5. **New canonical-event artifact ingestion (§4, §29 step 2)** requires StudioK to actually
   produce a `*.canonical-events.json` spec artifact and manifest entry before any runtime
   code can be written against a real shape rather than a guess.
6. This document was produced while Sprint 15 (uncommitted, mid-implementation) and Sprint
   16 (not yet materialized) are actively changing underneath it. **§17 and §18 must be
   re-verified against those sprints' actual closing state before implementation begins.**

---

SPRINT 18 PHASE 0 — CANONICAL EVENT INTEGRATION ARCHITECTURE READY — AWAITING PREREQUISITE SPRINT CLOSURES
