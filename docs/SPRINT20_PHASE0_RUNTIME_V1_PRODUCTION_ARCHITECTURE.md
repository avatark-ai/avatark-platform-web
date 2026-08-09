# Sprint 20 Phase 0 — Persistent Living World Runtime v1 Production Architecture

**As of:** 2026-08-09. Branch `feature/sprint20-phase0-runtime-v1`, forked
from `feature/sprint15-world-adaptation` @ `17c4bb3` — the latest
COMPLETED, merged-into-no-branch-but-authoritative Living World state.
Architecture/specification preparation only. No runtime code, no
migrations, no changes to any Sprint 7-15 package, and no changes to
any Sprint 16-19 branch. Verify against `git log` before trusting
anything below.

This document treats Sprint 7-15 as **authoritative ground truth**
(verified directly against code) and Sprint 16-19 Phase 0 documents as
**proposed, unstable integration inputs** — none of them has landed
runtime code, and this document never treats their proposals as fact.
Every claim about Sprint 16-19 below is attributed to "Sprint N Phase 0
proposes..." never "the runtime does...".

---

## 0. Executive summary

Sprints 7-15 built a real, tested, deterministic Persistent Living
World simulation stack (causal environment → persistence → population
→ memory → social ecology → rhythms → encounter opportunity →
realization → consequence → adaptation). Sprints 16-19 Phase 0 propose
four more layers (spatial ecology, long-horizon evolution, canonical
event projection, visitor participation) but have not landed a single
line of runtime code, and Sprint 17 Phase 0 found a real,
code-verified crash-recovery defect in the existing wake chain.

Sprint 20 is **not** another simulation-feature sprint. It is the
integration/hardening sprint that turns the accumulated packages into
one coherent, versioned, operable Runtime v1 — without collapsing them
into a monolith, without inventing atomicity the persistence layer
doesn't have, and without pretending unfinished Sprint 16-19 work is
done.

This Phase 0 document produces the architecture only. It ends with a
STOP condition: Sprint 20 implementation cannot begin until Sprint
16-19 close.

---

## 1. Runtime v1 boundary

Four systems, four different repos/lifecycles, four different trust
levels:

```
STUDIOK (authoring)                    -- separate repos: studiok-specifications,
                                           studiok-canon, etc. Produces Approved
                                           artifacts. Never executes anything.
        |  vendored, checksummed artifact (already exists, Sprint 6)
        v
PERSISTENT LIVING WORLD RUNTIME        -- THIS document's subject. Owns
(Sprint 7-15 landed;                      authoritative simulation state and
 Sprint 16-19 proposed)                   execution. Renderer-neutral,
                                           product-neutral, world-grammar-neutral.
        |  Host-composed function calls (lib/*/hostService.ts), never a network hop
        v
AVATARK HOST                           -- lib/*, app/api/*: auth, account/org
                                           scoping, product composition, admin
                                           surfaces, cross-product platform
                                           services (ExperienceRegistry, Timeline,
                                           product-registry).
        |  renderer-contracts-shaped snapshot/delta/intent
        v
RENDERER                               -- Web reference adapter (this repo);
                                           future Unreal adapter (separate repo/
                                           project). Presents semantic truth.
```

**Explicitly NOT part of the Persistent Living World Runtime**, and
Sprint 20 must not touch or duplicate any of them:

- **The "Runtime Kernel"** (`packages/experience-runtime`,
  `narrative-runtime`, `context-runtime`, `living-world-runtime`,
  `experience-registry`) — a separate, general-purpose journey/
  narrative product engine from an earlier program phase
  (`docs/RUNTIME_KERNEL_IMPLEMENTATION.md`). Its own `WorldDefinition`
  (a location/activity checklist with `entryLocationId`,
  `WorldActivity[]`, opaque `WorldPracticeRef`/`WorldReflectionRef`
  pointers) is a **different, older, coincidentally-named concept**
  from `@avatark/world-persistence-contracts`' own `WorldDefinition`
  (the StudioK-authored simulation grammar). Sprint 16 Phase 0's own
  collision audit already flagged this exact naming collision (§22 of
  that doc) and deliberately named its own new type `SpatialGrammar`
  to avoid minting a third one. **Glossary term for this document: the
  older concept is called "Runtime Kernel WorldDefinition"; the
  simulation grammar is called "World Grammar" throughout.**
- **`@avatark/experience-registry`** and **`@avatark/timeline`** —
  cross-product, product-agnostic activity/analytics surfaces
  (`ExperienceEvent`, `TimelineEntry` — practice/reflection/story/
  achievement events for the whole AvatarK ecosystem, not
  Vrindavan-specific). The Living World Runtime **may emit into them
  as one more product** (future work, not Sprint 20), but they are
  never authoritative simulation state, and Sprint 20 does not modify
  either package.
- **RC3** (`feature/avatar-platform-rc3`) — untouched.
- **Sprint 16-19 implementation** — not started; this document treats
  their Phase 0 docs as inputs, never as landed contracts.

---

## 2. Package / dependency inventory (actual, verified)

