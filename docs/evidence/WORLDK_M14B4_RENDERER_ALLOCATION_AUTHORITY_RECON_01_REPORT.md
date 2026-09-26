# WORLDK-M14-B4 — Renderer Allocation Authority & Signalling Attachment Contract — Reconnaissance

**Date:** 2026-09-26 · **Mode:** READ-ONLY reconnaissance. Nothing was implemented, no migration was created, and no GPU, Unreal or GCP resource was touched.

**Lineage:**
- B1 `752035c`, B2 `b5cc866` and B3 `0efb04c` are **frozen**.
- The B3 report was published as `ea8b528`, which Preview deployed as `dpl_Du7qgU6mfUU8ctzuvra1DdPAdRPM` (docs only).

**Classification:** `M14B4_RENDERER_ALLOCATION_RECON_COMPLETE`

**Phase 1 (B3 freeze/publication):**
- The `0efb04c..ea8b528` diff touches only `docs/`.
- Preview rebuilt, and `platform-preview.avatark.ai` now points to `ea8b528`.
- The post-publication probes match the certified B3 behavior exactly:
  - The stream page without a cookie returns 404.
  - `Origin: null` returns 403.
  - A forged session reaching the live 043 function returns 403, not 503.
  - The session page returns 404, unauthenticated runtime poll returns 401, and the public projection without the key returns 401.
  - The Production host returns 404.
- Production is still `dpl_FdYo7Sr2mq9322hgQkzqtvwa18kW`.

---

## 0. Headline findings
1. **The Platform already performs renderer placement.**
   - `world_entry_resolve` (040) binds each Visit to one registered runtime instance at ENTER time, before the browser reaches the gateway.
   - B1 defines that instance as "a renderer runtime". So "renderer allocation" is not greenfield.
   - What B4 lacks is the **attachment**: proof, verified by the *allocated* renderer and nobody else, that the browser presenting a stream is the session the Platform placed there.
2. **There is a lineage conflict to resolve before B4 (owner decision, §7 Q1).**
   - B1 maps `STREAM_JOINED` to `arrival`, which makes the session IN_WORLD. M14 recon Q10 agrees: "reports arrival when the visitor's stream session joins".
   - B3 issues a stream capability **only for an IN_WORLD session**.
   - With a real media stream the chain is circular: media needs the capability, the capability needs IN_WORLD, and IN_WORLD needs media.
   - It is hidden today only because the reference runtime auto-joins without any stream.
   - This is not a B3 code defect; each piece is internally correct. It is a cross-gate semantic inconsistency, so per the freeze rule I am reporting it rather than changing anything.
3. **Nothing forces 1 visitor = 1 Unreal process.**
   - Capacity is per instance, 1–64 (DB default 1; registry script default 4).
   - Bridge events are keyed per `sessionId`.
   - The only pressure toward per-visitor processes is the stock Pixel Streaming examples and the DB default `capacity = 1`.
4. **No infrastructure exists in this area yet.** There is no signalling server, no matchmaker, broker or GPU scheduler, no Pixel Streaming, WebRTC or TURN code, and no L4 script anywhere in `~/workspace` or `~/dt4m-os`. Topology is genuinely unfrozen.

---

## 1. Discovered existing machinery

