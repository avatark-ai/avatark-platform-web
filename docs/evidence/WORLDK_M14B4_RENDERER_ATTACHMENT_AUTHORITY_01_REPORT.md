# WORLDK-M14-B4 — Renderer Attachment Authority

**Date:** 2026-09-26
**Lane:** Platform (`avatark-platform-web`, branch `feature/worldk-p11b-platform-preview-provisioning`)
**Implementation commit:** `ad45089`, pushed. The push also published the accepted B4 recon report commits `5d34061` and `66922fa`.
**Preview DB:** `gxjdbfpyyrycvqzozyty`. Migration 044 applied at 20:44:58Z.
**Platform Preview:** `dpl_8fc3RGRbAaDFfjWLsB9CbFoS35Z4`, READY, aliased to `platform-preview.avatark.ai`.
**Production:** untouched, still `dpl_FdYo7Sr2mq9322hgQkzqtvwa18kW`.
**Classification:** `M14B4_RENDERER_ATTACHMENT_AUTHORITY_CERTIFIED` (scope and limits in §10).

Out of scope and not done: Pixel Streaming, WebRTC, TURN/STUN, a signalling host, Unreal, GPU scheduling, autoscaling, process spawning, dynamic capacity, Visit migration, WorldK changes, GCP L4 and B5.

---

## 1. Owner decisions implemented
| Decision | Implementation |
|---|---|
| **Q1(a):** ARRIVAL = actual media or world presence | The shared B3 stream predicate (043 `world_m14b3_session_in_world`) is replaced in 044. A session is now eligible when **CLAIMED by its allocated runtime, not ended**, with no leave requested (as in 043). Its allocation must be unreleased and bound to the visit, and its instance ACTIVE. The Visit is either not yet opened (pre-arrival), or open, fresh and the continuity's open visit (reconnect). **ARRIVAL still comes only from `STREAM_JOINED`.** A claimed or attached session is never IN_WORLD. 043's file, checksum, table, entry points, TTL, hashing, bindings, single use, error codes and grants are **unchanged**. |
| **Q2 D1:** renderer-verified authorization | New Runtime Ingress op `attach`, taking `{sessionId, authorizationSha256}` with the runtime Bearer. It calls `world_runtime_stream_attach(credential, secret, session, sha256(authorization))`. |
| **Q3:** attach window 60 s | `now() < consumed_at + 60 s`. The window end is stored as `attach_window_ends_at`, with a CHECK `attached_at < attach_window_ends_at`. |
| **Q4:** B1 frozen | `attach` is outside `RUNTIME_OPS` on both the Platform and SDK sides, and the two op sets still match exactly (B2 test unchanged). There is no new RendererEvent kind. `protocol.ts`, the B1 spec, schemas and fixtures are byte-identical (the diff is empty). |
| **Q5:** granularity-neutral | Allocation stays "one Visit seat on one render-capable RuntimeInstance" (040, unchanged). B-3 (shared simulation plus render workers) is recorded as direction only (recon §5B). Nothing assumes one process per visitor. |
| **Q6:** C1 only | Static declared capacity is unchanged. No headroom or GPU facts. |
| **Q7:** revoke semantics unchanged | A revoked instance cannot attach (401). ACTIVE seats still drain by presence timeout. |
| **Q8:** topology-neutral | There is only an in-process `StubAttachmentRelay` and **no deployed relay route** (Preview answers 401 at the host gate). No WebRTC, TURN or host. |
| **Q9:** living-forest | All certification uses living-forest. |

## 2. Migration `044_world_stream_attachment_authority.sql` (Preview-only; the runner refuses any other project)
- **Slot check:** no branch, worktree or local file used 044–049, and the Preview ledger ended at 043.
- **Predicate replacement** (Q1(a), as above). It is still read-only and never infers a timeout. EXECUTE was re-revoked from every API role.
- **`world_stream_attachments`:**
  - `authorization_sha256` is the PK and references 043's UNIQUE authorization hash.
  - `session_id` is UNIQUE, so there is one attachment per session.
  - `instance_id` records the allocated renderer.
  - `attached_at` and `attach_window_ends_at` are stored.
  - **No plaintext column.** RLS is on with no policies.
