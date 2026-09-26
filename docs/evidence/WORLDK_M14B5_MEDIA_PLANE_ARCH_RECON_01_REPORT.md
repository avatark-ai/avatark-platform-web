# WORLDK-M14-B5 — Pixel Streaming / Signalling / Renderer Media Plane — Architecture Reconnaissance

**Date:** 2026-09-26
**Mode:** READ-ONLY reconnaissance. Nothing was implemented or installed; no GPU, GCP L4, TURN, WorldK, Production or migration was touched.

**Lineage (frozen):**
- B1 `752035c`, B2 `b5cc866`
- B3 `0efb04c`, as amended by 044
- B4 `ad45089` (044)
- The B4 report `1029cee` was published as docs only. Preview `dpl_DjDAkzBTgHQA6x3fjkeKj9cZmQTG` is READY, and its probes are unchanged: attach without a bearer returns 401, and a forged session on issue returns 403.

**Classification:** `M14B5_MEDIA_PLANE_ARCH_RECON_COMPLETE`

**Provenance tags used throughout:**
- **[UP-V]** verified upstream behavior, with a URL. All URLs were accessed 2026-09-26; the full list is in §17.
- **[UP-I]** inferred from upstream, not directly quoted.
- **[SK]** existing StudioK/AvatarK implementation or docs.
- **[PROP]** a proposal in this report.

The three load-bearing upstream claims were re-verified by hand against the primary source:
- stream-sharing removal
- the JSStreamer mock
- NVENC session limits

The canonical chain (owner-frozen) is:

```
ENTER → allocation → RuntimeSession → CLAIM → stream capability → AUTHORIZED → ATTACH
      → [B5/M15: media establishment] → STREAM_JOINED → ARRIVAL → IN_WORLD
```

---

## 0. Headline findings
1. **UE 5.8 is current, and Pixel Streaming 2 (PS2) is the direction of travel.** Both plugins ship in 5.8. The UE5.8 branch of PixelStreamingInfrastructure is "Current", 5.7 is supported, and 5.6 is end-of-life. [UP-V]
2. **One encoder session per viewing peer.** PS2 removed "stream sharing": *"the better solution is to run an encoding session per peer (the new default) or use an SFU"* [UP-V, migration guide]. So N visitor streams need N NVENC sessions.
   - **RTX 5080: 2 NVENC engines, max 12 concurrent sessions. L4: 2 engines, unrestricted** [UP-V, NVIDIA matrix].
   - Past the hardware session limit, UE falls back to software encoding and raises `OnFallbackToSoftwareEncoding` [UP-V].
3. **"Connected" is not "media joined".**
   - Epic's frontend `webRtcConnected` fires on ICE `connected/completed` only [UP-V, code].
   - Epic's own tests prove media with inbound `framesReceived` [UP-V].
   - **UE cannot observe browser decoding** [UP-I]. The browser must report first decoded frame back, for example over the data channel.
   - So STREAM_JOINED must be a *composite, renderer-observed* fact (§8).
4. **Signalling cannot live in the Platform's Vercel/Next app.** It needs long-lived WebSockets, and the Preview Platform is serverless [UP-I; well-known Vercel constraint]. Signalling is necessarily a separate, long-running service. Where it runs is D5, still undecided.
5. **WebRTC inherently discloses the media endpoint's IP through ICE candidates**, unless the browser is forced to relay-only through TURN [UP-I; standard ICE]. This collides with the "browser never learns renderer infrastructure identity" invariant. It needs an explicit owner decision (§11, Q3).
6. **A GPU-free, real-WebRTC control-plane proof is supported upstream.**
   - `Extras/JSStreamer` is *"a mock of Unreal Engine Pixel Streaming for testing … in CI without requiring UE"* [UP-V].
   - `Extras/FrontendTests` is a Playwright suite [UP-V].
   - With headless Chromium fake media, the whole attach → offer → media → STREAM_JOINED → ARRIVAL chain can be proven on this Cloud Workstation.
7. **Epic's signalling has the needed auth seams.**
   - The WebSocket `verifyClient` hook runs before `config` is sent [UP-V].
   - `peerOptionsProvider` gives per-connection options, and `--turn_secret/--turn_ttl` mints short-lived coturn credentials per player connection [UP-V; UE5.8 signalling 0.2.0].
   - The built-in `--player_token` is a shared token, confirmed on master only [UP-V]. It is **not** per-visitor auth, so StudioK must add its own.
