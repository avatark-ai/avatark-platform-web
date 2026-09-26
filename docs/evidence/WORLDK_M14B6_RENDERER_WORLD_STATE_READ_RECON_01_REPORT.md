# WORLDK-M14-B6 — Renderer World-State Read Authority — Reconnaissance

**Date:** 2026-09-27
**Mode:** READ-ONLY. Nothing was implemented, no migration was created, B1–B5 were not modified, and there was no Unreal, GPU, WorldK or Production change.
**Classification:** `M14B6_RENDERER_WORLD_STATE_READ_RECON_COMPLETE`

**Phase 1 (B5 publication):**
- The report commit `f4f45f9` changes only `docs/` and is pushed.
- Preview `dpl_6wNTrUzH4hmTaMhEx8AcDwibKj7h` is READY and aliased.
- Probes are unchanged: route endpoint without key 401, media page with a forged cookie 503, attach without bearer 401, Production 404.
- B5 is frozen at `a43ff86` + `853a6b0` + migration 045.

---

## 0. Headline findings
1. **`WorldExperienceSnapshot` exists, but only as a per-visitor runtime projection for Living Vrindavan.** Its only composer is `composeVrindavanWorldExperienceSnapshot`, and its only route is a dev-only, unauthenticated one. **Living Forest never produces one outside a test** (`lib/livingForest/embodiment.ts:19-26` says so deliberately).
2. **The durable world path is not durable and not generic.**
   - `lib/worldPersistence/durableSnapshot.ts:5-9, 55-73, 122-127` imports Vrindavan definitions, seasons, rules and provenance at module level.
   - Every repository behind it is in-memory (`worldPersistence/singleton.ts:15-46`, "no Postgres repository is wired up").
   - Migrations 026–035 exist on Preview as tables, but no code reads or writes them.
3. **Existing world reads mutate.**
   - `getEmbodimentSnapshotForVisitor` / `getWorldSnapshotForVisitor` call `wakeLivingWorld` first (`livingWorldHost/hostService.ts:48-66`: *"whichever request wins the race genuinely advances the world"*).
   - The Vrindavan experience chain seeds state on first read (`durableState.ts:102-111`).
   - **B6 must not reuse any wake/seed path.**
4. **Living Forest state today is the Platform's deterministic fixture fact source.**
   - `lib/worldConsumer/facts.ts:69-185`: seed `worldk-m09-fixture`; the world tick is frozen at 6; `sourceRevision` is a digest; computed once per process and read-only.
   - This is the **same source** that the WorldK projections and the Runtime Ingress (for the authoritative world tick) already use. So a renderer snapshot built from it is consistent with lifecycle ticks by construction.
5. **The renderer already learns a binding at claim.**
   - `world_runtime_claim` (040:991) returns `{sessionId, visitId, subjectId, worldId, placeId, reconnect}`. Frozen M14-A behavior.
   - **No route accepts a runtime credential for any world-state read.**
6. **`WorldExperienceSnapshot` as defined is too private and too heavy for a renderer.**
   - It embeds `userId` five times.
   - It carries private return-recognition facts, prior location, visit and encounter counts, and `protectedNarrative`.
   - It violates the consumer `FORBIDDEN_CONSUMER_FIELD_NAMES` list on nine names. That is correct for a consumer list, but it signals that this is an internal projection.
   - `WorldEmbodimentSnapshot`, by contrast, is renderer-shaped and **already buildable for Living Forest** (`buildForestEmbodimentSnapshot`). Its only visitor-private part is `visitorContext {userId, lastLocationId, counts}`.

---