- **`world_runtime_stream_attach`** (SECURITY DEFINER, pinned `search_path`) runs these steps in order:
  1. The Platform gate.
  2. The 040 runtime credential check (invalid, revoked or expired credential; revoked instance).
  3. `world_m14_runtime_session`: the **caller must be the instance the session and its allocation are bound to** (`SESSION_NOT_BOUND`).
  4. The (world, subject) lock.
  5. A `FOR UPDATE` on the authorization's capability row: it must exist and be consumed, otherwise `STREAM_AUTHORIZATION_INVALID`, which also covers a raw capability hash.
  6. Binding to this session, subject and world, otherwise `…_BINDING_MISMATCH`.
  7. Not already attached (per authorization or per session), otherwise `STREAM_ALREADY_ATTACHED`.
  8. Inside the window, otherwise `STREAM_ATTACH_WINDOW_EXPIRED`.
  9. The eligibility predicate, otherwise `STREAM_SESSION_NOT_ELIGIBLE`.
  10. Insert, returning `{outcome:"ATTACHED", sessionId}`. The sessionId is the renderer's own id, returned only to the renderer.
- **`world_stream_attachment_route(view_sha256, authorization_sha256)`:** used only by the stub relay. It returns the browser's **own** session for an attachable authorization; the result goes to the Platform, never to the browser.
- **Writes:** 044 writes only `world_stream_attachments` (statically asserted). It calls no `world_m14_*` lifecycle helper, `record_world_*` function or `_v2` writer.
- **Privileges:** `REVOKE ALL` from PUBLIC, anon, authenticated and service_role on the table and every function. EXECUTE goes only to `worldk_platform_entry_authority`, for attach and route.

## 3. Code
- **`runtimeIngress.ts`:**
  - `ATTACH_OP` handling.
  - The body must be exactly `{sessionId: uuid, authorizationSha256: lowercase 64-hex}`, otherwise 400.
  - Uniform 401 on any runtime-auth failure.
  - 403 for binding/invalid, 409 for attached/window/eligibility.
  - 503 when the DB lacks the method.
- **`authorityDb.ts`:** `runtimeStreamAttach` and `streamAttachmentRoute`, plus 5 new codes. The `EntryAuthorityDb` interface is unchanged.
- **`machineIngress.ts`:** `/api/runtime/v1/attach` becomes self-authenticating.
- **SDK (`packages/runtime-bridge/src/bridge.ts`, B2):**
  - `RuntimeBridge.attach(sessionId, sha256Hex)` sends only for a session this bridge has CLAIMED or JOINED. Anything else is refused locally with no I/O.
  - It never changes local state; attach is not `STREAM_JOINED`.
  - It reuses the injected transport. The transport interface is unchanged, so the B2 tests are unchanged.
- **`referenceRuntime.ts`:** `attachStream(sessionId, authorization)` hashes the authorization and calls the SDK. The B2 legacy-equivalence oracle still passes.
- **`stubAttachmentRelay.ts`:**
  - The browser POSTs `{authorization}` with its session cookie, under strict same-origin checks.
  - The Platform resolves the browser's own session through the route function.
  - The relay delivers to whichever renderer registered that session, and the renderer proves itself at ingress.
  - The browser sees only `ATTACHED` or `REFUSED`.
  - A relay mis-route can only produce a refusal.
- **B3 test re-certification:**
  - Both B3 real-DB suites now apply 043 and then 044.
  - One N1 expectation changed by owner decision: a CLAIMED-not-joined session now gets ISSUED.
  - The B3 N12 grant query was narrowed from `world_stream_%` to `world_stream_capability_%`, because the prefix also matched 044's new route function.
  - B3 code and routes are unchanged.