| Layer | Contracts package | Runtime package | Host composition (`lib/`) | Sprint | Status |
|---|---|---|---|---|---|
| Shared id/tick types | `runtime-contracts` | — | — | 3 | LANDED |
| World grammar/causal engine | `living-systems-contracts` | `living-systems-runtime` | `lib/livingSystems/` | 7 | LANDED |
| Persistence/checkpoint/lease/lifecycle | `world-persistence-contracts` | `world-persistence-runtime` | `lib/worldPersistence/` | 9 | LANDED |
| Living population | `living-population-contracts` | `living-population-runtime` | `lib/livingPopulation/` | 10 | LANDED |
| World/entity memory | `world-memory-contracts` | `world-memory-runtime` | `lib/worldMemory/` | 11 | LANDED |
| Social ecology | `social-ecology-contracts` | `social-ecology-runtime` | `lib/socialEcology/` | 12 | LANDED |
| Living rhythms | `living-rhythms-contracts` | `living-rhythms-runtime` | `lib/livingRhythms/` | 13 | LANDED |
| Encounter realization | `encounter-realization-contracts` | `encounter-realization-runtime` | `lib/encounterRealization/` | 14 | LANDED |
| World adaptation | `world-adaptation-contracts` | `world-adaptation-runtime` | `lib/worldAdaptation/` | 15 | LANDED |
| Spatial ecology / territory | `spatial-ecology-contracts` (proposed) | `spatial-ecology-runtime` (proposed) | not started | 16 | **PROPOSED, Phase 0 only** |
| Long-horizon evolution | `long-horizon-contracts` (proposed) | `long-horizon-runtime` (proposed) | not started | 17 | **PROPOSED, Phase 0 only** |
| Canonical event projection | `canonical-event-contracts` (proposed) | `canonical-event-runtime` (proposed) | not started | 18 | **PROPOSED, Phase 0 only** |
| Visitor participation | additive to `encounter-realization-contracts` (proposed `ParticipationRecord`) | additive | not started | 19 | **PROPOSED, Phase 0 only** |
| Embodiment/renderer projection | `world-embodiment-contracts` | `world-embodiment-runtime` | `lib/worldEmbodiment/`, `lib/renderer/*` | 8 | LANDED (held at Sprint 10's width for 5 consecutive sprints) |
| Renderer neutrality contract | `renderer-contracts` | — | Web reference adapter | 6/8 | LANDED |
| Protected narrative / Canon read gate | (part of `living-systems-contracts`) | — | `lib/livingSystems/singleton.ts` | 7 | LANDED, no runtime ever writes it |
| StudioK artifact ingestion | — | — | `lib/livingWorldRuntime/artifactIngestion.ts` + `vendor/manifest.json` | 6 | LANDED |
| Account/host integration | `account`, `identity`, `auth`, etc. | — | `lib/account/*`, `lib/admin/*` | 1-5 | LANDED (separate product platform, out of this document's scope except for the System Information handoff, §18) |
| ExperienceRegistry / Timeline | `experience-registry`, `timeline` | — | — | 3/varies | LANDED, cross-product, not modified by Runtime v1 |
| StudioK governance repos | — | — | separate repos (`studiok-specifications`, `studiok-canon`, etc.) | — | LANDED, external to this repo |

**Dependency direction, verified**: `packages/runtime-contracts` has
zero dependencies; every `*-contracts` package depends only on
`runtime-contracts` and prior-sprint `*-contracts` packages; every
`*-runtime` package depends only on its own `*-contracts` package plus
prior-sprint `*-contracts` packages, **never a sibling `*-runtime`
package** — statically enforced by
`lib/runtimeKernel/dependencyBoundaries.test.ts` (68 tests as of Sprint
15, one boundary block per sprint). Sprint 20 adds no new runtime
package of its own; it operates entirely at the Host (`lib/`)
composition layer, so it needs no new boundary-test block for a new
runtime/contracts pair — only, if anything, a boundary test asserting
the NEW Host facade (§3) never bypasses an existing sole-writer
boundary (itself not new work, just applying the existing pattern).

---

## 3. Public Runtime API proposal (v1 facade)

**Principle**: the v1 public surface is the SMALLEST set of
capability-shaped operations a consumer (AvatarK Host route, admin
tool, or a future non-web renderer host process) needs — not a
re-export of every internal Host function. Every operation below is a
**thin facade over already-existing (or Sprint 16-19-proposed)
Host-layer functions**; Sprint 20 does not reimplement any of them.

```ts
// Proposed shape -- names illustrative, not final. Lives in a NEW,
// thin `lib/livingWorldHost/` facade module (or equivalent), never in
// a new *-runtime package -- it is pure composition/re-export.

createWorldInstance(worldDefinitionId, artifactRef, ownerContext) -> WorldInstanceId
wakeLivingWorld(worldInstanceId, ownerId, now?) -> LivingWorldWakeResult   // the ONE outermost composed wake -- see §8
getWorldSnapshot(worldInstanceId, userId, locationId, ...) -> WorldEmbodimentSnapshot (+ adaptation/spatial/canonical projections once landed)
getWorldDelta(worldInstanceId, userId, sinceTick) -> WorldEmbodimentDelta
submitVisitorIntent(worldInstanceId, userId, intent) -> ParticipationResult   // Sprint 19-dependent, see §34
enterVisitor(worldInstanceId, userId) -> WorldEmbodimentSnapshot              // = wakeLivingWorld + getWorldSnapshot; no separate "session" state
leaveVisitor(worldInstanceId, userId) -> void                                 // no-op today; a hook point for VisitorWorldMemory bookkeeping if ever needed
forceCheckpoint(worldInstanceId, ownerId) -> CheckpointId                     // admin-only, §19
restoreFromCheckpoint(worldInstanceId, checkpointId) -> void                  // admin-only, disaster recovery, §19
queryProvenance(worldInstanceId) -> WorldRuntimeProvenance                    // §7/§26
queryHealth(worldInstanceId) -> WorldRuntimeHealth                           // §17
```

Explicitly **not** in the v1 public API: raw repository access,
per-domain internal Host functions
(`wakeWorldWithPopulation`/`wakeWorldWithMemory`/etc. stay internal
building blocks the facade composes, exactly as today), and anything
that would let a caller construct authoritative state directly (no
`setWorldState`, no `setEntityMemory`).

`enterVisitor`/`leaveVisitor` are **not** a new stateful session
lifecycle — the runtime has no concept of "visitor present" beyond
whichever domains already track presence (population's
`locationId`-per-entity is about simulated entities, not visitors).
This deliberately avoids inventing a sixth kind of state Sprint 6-19
never needed.

---

## 4. World instance lifecycle

Reconciles Sprint 9's landed `WorldLifecycleState` with Sprint 17
Phase 0's proposed `WakeProgress` overlay, adding nothing new to the
stored state machine itself:

```
                    CREATE / PROVISION  (new WorldInstance row; §21)
                            |
                            v
                       INITIALIZE  (seed durable state from World Grammar; §7)
                            |
                            v
   +--------------------DORMANT<-------------------------+
   |                        |                             |
   |                 visitor_arrived /                     |
   |                 admin wake                            |
   |                        v                              |
   |                     WAKING   <---- crash_detected -----+
   |                        |    (from ANY state, Sprint 9   |
   |                catch-up        landed: `nextLifecycleState`)
   |                complete        |
   |                        v       |
   |                     ACTIVE-----+
   |                        |
   |               no-activity deadline
   |                        v
   |                   QUIESCING
   |                        |            visitor_arrived
   |             checkpoint |<-------(cancels quiesce,
   |             complete   |         returns to ACTIVE --
   |                        |         landed, Sprint 9 test-verified)
   +------------------------+
```

`WakeProgress` (Sprint 17 Phase 0, proposed) is an **additive, derived
projection** over this same state — "how far through the composed
wake chain has this call gotten" — never a sixth stored state, the
same "derived, never a second field" discipline `ResourceTier` already
uses for COLD/WARM/HOT.

**`DEGRADED`/`RECOVERING`/`FAILED` are explicitly NOT new stored
lifecycle states for v1.** A failed wake leaves the world in whichever
durable lifecycle state its last successful step reached (e.g. still
`WAKING` if catch-up itself failed) — Sprint 20 must not invent a
`FAILED` state that could itself desynchronize from reality. Instead:
- **Degraded** is a `WorldRuntimeHealth` READ (§17), computed fresh
  each query from persistence reachability + lease health + artifact
  validity — never a stored field that could go stale.
- **Recovering** is exactly the existing `WAKING` state entered via
  `crash_detected` (already a landed transition, Sprint 9).
- A world that cannot recover is surfaced as a `queryHealth` result of
  `blocked`, still sitting in its last real lifecycle state — it is
  never silently marked `FAILED` and left un-inspectable.

---

## 5. World grammar versioning

Already landed, more than the mission text assumed: `WorldDefinitionId`
(`world-persistence-contracts/src/ids.ts`) identifies "the
StudioK-authored grammar/configuration" a `WorldInstance` executes, and
`IncompatibleWorldDefinitionError` (`errors.ts`) already exists as the
enforcement hook for "this instance cannot silently switch grammar."
Artifact identity/checksum/provenance/approval state is **already
built** (Sprint 6, `lib/livingWorldRuntime/artifactIngestion.ts` +
`vendor/manifest.json`): every vendored artifact carries `artifactId`,
`specId`, `specStatus` (`Draft|Proposed|Approved|Deprecated`),
`specVersion`, `worldSchemaVersion`, `pinnedTag`/`pinnedCommit`,
`canonDocIds`, `canonVersion`, and a sha256 `checksum` verified at load
time.

**v1 gap to close**: nothing today ties a `WorldInstanceId` to a
SPECIFIC, immutable `ArtifactManifestEntry` at creation time and
refuses to re-resolve it later. Proposed `WorldRuntimeManifest` (new,
small, additive record saved once at `createWorldInstance` time,
never mutated):

```ts
interface WorldRuntimeManifest {
  worldInstanceId: WorldInstanceId
  worldDefinitionId: WorldDefinitionId
  artifactId: string            // pins the exact ArtifactManifestEntry
  artifactChecksum: string      // defense in depth vs. a mutated vendor file
  runtimeContractVersion: string   // §6
  rendererContractVersion: string  // §6
  persistenceSchemaVersion: string // §6, matches applied migration set
  createdAt: string
}
```

A world **never** silently begins executing a different grammar
because StudioK published a new artifact: `wakeLivingWorld` (§3)
re-checks the pinned `artifactId`/`checksum` against the CURRENT
manifest on every wake and throws `IncompatibleWorldDefinitionError`
(already-defined type, reused) if the vendored file's checksum ever
drifts out from under a running instance — closing the same "checksum
drift" class of defect `run-platform-migrations.js` already guards
against for SQL migrations (`CHECKSUM DRIFT: ... Refusing to
continue.`).

**Upgrade semantics**: explicit only. Upgrading `worldDefinitionId`
requires either (a) a brand-new `WorldInstanceId` (simplest, always
safe, loses no history since the old instance's checkpoints remain
readable), or (b) a deliberate, admin-invoked migration procedure
(§32) that a human explicitly authorizes — never automatic.

---

## 6. Runtime contract versioning

Four independent version axes, each with its own compatibility rule:

| Axis | Owner | Compatibility rule |
|---|---|---|
| World Grammar version (`specVersion`/`worldSchemaVersion`) | StudioK artifact | A running `WorldInstanceId` is pinned forever (§5); a NEW instance may use a newer Approved artifact |
| Runtime contract version (`runtimeContractVersion`) | this repo's `*-contracts` packages, collectively | Additive fields (every sprint's own convention: optional, shape-preserving) bump PATCH; a new closed-union member bumps MINOR; a removed/renamed field or narrowed union bumps MAJOR |
| Persistence schema version | `supabase/migrations/*.sql` (§13) | Tracked by the migration ledger already built (`schema_migrations` table + checksum, `run-platform-migrations.js`) |
| Renderer contract version | `renderer-contracts` | Additive capability negotiation already exists (Sprint 8's capability-negotiation mechanism, `world-embodiment-runtime`); MAJOR bump only if an existing capability's semantics change |

**No silent coercion.** A world instance whose pinned
`runtimeContractVersion` is MAJOR-behind the currently-deployed runtime
build refuses to wake with a distinguishable
`UnsupportedRuntimeVersionError` (new, small, mirrors
`IncompatibleWorldDefinitionError`'s shape) rather than attempting a
best-effort read that could silently misinterpret an old shape. This
is a v1 NEEDS IMPLEMENTATION item (§30 checklist) — today, nothing
checks a runtime-version field at all, because nothing stores one yet
(§5's `WorldRuntimeManifest` is the vehicle to add it).

---

## 7. Artifact ingestion (v1 production requirements)

Already substantially built (Sprint 6). Production v1 requirements,
layered on top without redesigning the mechanism:

1. **Approval gate at creation, not at read-time**: `createWorldInstance`
   (§3) must reject any `artifactId` whose manifest entry has
   `specStatus !== "Approved"` — a NEW requirement; today
   `artifactIngestion.ts`'s `IngestionResult` reports `specStatus` but
   nothing gates on it.
2. **Immutable execution reference**: once pinned into a
   `WorldRuntimeManifest` (§5), `artifactId`+`checksum` never changes
   for that instance's lifetime — checked on every wake (§5).
3. **Schema validation**: `worldSchemaVersion` must match a version the
   currently-deployed `living-systems-runtime` actually understands —
   ties into §6's compatibility table.
4. **The runtime must be able to answer "exactly which StudioK
   artifact/version is this world instance executing?"** — already
   possible today via `IngestionResult.entry`; v1 exposes it through
   `queryProvenance` (§3/§26) rather than requiring a caller to know
   `artifactIngestion.ts` exists.

No change to the manifest FORMAT is proposed — it already carries
every field needed.

---

## 8. Orchestration model

**Verified current wake chain** (Sprint 9-15, landed, each layer
composing the previous additively, never modifying it):

```
wakeWorld (Sprint 9, lib/worldPersistence/hostService.ts)
  -> wakeWorldWithPopulation (Sprint 10, lib/livingPopulation/hostService.ts)
    -> wakeWorldWithMemory (Sprint 11, lib/worldMemory/hostService.ts)
      -> wakeWorldWithSocialEcology (Sprint 12, lib/socialEcology/hostService.ts)
        -> wakeWorldWithRhythms (Sprint 13, lib/livingRhythms/hostService.ts)
          -> wakeWorldWithEncounterRealization (Sprint 14, lib/encounterRealization/hostService.ts)
            -> wakeWorldWithAdaptation (Sprint 15, lib/worldAdaptation/hostService.ts)
```

**Sprint 20's `wakeLivingWorld` (§3) is proposed to become the NEW
outermost link**, composing `wakeWorldWithAdaptation` exactly as each
prior sprint composed its predecessor — never bypassing the chain,
never reordering it.

**Where Sprint 16-19's proposed layers would slot in**, per their own
Phase 0 docs (not yet true — described for planning only):

- **Spatial ecology (16)**: alongside/after the causal-environment step
  — Patch state is DERIVED from `EnvironmentalState` + population
  presence, never re-simulated; Sprint 16 Phase 0 §14 already commits
  to this ordering.
- **Long-horizon evolution (17)**: WRAPS the entire chain above as a
  bounded-window scheduler (`EvolutionWindow`) and moves the "time
  claimed" marker to fire only after the WHOLE chain durably succeeds
  (§13/§16 of this document; the actual fix for the `lastActiveAt`
  defect).
- **Canonical event projection (18)**: AFTER adaptation, since
  eligibility evaluation needs the final post-adaptation world state
  for that tick (Sprint 18 Phase 0 §8's `ELIGIBLE → ACTIVATED`
  transition reads current world facts).
- **Visitor participation (19)**: a DIFFERENT flow, not part of the
  periodic wake chain at all — see diagram C below. `ParticipationRecord`
  realization is proposed to run strictly after Sprint 17's "last
  fully-evolved tick" marker is available (Sprint 19 Phase 0's own STOP
  gate #1), i.e. participation cannot land before Sprint 17's
  crash-recovery fix does.

### Diagram C — Request/action flow

```
VISITOR REQUEST (Web/future Unreal)
        |
        v
  AvatarK Host: authenticate, resolve worldInstanceId/userId
        |
        v
  wakeLivingWorld(worldInstanceId, ownerId, now)   <-- periodic/on-demand wake,
        |                                              full chain, §8 above
        |  (world now caught up to "now")
        v
  [if this request IS a visitor intent, Sprint 19-dependent:]
  ParticipationAuthorization gate (Sprint 19 Phase 0, proposed)
        |  validate: world/version match, rule currently available,
        |  protected-narrative gate open, no stale intent (§10/§12)
        v
  resolveEncounterRealization / deriveConsequences  (Sprint 14, UNMODIFIED)
        |
        v
  sole-writer persistence (existing per-domain writers, §15)
        |
        v
  getWorldSnapshot / getWorldDelta  -> renderer-contracts-shaped payload
        |
        v
  RENDERER (Web / Unreal) -- presents; owns zero world truth
```

---

## 9. Consistency / transaction boundary

**No cross-repository database transaction exists today, and Sprint 20
should not invent one the current persistence architecture cannot
support.** Every landed sprint (9-15) already uses the SAME real
pattern instead, verified directly in code:

> **Idempotent staged commits, ordered by causal dependency, each stage
> independently safe to retry** — compute a content-derived id →
> look it up before doing any work → if absent, do the work → append/
> save (itself idempotent-by-id or version-CAS) → move to the next
> stage. `EncounterRecord` (Sprint 14), `AdaptationEffect` (Sprint 15),
> `WorldEvent`/`EntityMemoryEntry` (Sprint 11) all follow this exact
> shape.

This is the **v1 target**, not a gap — it is already what the code
does, sprint over sprint, and is compatible with an eventual Postgres
backend without requiring multi-table `BEGIN`/`COMMIT` spanning
domains that may live in different services. The one place this
pattern was applied at the WRONG granularity is the crash-recovery
defect below (§13) — that is the gap, not the general pattern.

**Explicit non-goal**: Sprint 20 does not propose a distributed-
transaction or saga-orchestration framework. If a future sprint needs
true cross-domain atomicity the staged-commit pattern cannot provide,
that is a new decision requiring its own architecture review — not
assumed here.

---

## 10. Concurrency model

**Verified, concrete gap** (not hypothetical): `wakeWorld()`
(`lib/worldPersistence/hostService.ts:46`) calls
`worldLeaseRepository.acquire(worldInstanceId, ownerId, DEFAULT_LEASE_TTL_MS=60_000, now)`
and throws `LeaseConflictError` if `acquire` returns `"conflict"`.
`InMemoryLeaseRepository.acquire` (`packages/world-persistence-runtime/src/inMemoryLeaseRepository.ts:18-34`)
returns `"conflict"` for **any** existing unexpired lease — **including
one already held by the SAME `ownerId`** (only `renew`, which requires
knowing the exact current `leaseVersion`, can extend a same-owner
lease; `acquire` never does). Grepping every `lib/*/hostService.ts`
file for a `.release(` call returns **zero matches** — no production
Host code path ever releases a lease after a successful wake. Every
existing test releases the lease manually via a `releaseLease` test
helper, which is not part of the shipped runtime.

**Consequence**: two `wakeLivingWorld` calls against the same
`worldInstanceId` within the same 60-second window — even from what
should be the same logical owner/process — will throw
`LeaseConflictError` in production today, unless something outside
this repo's Host layer currently handles acquire/renew/release
per-request (not found in this repo). **This is a NEEDS
IMPLEMENTATION item for Sprint 20**, independently corroborated by
Sprint 17 Phase 0's own §18 finding ("`WorldLeaseRepository.acquire`
same-owner-retry ambiguity" — flagged there as needing an acceptance
test, not yet a fix).

**v1 target model — single-writer-per-world-instance via the EXISTING
lease primitive**, closing the gap rather than replacing the
primitive:

1. `wakeLivingWorld` acquires the lease ONCE at entry and holds it for
   the ENTIRE composed chain (through Adaptation and, once landed,
   Spatial/Long-Horizon/Canonical) — not just the innermost
   `wakeWorld` call. This is the SAME widening Sprint 17 Phase 0
   proposes for the `lastActiveAt` marker (§13) — one lease scope, one
   "time claimed" scope, matching boundaries.
2. `wakeLivingWorld` releases the lease in a `finally` block, always,
   including on error — closing the "no Host code ever releases"
   gap.
3. A caller whose OWN prior lease is still live (same `ownerId`, not
   yet expired) gets a `renew`, not a fresh `acquire`-then-conflict —
   requires `wakeLivingWorld` to track its own `leaseVersion` across
   calls (a small, new piece of state, scoped to the calling process,
   not persisted).
4. Two DIFFERENT owners racing for the same instance: the loser gets a
   typed `LeaseConflictError` (already exists) the Host layer surfaces
   as a retryable 409-shaped response — never a silent overwrite.

**Multi-visitor law preserved**: multiple visitors reading/acting on
the SAME world instance is not a concurrency problem for the SIMULATION
(one authoritative worldInstanceId, one lease, one writer) — it is a
FAN-OUT problem for snapshot/delta distribution (§26), which requires
no lease at all since reads never mutate.

---

## 11. World ownership / single writer

**Yes — already the intended model, via `WorldLeaseRepository`,
already built in Sprint 9, verified tested** (`leaseRepository.test.ts`:
acquire/conflict, expiry-based re-acquisition, owner+version CAS renew,
idempotent release, wrong-owner/stale-version release is a no-op).
Sprint 20 does not need a NEW primitive — it needs the gap in §10
closed (lease held across the FULL composed chain, always released).

- **Lease acquisition**: `acquire(worldInstanceId, ownerId, ttlMs, now)`
  — already exists.
- **Lease expiry**: TTL-based, already exists; a crashed worker's lease
  self-heals after `DEFAULT_LEASE_TTL_MS` (60s) with no manual
  intervention.
- **Failure recovery**: a new worker's `wakeWorld` call, once the old
  lease expires, re-enters via the SAME `crash_detected` →
  `WAKING` transition already landed (Sprint 9's `nextLifecycleState`).
- **Handoff**: not needed for v1 — no live migration of an in-flight
  wake between workers; a crashed wake simply waits out the TTL, then
  recovers deterministically (§13).
- **Split-brain prevention**: the lease's `leaseVersion` CAS on
  `renew`/`release` already prevents a stale worker from acting after
  a newer one has taken over (`renew fails with a conflict when the
  lease was taken over by a different owner or version` — existing,
  tested).

---

## 12. Idempotency

**Consolidated principle (already the pattern; Sprint 20 names it
once, formally, rather than re-deriving it per-domain):**

> Every authoritative write is guarded by a **content-derived id**
> computed BEFORE any work happens, checked against the target
> repository, and the write only proceeds if that id is absent. The id
> derivation is a documented, per-package RESTATEMENT of a shared hash
> pattern (`deriveMemoryRecordId` → `deriveEncounterRecordId` →
> `deriveAdaptationEffectId`, each a "second, independent
> implementation," never a cross-runtime import, per the dependency-
> boundary discipline) rather than one shared utility function — this
> is a DELIBERATE existing choice (§28 collision audit), not
> duplication to fix.

Applied per v1 operation:

| Operation | Idempotency key | Landed? |
|---|---|---|
| Wake / catch-up | `(worldInstanceId, ticksElapsed)` derived from `lastActiveAt`/checkpoint | LANDED (Sprint 9), **but see §13's gap** |
| Checkpoint | checkpoint id, save-once | LANDED (Sprint 9) |
| Encounter realization | `deriveEncounterRecordId(worldId, ruleId, locationId, participantIds, tick)` | LANDED (Sprint 14) |
| Consequence application | same `EncounterRecord` id gates re-derivation; per-consequence sole-writer calls are themselves idempotent-safe by construction | LANDED (Sprint 14) |
| Adaptation pressure/effect | pressure `lastUpdatedTick` guard + `deriveAdaptationEffectId(worldId, ruleId, subjectId, tier)` | LANDED (Sprint 15) |
| Visitor participation | `deriveParticipationRecordId(worldId, userId, ruleId, locationId, startTick)` | PROPOSED (Sprint 19 Phase 0) |
| Canonical event projection | `deriveCanonicalActivationId(worldInstanceId, canonicalEventId, definitionContentHash, activationTick)` | PROPOSED (Sprint 18 Phase 0) |
| Artifact/version migration | none yet — v1 gap (§32) | NEEDS IMPLEMENTATION |

---

## 13. Crash recovery

**The `lastActiveAt` defect, precisely** (Sprint 17 Phase 0's finding,
independently consistent with §10's lease finding — both are instances
of "the wrong layer claims completion too early"):

`wakeWorld()` (`lib/worldPersistence/hostService.ts`) persists
`WorldLifecycleRecord.lastActiveAt = now()` and transitions to `ACTIVE`
immediately after ONLY the Sprint 7/9 causal-environment catch-up
layer finishes — **before** `wakeWorldWithPopulation` and every layer
chained after it (Memory, Social Ecology, Rhythms, Encounter
Realization, Adaptation) has run. If the process crashes after that
point but before the outer chain finishes persisting, a retry re-enters
`wakeWorld`, computes `ticksElapsed` from the ALREADY-bumped
`lastActiveAt`, gets ~zero, and every downstream layer silently "catches
up" by zero ticks — **permanently losing the world-time the pre-crash
attempt already spent**, with no error, no duplicate, just quietly
wrong history. Sprint 17 Phase 0 confirms this is real/reproducible and
not exercised by any existing Sprint 9-14 test.

**Proposed fix (Sprint 17 Phase 0 §16, not yet implemented)**: a new
`EvolutionHorizon.lastFullyEvolvedTick`/`lastFullyEvolvedAt` marker,
bumped exactly once, by the OUTERMOST composed wake function
(`wakeLivingWorld`, §3/§8) only after the ENTIRE chain durably
succeeds. This is the single most important Sprint 20 readiness item
— see §30 checklist (BLOCKER) and §45 debt register item #1.

**General crash-recovery contract (v1 target, generalizes the fix
above)**:

```
operation begins
  -> acquire lease (§10/§11, held for the WHOLE operation)
  -> process fails at any point
  -> lease expires (bounded TTL) OR is explicitly released with a
     failure marker
  -> new worker acquires lease, sees `crash_detected` -> WAKING (Sprint 9, landed)
  -> new worker's "durable boundary" = EvolutionHorizon.lastFullyEvolvedTick
     (Sprint 17 proposed) -- NEVER an intermediate layer's own
     "I did my part" marker
  -> resumes/retries the FULL chain from that boundary
  -> no double advancement (idempotent ids, §12, gate re-derivation)
  -> no lost world time (single outermost horizon marker)
  -> no duplicate consequences (content-derived ids throughout)
```

### Diagram D — Wake / catch-up / recovery

```
                     wakeLivingWorld(worldInstanceId, ownerId, now)
                                    |
                     acquire lease (whole-chain scope, §10)  --conflict--> LeaseConflictError (retryable)
                                    |
                      read EvolutionHorizon.lastFullyEvolvedTick
                                    |
                      ticksElapsed = policy(horizonTick, now)
                                    |
                    +---------------+----------------+
                    | (ticksElapsed == 0: no-op wake) | (ticksElapsed > 0)
                    v                                 v
              return current snapshot        run FULL composed chain
                                              (causal env -> population ->
                                               memory -> social -> rhythms ->
                                               encounter realization ->
                                               adaptation -> [16/17/18 once landed])
                                                    |
                                        <<< CRASH HERE, any step >>>
                                                    |
                                          lease TTL expires (60s)
                                                    |
                                     new worker: crash_detected -> WAKING
                                                    |
                                     re-reads EvolutionHorizon (STILL the
                                     PRE-crash value -- nothing bumped it
                                     early, unlike today's `lastActiveAt`)
                                                    |
                                     re-runs the FULL chain from that
                                     boundary -- idempotent ids mean any
                                     step that DID complete pre-crash is a
                                     no-op re-check, not a re-derivation
                                                    |
                              chain fully succeeds this time
                                                    |
                       bump EvolutionHorizon.lastFullyEvolvedTick (ONCE,
                       only here, only after the whole chain durably wrote)
                                                    |
                                          release lease
                                                    |
                                          return snapshot
```

---

## 14. Persistence model

**Already deliberately NOT one giant serialized world blob** — verified
per-domain separation, one repository interface per concern:

| Domain | Repository (contracts) | Shape |
|---|---|---|
| Shared world state (clock/season/environment) + entity positions | `DurableWorldStateRepository` | one row per world, version-CAS |
| Checkpoints | `WorldCheckpointRepository` | append, `loadLatest` |
| Lease | `WorldLeaseRepository` | one row per world, version-CAS |
| Lifecycle | `WorldLifecycleRepository` | one row per world |
| Population entities/groups | (Sprint 10 repositories) | one row per entity/group |
| World events / entity memory | `WorldEventRepository` / `EntityMemoryRepository` | append-only, bounded retention (§15) |
| Relationships | `RelationshipRepository` | one row per relationship pair |
| Place rhythm | `PlaceRhythmRepository` | one row per (world, location) |
| Encounter records | `EncounterRecordRepository` | append/upsert-by-content-id |
| Adaptation pressure / effects | `AdaptationPressureRepository` / `AdaptationEffectRepository` | one row per subject / append-by-content-id |
| Spatial state (proposed) | `spatial-ecology-contracts` (proposed) | per-Patch rows, per Sprint 16 Phase 0 |
| Canonical projection state (proposed) | `canonical-event-contracts` (proposed) | per-(world, canonical event) rows |
| Visitor participation (proposed) | additive to encounter-realization | per-participation-record rows |
| Visitor-scoped memory | `VisitorWorldMemoryRepository` | one row per (world, user) — never shared |

**Checkpoint strategy (landed, Sprint 9)**: `WorldCheckpoint` captures
full `SharedWorldState` + `LivingEntityState[]` as of one tick, saved
only when real ticks elapse; Sprint 17 Phase 0 proposes an additive
`LongHorizonCheckpoint` wrapper adding per-layer snapshot timestamps
(`populationSnapshotAt`, etc.) around the SAME unmodified shape —
**never a second checkpoint mechanism**.

**Retained history**: bounded via Sprint 11's tiered retention
(`RECENT → DURABLE → LANDMARK/COMPACTABLE`), reused verbatim by every
later sprint (Sprint 15's `AdaptationEffect`s are append-only but
small/bounded-per-subject; nothing this document proposes needs a NEW
retention policy).

---

## 15. Event / state relationship (glossary)

To avoid duplicate authoritative histories, this is the canonical
classification (verified against code, not assumed):

| Structure | Classification | Notes |
|---|---|---|
| `DurableWorldState`, `EntityBehaviorState`, `RelationshipState`, `PlaceRhythmProfile`, `AdaptationPressure` | **Authoritative state** | current truth, mutated in place |
| `WorldEvent` (via `deriveWorldEvents`) | **Authoritative event history** (World Memory's own) | significance-filtered, bounded retention |
| `EntityMemoryEntry` | **Authoritative event history** (per-entity, bounded) | derived FROM `WorldEvent`s |
| `EncounterRecord` | **Authoritative event history** (per-realization-attempt) | Sprint 14's finer grain, complements not duplicates `EncounterOpportunity`/`EncounterHistoryEntry` |
| `AdaptationEffect` | **Authoritative event history** (per-tier-crossing) | append-only, content-derived id |
| `WorldCheckpoint`/`LongHorizonCheckpoint` (proposed) | **Durable recovery snapshot**, not a history | one per checkpoint moment, not queried for "what happened" |
| `VisitorWorldMemory` | **Visitor-specific derived projection** | never shared, never authoritative for world truth |
| `ExperienceEvent` (`experience-registry`) | **Cross-product diagnostic/analytics timeline**, NOT Living-World-authoritative | a different product's own event log; Living World Runtime is one POTENTIAL future emitter into it, never a reader of its own truth from it |
| `TimelineEntry` (`timeline`) | **Cross-product activity-stream UI feed**, NOT Living-World-authoritative | same posture as `ExperienceEvent` |
| `WorldSystemEvent`/`WorldSystemEventRecord` (Sprint 7/9) | **Authoritative event history** (raw simulation tick stream) | distinct from `WorldEvent` (Sprint 11's significance-filtered derivative); every `WorldEvent` traces back to one or more of these via `provenance` |
| Protected Canon / `ProtectedNarrativeStateRepository` | **Externally authored fact, read-only here** | never written by any runtime package, ever |

This table becomes part of the Runtime v1 glossary and should be kept
current as Sprint 16-19 land their own proposed structures
(`CanonicalEventProjection`, `ParticipationRecord`, spatial `Patch`
rows).

---

## 16. Observability / health model

**v1 target read surface** (a NEW, thin, read-only projection over
EXISTING state — no new storage):

| Question | Source (existing) |
|---|---|
| Which world / runtime version / artifact version? | `WorldRuntimeManifest` (§5, new) |
| Current logical tick / season? | `DurableWorldState.sharedState.clock/season` |
| Last checkpoint? | `WorldCheckpointRepository.loadLatest` |
| Last successful wake? | `EvolutionHorizon.lastFullyEvolvedAt` (§13, proposed) |
| Catch-up duration? | `WakeWorldResult.catchUpDurationMs` (already returned, Sprint 9) |
| Entity / encounter counts? | population/encounter-record repository counts |
| Pending canonical projection? | `WorldInstanceCanonicalProjectionState` (Sprint 18 Phase 0, proposed) |
| Current worker/lease? | `WorldLeaseRepository.getCurrent` |
| Persistence latency? | measured at the Host facade call site (new, thin instrumentation) |
| Error state? | `queryHealth` (§17) |

**Privacy boundary, explicit**: this surface exposes world-level facts
only. It never exposes `VisitorWorldMemory` content, private reflection
content (once Sprint 19 lands `PrivateReflectionRepository`), or any
per-user behavioral aggregate. Observability is about the WORLD, never
about a WATCHED VISITOR.

---

## 17. Health model

Multiple independent dimensions, never collapsed to one boolean —
mirrors `docs/PLATFORM_STATUS_CONTRACT.md`'s own existing "basis:
static_configuration_check, not live health" discipline, extended with
genuinely live checks where the runtime already has the state to
answer them honestly:

| Dimension | Check | Basis |
|---|---|---|
| Artifact valid | checksum matches pinned manifest entry (§5) | live |
| Persistence reachable | last read/write succeeded | live |
| Checkpoint healthy | `loadLatest` succeeds and matches expected tick | live |
| Lease healthy | no unexpected conflict/expiry churn | live |
| Simulation healthy | last wake completed without throwing | live |
| Renderer adapter healthy | capability-negotiation handshake succeeds (Sprint 8, landed) | live |
| Migration compatible | applied migration set matches `persistenceSchemaVersion` (§6) | static + live |
| Canonical provenance valid | (once Sprint 18 lands) projection state matches artifact | live |

**Rollup**: `healthy | degraded | blocked` — never a single boolean.
`degraded` = one non-critical dimension failing (e.g. renderer
capability handshake stale) with the world still authoritatively
correct; `blocked` = a dimension that prevents safe advancement (lease
conflict storm, checksum drift, migration mismatch) — the world stops
accepting new wakes/intents but its LAST durable state remains
readable (§37 degraded-mode policy).

---

## 18. System Information integration

AvatarK's existing System Information / Platform Health surface
(`lib/admin/platformStatus.ts`, `lib/admin/systemHealth.ts`,
`lib/admin/systemInformation.ts`, `docs/PLATFORM_STATUS_CONTRACT.md`)
already has a rollup pattern (`worstPlatformStatus`,
`operational < not_configured < unknown < degraded < unavailable`) and
a tiered-visibility model (`ConsumerDiagnostics` vs.
`developer`/`platform_operations` tiers, `docs/SAFE_DIAGNOSTICS.md`).

**Proposed integration (composition, not modification)**: Living World
Runtime becomes ONE MORE entry the existing `PlatformStatusEntry`
rollup can include, surfaced only at the `developer`/
`platform_operations` tier:

```
runtime version               -- from WorldRuntimeManifest
world grammar version         -- from WorldRuntimeManifest
world instance count/summary  -- aggregate, not per-visitor
persistence schema level      -- from migration ledger
artifact provenance           -- from queryProvenance (§3/§26)
last checkpoint / last wake   -- from queryHealth (§17)
simulation health rollup      -- healthy | degraded | blocked
renderer capability status    -- from capability negotiation
```

No secrets, no operations UI logic inside the runtime core — the
runtime exposes READ functions (`queryHealth`, `queryProvenance`); the
existing `lib/admin/*` surface decides how to render/gate them, exactly
as it already does for the other six platform items.

---

## 19. Admin / operations boundary

**Conservative, auditable, no "edit world truth" controls by default**:

| Capability | v1 scope |
|---|---|
| List world instances | read-only, paginated |
| Inspect world state summary | read-only projection (§16) |
| Inspect version/provenance | `queryProvenance` (§26) |
| Pause/resume a world | sets a `WorldRuntimeAdminFlag` (new, small, additive) that `wakeLivingWorld` checks BEFORE acquiring the lease — a paused world refuses new wakes, existing snapshot reads still work |
| Force checkpoint | calls the existing checkpoint mechanism out-of-band, same idempotency guarantees |
| Mark degraded | NOT proposed — degraded is always a live-computed health READ (§17), never an admin-settable stored flag that could drift from reality |
| Request recovery | re-triggers `crash_detected` → `WAKING` manually (already a landed transition) |
| Inspect migration readiness | reads the migration ledger (`schema_migrations` table, checksum-verified, already built) |
| Inspect runtime health | `queryHealth` |

**Every admin action is itself an authoritative-adjacent operation and
must go through the SAME lease/idempotency discipline** as any other
wake — an admin-forced checkpoint is not a backdoor around
single-writer-per-instance. Every admin action is logged with
`worldInstanceId`, actor, action, and timestamp (§27 provenance) —
never silent.

---

## 20. Security boundary

```
StudioK artifact  -- UNTRUSTED until checksum-verified + specStatus==Approved (§7)
Visitor input     -- UNTRUSTED; never a direct write, always through
                     resolveEncounterRealization/ParticipationAuthorization (§8/§34)
AvatarK Host      -- TRUSTED, authenticates/scopes/composes; the only
                     caller of the Runtime v1 public API (§3)
Admin/operator    -- TRUSTED but SCOPED; explicit capability list (§19),
                     no arbitrary world-truth mutation
Renderer          -- UNTRUSTED (client-side); receives snapshot/delta,
                     sends only semantic intents, never raw state writes
Runtime worker    -- TRUSTED process, holds lease, sole writer (§10/§11)
Database          -- TRUSTED at rest; RLS read-only for authenticated
                     clients, service-role bypass for the Host's own
                     writer process only (already the convention in
                     every prepared-but-unapplied migration, §32)
```

Protected Canon remains separately guarded exactly as today: read-only
projection (`ProtectedNarrativeProjection`), zero write method on any
repository interface, statically enforced by
`dependencyBoundaries.test.ts`'s regex scan
(`protectedNarrative\w*\.(save|put|mutate|write)\(`) across every
runtime package — Sprint 18 Phase 0 proposes extending the identical
scan pattern to `canonicalEventDefinition\w*\.(save|put|set|write|mutate|update)\(`,
which Sprint 20 should adopt once Sprint 18 lands.

---

## 21. Privacy

No change to the principles already established; Sprint 20 makes them
explicit as a v1 property rather than introducing anything new:

- No private reflection prose, psychological profile, engagement
  score, or hidden user inference is required anywhere in shared world
  state — verified: `EntityMemoryEntry`/`WorldEvent`/`RelationshipEvidence`/
  `AdaptationPressure` are all closed, small, ecological/behavioral
  vocabularies with zero free-form personal-content field.
- Sprint 19 Phase 0's proposed `PrivateReflectionRepository` firewall
  (content never crosses into `VisitorWorldMemory`, only an opaque
  `ReflectionRef` may) is the correct shape for the ONE
  visitor-writable domain that will ever exist — Sprint 20 should adopt
  it, not redesign it.
- Observability (§16) is world-level only, never a per-visitor
  behavioral surface — this is a hard v1 constraint, not a preference.

---

## 22. Scaling model

**Distinguish ACTIVE cost from DORMANT cost — already structurally
possible, not yet operationally exploited**:

- A `DORMANT` world costs exactly one durable-state row + one
  lifecycle row on disk; zero compute until a wake is requested.
- Waking a long-dormant world costs one deterministic catch-up
  computation proportional to `ticksElapsed`, capped by whatever
  bound §35/§36 imposes (a large multi-hour gap should never trigger
  an unbounded synchronous simulation — Sprint 14's own §23 debt #4
  already flagged the 1ms/tick reference policy as "a real performance
  hazard for any test or Host call that passes a large wall-clock
  delta," a finding Sprint 20 should formalize into an explicit
  `MAX_CATCHUP_TICKS_PER_CALL` guard rail, chunked across multiple
  windows if exceeded (Sprint 17 Phase 0's own `EvolutionWindow`
  concept is exactly this).
- The runtime should NEVER run a background scheduler that
  continuously simulates every dormant world — see §34.

---

## 23. World sharding

**Natural unit: `WorldInstanceId`, already the isolation unit
throughout every repository interface** (every table/map in every
in-memory reference repository is keyed first by `worldInstanceId`;
every dependency-boundary and multi-instance test in Sprints 9-15
verifies zero state bleed across instances). No cross-shard distributed
simulation is required or proposed for v1 — one world instance's
authoritative state lives entirely within one lease/one writer's scope
at a time (§10/§11), which is precisely what makes `worldInstanceId`
the correct horizontal-scaling unit: N world instances can run on M
independent worker processes with zero coordination between instances.

Cohort/organization-level grouping (mentioned in §30 as a possible
provisioning input) is a Host-layer/product-layer concern for WHICH
world instance a given account is routed to — never a simulation-layer
sharding concept.

---

## 24. Hot / warm / cold worlds

Already named and landed as `ResourceTier` (Sprint 9,
`lib/worldPersistence`): `COLD = DORMANT`, `WARM = WAKING/QUIESCING`,
`HOT = ACTIVE` — derived from `WorldLifecycleState`, never a
separately-stored field. Sprint 20 adds no new classification; it
formalizes the OPERATIONAL implication:

- **HOT** worlds justify a live worker process holding the lease.
- **WARM** worlds are mid-transition (waking from checkpoint, or about
  to checkpoint down) — bounded-duration by construction.
- **COLD** worlds cost nothing until a wake call arrives; deterministic
  catch-up (§13/§22) reconstructs exactly the state continuous
  simulation would have reached, byte-for-byte (already tested,
  `catchUp.test.ts`: "one dormant catch-up of N ticks equals N active
  single-tick advances, byte for byte").

This is the entire cost-effectiveness argument for the architecture:
dormancy is FREE, not merely cheap.

---

## 25. High concurrency (many visitors, one world)

**Already the correct model, verified**: `multiVisitorMultiInstance.test.ts`
proves "two visitors reading the same world instance see identical
world truth but independently isolated memory." Runtime v1 formalizes
this as a hard invariant: there is exactly ONE authoritative logical
`DurableWorldState` per `worldInstanceId`, regardless of how many
visitors are concurrently present; per-visitor scoping is confined to
`VisitorWorldMemory` and (once Sprint 19 lands) `PrivateReflectionRepository`
— never a second copy of shared state.

Concurrent WRITES from multiple visitors are serialized through the
single-writer lease (§10/§11) — a visitor's intent is a REQUEST that
gets validated against current state at resolution time
(`resolveEncounterRealization` re-checks presence/routine/etc. fresh
every time, never trusting a stale snapshot), giving natural
last-writer-wins-with-revalidation semantics without needing per-action
locking finer than the world-instance lease.

---

## 26. Snapshot / delta distribution

Landed (Sprint 8): `WorldEmbodimentSnapshot` (full state) +
`diffWorldEmbodiment`-style delta computation against a `sinceTick`
marker, already proven sufficient for long-horizon gaps ("renderer
`sinceTick` resync at large gaps" is explicitly one of Sprint 17 Phase
0's proposed acceptance-matrix rows, reusing this existing mechanism
rather than inventing a new one).

**v1 production requirements** (composition, not new mechanism):
- Every domain's own `getEmbodimentWith*` Host function
  (`getEmbodimentWithRhythms` → `getEmbodimentWithEncounterRealization`
  → `getEmbodimentWithAdaptation`, each wrapping the previous, Host-
  level composition only, `world-embodiment-contracts` held at its
  Sprint-10 width for 5 consecutive sprints) is what `getWorldSnapshot`/
  `getWorldDelta` (§3) call — Sprint 20 adds no sixth wrapper layer of
  its own logic, only names the existing chain as the public entry
  point.
- **Stale-delta detection**: a `sinceTick` older than the earliest
  retained history triggers a full-resync response (already implicit
  in the existing tick-comparison logic) rather than a silently
  incomplete delta.
- **Fan-out**: N concurrent visitor requests for the SAME world's
  snapshot/delta are independent READS against the same authoritative
  state — no lease needed, no serialization needed, since reads never
  mutate (§25).

---

## 27. Renderer capability negotiation

Landed (Sprint 8): capability negotiation already exists in
`world-embodiment-runtime`, proven to let Web render a subset while a
"headless Unreal-compatible command translator" receives the full
semantic surface (Sprint 8's own portability test: "prove
embodiment/Unreal-adapter reuse for a wholly different world"). Sprint
20 does not redesign this — it documents the invariant for v1 freeze
(§31): **every renderer receives a semantically equivalent
`WorldEmbodimentSnapshot`/`WorldEmbodimentDelta`; capability
negotiation governs presentation richness, never which facts are
true.**

---

## 28. Unreal production adapter boundary

Not designed here (explicitly out of scope per the mission). Runtime
v1 hands Unreal exactly what Web already receives through the SAME
renderer-neutral contract: world snapshot, spatial hierarchy (once
Sprint 16 lands), environment state, entities/groups, movement intents,
encounters, canonical projections (once Sprint 18 lands), semantic
deltas. Unreal owns geometry, animation, FX, streaming, navigation
presentation, and asset realization — Unreal never owns world truth,
enforced the same way Web's renderer never does today (zero write path
from `lib/renderer/*` into any repository).

---

## 29. StudioK → Runtime pipeline

**Already built, Sprint 6, verified**:

```
StudioK Canon (external repo)
  -> Approved Specification (external repo, specStatus tracked)
  -> portable artifact (JSON, e.g. livingVrindavan.systems.json)
  -> vendored into lib/livingWorldRuntime/vendor/
  -> manifest.json entry: artifactId/specId/specVersion/checksum/
     pinnedCommit/canonDocIds/canonVersion/specStatus
  -> schema validation + checksum verification (artifactIngestion.ts,
     runs at import time via lib/livingSystems/systemsDefinition.ts)
  -> Runtime v1 ingestion: pin into WorldRuntimeManifest at
     createWorldInstance (§5/§7, NEW for v1)
  -> world instance provisioning (§30)
  -> execution
```

**Manual approval gate**: `specStatus` transition to `"Approved"`
happens entirely OUTSIDE this repo (in StudioK's own governance
process); this repo only ever READS that field and gates on it (§7).
No approval workflow is proposed inside the Runtime.

---

## 30. World instance creation

```ts
createWorldInstance({
  worldDefinitionId,       // which StudioK grammar
  artifactId,              // pinned to a specific, Approved, checksummed vendor entry (§5/§7)
  ownerContext,            // AvatarK Host-supplied: organization/cohort scoping, NOT client input
  initialSeed,             // deterministic seed for initial procedural placement, if the grammar uses one
}) -> WorldInstanceId
```

**Client input never defines authoritative initial state.** The ONLY
inputs a caller controls are WHICH already-Approved artifact to run and
WHICH account/organization context owns the resulting instance —
identical to how every other creation path in this codebase already
treats authored content as external and untouchable (Canon, encounter
rules, resource affordances are all data, never request bodies).
Initial clock/season/environment/canonical-projection state are all
DERIVED from the artifact's own grammar, never passed in.

---

## 31. World instance upgrade

Two distinguishable cases, matching §5/§6's versioning model:

| Change | v1 policy |
|---|---|
| Additive runtime contract change (new optional field, new closed-union member with a default no-op branch) | **safe, automatic** — every sprint's own convention already guarantees old callers/data are unaffected |
| World Grammar artifact v1 → v2 for an EXISTING instance | **never automatic** — requires an explicit, admin-invoked migration (new `WorldInstanceId` is the default-safe path; in-place migration requires a human-authored migration procedure per artifact-version pair, out of scope to design generically) |
| Runtime v1.x → v1.y (persistence schema change) | governed by §32's migration ledger; a running instance is unaffected until its OWN read path is upgraded |
| Canonical content change | **never** silently applied to a running instance — Canon immutability (§20) means an existing instance's already-activated canonical projections are permanent; only NEWLY eligible events (per Sprint 18 Phase 0's model) could ever activate under a later artifact |

---

## 32. Migration strategy

**Inventory of prepared-but-unapplied migrations (verified, none
executed)**:

```
023_experience_events.sql   024_context_snapshots.sql   025_journey_states.sql
026_living_systems_world_state.sql     027_living_population_state.sql
028_world_memory.sql                   029_social_ecology.sql
030_living_rhythms.sql                 031_encounter_realization.sql
032_world_adaptation.sql   (Sprint 15, this program's latest)
```

All registered in `supabase/scripts/run-platform-migrations.js`'s
`MIGRATION_ORDER`, all guarded by the SAME checksum-drift detector
already described in §5. **Sprint 20 does NOT apply any of them.**

**Sprint 20's job is to produce the reconciliation PLAN**:
1. **Ordering/dependency**: verified already correct — each migration
   only references tables created by an earlier-numbered one (FK
   references to `world_instances(id)` throughout); no reordering
   needed.
2. **Environment readiness**: `assertPlatformTestDatabase()` already
   guards against running migrations against a non-test database — a
   v1 production run needs an equivalent production-environment guard,
   NOT yet built (NEEDS IMPLEMENTATION).
3. **Dry-run**: the existing script has no `--dry-run` flag — proposed
   addition: compute-and-print checksums/diff without executing DDL.
4. **Rollback posture**: none of the prepared migrations include a
   `DOWN` script — v1 policy should be "roll forward only, additive
   tables, never destructive `ALTER`/`DROP`" (already true of every
   migration written so far — verify this holds for any future one
   too, as a lint rule).
5. **Schema compatibility**: each migration's own header already
   documents "source of truth vs. projection" — Sprint 20 should keep
   this convention, not invent a new documentation format.

---

## 33. Deployment topology

Provider-neutral, matching what the repo already assumes (Next.js Host
+ Supabase/Postgres persistence, but nothing in the Runtime v1 design
requires either specifically):

### Diagram E — Production deployment topology

```
                    +-------------------+
                    |   Renderer(s)     |
                    |  Web / Unreal     |
                    +--------+----------+
                             |  snapshot/delta/intent (renderer-contracts)
                             v
                    +-------------------+
                    |  API / Host        |   <- auth, account/org scoping,
                    |  (Next.js routes)  |      System Info integration (§18)
                    +--------+----------+
                             |  Host-composed function calls (in-process
                             |  today; a network hop only if the runtime
                             |  is ever split into its own service)
                             v
                    +-------------------+
                    |  Runtime Worker /  |   <- holds world lease (§10/§11),
                    |  World Host        |      sole writer per instance,
                    |  (lib/*/hostService)|     executes the composed chain (§8)
                    +--------+----------+
                             |
              +--------------+---------------+
              v                               v
     +-----------------+             +------------------+
     |   Persistence    |             |  Artifact Store   |
     |  (Postgres today;|             |  (vendored files   |
     |   in-memory ref  |             |   today, per §7/29;|
     |   impls in tests)|             |   future: real     |
     +-----------------+             |   StudioK registry)|
                                       +------------------+
                             |
                             v
                    +-------------------+
                    |  Observability     |   <- queryHealth/queryProvenance
                    |  (System Info, §18)|      feed, no new infra required
                    +-------------------+
```

No AWS/GCP/Vercel-specific component is required by the core
architecture; this repo's existing deployment (Next.js host + Supabase)
is one valid instantiation, not a hard dependency of the Runtime v1
design itself.

---

## 34. Background execution

**Prefer on-demand deterministic catch-up over scheduled background
work — already the landed default (Sprint 9's whole `wakeWorld`
design), and Sprint 20 should not add a scheduler.** A dormant world
does zero work until a request arrives; catch-up reconstructs
exactly the state continuous simulation would have reached. The ONE
case that might genuinely need recurring execution — checkpoint
hygiene for a world that stays ACTIVE for a very long unbroken stretch
without ever going dormant — is a bounded, low-frequency housekeeping
job (checkpoint-if-due), not a per-tick scheduler, and is explicitly
NOT required for v1 (no world in this program has ever run
continuously long enough to need it; flagged as a future
consideration, not a Sprint 20 deliverable).

`submitVisitorIntent`'s `ParticipationRecord` realization (§3, Sprint
19-dependent) is itself request-triggered, not scheduled.

---

## 35. Service levels

Conceptual targets, not contractual numbers (none of this program's
sprints have measured production load yet):

| Path | Target character |
|---|---|
| World wake latency (small `ticksElapsed`) | consumer-interactive (sub-second; dominated by persistence round-trips, not simulation compute) |
| World wake latency (large `ticksElapsed`, long dormancy) | **offline catch-up computation** — must be chunked (`EvolutionWindow`, §22) rather than blocking a single request indefinitely |
| Snapshot/delta latency | consumer-interactive, read-only, no lease contention (§26) |
| Action resolution latency | consumer-interactive, bounded by one lease acquisition + one composed-chain pass |
| Checkpoint recovery | offline/administrative, bounded by checkpoint size (already small — one tick's worth of state, not a history) |
| Replay time | proportional to `ticksElapsed` since last checkpoint, same character as wake latency |

---

## 36. Failure-mode matrix

| Failure | Detect | Contain | Recover | Surface | World-truth safety |
|---|---|---|---|---|---|
| Artifact invalid (checksum mismatch) | ingestion-time hash check (landed) | refuse to load | fix vendor file, re-vendor | admin error, `queryHealth: blocked` | world never runs on unverified content |
| Unsupported artifact/runtime version | `WorldRuntimeManifest` compatibility check (§5/§6, new) | refuse wake for that instance | admin-invoked upgrade (§31) | typed error to Host | no silent misinterpretation of an old shape |
| Database unavailable | persistence call throws | `queryHealth: blocked` | standard DB recovery (outside this doc's scope) | admin/ops alert | no partial write, staged-commit pattern (§9) means no torn state |
| Checkpoint corrupt | `loadLatest` fails validation | fall back to prior checkpoint or full replay from `WorldSystemEventRecord` history | replay | admin alert | never silently accept a corrupt checkpoint (existing test: "an event belonging to a different world instance is a corrupt-checkpoint condition, never silently accepted") |
| Worker dies mid-wake | lease TTL expiry | new worker blocked from double-writing until expiry | `crash_detected` → `WAKING`, resume from `EvolutionHorizon` (§13) | transient 5xx-shaped retry to caller | no lost ticks once §13's fix lands; **lost ticks today, pre-fix** |
| Lease lost (network partition) | `renew` returns conflict | old worker must stop writing on conflict | new worker takes over after TTL | internal | CAS prevents split-brain (§11) |
| Catch-up fails partway | exception during composed chain | lease still held, not released until `finally` (§10, once fixed) | retry from `EvolutionHorizon` | error surfaced to caller | idempotent ids mean partial progress is safely re-checked, not re-applied |
| Renderer disconnects | client-side, out of Runtime's scope | none needed — Runtime is stateless per-request from its own perspective | client reconnects, resyncs via `sinceTick` (§26) | n/a | reads never mutate |
| Visitor retries an action | duplicate intent | `ParticipationRecord` id (§12) already exists | return existing record, no re-derivation | idempotent success response | no duplicate consequence |
| Canonical projection retry | `deriveCanonicalActivationId` (§12) | id already exists | return existing projection state | idempotent success response | no duplicate mandated fact |
| Migration mismatch | checksum-drift check (landed) | refuse to proceed | manual reconciliation | ops alert, hard stop | never applies a mismatched migration silently |
| State-version conflict | `conditionalSave` CAS (landed) | reject the stale writer | caller re-reads current version, retries | typed conflict result (`isSaveConflict`, landed) | never a silent overwrite of newer state |

---

## 37. Degraded-mode policy

**v1 target**: a `blocked`-health world (§17) becomes **read-only** —
`getWorldSnapshot`/`getWorldDelta` continue to serve the last durable
state (including the last successful checkpoint), but `wakeLivingWorld`
and `submitVisitorIntent` refuse to proceed until the blocking
condition clears (checksum reconciled, migration applied, database
reachable again). This is the ONLY degraded behavior proposed for v1
— **no invented mode that risks contradictory world truth** (e.g. no
"best-effort simulate anyway" mode, no "accept writes now, reconcile
later" mode).

---

## 38. Audit / provenance

Every authoritative world change is traceable, without storing
unnecessary personal data, via fields ALREADY present on every landed
authoritative record plus the new `WorldRuntimeManifest`:

```
worldInstanceId        -- every repository is keyed by this
runtime version         -- WorldRuntimeManifest.runtimeContractVersion (new)
artifact version        -- WorldRuntimeManifest.artifactId/checksum (new)
logical tick             -- every WorldEvent/EncounterRecord/AdaptationEffect carries `tick`/`appliedTick`
source event/intent      -- causalReferences (existing, structured, never prose)
consequence/adaptation provenance -- MemoryProvenance / AdaptationEffect.causalReferences (existing)
checkpoint identity       -- WorldCheckpoint's own id (existing)
```

No personal/private data is required in any of the above — every field
is either a world-scoped id, a tick number, or a structured
`{kind, ref}` causal reference (never prose, never a user-identifying
detail beyond the `userId`/`ownerId` fields that already exist for
account-scoping purposes elsewhere in this platform).

---

## 39. Testing strategy

Layered, matching the mission's own list, mapped to what ALREADY EXISTS
so Sprint 20 does not need to invent test infrastructure from scratch:

| Layer | Already-landed example | Sprint 20 addition |
|---|---|---|
| UNIT | every `*-runtime` package's own `.test.ts` files (1451 passing as of Sprint 15) | none required — Sprint 20 adds no new runtime package |
| CONTRACT | `dependencyBoundaries.test.ts` (68 tests) | extend once, for the new Host facade's own boundary rules if any emerge |
| SCENARIO | `emergentFuturesFork.test.ts` (Sprint 15), `scenarios.test.ts` per sprint | ONE new golden scenario test (§40) exercising the full v1 facade |
| RECOVERY | `crash recovery reconstructs correct season/tick/...` (`recovery.test.ts`, Sprint 9) | a NEW regression test for the `lastActiveAt`/lease gaps (§13/§10), which must FAIL on today's code and PASS once fixed — Sprint 17 Phase 0 already proposes this exact row (its acceptance-matrix row E) |
| CONCURRENCY | `leaseRepository.test.ts` (Sprint 9) | a NEW test for whole-chain lease scope + same-owner renew (§10) |
| PORTABILITY | a `livingForest*Portability.test.ts` in every sprint 7-15 package | none required — pattern already proven at every layer |
| RENDERER | Sprint 8's Web/Unreal-command-translator parity test | none required for Sprint 20 itself; Unreal production parity is future work (§28) |
| PRODUCTION SMOKE | none exists yet | NEW — a deployed-host smoke test exercising `createWorldInstance` → `wakeLivingWorld` → `getWorldSnapshot` against a real (non-in-memory) persistence backend, gated behind the same `assertPlatformTestDatabase()`-style environment guard as migrations |

Per the mission's efficiency instruction, this Phase 0 does not run any
of these — it only designs the layering.

---

## 40. Golden Runtime v1 scenario

This becomes the flagship v1 acceptance test once Sprint 20
implementation closes:

```
1.  createWorldInstance(vrindavan artifact, ownerContext)
2.  world starts DORMANT
3.  visitor A enters -> wakeLivingWorld -> catch-up from zero
4.  living systems advance (population/memory/social/rhythms/encounters)
5.  visitor A participates (Sprint 19-dependent submitVisitorIntent)
6.  an encounter realizes; consequences apply (Sprint 14, unmodified)
7.  adaptation changes future possibility (Sprint 15, unmodified --
    e.g. relationship band raised, feeding a LATER opportunity's score)
8.  visitor A leaves (no special teardown, §3)
9.  world becomes DORMANT (quiesce after no-activity deadline)
10. long absence elapses
11. spatial/long-horizon evolution advances the dormant world's state
    on the NEXT wake (Sprint 16/17-dependent, deterministic catch-up,
    chunked via EvolutionWindow if the gap is large, §22/§35)
12. an authorized canonical projection occurs where eligible (Sprint
    18-dependent, mandated fact only, never fabricated)
13. visitor B enters -> world wakes ONCE (single lease acquisition,
    §10/§11 -- visitor A's earlier presence is not re-simulated)
14. both visitors see the SAME shared truth (§25)
15. each retains independent visitor memory (VisitorWorldMemory, §14)
16. a checkpoint is written (§14)
17. the worker process crashes and restarts
18. the world resumes IDENTICALLY -- no lost ticks (§13, once the
    EvolutionHorizon fix lands), no duplicate consequences (§12)
19. the renderer receives a semantic snapshot/delta (§26) -- Web and
    (conceptually) Unreal both receive equivalent truth (§27/§28)
20. Protected Canon is unchanged throughout (§20 -- statically provable,
    zero write path)
21. the exact runtime version / artifact version / provenance chain is
    inspectable end-to-end (§38)
```

Every numbered step above already has a landed mechanism EXCEPT steps
5, 11, 12 (Sprint 19/16-17/18-dependent) and the "no lost ticks" clause
in step 18 (blocked on §13's fix). This scenario cannot be executed
today, honestly — it is the acceptance target for AFTER Sprint 16-19
close and Sprint 20 implements the facade + gap fixes.

---

## 41. Vrindavan first, Runtime generic

Explicit three-way split, verified against the actual dependency-
boundary test suite (zero Vrindavan-specific token in any `*-runtime`
package, proven by grep in every sprint's own portability test):

| Layer | What lives here |
|---|---|
| **RUNTIME** | every `*-contracts`/`*-runtime` package (7-15, and 16-19 once landed) — pure, deterministic, world-grammar-neutral functions and closed-union types |
| **VRINDAVAN WORLD GRAMMAR** | the vendored artifact (`livingVrindavan.systems.json`/`.world.json`/`.experience.json`) plus every `lib/*/vrindavanXDefinition.ts` Host-layer config file (rules, affordances, significance thresholds, adaptation rules) — DATA, never a branch inside the engine |
| **VRINDAVAN CONTENT/ASSETS** | StudioK Canon narrative content, future Unreal geometry/animation assets — outside this repo entirely |

This separation is already load-bearing (every `*-runtime` package's
own dependency-boundary test statically forbids a React/Unreal/
franchise token), not a Sprint 20 invention — Sprint 20 documents it as
a v1 freeze candidate (§31 of the deliverable list, this document's
§42 below).

---

## 42. Other world readiness

Runtime v1 already accepts alternate world grammars WITHOUT touching
the Runtime Kernel — proven, not proposed, at every layer via a
`livingForest*Portability.test.ts` in every sprint 7-15 package (a
fictional deer-herd/forest-clearing fixture run through the identical
pure functions Vrindavan uses, zero core changes). **Extension points**
for Living Forest / Living Stillness / Living Symphony / Living Forge:

1. Author a new StudioK artifact, vendor it (§29).
2. Write a new `lib/*/<world>Definition.ts` Host-config file per layer
   (rules/affordances/significance/adaptation-rules as DATA).
3. Call `createWorldInstance` with the new `worldDefinitionId`/
   `artifactId`.
4. Zero changes to any `*-contracts`/`*-runtime` package.

This document does not speculate on WHICH of these worlds comes next —
only that the extension point already exists and is exercised by
tests today.

---

## 43. Production readiness checklist

| Area | Status | Notes |
|---|---|---|
| Architecture (this document) | READY | Phase 0 complete |
| Persistence (per-domain separation) | READY | verified §14 |
| Persistence (production backend) | NEEDS VALIDATION | in-memory reference repos are the only ones ever exercised; Postgres migrations prepared but never applied against real infra |
| Migrations (10 prepared) | NEEDS VALIDATION | ordering/checksum ledger solid; production-environment guard + dry-run mode NEEDS IMPLEMENTATION (§32) |
| Concurrency (lease scope) | **BLOCKER** | verified gap: no Host code ever releases a lease; `acquire` conflicts on same-owner retry (§10) |
| Recovery (`lastActiveAt`) | **BLOCKER** | verified gap, Sprint 17 Phase 0's own finding (§13) |
| Recovery (general chain resume) | NEEDS IMPLEMENTATION | depends on `EvolutionHorizon` (Sprint 17, unlanded) |
| Security (Canon write-path absence) | READY | statically enforced today |
| Security (artifact approval gate) | NEEDS IMPLEMENTATION | `specStatus` tracked but not gated on at creation (§7) |
| Privacy | READY | verified, no redesign needed |
| Observability | NEEDS IMPLEMENTATION | mechanism exists piecemeal; no unified `queryHealth`/`queryProvenance` facade yet (§16/§17) |
| Versioning (World Grammar) | READY (mostly) | `WorldDefinitionId`/`IncompatibleWorldDefinitionError` exist; `WorldRuntimeManifest` pinning is new (§5) |
| Versioning (runtime/persistence/renderer) | NEEDS IMPLEMENTATION | no version field stored anywhere yet (§6) |
| Artifact provenance | READY (mostly) | Sprint 6 mechanism solid; approval gate is the one gap (§7) |
| Runtime compatibility checking | NEEDS IMPLEMENTATION | no `UnsupportedRuntimeVersionError` exists yet (§6) |
| Renderer contract | READY | capability negotiation landed, Sprint 8 |
| World portability | READY | proven at every layer, every sprint |
| Testing (unit/contract/portability) | READY | 1451 tests passing as of Sprint 15 |
| Testing (recovery/concurrency regression) | NEEDS IMPLEMENTATION | the two BLOCKER gaps have no regression test yet (§39) |
| Testing (production smoke) | NEEDS IMPLEMENTATION | none exists (§39) |
| Deployment topology | READY | provider-neutral design, §33 |
| Operational controls (admin) | NEEDS IMPLEMENTATION | conceptually scoped (§19), no code yet |
| Documentation | READY | this document + Sprint 7-19 Phase reports/docs |
| **Sprint 16 (spatial)** | **BLOCKER (external)** | Phase 0 only, no implementation |
| **Sprint 17 (long-horizon)** | **BLOCKER (external)** | Phase 0 only; contains the fix for the `lastActiveAt` BLOCKER above |
| **Sprint 18 (canonical events)** | **BLOCKER (external)** | Phase 0 only |
| **Sprint 19 (visitor participation)** | **BLOCKER (external)** | Phase 0 only; itself gated on Sprint 17 closing first |

---

## 44. Contract freeze candidates

**Freeze after Sprint 20 implementation** (stable v1 public contract,
changes thereafter require a version bump per §6):

- Public Runtime Host API (§3): `createWorldInstance`, `wakeLivingWorld`,
  `getWorldSnapshot`, `getWorldDelta`, `submitVisitorIntent`,
  `queryProvenance`, `queryHealth`.
- World identity/version: `WorldInstanceId`, `WorldDefinitionId`,
  `WorldRuntimeManifest` shape.
- World snapshot/delta shape: `WorldEmbodimentSnapshot`/`Delta` (already
  stable since Sprint 8, held at width for 5+ sprints).
- Renderer adapter contract: `renderer-contracts` (Sprint 6/8).
- Artifact ingestion manifest shape: `ArtifactManifestEntry` (Sprint 6).
- Persistence/checkpoint contract: `WorldCheckpoint`,
  `DurableWorldState` (Sprint 9).
- Semantic visitor intent shape: `InteractionIntent` (Sprint 6) +
  `ParticipationRecord` (once Sprint 19 lands and is reviewed).
- Runtime health/provenance read shape: `WorldRuntimeHealth`,
  `WorldRuntimeProvenance` (new, this document).

**Remain internal implementation detail** (free to change without a
v1 contract bump): every per-domain `wakeWorldWith*`/`getEmbodimentWith*`
Host function (already an internal composition chain, never
independently called by a renderer or external consumer), every
in-memory reference repository, every `lib/*/vrindavanXDefinition.ts`
config file (Vrindavan-specific data, not contract).

Canonical projection (`CanonicalEventProjection`) and spatial hierarchy
(`SpatialGrammar`/`PatchDefinition`) contracts are **not yet freeze
candidates** — they are Phase 0 proposals with open STOP gates (§45)
and must be reviewed against their OWN sprint's actual implementation
before joining this list.

---

## 45. Technical debt register

Consolidated, verified against actual docs/code — not asserted from
memory:

1. **`lastActiveAt` crash-recovery defect** (§13) — verified in
   `lib/worldPersistence/hostService.ts`; real, reproducible, found by
   Sprint 17 Phase 0, not yet fixed. **BLOCKER.**
2. **World lease never released by any Host code path; `acquire`
   conflicts on same-owner retry** (§10) — verified via grep across
   every `lib/*/hostService.ts`; independently consistent with Sprint
   17 Phase 0's own §18 finding. **BLOCKER.**
3. **10 prepared-but-unapplied migrations** (§32) — no production
   environment guard, no dry-run mode.
4. **No runtime/persistence/renderer version field stored anywhere**
   (§6) — `WorldDefinitionId`/artifact versioning exists; the OTHER
   three axes do not yet.
5. **Timeline/ExperienceRegistry naming proximity to Living-World
   concepts** (§1/§15) — not a bug, but a documentation risk: two
   unrelated `WorldDefinition` types already coexist
   (`world-persistence-contracts` vs. the older Runtime Kernel's
   `living-world-runtime`), flagged independently by Sprint 16 Phase 0
   §22. This document's glossary (§1/§15) is the mitigation; no code
   rename is proposed (out of scope, high blast radius, low value).
6. **Every production repository implementation is in-memory only** —
   every sprint's own Postgres migration is prepared, checksummed, and
   registered, but never applied or exercised against real
   infrastructure. This is the single largest gap between "tested" and
   "production-ready."
7. **Manual artifact vendoring** — `lib/livingWorldRuntime/vendor/*`
   is hand-copied from `studiok-specifications`, not pulled from a real
   package registry (acknowledged explicitly in `artifactIngestion.ts`'s
   own doc comment as the deliberate, appropriately-sized-for-now
   choice, with a documented upgrade path).
8. **No Unreal production adapter exists** — only a headless
   Unreal-COMMAND-translator proof-of-concept (Sprint 8). Real asset/
   geometry work is unstarted, and rightly out of this repo's scope.
9. **No production concurrency primitive beyond the in-memory
   `WorldLeaseRepository`** — the CAS/TTL design is sound (§11) but has
   never been exercised against a real multi-process deployment.
10. **`resourceOpportunityAvailable`/coarse resource-affordance gaps**
    (Sprint 14 §23 debt #3, Sprint 15 §18 debt #1) — still open,
    inherited, not this document's to resolve.
11. **Legacy `select-encounter` InteractionIntent** remains
    disconnected from world-instance persistence (Sprint 14 §23 debt
    #1, restated by Sprint 15 §18 debt #4) — still open.

---

## 46. Sprint 20 implementation sequence (once unblocked)

A SHORT integration/hardening sprint, not a new feature sprint:

1. Reconcile final Sprint 16-19 contracts against their actual landed
   implementation (not their Phase 0 proposals) — resolve every STOP
   gate each Phase 0 doc lists for itself.
2. Fix the two verified BLOCKER gaps first, standalone, with
   regression tests that fail on today's code (§13 `EvolutionHorizon`,
   §10 whole-chain lease scope + release + same-owner renew).
3. Establish the Runtime v1 Host facade (§3) as a thin composition
   layer over the (now-fixed) full chain.
4. Establish `WorldRuntimeManifest` (§5) and the version-compatibility
   checks it enables (§6/§7).
5. Wire `queryHealth`/`queryProvenance` (§16/§17) and the System
   Information integration (§18).
6. Reconcile the 10 prepared migrations into one production-readiness
   plan (§32) — still do not apply them without a separate, explicit
   authorization.
7. Run the golden scenario (§40) against whichever of its 21 steps are
   actually implementable at that point; do not claim it fully passes
   until Sprint 16-19 land steps 5/11/12.
8. Freeze the v1 contracts (§44).
9. Produce a Runtime v1 handoff document.

No further roadmap beyond this is proposed — Sprint 20 is the
architectural finish line for v1, not the start of v2 planning.

---

## Collision audit

Explicit confirmation Sprint 20 Phase 0 duplicates none of the
following (verified against actual package/doc names, not assumed):

| System | Owner | Sprint 20's relationship to it |
|---|---|---|
| Runtime Kernel packages (`experience-runtime`, `narrative-runtime`, `context-runtime`, `living-world-runtime`, `experience-registry`) | pre-Sprint-7 program phase | **Zero overlap.** Different product, different `WorldDefinition`, explicitly out of boundary (§1). |
| World persistence (`world-persistence-contracts/-runtime`) | Sprint 9 | **Composed, never duplicated.** Sprint 20 adds `WorldRuntimeManifest`/version fields ADDITIVELY; the lease/checkpoint/lifecycle primitives are reused as-is (§5/§10/§11/§14). |
| ExperienceRegistry | Sprint 3-ish, cross-product | **Zero overlap**, one-way future emitter relationship only (§1/§15), not built in Sprint 20. |
| Timeline | cross-product | Same as above. |
| World memory | Sprint 11 | **Reused verbatim** for the event/state glossary (§15); no new event type. |
| Encounter engine | Sprint 7/10/14 | **Composed, never duplicated** — `wakeLivingWorld` calls the existing chain (§8). |
| Adaptation engine | Sprint 15 | **Composed, never duplicated** — same posture. |
| Spatial runtime | Sprint 16 (proposed) | **Referenced as a Phase 0 input only**; no implementation, no package created here. |
| Canonical event runtime | Sprint 18 (proposed) | Same. |
| Visitor participation runtime | Sprint 19 (proposed) | Same. |
| Renderer contracts | Sprint 6/8 | **Reused verbatim** (§3/§26/§27). |
| StudioK artifact ingestion | Sprint 6 | **Reused verbatim**, extended additively (§7). |

Sprint 20 itself introduces exactly ONE new conceptual surface not
already named by an earlier sprint: the **Host facade + version/health/
provenance read-model** (§3/§5/§6/§16/§17) — everything else in this
document is composition, gap-closing, or documentation of what already
exists.

---

## Unresolved prerequisite-dependent items

Every item in this list is explicitly NOT decided by this document,
because its answer depends on work that has not landed:

- `CanonicalEventProjectionScope` (Sprint 18 Phase 0 §11) — cannot
  finalize until Sprint 16 produces a real spatial hierarchy.
- Whether `VisitorWorldMemory.save()` should be removed from the
  contract entirely (Sprint 19 Phase 0 open question) — awaiting
  Sprint 19 implementation-time review.
- The REQUIRED/OPTIONAL/PRESENTATION-CONDITION split for canonical
  events (Sprint 18 Phase 0 §9) — unconfirmed StudioK vocabulary, STOP
  gate in that document, inherited here unresolved.
- `ParticipationPrecondition`'s closed union (Sprint 19 Phase 0 §14) —
  same caveat, Sprint-19-invented vocabulary pending StudioK
  confirmation.
- Whether a `DEFERRED` canonical-projection lifecycle state is needed
  at all (Sprint 18 Phase 0) — depends on unresolved `NarrativeConstraint`
  scope.
- Exact production concurrency behavior under a REAL Postgres backend
  (vs. the in-memory reference lease) — cannot be validated until
  persistence is actually applied (§32).
- Whether background checkpoint hygiene (§34) is ever actually needed
  — no world has run long enough, in production, to know.

---

## STOP gates

1. **STOP** — Sprint 16, 17, 18, and 19 have not landed implementation.
   Sprint 20 implementation must not begin until all four close and
   this document's §2/§8/§43 are re-verified against their ACTUAL
   landed code, not their Phase 0 proposals.
2. **STOP** — the two verified BLOCKER gaps (§13 `lastActiveAt`, §10
   lease scope/release) must be fixed, with regression tests that fail
   pre-fix, before any other Sprint 20 work proceeds — they affect
   every downstream layer (Sprint 16-19 all inherit the same wake
   chain).
3. **STOP** — no database migration (10 already prepared, §32) may be
   applied as part of Sprint 20 without a SEPARATE, explicit
   authorization outside this architecture document's scope.
4. **STOP** — RC3 must remain untouched; this document proposes no
   merge.
5. **STOP** — the REQUIRED/OPTIONAL/PRESENTATION-CONDITION vocabulary
   (Sprint 18) and `ParticipationPrecondition` vocabulary (Sprint 19)
   are not confirmed StudioK terminology; do not treat either as final
   without an explicit StudioK/Canon governance sign-off.

---

SPRINT 20 PHASE 0 — PERSISTENT LIVING WORLD RUNTIME v1 PRODUCTION ARCHITECTURE READY — AWAITING SPRINT 16–19 IMPLEMENTATION CLOSURE