## 1. Existing machinery
| Machinery | Where | Status |
|---|---|---|
| `WorldExperienceSnapshot` contract | `packages/world-experience-contracts/src/worldExperienceSnapshot.ts:18-29` | Real type. Fields: `worldId, userId, generatedAt, suggestedStage, arrival, orientation, place, nearbyPlaces, recentWorldChanges, embodiment`. **No schemaVersion, tick or sourceRevision.** |
| Generic composer | `packages/world-experience-runtime/src/worldExperienceSnapshot.ts:36-49` | Pure pass-through that adds `suggestedStage`. World-generic (forest portability test). |
| Vrindavan composer | `lib/livingWorldExperience/vrindavanWorldExperienceSnapshot.ts:16-49` | The only real caller, used by the dev route and tests. |
| `WorldEmbodimentSnapshot` | `packages/world-embodiment-contracts/src/snapshot.ts:27-39` | `worldId, worldVersion, simulationTick, season, current (EmbodiedRegion), reachable[], transitions[], visitorContext, protectedNarrative, generatedAt, provenance`. |
| Forest embodiment builder | `lib/livingForest/embodiment.ts:71-83` (+ `hostService.ts:313-325`) | Real, pure. Visitor memory and protected narrative are empty. |
| Forest world | `lib/livingForest/definition.ts` | Places `forest-clearing`, `forest-stream`, `forest-pond`; seasons `canopy-wet` → `drought`; deer archetype; one encounter rule. Runtime id `living-forest-fixture`, consumer id `living-forest` (`bindings.ts:232-243`). |
| Forest facts | `lib/worldConsumer/facts.ts` | Deterministic fixture timeline. `sourceRevision "fixture:living-forest-vertical-slice:<digest>"`, `fixtureBacked: true`. |
| Per-subject continuity (Postgres) | 037 `world_visitor_continuity` (+039 `open_visit_id`), 039 lifecycle events | Real, on Preview. `visit_count`, `last_place_id`, `encountered_place_ids`, `last_entered/left_at`, `visit_open`. |
| Session binding (Postgres) | 040 sessions, allocations, resolutions; `world_m14_runtime_session` | Real. Instance and world binding enforced (`SESSION_NOT_BOUND`). The allocation carries `arrival_place_id`; the resolution carries `arrival_kind`. |
| Stream eligibility predicate | 044 `world_m14b3_session_in_world` | Real (B4, frozen). CLAIMED, not ended, no leave requested, allocation live, instance ACTIVE, visit not closed and fresh. |
| WorldK consumer projections | `packages/world-consumer-contracts` (`PublicWorldProjection`, `VisitorWorldProjection`), `lib/worldConsumer/*` | Real. Browser/WorldK-facing, with `Freshness {generatedAt, validAsOf, staleAfter, source{worldTick, worldVersion, sourceRevision}}` and schemaVersion `"1.0"`. |
| World Memory / ReturnRecognition | `packages/world-memory-runtime` (pure, generic); `lib/worldMemory/hostService.ts` (Vrindavan, in-memory) | The pure function is used for the Forest by `visitorProjection.ts`. |
| Narrative / canonical | in-memory, Vrindavan-only | Not needed for M15's first render. Forest `protectedNarrative` is always empty. |
| Contract pack §21 | `STUDIOK_UNREAL_58_INTEGRATION_CONTRACT_PACK.md:869-888` | No version field on any renderer wire type; there are three competing version conventions. |

## 2. Answers (Q1–18)
1. **The contract:** as in §1. It is a per-visitor composite of arrival, orientation, place continuity (with a `visitor` sub-block), recent world events and the embodiment snapshot.
2. **Owner:** the Platform's world-experience packages. Composition is by the Host layer (Vrindavan only).
3. **Nature:** a **runtime projection**. It is derived per visitor at read time from the Host's (in-memory) world state. It is **not** authoritative truth. Truth is the world's durable state (today in-memory; 026 unapplied in code), plus lifecycle and continuity (Postgres, 037/039/040). It is also not a consumer projection; WorldK never sees it.
4. **Why the durable path is Vrindavan-specific:** it was built in Sprints 9–20 for the flagship world, with module-level Vrindavan constants. The Host files are "Vrindavan-wired by convention" (`livingWorldHost/hostService.ts:70-83`). The Forest was added later as a **parallel, pure, fixture-backed** slice, not a second tenant of the durable path.
5. **What can become world-generic without breaking semantics:**
   - `composeWorldExperienceSnapshot`, `resolveArrivalDecision`, `computeReturnRecognition` and the embodiment contracts are already generic.
   - The **Forest embodiment builder** exists.
   - What is not generic is the durable/Host orchestration (seed, wake, lease, catch-up, canonical events, memory repositories). Generalizing that is a world-state architecture project, **not B6**.