## 4. Certification gates (real Postgres `streamAttachment.postgres.test.ts`, 14/14)
| Owner gate | Test | Result |
|---|---|---|
| Q1(a) predicate re-cert | Q1 | Redeemed but unclaimed: `STREAM_SESSION_NOT_IN_WORLD`. **CLAIMED, not joined: ISSUED**, with 0 presence rows and 0 lifecycle events. Claimed + leave requested: refused. Claimed then ended: refused. |
| Allocated renderer attach PASS | G1, G1b | `ATTACHED`. The row holds only {authorization hash, session, instance = allocated, attached_at, window}, and the window equals `consumed_at` + exactly 60 s. **The digest of every public table except the two stream stores is identical across attach.** Attach is **not arrival** (`joined_at` NULL, no presence). `STREAM_JOINED` afterwards gives `VISIT_OPENED`. The SDK path works. A grace-reconnect session attaches with its own new authorization, and the old session's authorization gets `BINDING_MISMATCH` on it. |
| Wrong renderer REFUSED | G2 | Another instance attaching this session: `SESSION_NOT_BOUND`. Another instance using its own session with a foreign authorization: `BINDING_MISMATCH`. The SDK refuses locally (no I/O). The allocated renderer still succeeds afterwards. |
| Expired/revoked credential REFUSED | G3 | `RUNTIME_CREDENTIAL_EXPIRED`, `…_REVOKED` and `…_INVALID` at the DB. Over HTTP, a revoked credential and a revoked instance both get a uniform 401. Nothing is attached. |
| Replay / second attach REFUSED | G4 | Same authorization: `STREAM_ALREADY_ATTACHED`. A second authorization for an already-attached session: `STREAM_ALREADY_ATTACHED`. The original row is unchanged. |
| Concurrent: exactly one winner | G5 | **Held lock:** T1 attaches in an open transaction. T2 is observed waiting on a Lock, then gets `STREAM_ALREADY_ATTACHED`. **Race:** 16 attempts over 8 pools gave 1 ATTACHED and 15 ALREADY_ATTACHED. |
| Expired attachment REFUSED | G6 | At `consumed_at` + 61 s: `STREAM_ATTACH_WINDOW_EXPIRED`. At 59 s: `ATTACHED`. |
| Ended/departed/superseded session REFUSED | G7 | Ended (STREAM_LOST), superseded (grace reconnect), leave-requested, departed, and joined with presence past grace (unswept) are all `STREAM_SESSION_NOT_ELIGIBLE`. The last case inferred no timeout (digest equal). |
| Cross-session / cross-subject REFUSED | G8 | Cross-subject and cross-session: `BINDING_MISMATCH`. Other material presented as an authorization is `STREAM_AUTHORIZATION_INVALID`: the raw B3 capability, a forged value, the session cookie, and an unredeemed capability. Malformed bodies: 400. |
| Raw B3 capability substituted | G8 | `STREAM_AUTHORIZATION_INVALID` (see above). |
| Authorization material vs lifecycle ingress | G9 | As a ticket: `TICKET_INVALID`. As a session view or leave: `SESSION_NOT_FOUND`. As a runtime secret on arrival or attach: `RUNTIME_CREDENTIAL_INVALID`. As a B3 capability: `STREAM_CAPABILITY_INVALID`. As an ingress Bearer: 401. The digest is unchanged. |
| Stub proof: browser → allocated renderer → attach → ATTACHED | G10 | The browser receives exactly `{"status":"ATTACHED"}`. Refused cases: a foreign browser routing another's authorization (403); a relay mis-routing to the wrong renderer (the SDK refuses, and the wire call gets `SESSION_NOT_BOUND`, with nothing bound); no renderer registered; a malformed body; a cross-site request. |
| 038 hardening | G11 | No table grants; RLS on with 0 policies. anon, authenticated, service_role and the NOINHERIT credential have no table privilege or EXECUTE. The predicate cannot be executed by anyone. The Platform role has exactly {attach, route, issue, redeem}. All functions are SECURITY DEFINER with a pinned search_path. The owner session gets `AUTHORITY_INVALID`. |
| Plaintext absent | G12 | 41 plaintexts (capabilities and authorizations) checked against every public/auth table and `pg_stat_activity`: 0 hits. |

