# WORLDK-M14-B6 — Renderer World-State Read Authority

**Date:** 2026-09-27
**Environment:** Cloud Workstation only. No Unreal, no WRK-01, GCP L4 parked, WorldK untouched.
**Lane:** Platform (`avatark-platform-web`, branch `feature/worldk-p11b-platform-preview-provisioning`)
**Implementation:** `190f655`, pushed together with the accepted B6 recon report `b86a991`.
**Preview DB:** migration 046 applied at 00:21:27Z, checksum `dfd37ba93e1066869f4c934b88c1f31bb128e92c7659c63aa186d1dc5ee8b548`.
**Platform Preview:** `dpl_5LUmPb93SodSA1sKNyBNmDhmoo85`, READY, aliased to `platform-preview.avatark.ai`.
**Production:** untouched, still `dpl_FdYo7Sr2mq9322hgQkzqtvwa18kW`.
**Classification:** `M14B6_RENDERER_WORLD_STATE_READ_CERTIFIED`

Explicit statement (owner Q2): **B6/M15A world state is an authoritative Platform renderer projection over the current deterministic Living Forest fixture fact source (`WorldFactSource`). It is not yet the final durable, advancing Living Forest.** It is not `WorldExperienceSnapshot`, not a WorldK projection, not a browser API, not StreamK narrative context and not StudioK authoring state.

---

## 1. What was built
| Piece | Where | Behavior |
|---|---|---|
| **Migration 046** (Preview-only, **no table**) | `supabase/migrations/046_renderer_session_snapshot_authority.sql` | See the details below this table. |
| **Runtime Ingress `snapshot`** | `lib/worldEntry/runtimeIngress.ts` (`SNAPSHOT_OP`, **outside the frozen B1 `RUNTIME_OPS`**, like B4 `attach`) | `POST /api/runtime/v1/snapshot {sessionId}` with the existing runtime Bearer. The body must be exactly `{sessionId}`; anything else gives 400. Responses: 401 uniform, 403 `SESSION_NOT_BOUND`, 409 `SESSION_NOT_ELIGIBLE`, `Cache-Control: private, no-store`, `ETag: "<sourceRevision>"`. **304 only after full authorization.** |
| **RendererSessionSnapshot v1.0** | `lib/rendererProjection/rendererSessionSnapshot.ts` + `schemas/renderer-session-snapshot.schema.json` | Built **explicitly** from the fact source (§2). Includes a renderer forbidden-field guard. |
| **Composition root** | `app/api/runtime/v1/[op]/route.ts` | Injects `createRendererSnapshotPort(deps)`. `lib/worldEntry` declares only the `RendererSnapshotPort` interface and `RenderContext`, so it keeps its **frozen M14-A boundary** (no renderer or embodiment imports). |
| **SDK / reference runtime** (additive) | `packages/runtime-bridge/src/bridge.ts` `RuntimeBridge.readSnapshot(sessionId)`; `ReferenceRuntime.readSnapshot` | Sends only for a session this bridge has claimed or joined, and never changes local state. There is **no RendererEvent**. |

**Migration 046 details.** It defines `world_runtime_session_render_context(credential, secret, session)`: **STABLE**, SECURITY DEFINER, with a pinned `search_path`. Its authority chain:
1. The Platform gate.
2. 040 runtime authentication, which also requires an ACTIVE instance.
3. `world_m14_runtime_session`: the session is bound to the caller's instance and the same world.
4. The **frozen 044 eligibility predicate, unchanged**.

It returns only `{world_id, reconnect, arrival_kind, arrival_place_id}`. There is no identity parameter and no identity is returned. EXECUTE goes only to `worldk_platform_entry_authority`.

**Architecture correction during certification.** The first cut placed the builder inside `lib/worldEntry`. The **frozen M14-A boundary test** (`worldEntry.test.ts:211`: world-entry modules never import renderer or embodiment code) caught this in the full regression. Rather than edit a frozen test, I moved the builder to `lib/rendererProjection`, which depends on `worldEntry` and never the reverse. The ingress now reaches it through a port wired at the Next route. A mutant (A1) proves the boundary is enforced.