6. **Living Forest state that exists:**
   - Definition (places, edges, seasons, archetypes, encounter rule, day phases).
   - The pure advance function.
   - The deterministic fact source (tick, season, environment, population `deer-1`, `deer-2`, `deer-herd-1`).
   - The embodiment builder.
   - Per-subject continuity and lifecycle in Postgres.
   - Session binding with the arrival place.
7. **Living Forest state that does not exist:**
   - A durable, advancing Forest world (it is frozen fixture time).
   - A Forest `WorldExperienceSnapshot` composer (place continuity, orientation).
   - Durable Forest world memory or encounter history (`priorVisitEvidence` / `encounteredEntityIds` are stubbed empty, `runtimeDeps.ts:34-35`).
   - Canonical events and narrative for the Forest.
   - Deltas.
8. **The minimum first M15 snapshot** is in §4. It is world identity and time, the current place region with its environment and entities, reachable places and transitions, the session-bound visitor context minus identity, and freshness.
9. **Bootstrap vs deltas: bootstrap only, re-fetchable**, with a `sourceRevision`/ETag for "has it changed". `WorldEmbodimentDelta` exists in contracts but has no Forest producer. The frozen fixture tick changes only when the fact source changes, so deltas are premature.
10. **Renderer authentication:** the existing **runtime credential** (`Bearer wkrt1.<id>.<secret>`), verified in the DB by `world_m14_authenticate_runtime`. The same authority as every ingress op.
11. **Reuse of the runtime credential and session binding:** yes. The credential and `world_m14_runtime_session` (instance plus world binding) are reusable as-is. What is missing is a **read-only** function that returns the session's render context: the claim function writes `claimed_at` (idempotent, but a write), and nothing else returns the binding.
12. **Preventing cross-session, cross-subject and cross-world reads:**
    - The renderer names **only a `sessionId`**. The subject, visit, world and place are derived from the Platform's binding.
    - `SESSION_NOT_BOUND` covers a session on another instance and a world mismatch between instance and session.
    - There is no subject or world parameter at all.
    - The snapshot's world must equal the session's world, which must equal the instance's world.
13. **After LEAVE, supersession, expiry or allocation release:** refuse. Reuse the frozen 044 eligibility predicate: ended (disconnect, supersede, visit closed), leave requested, allocation released, instance revoked, or presence past grace all mean `SESSION_NOT_ELIGIBLE`. Owner Q4 covers whether LEAVING should still read.
14. **What must never reach the renderer:**
    - email and profile data
    - other visitors' continuity or presence
    - the browser view-cookie hash
    - B3 capability and authorization values, and B4 attachment rows
    - service, signalling and streamer keys; TURN secrets
    - allocation, instance and lifecycle-event ids beyond what it holds
    - raw ledger rows
    - private return-recognition facts, which are not needed for M15
    - `protectedNarrative` content, which is empty for the Forest anyway
15. **Visitor-private state:** the existing `WorldExperienceSnapshot` does contain visitor-private state. The proposed B6 snapshot contains only a **minimal** visitor block: arrival kind and arrival place (both already implied by claim and resolution), and **no user id** (§4).
16. **Relationship to WorldK projections:**
    - `PublicWorldProjection` / `VisitorWorldProjection` are **consumer (browser/WorldK)** contracts. They carry forbidden-field guards that exclude renderer-level fields (`locationId`, `simulationTick`, `visitorContext` and so on).
    - The renderer snapshot is a **separate contract** for an authenticated runtime.
    - **Reuse the same underlying sources** (`WorldFactSource`, the continuity reader) so all views agree on tick and revision. Never reuse the endpoints, cache scopes or guards interchangeably.