### 1.1 Real code
| Machinery | Where | What it actually is |
|---|---|---|
| Runtime registry | 040 `world_runtime_instances` | World-scoped instance with `capacity` 1–64, `readiness` OFFLINE/STARTING/READY, `last_seen_at`, and `status` ACTIVE/REVOKED. Registered by an operator (`world_runtime_register_instance`, owner only). **Renderer-neutral and GPU-agnostic.** |
| Runtime credentials | 040 `world_runtime_credentials` | A hashed per-instance secret, TTL ≤ 7 days, revocable. Verified inside every ingress call. |
| **Allocator** | 040 `world_entry_resolve` (allocation block around :783–812) | Picks the first ACTIVE + READY + live (≤ 30 s) + credentialed instance with `live allocations < capacity`, ordered by `registered_at`, `FOR UPDATE`. Otherwise it returns AT_CAPACITY (30 s), PREPARING (5 s) or RUNTIME_UNAVAILABLE. |
| Allocation | 040 `world_runtime_allocations` | **One per Visit** (`visit_id UNIQUE`). States: `ALLOCATED` (created at ENTER), then `ACTIVE` (set at first ARRIVAL, :1064), then `RELEASED` with a reason: ABANDONED, RUNTIME_DEPARTURE, PRESENCE_TIMEOUT, INSTANCE_REVOKED or VISIT_CLOSED_EXTERNALLY. Reconnects reuse it. |
| Ticket → session | 040 tickets, `world_entry_redeem_ticket` | A single-use ticket creates a **RuntimeSession** bound to (allocation, instance, subject, visit). A reconnect supersedes the previous live session, so there is one live session per visit. |
| Session ↔ instance binding | 040 `world_m14_runtime_session` | Every ingress call re-checks `session.instance_id = caller instance` and that the allocation is on that instance; otherwise it raises `SESSION_NOT_BOUND`. **This already prevents renderer substitution for lifecycle evidence.** |
| Work queue | 040 `world_runtime_poll` | A renderer sees only live sessions on its own instance. |
| Presence and expiry | 040 presence, `world_presence_sweep`; A5 041 pg_cron job | The sweep closes a visit when evidence stops for longer than grace (120 s). It records PRESENCE_TIMEOUT and releases the allocation. |
| Liveness view | 042 `world_runtime_instance_liveness` | A derived effective_state plus `active_allocations/capacity`. Read-only. |
| Bridge protocol / SDK | B1/B2 `packages/runtime-bridge` | Renderer facts map to ingress operations. `STREAM_JOINED` maps to arrival; `STREAM_LOST` maps to disconnect (grace, never departure). The bridge "is never an authority". There are no network, credential, signalling or GPU paths. |
| Stream capability | B3 043 and `/world-entry/stream*` | IN_WORLD session → 60 s single-use capability → stub AUTHORIZED. `authorization_sha256` is stored and **inert**. |
| Consumer boundary | `world-consumer-contracts/src/forbiddenFields.ts:15-16`; WorldK `audit-boundary.mjs` | The consumer boundary bans `runtimeInstanceId`, `gpu`, `machine`, `region`, `server`, `renderer`, `unrealProcess`, `podId` and `ipAddress` from consumer payloads. |
| UnrealCommand translator | `world-embodiment-contracts` / `-runtime` (about 24 worktrees) | Headless snapshot/delta → 11-op command translation. No transport. **Snapshots are per visitor** (`getEmbodimentSnapshotForVisitor`, `hostService.ts:113`). |
| WorldLease | `world-persistence-contracts/src/lease.ts` (in memory; the 026 table is NOT applied) | **One simulation owner per world.** This is world-simulation ownership, not rendering. |

### 1.2 Docs and specs only (no code)
- **Unreal 5.8 contract pack** (`feature/studiok-unreal-integration-contract-pack` @ 8012814):
  - Transport is poll-based HTTP.
  - A bridge is configured with one `worldInstanceId` and addresses visitors by `userId`.
  - It does not decide shared vs per-visitor, and has no Pixel Streaming or allocation.
- **Build 05 GPU handoff** (@ 643fda7): describes a single future Windows/NVIDIA RTX **authoring workstation** (not provisioned). Push transport and multi-client sync are flagged as new scope.
- **Build 06 PCG** (@ af361b5): "no L4/G2-specific behavior gets encoded into world architecture".
- **Build 02 architecture** (lines 1137–1141): "Unreal-side multiplayer (if ever needed) is Unreal's own concern between multiple LOCAL clients of one Unreal server process … out of scope". This is the only explicit multi-user rendering statement found.
- **M14 recon:**
  - Q9: allocation lives in the Platform, with the fleet behind an allocator port.
  - Q10: "Unreal + Pixel Streaming signalling = one runtime instance behind the allocator".
  - D5: signalling placement behind the Platform gateway was proposed but is **still undecided**.
- **M14-B recon:** GCP L4 is PARKED. Remaining blockers are D5, TURN (likely billed) and the certification world (living-forest vs living-vrindavan).
- **dt4m-os NVIDIA/Warp:** absent. It would be world-*simulation* compute (Warp, hydrology) anyway, which is unrelated to rendering.
- **`living-symphony` Unreal skeleton:** interface headers only, no commits, no networking. Unrelated.
- **"stream" keyword noise:** `streamHandoff.ts`, StreamK, CinemaK and dt4m streamk-publication are **content products**, not media streaming.