## 2. RendererSessionSnapshot (frozen shape, schemaVersion "1.0")
```
{ schemaVersion: "1.0", contract: "renderer-session-snapshot",
  worldId,                                   // consumer id ("living-forest") = session world = instance world
  session: { sessionId, reconnect },         // the renderer's own session
  visitor: { arrivalKind, arrivalPlaceId },  // EXACTLY these two (owner Q3)
  embodiment: { worldVersion, simulationTick, season{id,name},
                current: Region, reachable: Region[], transitions[{toLocationId, affordance}] },
  freshness: { generatedAt, validAsOf, staleAfter, source{ worldTick, worldVersion, sourceRevision } } }
Region = { locationId, name, spatialNode, environment, entities[EntityPresentation fields], encounters[EncounterPresentation fields] }
```
- **Explicit construction.** Every field is copied from the Forest embodiment. `visitorContext`, `protectedNarrative`, `provenance`, the runtime world id and `generatedAt` inside the embodiment are **never projected**.
- **Identity input.** The Forest builder's signature requires an identity value. It gets the fixed placeholder `renderer-session-view`, never the subject, and that value lands only in `visitorContext`, which is never projected. A gate asserts the placeholder is absent from the bytes.
- **Determinism.** `generatedAt = validAsOf = facts.observedAt`, and `staleAfter = observedAt + 60 s` (Q7). Identical `sourceRevision` plus session context gives byte-identical output.
- **Freshness source** is `{clock.tick, worldVersion, sourceRevision}` of the Platform fact source. That is the same fact source the Runtime Ingress uses to stamp lifecycle ticks, so they agree by construction; this is proven in G21.
- **Fixture caveat.** The fixture's `observedAt` is 2026-09-23T17:00:00Z, so `staleAfter` is already in the past. A re-fetch returns the same bytes and ETag until the fact source changes. This is correct behavior for a frozen fixture world.
- **Example from Preview-equivalent facts:**
  - `currentLocation: forest-clearing`, reachable `forest-stream`, `forest-pond`, 2 entities.
  - `freshness.source = {worldTick: 6, worldVersion: 1, sourceRevision: "fixture:living-forest-vertical-slice:5d69ae221f263009"}`.
  - The snapshot is 2,953 bytes.

## 3. Certification (owner gates 1–30)
**Real Postgres** (`rendererSessionSnapshot.postgres.test.ts`, 6/6). Setup:
- 037–046 applied as the non-superuser owner, on a DB with Supabase default privileges.
- The real ingress with the port wired, and the reference runtime.
- The real fixture fact source.

**Unit** (`rendererSessionSnapshot.test.ts`, 9/9).