17. **Freshness and versioning owner:** the **Platform's world fact source** (`worldTick`, `worldVersion`, `sourceRevision`), the same source Runtime Ingress uses for authoritative ticks. The snapshot carries `schemaVersion` plus a consumer-style `Freshness` block. The renderer never supplies time or tick.
18. **Migration:** **yes, one minimal read-only function** (proposed 046). The Platform authority role has no table privileges, and no existing function returns a session's render context without writing. No table is needed. World state itself derives from the existing fact source in TypeScript.

## 3. Ownership / authority map
| State | Authority | B6 role |
|---|---|---|
| World definition, advance rules | Platform world packages (`lib/livingForest/*`) | read (build snapshot) |
| World time / season / population (Forest) | Platform `WorldFactSource` (fixture, deterministic) | read; source of `worldTick` / `sourceRevision` |
| Lifecycle, continuity | Platform DB (037/039/040) | read the minimal visitor block via the 046 function |
| Session binding (instance / world / subject / place) | Platform DB (040) | verify and derive; the renderer supplies only `sessionId` |
| Stream eligibility | 044 predicate (frozen) | reuse for read eligibility |
| Snapshot contract and version | Platform (new `renderer-session-snapshot` contract) | produce |
| Rendering, camera, interpolation | Renderer | consume only; it authors nothing |
| Browser | none | outside the read path |

## 4. Proposed minimum M15 snapshot (reconciled with existing contracts)
**Recommendation:** a thin, versioned **renderer envelope around the existing `WorldEmbodimentSnapshot`**. It needs no new world model, and it fits the existing headless UnrealCommand translator (snapshot → commands). Conceptual shape (not a schema yet):

```
RendererSessionSnapshot {
  schemaVersion: "1.0"
  contract: "renderer-session-snapshot"
  worldId            // consumer id ("living-forest"), = session.world_id
  session: { sessionId, reconnect }                       // the renderer's own id, already known
  visitor: { arrivalKind: FIRST_VISIT|RETURNING, arrivalPlaceId }   // no userId, no counts, no SYWH
  embodiment: WorldEmbodimentSnapshot                      // Forest builder output, with visitorContext REDACTED
                                                           //   (userId removed/replaced; counts removed); protectedNarrative empty
  freshness: { generatedAt, validAsOf, staleAfter, source: { worldTick, worldVersion, sourceRevision } }
}
```

- **`embodiment.current`** is the region at the session's arrival place (allocation `arrival_place_id`). `reachable` and `transitions` come from the Forest graph.
- **Deterministic:** the same facts and the same session produce the same bytes, except `generatedAt`. Proposal: set `generatedAt = validAsOf = facts.observedAt` so the whole snapshot is deterministic for a given `sourceRevision`.
- **Not included** in M15's first render: `orientation`, `place` continuity views, `recentWorldChanges`, return recognition, canonical or narrative content. These belong to a later world-state architecture step once the Forest is durable.
- **Builder input check (verified):** `WorldFacts` carries `sharedState` and `populationEntities` (`facts.ts:38-57`), which is exactly what `buildForestWorldSnapshot(sharedState, populationEntities, locationId, userId, now)` needs.
  - The builder **requires a `userId` argument**, which it embeds in `visitorContext`. B6 must pass a fixed non-identifying value and redact it in the envelope, **never the real subject id**. A gate must assert that the subject id is absent from the output bytes.
- **Redaction approach:**
  - Construct the renderer view explicitly; do not strip fields.
  - Add a renderer forbidden-field guard covering userId/visitorId, email, subject identifiers, service or credential fields, and infra identifiers beyond the renderer's own.
  - Add a fixture-backed schema test.

## 5. Authentication and transport model
- **Transport:** a new Runtime Ingress operation `snapshot`, outside B1 `RUNTIME_OPS`, exactly like B4 `attach` (so B1/B2 stay frozen). `POST /api/runtime/v1/snapshot {sessionId}` with the runtime Bearer. The SDK gains an additive `readSnapshot(sessionId)`, and the reference runtime gains an additive `readSnapshot`.
- **Authority chain (all inside the DB transaction):**
  1. Platform gate.
  2. Credential valid, not revoked or expired; instance ACTIVE.
  3. `world_m14_runtime_session`: session bound to this instance, same world.
  4. Eligibility (044 predicate).
  5. Return `{worldId, reconnect, arrivalKind, arrivalPlaceId}`.