**Unit** (`streamAttachment.test.ts`, 6/6):
- The B1 freeze assertions: no "attach" in `protocol.ts` or the B1 spec, and the SDK and Platform op sets are equal.
- Ingress validation, with only hashes reaching the DB.
- Uniform 401.
- The status mapping.
- SDK local refusal and unchanged state.
- The relay's browser boundary.
- The host gate.
- No `app/` file imports the relay.

**Browser** (`streamAttachment.browser.test.ts`, real Chromium 151 + real handlers + real Postgres, 1/1):
1. Before the claim, capability issuance gets 403.
2. After the allocated renderer claims, the page runs capability → authorize → stub attach and gets `{"status":"ATTACHED"}`. The replay gets 403. Chromium sent the real Origin.
3. The attachment row's instance is the allocated renderer, and there is no presence row.
4. `STREAM_JOINED` gives `VISIT_OPENED`, and the status page says "You are in…".
5. **No instance, session, allocation, visit or subject id appeared anywhere the browser received**, and no body mentioned instance, renderer, process, gpu, host, port or localhost.
6. A cross-site CORS fetch was BLOCKED and never reached the Platform.

**Mutation check.** Each mutant was applied, run, and 044 restored (byte-compared). All 8 were killed:

| Mutant | Caught by |
|---|---|
| no instance binding | G2, G10 |
| no single attach | G4, G5. The first combined run also failed unrelated tests because of a known parallel-suite race on the cluster-wide `ALTER ROLE`; a serial re-run failed exactly G4/G5. |
| no window | G6 |
| no eligibility | G7 |
| no authorization binding | G1b, G2, G8 |
| predicate accepts unclaimed sessions | Q1, B3 N1 |
| anon table grant | G11 |
| predicate ignores leave | Q1, G7, B3 N1/N9 |

## 5. Preview apply and audit (real Supabase)
- **Pre-snapshot:** ledger …042, 043. No 044 table, 0 capability rows. The lifecycle digest is identical to the pre-043 values.
- **Apply:** 044 byte-for-byte, together with the runner-format ledger row (checksum `89a584a539f28a1e0dc6f2967a0ca9a89bc18f3131df593e6bb90a510494f5ed` = the committed file), in **one transaction**, as postgres, via `supabase db query --linked`.
- **Post-apply:** the digest is **unchanged**.
- **Audit:**
  - Table: RLS on, 0 policies, no grants. anon, authenticated, service_role, authority and credential roles all have no table privilege.
  - EXECUTE: the API roles and the credential have none on any of the five stream functions, and PUBLIC has none.
  - The authority role has EXECUTE on exactly attach, route, issue and redeem, and **not** on the predicate.
  - The functions are SECURITY DEFINER with a pinned search_path.
  - The deployed predicate contains the CLAIMED rule.
  - 0 rows.
- **Evidence:** `worldk-m14b4/preview-{pre-044,post-044,audit044}.json`.

## 6. Deployed Preview probes (Platform-only: no bypass, no WorldK, no real session)
The raw output is in `worldk-m14b4/preview-deployed-probes.txt`.

| Probe | Result |
|---|---|
| attach: no bearer / malformed bearer | 401 / 401 |
| **attach: well-formed forged credential + valid body** | **401 `RUNTIME_UNAUTHORIZED`**. If 044 were missing, the undefined function would map to `PERMISSION_DENIED`, which is 403, so the 401 is consistent with 044's `world_m14_authenticate_runtime` rejecting the credential. This is inferred from the status mapping; no DB log was read. |
| attach: bad digest / extra field (e.g. `instanceId`) | 400 / 400 |
| unknown op `stream_attach` | 401 (host gate: not a self-authenticating path) |
| Stub relay path `/world-entry/stream/attach` | 401 host gate: **not deployed** (Q8) |
| B3: issue with forged session / `Origin: null` / stream page no cookie / session page no cookie | 403 / 403 / 404 / 404 (unchanged) |
| Production `next.avatark.ai` attach / stream page | 404 / 404, still `dpl_FdYo…` |