---

## 2. Answers to reconnaissance questions 1–17

1. **Renderer/allocation concepts that exist:**
   - The M14-A instance, allocation, session and credential model.
   - B1's renderer facts.
   - B3's capability.
   - The per-visitor embodiment snapshot.
   - WorldLease (simulation).
   - Nothing GPU-, process- or signalling-specific.
2. **M14-A allocation machinery:** an allocation is **a capacity seat for one Visit on one registered runtime instance**, chosen by the Platform at ENTER. The seat is held for the whole Visit, including reconnects within grace.
3. **What `world_runtime_allocations` represents:** a *logical runtime placement* that B1 also treats as the renderer placement. The instance is "whatever hosts the visitor's session and evidences presence". In M15 that would be the Unreal host.
   - It is **not** GPU allocation.
   - It is **not** world simulation (that is WorldLease).
   - It conflates "presence-evidencing session host" with "renderer". B4 should decide whether to keep that conflation (§5 B).
4. **Authority that creates and releases allocations:**
   - **Create:** only `world_entry_resolve`, under the Platform credential.
   - **Release:**
     - `world_m14_close_visit`, for departure, timeout and external close.
     - `world_m14_release_abandoned`, called from resolve and from the sweep.
     - `world_runtime_revoke_instance`, which releases only `ALLOCATED` seats. `ACTIVE` seats on a revoked instance drain via PRESENCE_TIMEOUT once heartbeats stop, because the credential is revoked.
   - Renderers never create or release; they only evidence.
5. **Capacity semantics:**
   - The operator declares a static integer per instance (1–64).
   - Occupancy = non-RELEASED allocations.
   - No dynamic capacity, no weights, no GPU/VRAM notion, no queue.
   - AT_CAPACITY is reported to WorldK as retryable.
6. **Session-to-instance binding:**
   - A RuntimeSession carries `instance_id` from its allocation at redemption.
   - Ingress enforces the binding (`SESSION_NOT_BOUND`).
   - A reconnect gets a new session on the **same** instance (sticky).
7. **When an instance goes stale or unavailable:**
   - **New entries** skip it (liveness 30 s, 042 shows STALE).
   - **An open Visit on it:**
     - A reconnect is refused with RUNTIME_UNAVAILABLE and `retryAfter` = time to grace end.
     - The visit then closes by PRESENCE_TIMEOUT (A5 cron). After that, re-entry is a new Visit (RETURNING) on another instance.
   - **There is no live migration** of a Visit between instances.
8. **NVIDIA/Unreal/Pixel Streaming work elsewhere:** docs only (contract pack, Build 02/05/06, Fab readiness), the headless translator and an empty Unreal skeleton. No Pixel Streaming.
9. **Signalling server:** none. Only the B3 stub authorization endpoint.
10. **Renderer/session broker:** none beyond the Postgres allocator (effectively a first-fit session broker without provisioning).
11. **GPU scheduler/provider abstraction:** none.
12. **Prior NVIDIA/Warp/GPU work:**
    - Relevant: the Build 05/06 workstation guidance (dev hardware, "not a target spec") and the per-visitor snapshot model.
    - Unrelated: Warp/hydrology simulation providers (absent anyway), StreamK/CinemaK content "streams", and the dt4m publication transport.
13. **Assumptions that would accidentally force 1 Unreal process per visitor:**
    - Copying the stock Pixel Streaming matchmaker model (one streamer = one process = one player).
    - Keeping `capacity DEFAULT 1` as the operating assumption.
    - Treating the RuntimeSession or the Visit as the process lifetime (spawn on ENTER, kill on LEAVE).
    - Putting world simulation inside the renderer process, which forces one world copy per process.
    - Making the attachment token carry a process address.
    - Tying WebRTC session lifetime to the Visit (a STREAM_LOST would then have to end the Visit, which B1 already forbids).
14. **What can be multiplexed safely:**
    - Many Visits per render node (already modeled).
    - One authoritative world simulation shared by many renderers (WorldLease plus the snapshot/delta contract).
    - Signalling (one signalling service for many streams).
    - TURN (shared relay).
    - GPU hardware (N render processes or N viewports per GPU; an M15 measurement question).
    - Warm pools of render processes that are not bound to a visitor.