8. **WRK-01 / RTX 5080 appears in no StudioK document** [SK]. Its OS, driver, reachability and status are unrecorded. The only StudioK GPU material is Build 05/06's generic "future Windows/NVIDIA workstation … not provisioned".
9. **World-state delivery is a separate, unbuilt dependency** [SK].
   - No runtime-credential snapshot read exists.
   - The living-forest `WorldExperienceSnapshot` has no host wiring.
   - `durableSnapshot.ts` is hardcoded to Living Vrindavan.
   - The living-forest runtime is fixture/in-memory only.
   - It is **not** needed to prove the media plane, but it **is** needed before the renderer shows the real world (§12).

---

## 1. Current Unreal / Pixel Streaming architecture (upstream)

**Plugins**
- UE 5.8 ships both Pixel Streaming and **Pixel Streaming 2 (PS2)** "to give users time to migrate". PS2 has an abstraction layer with no WebRTC types in its public API, and a built-in player. [UP-V: PS2 overview]
- 5.8's UE Remote app moved to PS2. [UP-V, release-notes excerpt]

**Encoders**
- NVENC/AMF hardware, with software fallback. Codecs: `-PixelStreamingEncoderCodec` = H264/AV1/VP8/VP9 [UP-V, reference].
- PS2 splits presets into QualityPreset/LatencyMode, and its default max bitrate is 40 Mb/s [UP-V, migration guide].

**Connecting UE to signalling**
- UE dials out as a WebSocket client: `-PixelStreamingURL=ws://…` (original plugin), and `-PixelStreamingSignallingURL` in PS2, which is required when IP/port are not set [UP-V, hand-verified].
- Headless: `-RenderOffscreen`. Also `-PixelStreamingWebRTCMinPort/MaxPort` [UP-V].

**Multiple streamers per process**
- PS2 signalling delegates carry a `StreamerId`, and there is a custom `IPixelStreaming2VideoProducer` [UP-V].
- Distinct per-visitor views mean one streamer per camera/render target, each costing its own scene render plus encode [UP-I]. The exact 5.8 C++ call for creating an extra streamer is not confirmed; this is an open gap.

**Streamer-side events (PS2)**
- `OnNewConnection`, `OnConnectionClosed`, `OnAllConnectionsClosed`, `OnStatChanged(playerId, stat, value)`, `OnDataTrackOpen/Close`, `OnConnectedToSignallingServer(StreamerId)`, `OnFallbackToSoftwareEncoding` [UP-V].

**Linux:** supported for encoding on specific GPUs. The infra repo ships bash and Docker scripts, including StreamerDocker [UP-V].

## 2. Epic infrastructure (PixelStreamingInfrastructure, UE5.8 branch)

**Components** [UP-V]:
- the Common protocol library
- the **Signalling library** (`@epicgames-ps/lib-pixelstreamingsignalling-ue5.8`, 0.2.0)
- the **SignallingWebServer "Wilbur"**
- the **Frontend** and Frontend-UI libraries (`lib-pixelstreamingfrontend-ue5.8` 0.1.2)
- the **SFU** (mediasoup), *experimental*
- the **Matchmaker**, *deprecated from 5.5*
- master is *experimental*

**Protocol** (JSON over WebSocket) [UP-V, Protocol.md]:
- **Streamer registration:** the streamer connects, the server sends `config{peerConnectionOptions}` and `identify`, the streamer answers `endpointId{id}`, and the server confirms with `endpointIdConfirm`.
- **Player connection:** the player connects, the server sends `config` and `playerCount`, the player sends `listStreamers`, the server answers `streamerList`, and the player sends `subscribe{streamerId}`.
- **Offer and answer:** after `subscribe`, the server sends `playerConnected{playerId}` to the streamer, and **the streamer sends the `offer`**. The player replies with `answer`, and both sides trade `iceCandidate`.
- **Other messages:** `playerDisconnected`, `disconnectPlayer`, `streamerDisconnected`, `ping/pong`, `stats`.
- **Capacity:** one server handles many streamers and players; `--max_players` limits players per streamer.

**Authentication** [UP-V, Security-Guidelines]:
- It *"intentionally ships no authentication beyond an optional shared token on the player port"*.
- It recommends a `verifyClient` check at WebSocket upgrade.
- The streamer port "should never be exposed directly to the internet".