After deploy and probes: **0 attachments, 0 capabilities, lifecycle digest unchanged** (`preview-post-probe-044.json`).

## 7. Regression
| Suite | Result |
|---|---|
| **`pnpm test` (full, disposable DB)** | **1972 pass / 0 fail / 4 skipped of 1976.** The skips are the optional PostgREST stack and 3 A5 pg_cron tests that need a cron DB. |
| A5 with pg_cron | 7/7 |
| `pnpm test:browser` (A3 Leave + B3 + B4) | 6/6 |
| B3 re-cert on 043+044 (unit + real DB + browser) | 23/23 |
| B1/B2: `protocol`, `bridge`, `runtimeBridgeSdk`, `referenceRuntimeEquivalence` | 23/23. The B1 files are byte-identical. |
| tsc / eslint / `next build` | clean |
| Secret scan (staged) / plaintext scan (evidence, full-test log, Postgres server logs) | 0 / 0 hits |

## 8. Diff (`ad45089`, 16 files, +1405/−9)
- **New:**
  - `044_world_stream_attachment_authority.sql`
  - `lib/worldEntry/stubAttachmentRelay.ts`
  - `streamAttachment{.test,.postgres.test,.browser.test}.ts`
  - `docs/evidence/worldk-m14b4/{postgres-proofs,browser-proof}.json`
- **Modified:**
  - `runtimeIngress.ts`
  - `authorityDb.ts`
  - `referenceRuntime.ts`
  - `machineIngress.ts`: one regex alternative
  - `packages/runtime-bridge/src/bridge.ts`: B2, additive
  - `run-platform-migrations.js`
  - `package.json`
  - the two B3 real-DB test files: apply 044, plus the N1 and N12 scoping changes described in §3
- **Untouched:**
  - 040–043 SQL
  - B3 handlers and routes (`streamCapability.ts`, `app/world-entry/**`)
  - `gateway.ts`
  - the B1 `protocol.ts`, spec, schemas and fixtures
  - WorldK

## 9. Ownership after B4
| Role | What it owns |
|---|---|
| Platform | Placement (040, unchanged), the stream capability (043) and the **attachment** record (044): which instance verified which authorization for which session, and when. |
| Allocated renderer | Presents the digest with its credential. It learns nothing about the visitor beyond its existing claim binding. |
| Browser | Opaque capability → authorization → `ATTACHED`, and never any infrastructure identity. |
| Signalling / topology | Unchosen (stub only). |

## 10. Scope, limits and open items
- **Positive path not run on the deployment.** An attach on Preview needs a claimed session, which needs a WorldK-issued entry (machine key plus visitor), plus a registered runtime credential. It is certified locally with the production handler code, as in B3. The deployment proves the op exists, the host gate, validation, uniform auth refusal, the 044 grants and state isolation.
- **The route function exists only for the stub relay.** A real signalling layer's routing is a Q8/B5+ decision; it may replace it.
- **One attachment per session.** Re-attaching media within a session (renegotiation) needs a new session through re-entry, consistent with B1 ("never revive a DROPPED session"). A renegotiation model, if wanted, is an owner decision.
- **Retention:** no purge of expired capability or attachment rows (open since B3).
- **Test harness caveat:** concurrent real-DB suites share a cluster-wide role, and their `ALTER ROLE` in `before()` can race. This is pre-existing M14 test-harness behaviour. The full sequential/parallel `pnpm test` passed.
- **This report commit is local, not pushed** (a push would redeploy Preview).

## 11. STOP
No Pixel Streaming, WebRTC, TURN/STUN, signalling infrastructure, Unreal, GPU scheduler, autoscaling, process spawning, dynamic capacity, Visit migration, WorldK change, Production change, GCP L4 or B5.

```
M14B4_RENDERER_ATTACHMENT_AUTHORITY_CERTIFIED
```