15. **Required isolation between visitors:**
    - **Identity/session:** one visitor's stream, input channel and view must never attach to another's session. Enforced at the Platform (binding) and at the renderer (attachment verification).
    - **Input:** interaction intents are per session and validated by the Platform (InteractionIntent firewall), never trusted from the renderer.
    - **View/privacy:** per-visitor snapshot fields (visitor memory, return recognition) must render only into that visitor's stream.
    - **Fault domain:** one visitor's renderer crash must not end others' Visits. Shared-process designs weaken this.
    - **Resource:** fair share on shared GPUs (M15).
16. **State ownership:** see §3.
17. **What B4 owns and does not own:** see §6.

---

## 3. Authoritative ownership map
| State | Owner | Durable? | Notes |
|---|---|---|---|
| Visitor identity, subject | Platform (Supabase auth) | yes | Never chosen by the browser, the renderer or WorldK. |
| Visit, lifecycle events, continuity | Platform (039/040) | yes | Renderer facts are evidence only. |
| Entry resolution, allocation (visit → instance seat), tickets, RuntimeSessions, presence | Platform (040) | yes | The Platform decides placement. |
| Stream capability, authorization hash (B3) | Platform (043) | yes | Hash only. |
| **Attachment record** (authorization → the allocated renderer accepted the stream) | **Platform (B4, proposed)** | yes (hash plus timestamps) | Proof that the right renderer verified the right session. |
| Instance registry, capacity, readiness, liveness | Platform (declared) plus renderer (advertised readiness) | yes | Capacity is *declared*, not measured, by the Platform. |
| Placement *policy* inputs (load, region, GPU class) | Renderer allocator / fleet (future) | no | Advertised to the Platform as opaque capacity. |
| Process / GPU / VM identity, PIDs, ports, IPs, streamer ids | Renderer allocator / fleet | **never in the Platform** | Forbidden at the consumer boundary. |
| WebRTC peer state, SDP/ICE, TURN credentials | Signalling layer | no (ephemeral) | Never durable, never shown as infrastructure identity. |
| Rendered frames, camera, local interpolation | Unreal runtime | no | Presentation only; never world truth. |
| World simulation state | World simulation owner (WorldLease / persistence) | yes | Not M14. Shared across visitors. |
| Projections, UI, "enter" intent | WorldK | no (reads the Platform) | Never sees runtime or renderer identifiers. |

---

## 4. Gaps
1. **The lineage conflict:** IN_WORLD before media (B3) vs arrival at media join (B1, M14 Q10). See Q1.
2. **No attachment step:**
   - `authorization_sha256` is inert.
   - No renderer ever learns which stream to accept.
   - No proof ties a media connection to the allocated instance.
3. **No capacity reporting from the fleet:** capacity is static and operator-declared, with no dynamic or advertised headroom.
4. **No placement policy beyond first-fit** by `registered_at` (no region, load, GPU class or warm/cold distinction).
5. **No Visit migration** between instances (sticky allocation; a dead instance means timeout, then a new Visit).
6. **`revoke_instance` does not release ACTIVE seats** (they drain by timeout, up to 120 s). This is a deliberate but undocumented consequence.
7. **No attachment timeout concept:** B3's `consumed_at` exists, but nothing says how long an AUTHORIZED result remains attachable.
8. **D5 is undecided:** where signalling lives, whether it sits behind the Platform origin, and the TURN provider.
9. **The certification world is undecided for M15:** living-forest (runtime) vs living-vrindavan (Unreal pack).
10. **Process vs session lifetime is not specified anywhere.** Nothing states that a render process outlives Visits.

---

## 5. Architecture alternatives and tradeoffs

### A. Renderer allocation authority: where it lives
| Option | Description | Pros | Cons |
|---|---|---|---|
| **A1 Platform DB allocator (status quo, extended)** | `world_entry_resolve` keeps choosing an instance seat. B4 adds attachment. | Already certified; one choke point; the browser never chooses; atomic with lifecycle. | Placement policy lives in SQL; weak for rich fleet signals. |
| A2 Separate renderer broker behind an allocator port | The Platform asks the broker for a seat; the broker returns an opaque `placementRef`; the Platform records and binds it. | Rich placement; fleet-owned autoscaling; GPU knowledge stays out of the Platform. | A new service and trust boundary. The broker becomes a partial authority that must not be able to bind sessions itself. |
| A3 Renderer self-selection (pull) | Renderers claim from a world-wide queue. | Simple scaling. | Loses Platform placement authority and weakens substitution protection. **Not recommended.** |