**ICE/TURN distribution** [UP-V]:
- `--peer_options` goes to both peers inside `config`.
- `peerOptionsProvider` runs once per connecting peer.
- `--turn_secret/--turn_ttl` gives per-player time-limited credentials (coturn `use-auth-secret`); the streamer and SFU get config once.
- The frontend passes these into `RTCPeerConnection`, and `ForceTURN` sets `iceTransportPolicy='relay'`.

**Shipped TURN scripts** [UP-V, UE5.8 common.sh]:
- coturn via apt.
- They run `--no-tls --no-dtls`, so there is no TLS TURN.
- They use **hard-coded default credentials** (must never be used).
- The default STUN server is Google's public one.

## 3. Existing StudioK assets (what already exists)
| Asset | State |
|---|---|
| M14-A entry/allocation/ingress, A5 sweep, 042 liveness | Real, certified, Preview [SK] |
| B1 protocol (`STREAM_JOINED` → arrival, `STREAM_LOST` → disconnect/grace, never departure; InteractionIntent firewall) | Real, frozen [SK] |
| B2 SDK (`RuntimeBridge`, injected transport, `attach()`), reference runtime (`attachStream`, `--hold-join-until`) | Real, frozen [SK] |
| B3 capability (043 + 044 predicate), B4 attachment (044), `StubAttachmentRelay` (in-process only) | Real, certified, Preview [SK] |
| Unreal 5.8 contract pack: poll-only transport, per-visitor snapshot, `userId` identity, 11-op `UnrealCommand`, no `schemaVersion` | Docs/fixtures only [SK] |
| Build 05/06: future Windows/NVIDIA *authoring* workstation, "not a target spec" | Docs only [SK] |
| Pixel Streaming, signalling, WebRTC, TURN, GPU scheduler, Unreal project with networking | **None** [SK] |
| WRK-01 / RTX 5080 | **No record anywhere** [SK] |
| GCP L4 | "Owner, 2026-09-26: GCP_L4 = PARKED / DO NOT USE" (`worldk-web/docs/evidence/WORLDK_M14B_RECON_01_REPORT.md:20`) [SK] |

## 4. What a RuntimeInstance should correspond to
| Candidate | Fit with M14 |
|---|---|
| **Render-worker process hosting one RuntimeBridge** (a UE process, or a sidecar tightly coupled to one) | **Best fit.** One credential, one liveness (`poll`), one claim/presence stream and one failure domain per process. `capacity` = the concurrent visitor views/streams that process serves (≥ 1). [PROP] |
| Pixel Streaming streamer | Too fine. A streamer is a per-view/per-camera artefact inside a process. It maps to a *session*, not an instance. |
| Host/node | Too coarse. One host may run several processes, and a crash of one must not look like the whole node failing. Nodes are fleet inventory behind the allocator port. |
| Pool | A fleet concern (warm pools, autoscaling) outside the Platform. It surfaces only as more or fewer registered instances. |

**Recommendation [PROP]:**
- **RuntimeInstance = one render-worker process with its bridge.**
- **Seat (allocation) = one visitor view/stream on it.**
- The PS2 streamer id and the WebRTC peer are ephemeral, renderer-side, per-session state, never Platform state.
- This keeps Q5 granularity-neutral: capacity 1 = process-per-visitor; capacity N = multi-view.

## 5. Concurrency and resource models
All figures marked [UP-I] are engineering estimates to be measured in M15. They are not upstream numbers.

| Model | Isolation | GPU / encoder | VRAM | CPU | Density | Failure domain | Cold start | Persistent-world fit | M14 seats |
|---|---|---|---|---|---|---|---|---|---|
| **A** Process per visitor | strongest | 1 render + 1 NVENC session each | full world assets **per process** (several GB each [UP-I]); a 16 GB RTX 5080 fits only a few | full game thread per visitor | low | one visitor | slow (process + level load) unless pooled | poor: world copy per process unless it is a thin client of a shared simulation | capacity = 1 |
| **B** Warm process pool | strong | as A | as A, idle processes hold VRAM | idle cost | low–medium | one visitor | fast (pre-warmed) | as A | capacity = 1, with pool size = registered instances |
| **C** Render worker, multiple visitor views (one process, N cameras/streamers) | medium (shared process) | N scene renders + N NVENC sessions; **RTX 5080 hard cap 12 sessions**; L4 unrestricted but compute-bound | assets shared once, plus per-view render targets | one game thread shared | medium–high | all visitors on that process | per process, amortised | good: one world-state consumer per process | capacity = N |
| **D** Shared UE process, multiple streams of the **same** view (players share a streamer; or SFU) | weakest (same image) | 1 render; N encodes, or 1 encode + SFU simulcast | shared | low | high | all | per process | **invalid for per-visitor views**: per-visitor snapshot fields (memory, return recognition) would leak | not applicable for distinct visitors |
| **E** Shared authoritative simulation (UE dedicated server or Platform world runtime) + render-client workers (A/B/C as clients) | per worker | per worker as C or A | per worker | simulation separate | high | worker vs simulation separated | worker-level | **best** (B-3 direction): the world lives without renderers, and renderers are views | seats on workers |