- **After the DB step:** TypeScript builds the embodiment from `WorldFactSource` for `worldId`'s runtime binding, and returns the envelope with `Cache-Control: private, no-store`.
- **Browser:** has no runtime credential; the op is host-gated like every ingress op; there are no CORS headers. A browser (or a B3 authorization, capability or view cookie presented as a bearer) gets a uniform 401.
- **No write:** the 046 function is `STABLE`, and the fact source is pure and cached. The Vrindavan wake and seed paths are never called.

## 6. Freshness / version model
- **`schemaVersion` "1.0"** follows the consumer-contract string convention, the one already used in production code. Choosing a single convention for renderer wire types is contract-pack §21 debt and an owner decision (Q5).
- **`source.sourceRevision`** is the fact-source digest, and **`worldTick`** is the Platform's tick, identical to what ingress stamps on lifecycle events.
- **`staleAfter`:** the renderer re-fetches after this, or on reconnect. The proposal is 60 s, matching `publicProjection` `staleAfterMs`.
- **ETag = `sourceRevision`**, allowing a 304-style "unchanged" answer. The ETag carries no private data.

## 7. Security boundaries
| Threat | Control |
|---|---|
| Wrong renderer reads another's session | `SESSION_NOT_BOUND` (credential → instance → session binding) |
| Cross-subject / choose a visitor | No subject parameter; the subject is derived, and the snapshot carries no user id |
| Cross-world | Session world = instance world = snapshot world |
| Departed / superseded / released / expired | 044 eligibility predicate → `SESSION_NOT_ELIGIBLE` |
| Stale or revoked credential | 040 authentication → uniform 401 |
| Browser access | No runtime credential; host gate; B3/B4 secrets are not bearers |
| Read-path mutation | STABLE function; pure fact source; no wake or seed; digest-equality gate |
| PII / secret leakage | Explicit renderer view plus a forbidden-field guard; no email or profile; no keys |
| Renderer authoring truth | Read-only op; interaction remains the InteractionIntent path (B1 firewall), never lifecycle |

**Observation (not reopened):** the frozen claim reply already gives the renderer `subjectId` and `visitId`. B6 should add **no** further identity, and should not echo them in the snapshot. Whether M15 should stop depending on `subjectId` at the renderer is an owner question (Q6).

## 8. Architecture alternatives
| Option | Description | Pros | Cons |
|---|---|---|---|
| A1 Reuse `WorldExperienceSnapshot` as-is | Build a Forest composer (orientation, place continuity) | Existing contract | Embeds `userId` five times, private return facts, `protectedNarrative`; Forest composers missing; far more than M15 needs |
| **A2 Renderer envelope + `WorldEmbodimentSnapshot` (redacted)** | §4 | Forest builder exists; renderer-shaped; fits the UnrealCommand translator; minimal private data | A new, small envelope contract; `visitorContext` must be redacted |
| A3 Bespoke minimal schema | A new scene description | Tailored | Drifts from the existing embodiment/translator; re-derives the world model |
| A4 Let the renderer read WorldK `VisitorWorldProjection` | Consumer endpoint with a runtime key | Nothing new | Wrong authority and cache scope; a consumer contract that forbids renderer fields; needs a visitor session |

**Recommendation: A2.**

**Durable-world generalization** (making the Vrindavan Host path multi-world and Postgres-backed) is explicitly **out of B6 scope**. It is a separate world-state architecture decision (Q2).

## 9. Recommended smallest B6 implementation
1. **Preview-only migration 046** (slot to be confirmed free at implementation time):
   - `world_runtime_session_render_context(credential, secret, session)`, STABLE, SECURITY DEFINER, Platform gate.
   - It performs runtime authentication, the `world_m14_runtime_session` binding and the 044 eligibility check.
   - It returns `{world_id, reconnect, arrival_kind, arrival_place_id}`.
   - No table. EXECUTE only to the Platform authority role. The 038 hardening applies.