| # | Gate | Result |
|---|---|---|
| 1 | Allocated renderer reads its own snapshot after CLAIM | 200. Schema-valid, and the guard is clean. |
| 2 | The same renderer reads while IN_WORLD | 200 after `STREAM_JOINED` → `VISIT_OPENED`, with the **same bytes** (same facts and context). The SDK path gives the same object. |
| 3 | Wrong renderer | 403 `SESSION_NOT_BOUND`. The SDK refuses locally. |
| 4 | Unknown or foreign session | 403 `SESSION_NOT_BOUND`, byte-identical to gate 3. |
| 5 | Cross-world renderer (an instance registered for a second seeded world) | 403 `SESSION_NOT_BOUND`, identical. |
| 6 | No parameter selects subject, user, world or place | Adding `subjectId`, `userId`, `worldId`, `placeId`, `visitId` or `sessionIds` gives 400. The 046 signature is `p_credential_id uuid, p_secret_sha256 bytea, p_session_id uuid` only. |
| 7 | Departed | 409 `SESSION_NOT_ELIGIBLE` |
| 8 | Superseded (grace reconnect) | 409. The new session reads, with `reconnect: true`. |
| 9 | Leave-requested | 409 (the 044 predicate is reused unchanged) |
| 10 | Released allocation (isolated, with the session still open) | 409 |
| 11 | Presence beyond grace (unswept) | 409, and the **digest is unchanged**, so the read inferred no timeout. Ended (disconnect) also gives 409. |
| 12 | Stale, revoked or wrong-secret credential; revoked instance | 401 uniform |
| 13 | Browser / no bearer / cookie header only | 401 |
| 14 | B3 capability as bearer | 401 |
| 15 | B3 authorization as bearer | 401 |
| 16 | View cookie as bearer | 401 |
| 17 | Extra request fields | 400. A malformed or empty body also gives 400. |
| 18 | Full public-schema digest before and after reads | **Equal** |
| 19 | Fact source before and after | **Equal** (sha256 of the loaded facts) |
| 20 | Same `sourceRevision` plus session context | **Byte-identical** snapshot (repeated reads, and before and after arrival) |
| 21 | Freshness tick and revision equal the Platform fact source and the ingress tick | `freshness.source.worldTick` equals the lifecycle event's `world_tick` stamped by ingress at arrival (6). Revision and worldVersion equal the facts. |
| 22 | Actual subject id absent from serialized bytes | Absent |
| 23 | visitId, allocationId, instanceId (and credential ids) absent | Absent |
| 24 | No email, profile, keys, capability, authorization, view hash or continuity rows | Absent: the view cookie and its sha256 are not in the bytes. There is no email or profile source in this path. There are no continuity fields; the visitor block is exactly two fields. |
| 25 | Schema validation and renderer forbidden-field guard | Pass for every Forest place, for FIRST_VISIT and RETURNING, and for reconnect true and false. |
| 26 | 046 privilege audit | Only the authority role has EXECUTE. anon, authenticated, service_role and the credential role have none, and PUBLIC has none. STABLE, SECURITY DEFINER, pinned `search_path`. The owner session gets `AUTHORITY_INVALID`. 046 contains no write, lock or table. |
| 27 | M14 A/A5/B1–B5 regressions | §5 |
| 28 | B1/B2 frozen files | `protocol.ts`, the spec, schemas and fixtures are **byte-identical**. The SDK only gained the additive `readSnapshot`. The SDK and Platform op sets are still equal. |
| 29 | Preview healthy | §6 |
| 30 | Production untouched | `next.avatark.ai` returns 404 for the snapshot op, still `dpl_FdYo…` |

**Physically non-mutating read.** The builder module statically contains none of `wakeLivingWorld`, `loadOrSeed`, `ensureWorldInstance`, `releasingWorldLeaseAfter`, `wakeWorldWithCanonicalEvents`, `getReturnRecognition` or `resolveDurable` (asserted by a unit test). 046 is STABLE with no lock, and the digest gates (18, 19, 11) hold.

## 4. Mutation / adversarial results (14/14 killed; sources byte-compared after each)
| Invariant | Mutant | Caught by |
|---|---|---|
| Binding | B1: no `world_m14_runtime_session` | G3–G5 |
| Eligibility | B2: no 044 predicate | G7–G11 |
| Authentication | B3: no runtime authentication | G12–G16 |
| Non-mutation | B4: VOLATILE plus a liveness write on read | G1/G18 digest, G26 |
| Privilege | B5: anon EXECUTE left | G26 |
| Redaction | R1: project `visitorContext` | schema, guard, G22 |
| Redaction | R2: project `protectedNarrative` | same |
| Redaction | R3: extra visitor field | same |
| Determinism | D1: wall-clock `generatedAt` | G20 |
| Freshness | F1: tick drift | G21 |
| Request strictness | I1: extra fields accepted | G6/G17 |
| Authorization order | I2: ETag 304 before authorization | unit |
| Cache scope | I3: public cache | G1 and unit |
| Architecture | A1: `lib/worldEntry` imports the projection | boundary test |

**Adversarial cases:** the second-world renderer; a superseded session; an isolated released allocation; B3 values as bearers; an ETag with a refused session (409, never 304).

## 5. Regression
| Suite | Result |
|---|---|
| **`pnpm test` (full, disposable DB)** | **2004 pass / 1 fail / 4 skipped of 2009.** The failure is the known pre-existing flake `embodimentOrchestrator.test.ts` "Phase 17" (Vrindavan). It **passes 4/4 in isolation**, and B6 changed no code in `lib/worldEmbodiment`, `lib/livingWorldHost` or `lib/worldPersistence`. The skips are the optional PostgREST stack and 3 A5 cron tests that need a cron DB. |
| A5 with pg_cron | 7/7 |
| `pnpm test:browser` (A3, B3, B4, B5 end-to-end with local coturn) | **17/17**. Re-run because B6 touched the ingress and the reference runtime, which B5 uses. |
| `pnpm test:signalling` | 8/8 |
| B6 unit / real Postgres | 9/9 / 6/6 |
| tsc (root, `tsconfig.b5-e2e.json`) / `next build` **with the service `node_modules` removed** (Vercel-equivalent) | clean |
| Secret scan (staged) | 0 hits |