**Recommendation:** A1 now. Define the **allocator port** so A2 can later *propose* a seat while the Platform still *binds* it (authority = binding, not placement heuristics).

### B. Allocation granularity
| Option | Model | Isolation | Cost / scale | Fit for persistent living worlds |
|---|---|---|---|---|
| B-1 Dedicated process per visitor (stock Pixel Streaming matchmaker) | instance capacity = 1, spawned per Visit | strongest | worst: cold start, GPU per visitor | poor (world copy per process, unless it is a thin client) |
| B-2 Warm pool, seat per RuntimeSession | pre-started renderers, capacity = 1, returned to the pool after the Visit | strong | better: no cold start, but still 1 render per visitor | ok |
| **B-3 Shared world simulation + per-visitor render clients** | one authoritative simulation (WorldLease) → N render workers, each hosting 1..k visitor viewports/streams | good (process per worker; k visitors per worker share a fault domain) | good: GPU multiplexing; process lifetime ≠ Visit | **best:** the world lives without visitors, and renderers are views |
| B-4 Single process, many streams | one Unreal process renders every visitor's viewport | weakest | best density, worst fault domain | risky |

**Key point:** the existing model (instance with capacity N, a seat per Visit) already expresses B-1 through B-4 by choosing `capacity` and the meaning of "instance". **B4 should stay granularity-neutral.** Its contract should talk about *seats on render instances*, never processes. The real choice is an M15 measurement and owner decision. The recommended *direction* is B-3.

### C. Capacity model
| Option | Description | Tradeoff |
|---|---|---|
| **C1 Declared static capacity** (status quo) | The operator sets `capacity`. | Simple and certified; stale under real load. |
| C2 Advertised headroom | The renderer reports `availableSeats` (an opaque integer) on poll. The Platform caps occupancy at min(declared, advertised). | The Platform learns *how many*, never *why* (GPU, VRAM). A small additive ingress field. |
| C3 Broker-owned capacity | The Platform asks the broker (A2). | Needs A2. |

**Recommendation:** C1 in B4. Offer C2 as an optional additive (poll field → occupancy cap) only if the owner wants it now. The Platform never stores GPU facts.