**Conclusions [PROP]:**
- D is ruled out for distinct visitors (privacy of per-visitor views).
- A/B are the safe first M15 step; each visitor is one encode.
- C is the density path; the RTX 5080's 12-session cap bounds it on consumer hardware.
- E is the long-term direction and is compatible with every seat model.
- Nothing in B5 needs to choose. B5 proves the per-seat media control plane, which is identical under A, B, C and E.

## 6. Signalling topology alternatives (not frozen)
**Constraints:**
- Signalling needs long-lived WebSockets, so it is not the Vercel app.
- The browser must not choose a renderer.
- The Platform stays the authority.
- The streamer port is never public [UP-V].

| Option | Description | Pros | Cons |
|---|---|---|---|
| **T1 Central signalling, renderers dial out** (Epic's native model) | One Platform-controlled signalling service. Every render worker's streamers connect *outbound* to it. Browsers connect to its player port on a Platform-controlled origin. | No inbound ports on render nodes; one auth point; matches `-PixelStreamingSignallingURL`. | One more service to operate. It must route by authorization, not by a browser-chosen streamer id. |
| T2 Signalling per render node, behind a Platform-controlled proxy | A Wilbur per node or process; an edge proxy routes browser WebSockets by authorization. | Keeps signalling near media; failure is isolated. | The proxy needs an instance → endpoint map, which is internal infra identity. More moving parts. |
| T3 Signalling embedded in the bridge/sidecar | The bridge process serves signalling for its own streamers. | Fewest hops. | Browser WebSockets must still reach the node, which is disclosure and inbound exposure. |

**Recommended logical shape [PROP]:** T1, not physically frozen.

**Routing without browser choice [PROP]:**
1. The browser presents only its **B3 authorization** to the signalling `verifyClient` check. This is a per-visitor, single-attach, 60 s value, not Epic's shared `--player_token`.
2. Signalling asks the Platform for an **opaque route** for that authorization, and never learns the subject or visit. The route is a key the render worker registered for the session, such as a derived streamer id.
3. Signalling subscribes the player to that streamer internally. The browser never sends `listStreamers`/`subscribe` with a chosen id, and the frontend's streamer list is suppressed.
4. The renderer receives `playerConnected` together with the authorization, and calls **B4 attach** *before creating the offer*. If the result is not `ATTACHED`, it sends `disconnectPlayer`.

This makes the B4 attachment the gate on media, with no second authority.

**Open design point for B5:** the route lookup. The B4 `world_stream_attachment_route` takes the browser's session cookie hash. A signalling service on another origin will not have the cookie. B5 needs either a signalling-facing variant keyed by the authorization alone, which is possible because the authorization is already bound, single-attach and 60 s, or a cookie-bearing same-site origin. A new function means a new migration, which is an owner decision.

## 7. TURN / STUN
- **TURN is required** when both sides sit behind address- or port-dependent (symmetric) NATs, UDP is blocked, or the client is on an enterprise or mobile-carrier network [UP-V RFC 8656; Epic hosting guide].
  - Client-to-TURN runs over UDP/TCP 3478 or TLS/DTLS 5349. Using 443 is a deployment choice [UP-V/UP-I].
  - Relay-only is also the only way to hide the renderer IP (see §0.5, §11).
- **STUN alone** (server-reflexive) works for many home NATs and for the renderer's own public address discovery [UP-I].
- **Provable locally or on Preview without purchasing anything [PROP]:**
  - On loopback or LAN: host and srflx candidates, ICE, DTLS and SRTP; frame delivery using fake media.
  - With a **local coturn** in `use-auth-secret` mode plus `iceTransportPolicy:'relay'`: relay allocation, per-connection credential minting through `peerOptionsProvider`, the TTL, and a credential leak check.
- **Needs public infrastructure (M15):** real NAT traversal for internet visitors, TURN over TLS/443 for enterprise, relay bandwidth cost, geographic placement. Provider choice and billing are owner decisions.

## 8. Exact ATTACHED → STREAM_JOINED mapping [PROP]
**What is not joined:**
- A WebSocket connected, a `subscribe` or a `playerConnected`: **not joined**.
- An ICE `connected` (Epic's `webRtcConnected`): **not joined**, because no frame is proven.

**MEDIA_ESTABLISHED for a session holds when all of the following are true, as observed by the renderer's bridge:**
1. **B4 `ATTACHED`** for this session: the authorization was verified by this renderer's credential.
2. The WebRTC peer created **for that attached player** reaches `connected`: DTLS done and the data channel **open** (PS2 `OnDataTrackOpen` / `OnNewConnection` for that player id).
3. A **first-frame acknowledgement** arrives over that peer's data channel from the browser. The browser sends it once `inbound-rtp` video `framesDecoded > 0` **and** the video element fires `playing`. The ack carries a per-attach nonce the renderer issued in the offer or on the data channel, so it cannot be replayed onto another peer.
4. This all happens within a media-establishment timeout. The proposal is 30 s; it is an owner decision.

**Then:**
- The bridge emits `STREAM_JOINED` for that session, which the Platform turns into the arrival op: `VISIT_OPENED`, or `SESSION_RESUMED` inside grace.

**Why the browser ack is acceptable evidence:**
- UE cannot see decoding [UP-I].
- The ack travels only over the peer that the renderer created after verifying the attachment, so a browser can at most misstate its *own* arrival, never another visitor's.
- Renderer-side corroboration: RTCP receiver reports show packets received, visible through `OnStatChanged`. They can be required too (Q2).

**Failure to reach MEDIA_ESTABLISHED:**
- No STREAM_JOINED, so no arrival.
- The session stays CLAIMED. Its attachment is spent (B4: one per session), so a retry requires re-entry: a new session.
- The unused allocation is later released by the existing `release_abandoned`/A5 paths.

## 9. Failure / reconnect matrix (mapped onto B1/A5; no new lifecycle)
| Event | Media plane | Bridge fact (B1) | Platform result (A/A5) |
|---|---|---|---|
| Signalling WS drops, peer still up | Media continues | **none** while the peer is healthy. Signalling is not lifecycle. | presence continues |
| Signalling WS drops and the peer closes (Epic: `playerDisconnected` → peer torn down) | media stops | `STREAM_LOST` (if joined) | disconnect → grace (A5 timer) |
| ICE `disconnected`, transient | media stalls | **none** until debounce expires (proposal: `failed`/`closed`, or `disconnected` > 10 s) | presence heartbeats continue |
| ICE `failed` after joined | lost | `STREAM_LOST` | grace |
| ICE failure **before** MEDIA_ESTABLISHED | never joined | none | session stays CLAIMED; re-entry needed (attach is single-use); abandoned allocation released |
| Browser refresh / tab close | WS 1001, peer closed | `STREAM_LOST` | grace. The re-entered new session inside grace gives `SESSION_RESUMED` (same Visit). |
| Visitor Leave (gateway) | — | `VISITOR_LEFT` → departure (A3) | visit closed |
| Renderer (UE) process crash, bridge alive (sidecar) | all its peers gone | `STREAM_LOST` for each session | grace, then timeout if not re-entered |
| Bridge crash (or UE+bridge in-process crash) | peers orphaned or gone | nothing sent (B1: abandonment sends nothing) | A5 `PRESENCE_TIMEOUT` after 120 s. Re-entry before that gets `RUNTIME_UNAVAILABLE` (sticky). Re-entry after it is a new Visit on another instance. |
| Bridge restart, UE alive | peers may survive | `reconcileWithWork` (B2) restores JOINED from poll | presence resumes if within grace |
| Reconnect during A5 grace | new peer | new session: claim → capability → authorize → attach → media → `STREAM_JOINED` | `SESSION_RESUMED` (same Visit, no second lifecycle arrival) |
| Signalling service down | new connects fail; existing peers may continue | none for healthy peers | no lifecycle change; new entries see media timeout (§8) |

## 10. Security / authority map [PROP]
| Threat | Control |
|---|---|
| Authorization replay | B3 single use (redeem) and B4 single attach per authorization and per session, with a 60 s window. The signalling `verifyClient` check is only a pre-filter; the **renderer's attach is authoritative**. |
| Renderer substitution | Only the credential of the instance the session is bound to can attach (`SESSION_NOT_BOUND`). A rogue streamer registered on signalling cannot attach and so never gets an `ATTACHED` session. |
| Session stealing | The authorization is bound to session, subject and world. The first-frame ack is tied to the attach nonce on that peer only. Signalling never lets the browser pick a streamer. |
| Signalling becoming an authority | Signalling holds no DB credential, writes no lifecycle, and its events are never lifecycle facts. Only bridge facts go through ingress. |
| Renderer host/IP disclosure | The signalling origin is Platform-controlled. Streamers dial out, and the streamer port is never public. **ICE candidates reveal the media endpoint IP unless the browser is relay-only** (Q3). |
| TURN credential leakage | Per-connection time-limited credentials via `peerOptionsProvider`/`--turn_secret` [UP-V]. They are minted **only after** `verifyClient` accepts the authorization, and never persisted by the Platform, logged or put in evidence. The shipped default credentials must be removed. |
| Infrastructure disclosure in payloads | The existing forbiddenFields/WorldK audits cover signalling-facing and browser-facing messages. Streamer ids are opaque route keys, not hostnames. |

## 11. World-state delivery dependency [SK + PROP]
- **Current state:**
  - The renderer (bridge) holds only an ingress credential.
  - No runtime-credential snapshot read exists: the dev route is unauthenticated, and the production route is session-authenticated and orientation-only.
  - Living-forest has no snapshot route and no host wiring. `lib/livingForest/*` is in-memory and fixture-backed.
  - `resolveDurableWorldEmbodimentSnapshot` is hardcoded to Vrindavan.
  - The M14-B recon's proposed "runtime-credential `WorldExperienceSnapshot` read" was never built, because B4 became attachment.
- **Dependency:**
  - **Not required** to prove the media plane. A test pattern or static greybox scene proves attach → media → STREAM_JOINED.
  - **Required** before any real world rendering. The renderer must read the allocated world's per-visitor snapshot with its runtime credential, scoped to its bound sessions, with `schemaVersion`. Per-visitor fields must render only into that visitor's stream, which also rules out model D.
- **Recommendation:** a separate GPU-independent gate, **"renderer world-state read"**, either as B6 or as the first step of M15, owner's choice. It is not part of B5.

## 12. Development and certification environments
| Environment | Can prove | Cannot |
|---|---|---|
| **Cloud Workstation (this box, no GPU)** | Everything in the control plane with **real WebRTC and fake media**: Epic Signalling library (UE5.8 tag) plus a StudioK `verifyClient`; the JSStreamer-style mock streamer in headless Chromium with a fake video device; the Epic frontend player; the real Platform (Preview or local), real Postgres, reference runtime bridge; attach-gated offer, first-frame ack → STREAM_JOINED → ARRIVAL, reconnect and ICE-failure paths; local coturn relay-only tests. Chromium already runs here (after `libxkbcommon0`). | Real UE, NVENC, GPU load, internet NAT traversal |
| WRK-01 (RTX 5080) | First real UE 5.8 PS2 streamer on Windows, NVENC (≤ 12 sessions), greybox render, bridge integration, VRAM/GPU measurements for models A/C | Public-internet certification (unknown NAT/reachability). **No StudioK record of its OS, driver or network: facts needed.** |
| GCP L4 (parked) | Linux headless UE, unrestricted NVENC, cloud networking, public TURN, density measurements | — (billed; parked by owner) |

**Recommendation:**
1. Activate the **Cloud Workstation first**, for B5. It costs nothing, needs no GPU, and proves every authority boundary with real WebRTC.
2. Then **WRK-01** for M15a, the first real UE and NVENC environment, once the owner supplies its facts.
3. Then **L4** for M15b cloud and public-network certification, when the owner unparks it.

## 13. M14 vs M15 boundary [PROP]
- **B5 (M14, GPU-independent): the media control plane.** It covers:
  - signalling service design and implementation on the Epic Signalling library, with authorization-gated player admission
  - Platform-routed streamer selection
  - the **renderer-side attach-before-offer** rule
  - the MEDIA_ESTABLISHED composite rule
  - the bridge mapping to `STREAM_JOINED`/`STREAM_LOST`
  - ephemeral TURN credentials with local coturn
  - all certified with a **mock streamer, real WebRTC and fake media** in Chromium, against the real Platform and Postgres
- **B6 (optional, GPU-independent): the renderer world-state read** (§11).
- **M15 (GPU): real Unreal 5.8 PS2.**
  - The C++ bridge or sidecar implements the B1 spec plus attach plus the §8 rule, and passes the fixtures.
  - WRK-01 first (encoder, VRAM, model A vs C measurement), then L4 with public TURN.
  - The process-granularity decision, from measurements.

This split is cleaner than alternatives because every authority question is settled before GPU time is spent, and M15 becomes "replace the mock streamer with UE".

## 14. Recommended B5 scope (smallest)
1. A **signalling service** built on `@epicgames-ps/lib-pixelstreamingsignalling-ue5.8` (pinned):
   - `verifyClient` requiring a well-formed B3 authorization, pre-check only
   - the Platform route lookup (design per §6; may need Preview-only migration 045, owner decision)
   - server-side subscribe (no browser `listStreamers`)
   - `peerOptionsProvider` with local-coturn ephemeral credentials
   - no DB credential
2. A **mock streamer bridge**: a JSStreamer-derived peer driven by the B2 reference runtime.
   - On `playerConnected` + authorization: `attach`, and only if `ATTACHED`, `offer`.
   - First-frame ack plus nonce: `STREAM_JOINED`.
   - Debounced ICE failure or close: `STREAM_LOST`.
3. A **browser player**: the Epic frontend library (pinned) on a Platform-controlled stream page that replaces the stub page. It sends the first-frame ack after `framesDecoded > 0` and `playing`, and shows no streamer list.
4. **Certification** on the Cloud Workstation: local, plus a Preview Platform where applicable.
5. **Excluded:** UE, GPU, public TURN, SFU, Matchmaker, world-state read, WorldK changes, Production.

## 15. Owner decisions required
1. **Split:** approve B5 = GPU-independent media control plane (mock streamer, real WebRTC), with M15 = real UE/GPU. Also decide whether B6 (world-state read) is inserted before M15.
2. **MEDIA_ESTABLISHED rule:** approve the §8 composite (ATTACHED + peer connected with data channel open + nonce-bound browser first-frame ack, within a timeout). Optionally also require RTCP receipt. Set the timeout (proposal 30 s) and the ICE-disconnect debounce (proposal 10 s).
3. **ICE IP disclosure:**
   - (a) relay-only for browsers (hides renderer IPs; all media through TURN, which costs bandwidth), or
   - (b) accept that ICE reveals render-node IPs. The invariant would then be reinterpreted as "never *chooses* and never receives *identifiers*".
   - Recommend (a) for production, and (b) permitted locally for B5.
4. **D5 signalling placement:** approve the logical T1 (central, dial-out, Platform-controlled origin), still not physically frozen. Also decide where B5's Preview signalling runs (local only, or a long-running Preview host). Not Vercel.
5. **Signalling route lookup:** approve a signalling-facing route keyed by authorization alone (a new Preview-only function, migration 045), or require a same-site cookie-bearing signalling origin.
6. **Epic code adoption:** approve pinning the PixelStreamingInfrastructure UE5.8 packages (Signalling and Frontend libraries), with a licence review, versus a minimal in-house protocol implementation.
7. **Pre-join ICE failure:** keep B4's one attachment per session (a retry means re-entry), or allow a bounded re-attach before STREAM_JOINED. Recommend keeping it frozen.
8. **WRK-01 facts:** OS, GPU driver, network reachability and availability. There is no StudioK record.
9. **TURN provider:** defer to M15. B5 uses local coturn only.
10. **RuntimeInstance mapping:** confirm "one render-worker process + bridge = one instance; seat = one visitor view/stream".

## 16. Proposed B5 certification gates
1. **No offer before ATTACHED:**
   - A player with no, forged, replayed, expired or foreign authorization gets no `offer`, and is disconnected.
   - A mock streamer that is not the allocated instance cannot attach, so it never offers.
2. **No browser choice:** the browser cannot enumerate or select streamers. `listStreamers`/`subscribe` from the player are refused or ignored.
3. **WebSocket-only ≠ joined:** WS connected, `playerConnected` or ICE `connected` without the first-frame ack gives no `STREAM_JOINED` and no arrival.
4. **MEDIA_ESTABLISHED → STREAM_JOINED → ARRIVAL exactly once:**
   - `VISIT_OPENED`, or `SESSION_RESUMED` inside grace.
   - A replayed or cross-peer first-frame ack (wrong nonce) is refused.
5. **Failure matrix (§9) reproduced:**
   - A transient disconnect under the debounce causes no `STREAM_LOST`.
   - ICE failed or peer closed gives `STREAM_LOST` and grace.
   - Refresh gives grace, then re-entry and `SESSION_RESUMED`.
   - Bridge death gives A5 timeout.
   - Pre-join ICE failure gives no arrival.
6. **TURN:** relay-only works with local coturn. Credentials are per-connection with a TTL, minted only after authorization, and absent from Platform DB, logs and evidence (plaintext scan).
7. **Signalling is not an authority:** no DB credential; no lifecycle write; lifecycle, continuity and world digest unchanged by any signalling-only event.
8. **Disclosure:** no instance, session, allocation or subject id, and no host or port, in any browser-facing message. The ICE candidate policy is as decided in Q3.
9. **Chromium end-to-end** with fake media, over real WebRTC, against the real Platform and Postgres.
10. **Regression:** the full suite; the M14 A/A5/B1–B4 suites unchanged; Preview healthy; Production untouched; no GPU, UE or public TURN.

## 17. Sources (accessed 2026-09-26)
**Unreal and Epic** (UE 5.8 is current):
- https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-8-release-notes (search excerpt)
- https://dev.epicgames.com/documentation/en-us/unreal-engine/pixel-streaming-2-overview-in-unreal-engine
- https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-pixel-streaming-reference
- https://dev.epicgames.com/documentation/en-us/unreal-engine/getting-started-with-pixel-streaming-in-unreal-engine
- https://dev.epicgames.com/documentation/en-us/unreal-engine/hosting-and-networking-guide-for-pixel-streaming-in-unreal-engine
- https://dev.epicgames.com/documentation/en-us/unreal-engine/pixel-streaming-infrastructure
- https://dev.epicgames.com/documentation/unreal-engine/interacting-with-the-pixel-streaming-system-in-unreal-engine

**PixelStreamingInfrastructure** (https://github.com/EpicGamesExt/PixelStreamingInfrastructure; branches UE5.8 current, UE5.7 supported, UE5.6 end-of-life, master experimental):
- Tags: `lib-pixelstreamingsignalling-ue5.8-0.2.0` (2026-08-17), `lib-pixelstreamingfrontend-ue5.8-0.1.2` (2026-09-11), `lib-pixelstreamingfrontend-ui-ue5.8-0.1.1`.
- Files read:
  - Docs/pixel-streaming-2-migration-guide.md *(hand-verified)*
  - Docs/Security-Guidelines.md
  - Common/docs/Protocol.md
  - Common/src/Messages/signalling_messages.ts
  - SignallingWebServer/README.md (master and UE5.8)
  - SignallingWebServer/src/index.ts
  - Signalling/CHANGELOG.md (UE5.8)
  - SignallingWebServer/platform_scripts/bash/common.sh (UE5.8)
  - Frontend/library/src/{Config/Config.ts, Util/EventEmitter.ts, PeerConnectionController/PeerConnectionController.ts, WebRtcPlayer/WebRtcPlayerController.ts}
  - Extras/JSStreamer/README.md *(hand-verified)* and src/streamer.ts
  - Extras/FrontendTests/README.md and tests/basic_stream.spec.ts
  - Extras/MinimalStreamTester/README.md

**NVIDIA:**
- https://developer.nvidia.com/video-encode-and-decode-gpu-support-matrix-new *(hand-verified: RTX 5080 2 NVENC / 12 sessions; L4 2 NVENC / unrestricted)*
- https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5080/ (16 GB GDDR7)
- https://www.nvidia.com/en-us/data-center/l4/ (24 GB GDDR6)

**Standards:**
- https://www.rfc-editor.org/rfc/rfc8656.html (TURN)
- https://www.w3.org/TR/webrtc-stats/ (`framesDecoded`; CRD 2025-09-25)

**Open upstream gaps:**
- the exact PS2 5.8 C++ API for extra streamers
- whether `--player_token` has been backported to the UE5.8 branch
- the exact trigger of the frontend `videoInitialized` event
- the direction of the `stats` signalling message
- the date of NVIDIA's GeForce 12-session driver limit
- coturn docs not fetched
- the PixelStreamingInfrastructure licence not reviewed

## 18. STOP
Recon only. No signalling implemented, Unreal not installed, GCP L4 not activated, no TURN or GPU provisioned, no WorldK or Production change, no migration, B5 and M15 not started. The report is committed locally (a push would redeploy Preview).

```
M14B5_MEDIA_PLANE_ARCH_RECON_COMPLETE
```