## 6. Preview state
- **046:**
  - The pre-snapshot matched pre-045.
  - It was applied in one transaction together with its runner-format ledger row.
  - The post-apply lifecycle digest is **unchanged**.
  - Audit: identity args `p_credential_id uuid, p_secret_sha256 bytea, p_session_id uuid`; `volatile: s`; `secdef: true`; pinned `search_path`; owner `postgres`; EXECUTE only for the authority role; PUBLIC none.
  - Evidence: `worldk-m14b6/preview-*.json`.
- **Deployment:** `dpl_5LUmPb93SodSA1sKNyBNmDhmoo85`, READY at the first attempt (the B5 build lesson was applied: clean build verified before pushing).
- **Deployed probes** (no bypass, no real session; raw output in `worldk-m14b6/preview-deployed-probes.txt`):

  | Probe | Result |
  |---|---|
  | snapshot: no bearer / malformed bearer | 401 / 401 |
  | **snapshot: well-formed forged credential** | **401**. The port is wired, the 046 function answered `RUNTIME_CREDENTIAL_INVALID`, and a missing function would give 403 `PERMISSION_DENIED`. This is inferred from the status mapping. |
  | snapshot: extra `subjectId` | 400 |
  | snapshot: a 43-char token as bearer / cookie only | 401 / 401 |
  | snapshot: GET | 405 |
  | B4 attach / B5 route / B5 media page / B3 issue / ingress poll | 401 / 401 / 503 / 403 / 401 (unchanged) |
  | Production snapshot | 404 |

- **After the probes:** the lifecycle digest is **unchanged**.

## 7. Diff (`190f655`, 14 files, +945/−8)
- **New:**
  - migration 046
  - `lib/rendererProjection/rendererSessionSnapshot.ts`, its schema, and its unit and Postgres tests
  - `docs/evidence/worldk-m14b6/postgres-proofs.json`
- **Modified, all additive:**
  - `lib/worldEntry/runtimeIngress.ts`: the `snapshot` op, the `RenderContext` / `RendererSnapshotPort` types and the status mapping
  - `authorityDb.ts`: one method and one code
  - `referenceRuntime.ts`: `readSnapshot`
  - `machineIngress.ts`: one path alternative
  - `packages/runtime-bridge/src/bridge.ts`: `readSnapshot` and `SNAPSHOT_OP`
  - `app/api/runtime/v1/[op]/route.ts`: port injection
  - the runner and `package.json`
- **Untouched:**
  - migrations 040–045
  - the B1 protocol, spec, schemas and fixtures
  - the B3/B4/B5 modules
  - the signalling service
  - `WorldExperienceSnapshot`
  - the Vrindavan Host and durable path
  - WorldK

## 8. Remaining gaps / owner notes
- **Frozen technical debt (Q6):** the M14-A claim reply still gives the renderer `subjectId` and `visitId`. B6 adds none and echoes neither; this is proven by G22/G23.
- **Durable, advancing Living Forest; multi-world Host; deltas:** out of scope (Q2, Q7). When the Forest becomes durable, only the fact source behind the port changes, and the contract and authority stay the same.
- **Unknown or non-Forest worlds** answer honestly 503 (no renderer projection yet). Vrindavan is deliberately not wired.
- **Freshness convention:** schemaVersion `"1.0"` (Q5) plus the consumer-style freshness block. Contract pack §21's other conventions remain unresolved for other wire types.
- **Positive path not run on the deployment:** a real session on Preview needs a WorldK entry. The positive read is certified locally with the production handler code. The deployment proves the op exists, the port is wired, validation and auth refusal work, and the 046 grants and state isolation hold.
- **This report commit is local, not pushed** (a push would redeploy Preview).

## 9. STOP
Not done:
- no durable-world generalization
- no advancing Forest
- no deltas
- no change to `WorldExperienceSnapshot`
- no WorldK change
- no Production change
- no change to B1–B5 semantics
- no Unreal, WRK-01 or L4
- no M15

```
M14B6_RENDERER_WORLD_STATE_READ_CERTIFIED
```