### D. Attachment token: connecting B3 AUTHORIZED to the allocated renderer
| Option | Flow | Pros | Cons |
|---|---|---|---|
| **D1 Renderer verifies the B3 authorization at Platform ingress** | Browser holds `authorization` → signalling (future) → the allocated renderer receives it with the stream offer → the renderer calls a new ingress op `stream_attach(credential, sessionId, sha256(authorization))` → the Platform checks four things: authorization consumed for **that** session; the session is bound to the **caller's** instance; within the attach window; not attached before. It records an attachment. | Uses B3's inert hash exactly as designed, **without altering B3**. Renderer substitution is impossible (only the allocated instance's credential can attach). Single use. No new key material. | The renderer sees a bearer value (short-lived, single-use, useless after attach). Needs an attach-window rule. |
| D2 Platform-signed attachment ticket (JWT/HMAC) | On AUTHORIZED, the Platform mints a signed token with {sessionRef, instanceRef, exp}; signalling or renderer verify it offline. | No Platform round-trip in the media path. | New signing keys, rotation and revocation. The token names an instance reference (disclosure risk). Harder single-use enforcement. |
| D3 Platform-pushed expectation | The renderer's poll lists "expect stream for session S, hash H"; the renderer compares locally. | No new ingress op. | Leaks the hash into poll payloads, and single use is enforced at the renderer rather than the Platform. |

**Recommendation:** D1. The browser never learns the renderer; the renderer never learns the subject beyond its existing claim binding; the Platform records *which instance attached*.

### E. Failure and recovery (reuse existing semantics; add only the attach rules)
| Event | Existing behavior | B4 addition |
|---|---|---|
| Renderer crash | Heartbeats stop, grace, PRESENCE_TIMEOUT (A5), allocation released | Attachment becomes moot (the session ended). |
| Signalling / WebRTC loss | STREAM_LOST, disconnect, GRACE_RUNNING (B1) | None. A re-attach requires re-entry. |
| Visitor reconnect within grace | Re-ENTER gives a new ticket and a new session on the **same** instance (D7) | A new B3 capability, a new AUTHORIZED result and a new attach. An old authorization can never attach to the new session (binding). |
| Allocation timeout (never redeemed) | `release_abandoned` | None. |
| Authorized but never attached | none | The attach window expires (proposal: 60 s after `consumed_at`). The session stays as it is; the browser may request a new capability (≤ 5 outstanding). |
| Instance revoked | ALLOCATED seats released; ACTIVE ones drain by timeout | Attach refused (credential revoked). The owner may decide whether revoke should also close ACTIVE seats (gap 6). |

### F. Persistence
- **Durable Platform authority:** allocation (visit → instance), session, capability hash, **attachment** (authorization hash, session, instance, attached_at). Attachment could be a new table referencing the B3 capability, which leaves B3's table untouched.
- **Ephemeral infrastructure:** process/GPU identity, streamer ids, ports, SDP/ICE, TURN credentials, frame state. These are never persisted by the Platform and never reach WorldK or the browser.

### G. Security
- **Capability replay:** B3 single-use plus D1 single attach, each within a short window.
- **Renderer substitution:** attach is accepted only from the credential of the instance the session is bound to (the same rule as `SESSION_NOT_BOUND`).
- **Session stealing:** the authorization is bound to session, subject and world (B3). A stolen authorization is useless once attached, and useless to any other renderer.
- **Infrastructure disclosure:**
  - The browser receives only opaque values.
  - The signalling endpoint must be on a Platform-controlled origin, or be proxied (D5); otherwise its hostname is itself disclosure.
  - forbiddenFields and the WorldK boundary audit are extended to attachment payloads.
- **Renderer trust:** attach success is **not** arrival. Arrival stays a separate runtime fact under B1 rules.

### H. Scale: avoiding "1 visitor = 1 permanently running Unreal process"
- Allocation = **seat**, not process. Capacity N per instance.
- **Renderer lifetime is decoupled from Visit lifetime:** instances register, poll READY and serve many sequential and concurrent Visits.
- World simulation is decoupled (WorldLease/persistence): the world lives with zero renderers.
- Warm pools and scale-to-zero are fleet concerns behind the port (A2 later). The Platform only sees seats and readiness.

---

## 6. Recommended smallest B4 scope (GPU-independent, like B3)
**B4 owns:**
1. The owner's resolution of **Q1** (the IN_WORLD vs media circularity), with the minimal lineage change the owner approves.
2. **Attachment authority (D1):**
   - A Preview-only migration (044, number to be confirmed free at the time): `world_stream_attachments` holding the authorization hash (FK/lookup into the 043 row, **043 unchanged**), session, instance, attached_at and window.
   - One SECURITY DEFINER ingress function `world_runtime_stream_attach(credential, secret, session_id, authorization_sha256)`, under the existing Platform gate, with runtime credential verification and a single attach.
3. A **Runtime Ingress op** `attach` (Platform route) plus the B2 SDK/reference-runtime handling. Whether the bridge protocol gains a new event for this is Q4. Note that B1 v1 §7 rejects unknown event *kinds* even at a newer MINOR, so a new event is not transparently compatible with v1.0 bridges.
4. **Stub signalling relay:** the Preview stub hands the browser's authorization to the *allocated* reference runtime in-process or over ingress, with no media. The proof: only the allocated renderer can attach, exactly once, within the window.
5. An explicit written contract: **allocation = a seat on a render-capable runtime instance; placement stays in `world_entry_resolve`; the browser never selects.**

**B4 does not own:**
- GPU/VM provisioning, autoscaling, warm pools, process spawning.
- Placement policy beyond the current first-fit.
- Signalling transport, WebRTC/SDP/ICE, TURN/STUN.
- Pixel Streaming, Unreal.
- World simulation / WorldLease, Visit migration.
- WorldK changes, Production.
- Topology freeze, cloud GPU selection.

---

## 7. Questions requiring owner decision
1. **Q1 Arrival vs media (blocking).** Choose one:
   - **(a) Arrival = media joined** (B1 and M14 Q10 as written). B3's issuance prerequisite widens from IN_WORLD to "CLAIMED by the allocated renderer and not ended", so initial media can precede arrival. This is a narrow B3 change and needs the freeze lifted for that predicate only.
     - *Recommended:* it keeps "arrival = the visitor is actually present" and never opens a Visit that never received media.
   - **(b) Arrival = logical admission before media.** B1's `STREAM_JOINED` is reinterpreted as "admitted to the world session", and media attaches after IN_WORLD. B3 stays untouched.
     - Cost: Visits can open and count without the visitor ever seeing the world.
2. **Q2 Attachment mechanism:** approve D1 (renderer-verified B3 authorization at ingress) vs D2 (signed token) vs D3.
3. **Q3 Attach window:** how long AUTHORIZED stays attachable. Proposal: 60 s after `consumed_at`.
4. **Q4 B1 evolution:** B1 v1 §7 accepts newer MINOR versions but **still rejects unknown event kinds**. So adding `STREAM_ATTACH_REQUESTED` needs either a v2 MAJOR (RESYNC for old bridges) or a v1.1 whose receivers are all upgraded together. The alternative, *recommended* because it leaves frozen B1 untouched, is to keep attach as an ingress call made by the bridge host outside the RendererEvent vocabulary.
5. **Q5 Granularity stance:** confirm B4 stays granularity-neutral (seat on an instance), with the *direction* B-3 (shared simulation + render workers) recorded but not frozen.
6. **Q6 Capacity:** C1 only, or add C2 (advertised headroom, opaque integer) now.
7. **Q7 Revoke semantics:** should `revoke_instance` also close ACTIVE seats immediately (explicit departure kind), or keep drain-by-timeout?
8. **Q8 D5:** is the signalling endpoint required to be on the Platform origin (or proxied)? B4 can stay stub-only without deciding, but the attachment contract assumes the browser never sees a renderer host.
9. **Q9 Certification world** for B4 proof: living-forest (recommended, continuous with A/B1–B3).

---

## 8. Proposed B4 certification gates
1. Q1 is decided, and any B3 change is limited to the approved predicate. B1/B2 equivalence and fixtures still pass (a v1.1 fixture is added if Q4 = v1.1).
2. The 044 slot is confirmed free. The migration is Preview-only (the runner refuses other targets). Default grants are revoked (the 038 lesson). EXECUTE goes only to the Platform authority role. RLS is on with no policies. Hash only.
3. **Positive:** IN_WORLD (or the Q1 predicate) → capability → AUTHORIZED → the allocated renderer attaches once → attachment recorded (hash, instance, time). No lifecycle, continuity or world-state mutation (digest equality).
4. **Negatives:**
   - attach by a non-allocated instance: refused
   - attach with a revoked or expired credential: refused
   - a second attach: refused
   - concurrent attach: exactly one succeeds (held lock + race)
   - attach after the window: refused
   - attach for an ended, departed or superseded session: refused
   - an authorization from another session or subject: refused
   - a B3 capability (not an authorization) presented as an authorization: refused
   - attach material used against the lifecycle ops: refused
5. **Disclosure:** no response to the browser or WorldK contains instance, process, GPU, host or port data. forbiddenFields and the WorldK audit extended. A plaintext scan of the DB, logs and evidence finds 0 hits.
6. **Separation:** attach success is not arrival. `STREAM_LOST` after attach still means grace, never departure.
7. **Browser:** a real-Chromium stub flow proves the browser never learns which renderer attached, and cross-site attempts are refused.
8. **Regression:** the full suite and M14 A/B1–B3 suites pass. Preview deploy is healthy. Production is untouched. No GPU, Unreal or TURN.

---

## 9. STOP
Recon only. No B4 implementation, no migration, no Pixel Streaming, no Unreal, no GCP L4, no GPU, no WorldK change, no Production change, no topology freeze, no cloud GPU selection, no B5. This report is committed locally in the Platform repo (a push would redeploy Preview; publication is at the owner's discretion).

```
M14B4_RENDERER_ALLOCATION_RECON_COMPLETE
```