2. **Runtime Ingress op `snapshot`**, outside `RUNTIME_OPS`: 401 uniform auth; 403 for `SESSION_NOT_BOUND`; 409 for `SESSION_NOT_ELIGIBLE`.
3. **`lib/worldEntry/rendererSnapshot.ts`:**
   - Builds the §4 envelope from `WorldFactSource` (Forest builder) for the session's runtime world binding.
   - Explicit redaction.
   - A renderer forbidden-field guard.
   - A deterministic `generatedAt`.
   - A `sourceRevision` ETag.
4. **SDK** `RuntimeBridge.readSnapshot(sessionId)` (additive, no RendererEvent) and reference-runtime support.
5. **Tests:** unit, real Postgres, and a Chromium-free end-to-end run (the reference runtime reads its session snapshot after claim).
6. **Out of scope:** no durable Forest, no deltas, no Vrindavan path, no browser API, no WorldK change.

## 10. Proposed B6 certification gates
1. The allocated renderer reads its session snapshot (pre-arrival after CLAIM, and while IN_WORLD).
2. Wrong renderer: `SESSION_NOT_BOUND`.
3. An unknown or foreign session is refused identically.
4. Cross-subject: no parameter exists to name another visitor, and the snapshot has no user id. Proven by schema and by static signature.
5. Cross-world: an instance of world X cannot read a session of world Y (seeded second-world instance).
6. Departed, superseded, leave-requested, released allocation, or presence past grace: `SESSION_NOT_ELIGIBLE`.
7. Stale, revoked or wrong-secret credential, or a revoked instance: uniform 401.
8. Browser: no bearer, a B3 capability or authorization, or the view cookie presented as a bearer: 401. Host gate verified.
9. A read mutates nothing: full public-schema digest equal, and the fact source unchanged.
10. The renderer cannot choose visitor identity: the request body is exactly `{sessionId}`, and extra fields give 400.
11. Deterministic snapshot: the same `sourceRevision` gives byte-identical bytes, and `freshness.source` equals the ingress tick.
12. No PII or secrets: forbidden-field scan (userId, email, subject/visit/allocation/instance ids beyond `sessionId`, keys, capability or authorization values, view hashes); schema-validated fixture.
13. 046 privileges: anon, authenticated, service_role and the credential role have no EXECUTE; the authority role does; STABLE; no table.
14. Regression: M14 A/A5/B1–B5 green; B1/B2 files byte-identical; Preview healthy; Production untouched.

## 11. Owner decisions required
1. **Q1 Contract choice:** approve A2 (renderer envelope plus redacted `WorldEmbodimentSnapshot`), not `WorldExperienceSnapshot`.
2. **Q2 World-state scope:** confirm B6 reads the **fixture-backed Living Forest fact source** (frozen tick). A durable, advancing Forest and a multi-world Host belong to a later, separate world-state architecture mission.
3. **Q3 Visitor block:** approve `{arrivalKind, arrivalPlaceId}` only, with no visit counts, no return-recognition facts and no user id. Or name additional fields M15 needs.
4. **Q4 Read eligibility:** reuse the frozen 044 predicate, so LEAVING is refused, or allow reads until the session ends.
5. **Q5 Version convention:** adopt the consumer string `schemaVersion "1.0"` for renderer wire types (addressing contract pack §21), or another convention.
6. **Q6 Renderer identity exposure:** keep the frozen claim reply (`subjectId`/`visitId` to the renderer) as is, or schedule a later minimization (out of B6).
7. **Q7 Bootstrap only:** confirm no deltas in B6 (re-fetch on `staleAfter` or reconnect; ETag = `sourceRevision`).
8. **Q8 Migration 046:** authorize one read-only function (no table) for the render context.

## 12. STOP
Recon only. No B6 implementation, no migration, B1–B5 unchanged, no Unreal, no WRK-01 or GCP L4, no WorldK or Production change, and M15 not started. The report is committed locally (a push would redeploy Preview).

```
M14B6_RENDERER_WORLD_STATE_READ_RECON_COMPLETE
```
